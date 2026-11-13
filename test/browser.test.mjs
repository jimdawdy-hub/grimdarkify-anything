import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { available } from '../src/process.mjs';
import { serveFiles } from '../src/workspace.mjs';
import { verifyInBrowser } from '../src/browser.mjs';
import { loadData, themeHtml } from '../src/toolkit.mjs';
import { forge } from '../src/forge.mjs';

test('real browser observes working controls and detects broken layout, notice, and original navigation', { skip: !await available('agent-browser'), timeout: 90_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'grimdarkify-browser-'));
  const site = join(root, 'site'), evidence = join(root, 'evidence'); await mkdir(site); await mkdir(evidence);
  const { factions, notice, baseCss } = await loadData();
  const html = themeHtml(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>Actual browser check</title><style>body{padding:20px}h1{font-size:48px}svg{display:block;width:150px;height:150px}</style></head><body><h1>The great task engine</h1><svg data-gd-art viewBox="0 0 150 150" aria-label="Original fan artwork"><rect width="150" height="150" fill="#bc942f"/><circle cx="75" cy="65" r="40" fill="#38263a"/><text y="145" font-size="6">UNOFFICIAL NON-COMMERCIAL · Games Workshop fan work</text></svg><p>A functioning local interface with a real action and a visible result, for testing the browser verification adapter.</p><button id="add" onclick="document.querySelector('#status').textContent='Task added'">Add task</button><p id="status" role="status">Waiting</p><a href="#details">Details</a><section id="details"><h2>The task manifest</h2></section></body></html>`, forge(factions[0]), notice, baseCss);
  await writeFile(join(site, 'index.html'), html);
  const server = await serveFiles(site);
  const options = { evidence, notice, inventory: { controls: [{ id: 'add', tag: 'button' }], links: [{ href: '#details' }] }, build: { interactions: [{ name: 'Add a task', steps: [{ selector: '#add', action: 'click', value: '' }], assertion: { selector: '#status', textIncludes: 'Task added' } }] }, attempt: 1 };
  try {
    const first = await verifyInBrowser(server.url, options);
    assert.equal(first.passed, true, JSON.stringify(first.failures)); assert.equal(first.interactions[0].passed, true);
    assert.deepEqual(first.viewports.map((v) => v.width), [1440, 390]);
    let broken = await readFile(join(site, 'index.html'), 'utf8');
    broken = broken.replace(/<footer[\s\S]*?<\/footer>/, '').replace('href="#details"', 'href="#missing"').replace('</head>', '<style>body{min-width:2000px!important}</style></head>');
    await writeFile(join(site, 'index.html'), broken);
    const second = await verifyInBrowser(server.url, { ...options, attempt: 2 });
    assert.equal(second.passed, false); assert.ok(second.failures.some((f) => f.includes('overflow')));
    assert.ok(second.failures.some((f) => f.includes('fan notice'))); assert.ok(second.failures.some((f) => f.includes('navigation destination')));
  } finally { await server.close(); await rm(root, { recursive: true, force: true }); }
});

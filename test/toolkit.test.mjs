import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { forge, contrast, noticeText } from '../src/forge.mjs';
import { ROOT, loadData, selectFaction, themeHtml, renderCss, createKit, fetchHtml, inspectTarget } from '../src/toolkit.mjs';

const { factions, notice, baseCss } = await loadData();
const exec = promisify(execFile);
const cli = join(ROOT, 'bin/grimdarkify.mjs');
const source = `<!doctype html><html lang="en"><head><title>Real app</title><style>.a::after{content:"</body>"}</style><script>const bait = '<html><head></head></body>'; window.original = true;</script></head><body><!-- </body> --><main data-note="a > b"><h1>Account settings</h1><form action="/save" method="post"><label>Email<input name="email" type="email" required></label><button>Save</button></form><a href="/projects">Projects</a></main></body></html>`;

async function temporary(run) {
  const path = await mkdtemp(join(tmpdir(), 'grimdarkify-test-'));
  try { return await run(path); } finally { await rm(path, { recursive: true, force: true }); }
}

test('catalogue includes requested armies and every known primarch lineage', () => {
  assert.equal(new Set(factions.map((f) => f.id)).size, factions.length);
  for (const id of ['drukhari', 'tau-empire', 'orks', 'aeldari', 'necrons', 'tyranids', 'genestealer-cults', 'leagues-of-votann', 'adepta-sororitas', 'adeptus-mechanicus', 'emperors-children']) assert.ok(selectFaction(factions, id));
  const primarchs = factions.filter((f) => f.primarch);
  assert.equal(primarchs.length, 19);
  assert.equal(new Set(primarchs.map((f) => f.legion)).size, 18);
  assert.ok(primarchs.some((f) => f.primarch === 'Omegon'));
  assert.throws(() => selectFaction(factions, 'made-up-army'), /Unknown faction/);
});

test('fresh runs produce genuinely different visual tokens within each faction', () => {
  for (const faction of factions) {
    const designs = Array.from({ length: 12 }, () => forge(faction));
    assert.equal(new Set(designs.map((d) => d.seed)).size, 12);
    assert.equal(new Set(designs.map((d) => JSON.stringify(d.tokens))).size, 12, faction.id);
    assert.ok(designs.every((d) => faction.frames.includes(d.frame)));
    assert.ok(designs.every((d) => faction.motifs.includes(d.motif)));
  }
});

test('explicit seeds reproduce a favored design and its stylesheet', () => {
  const faction = selectFaction(factions, 'drukhari');
  assert.deepEqual(forge(faction, { seed: 'favorite-123' }), forge(faction, { seed: 'favorite-123' }));
  assert.equal(renderCss(forge(faction, { seed: 'favorite-123' }), notice, baseCss), renderCss(forge(faction, { seed: 'favorite-123' }), notice, baseCss));
});

test('generated text, muted labels and accents stay readable across all faction surfaces', () => {
  for (const faction of factions) for (let i = 0; i < 10; i++) {
    const design = forge(faction, { seed: `contrast-${i}` });
    for (const surface of ['background', 'surface']) {
      assert.ok(contrast(design.palette.text, design.palette[surface]) >= 7, `${faction.id}: body text`);
      for (const role of ['muted', 'accent', 'secondary']) assert.ok(contrast(design.palette[role], design.palette[surface]) >= 4.5, `${faction.id}: ${role}`);
    }
  }
});

test('HTML transformation preserves real interactions, scripts and misleading tag strings', () => {
  const design = forge(factions[0]);
  const output = themeHtml(source, design, notice, baseCss);
  assert.ok(output.includes('<script>const bait = \'<html><head></head></body>\'; window.original = true;</script>'));
  assert.ok(output.includes('<form action="/save" method="post">'));
  assert.ok(output.includes('<input name="email" type="email" required>'));
  assert.ok(output.includes('data-note="a > b"'));
  assert.ok(output.includes('<a href="/projects">Projects</a>'));
  assert.equal((output.match(/data-grimdark-notice/g) ?? []).length, 1);
  assert.ok(output.indexOf('<style id="grimdarkify-theme">') < output.indexOf('</head><body>'));
  assert.ok(output.includes(notice.short));
  assert.ok(output.endsWith('</body></html>'));
});

test('a remote snapshot retains its original URL base without replacing an existing base', () => {
  const design = forge(factions[0]);
  assert.ok(themeHtml(source, design, notice, baseCss, { baseUrl: 'https://example.org/docs/page' }).includes('<base href="https://example.org/docs/page">'));
  const withBase = source.replace('<head>', '<head><base href="https://cdn.example.org/">');
  const output = themeHtml(withBase, design, notice, baseCss, { baseUrl: 'https://example.org/' });
  assert.equal((output.match(/<base /g) ?? []).length, 1);
  assert.ok(output.includes('https://cdn.example.org/'));
});

test('HTML adapter refuses re-theming, fragments and restrictive inline CSP', () => {
  const design = forge(factions[0]);
  assert.throws(() => themeHtml(themeHtml(source, design, notice, baseCss), design, notice, baseCss), /already themed/);
  assert.throws(() => themeHtml('<section>partial component</section>', design, notice, baseCss), /complete HTML/);
  assert.throws(() => themeHtml(source.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="style-src \'self\'">'), design, notice, baseCss), /Content Security Policy/);
});

test('every kit artifact carries notice text or metadata; existing work is never overwritten', () => temporary(async (root) => {
  const out = join(root, 'kit');
  const design = forge(factions[0]);
  const files = await createKit(out, factions[0], design, notice, baseCss);
  for (const file of files) {
    const text = await readFile(join(out, file), 'utf8');
    assert.ok(text.includes('NON-COMMERCIAL'), file);
    assert.ok(text.includes('Games Workshop'), file);
  }
  const original = await readFile(join(out, 'theme.css'), 'utf8');
  await assert.rejects(createKit(out, factions[0], forge(factions[0]), notice, baseCss), { code: 'EEXIST' });
  assert.equal(await readFile(join(out, 'theme.css'), 'utf8'), original);
}));

test('source inventory avoids hidden secrets, sensitive names and external symlinks', () => temporary(async (root) => {
  await writeFile(join(root, 'package.json'), JSON.stringify({ dependencies: { react: 'example' } }));
  await writeFile(join(root, '.env'), 'SHOULD_NOT_APPEAR=secret');
  await writeFile(join(root, 'credentials.json'), 'secret');
  await mkdir(join(root, '.hidden'));
  await writeFile(join(root, '.hidden', 'app.js'), 'secret');
  await writeFile(join(root, 'app.js'), 'legitimate source');
  await symlink('/etc', join(root, 'external'));
  const result = await inspectTarget(root, notice);
  assert.deepEqual(result.files.sort(), ['app.js', 'package.json']);
  assert.deepEqual(result.packages, ['react']);
  assert.ok(!JSON.stringify(result).includes('SHOULD_NOT_APPEAR'));
}));

test('CLI creates distinct local themes from identical settings and leaves source untouched', () => temporary(async (root) => {
  const input = join(root, 'index.html'); await writeFile(input, source);
  for (const file of ['a.html', 'b.html']) await exec(process.execPath, [cli, 'html', input, '--out', join(root, file), '--faction', 'orks']);
  assert.notEqual(await readFile(join(root, 'a.html'), 'utf8'), await readFile(join(root, 'b.html'), 'utf8'));
  assert.equal(await readFile(input, 'utf8'), source);
  await assert.rejects(exec(process.execPath, [cli, 'html', input, '--out', join(root, 'a.html')]));
  assert.equal(await readFile(input, 'utf8'), source);
}));

test('website fetching and CLI work against an actual HTTP page, without model calls', async () => {
  const server = createServer((request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(source); });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const url = `http://127.0.0.1:${server.address().port}/original`;
  try {
    const result = await fetchHtml(url); assert.equal(result.html, source);
    await temporary(async (root) => {
      const out = join(root, 'remote.html');
      await exec(process.execPath, [cli, 'website', url, '--out', out, '--faction', 'tau-empire']);
      const transformed = await readFile(out, 'utf8');
      assert.ok(transformed.includes(`<base href="${url}">`));
      assert.ok(transformed.includes(notice.short));
    });
  } finally { await new Promise((done) => server.close(done)); }
});

test('unrecognized options fail rather than silently changing the requested operation', async () => {
  await assert.rejects(exec(process.execPath, [cli, 'factions', '--seed', 'ignored']));
  await assert.rejects(exec(process.execPath, [cli, 'kit', '--faction', 'drukhari']));
});

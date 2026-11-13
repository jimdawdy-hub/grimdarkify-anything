import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, noticeText, noticeHtml, watermarkSvg, buildBrief, cssVariables, escapeHtml } from './forge.mjs';
import { studySvg } from './study.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export async function loadData() {
  const [factions, notice, baseCss] = await Promise.all([
    readFile(new URL('../data/factions.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../data/notice.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../assets/base.css', import.meta.url), 'utf8')
  ]);
  return { factions, notice, baseCss };
}
export function selectFaction(factions, id = 'space-marines') {
  const faction = factions.find((entry) => entry.id === id);
  if (!faction) throw new Error(`Unknown faction "${id}". Run grimdarkify factions for available identifiers.`);
  return faction;
}
export function renderCss(design, notice, baseCss) {
  return `/* ${noticeText(notice).replaceAll('\n', ' ')}\nFaction: ${design.name}; variation seed: ${design.seed.replaceAll('*/', '* /')} */\n${cssVariables(design)}${baseCss}`;
}
export function designAttributes(design) {
  return `data-grimdark="${escapeHtml(design.faction)}" data-gd-frame="${design.frame}" data-gd-ornament="${design.ornament}" data-gd-texture="${design.texture}" data-gd-layout="${design.layout}"`;
}

// Locate actual document tags without mistaking script strings, comments, or
// quoted attribute contents for markup. This is a complete-document adapter,
// not a general-purpose HTML repair parser.
function documentTags(html) {
  const tags = [];
  const pattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const start = match.index;
    if (/^<!/.test(match[0])) continue;
    let end = start + 1, quote = null;
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === html.length) throw new Error('Unclosed HTML tag; use the agent workflow to repair the source first.');
    const text = html.slice(start, end + 1);
    pattern.lastIndex = end + 1;
    const [, closing, name] = /^<(\/?)([a-z][\w:-]*)/i.exec(text);
    const tag = { name: name.toLowerCase(), closing: Boolean(closing), start, end: end + 1, text };
    tags.push(tag);
    if (!closing && ['script', 'style', 'textarea', 'title'].includes(tag.name)) {
      const close = new RegExp(`</${tag.name}\\s*>`, 'gi');
      close.lastIndex = end + 1;
      const rawClose = close.exec(html);
      if (!rawClose) throw new Error(`Unclosed ${tag.name} element.`);
      pattern.lastIndex = close.lastIndex;
    }
  }
  return tags;
}
export function themeHtml(html, design, notice, baseCss, { baseUrl } = {}) {
  const tags = documentTags(html);
  const root = tags.find((tag) => tag.name === 'html' && !tag.closing);
  const head = tags.find((tag) => tag.name === 'head' && !tag.closing);
  const headClose = tags.find((tag) => tag.name === 'head' && tag.closing);
  const bodyClose = tags.find((tag) => tag.name === 'body' && tag.closing);
  if (!root || !head || !headClose || !bodyClose) throw new Error('Expected a complete HTML document with html, head, and closing body tags. Use kit for source components.');
  if (tags.some((tag) => /\bdata-grimdark(?:\s|=|>)/i.test(tag.text))) throw new Error('This document is already themed. Reforge its original source to create another variation.');
  if (tags.some((tag) => tag.name === 'meta' && /http-equiv\s*=\s*["']?content-security-policy/i.test(tag.text))) throw new Error('This page declares a Content Security Policy. Use kit and integrate the stylesheet through the source project instead.');
  const css = renderCss(design, notice, baseCss).replace(/<\/style/gi, '<\\/style');
  const changes = [
    { at: root.end - 1, value: ` ${designAttributes(design)}` },
    { at: headClose.start, value: `\n<style id="grimdarkify-theme">\n${css}\n</style>\n` },
    { at: bodyClose.start, value: `\n${noticeHtml(notice)}\n` }
  ];
  if (baseUrl && !tags.some((tag) => tag.name === 'base')) changes.push({ at: head.end, value: `\n<base href="${escapeHtml(baseUrl)}">\n` });
  for (const change of changes.sort((a, b) => b.at - a.at)) html = html.slice(0, change.at) + change.value + html.slice(change.at);
  return html;
}

export async function fetchHtml(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Website URLs must use http or https.');
  const response = await fetch(parsed, { signal: AbortSignal.timeout(20_000), headers: { Accept: 'text/html', 'User-Agent': 'GrimdarkifyAnything/0.1 (unofficial fan toolkit)' } });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}. Use local source or your browser-based agent for authenticated sites.`);
  if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type') ?? '')) throw new Error('The URL did not return an HTML page.');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 5 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error('HTML exceeds the 5 MiB snapshot limit.'); }
    chunks.push(chunk);
  }
  return { html: Buffer.concat(chunks).toString('utf8'), url: response.url };
}
export async function readHtml(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || !/\.html?$/i.test(path)) throw new Error('Local HTML input must be a regular .html or .htm file.');
  if (stat.size > 5 * 1024 * 1024) throw new Error('HTML exceeds the 5 MiB snapshot limit.');
  return readFile(path, 'utf8');
}
export async function writeNew(path, value) {
  await writeFile(path, value, { flag: 'wx' });
}
export function previewHtml(design, notice) {
  return `<!doctype html><html lang="en" ${designAttributes(design)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(design.name)} · Grimdarkify</title><link rel="stylesheet" href="theme.css"><style>body{max-width:64rem;margin:3rem auto;padding:0 1rem}main{display:grid;gap:1.5rem}h1{font-size:clamp(2rem,6vw,4rem)}label{display:block;margin:.75rem 0}input{max-width:100%;box-sizing:border-box}</style></head><body><header><p class="gd-meta">Grimdarkify Anything · ${escapeHtml(design.name)}</p><h1>The work endures.</h1><p class="gd-muted">A fresh ${escapeHtml(design.frame)} / ${escapeHtml(design.texture)} interpretation. Seed: ${escapeHtml(design.seed)}</p></header><main><section class="gd-panel" aria-labelledby="project-title"><p class="gd-meta">Project status · Active</p><h2 id="project-title">Project Atlas</h2><p>Keep the product useful. Make its world feel ancient.</p><label>Project name <input value="Project Atlas"></label><button type="button" onclick="this.textContent='Project saved'">Save project</button></section><section class="gd-panel"><h2>Deployment manifest</h2><table><thead><tr><th>Module</th><th>Status</th></tr></thead><tbody><tr><td>Navigation</td><td>Operational</td></tr><tr><td>Accessibility</td><td>Preserved</td></tr></tbody></table></section></main>${noticeHtml(notice)}</body></html>\n`;
}
export async function createKit(out, faction, design, notice, baseCss) {
  await mkdir(out); // An existing directory is never merged with or overwritten.
  const files = {
    'theme.css': renderCss(design, notice, baseCss),
    'tokens.json': JSON.stringify({ ...design, notice }, null, 2) + '\n',
    'NOTICE.txt': noticeText(notice) + '\n',
    'notice.html': noticeHtml(notice) + '\n',
    'watermark.svg': watermarkSvg(notice),
    'study.svg': studySvg(faction, design, notice),
    'brief.md': buildBrief(faction, design, notice),
    'preview.html': previewHtml(design, notice)
  };
  await Promise.all(Object.entries(files).map(([name, value]) => writeNew(resolve(out, name), value)));
  return Object.keys(files);
}
export async function inspectTarget(target, notice) {
  if (/^https?:\/\//i.test(target)) {
    const { html, url } = await fetchHtml(target);
    return { target: url, kind: 'static-website', title: /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? null, bytes: Buffer.byteLength(html), hasScripts: /<script\b/i.test(html), limitation: 'Static HTML only. Use a browser-capable coding agent to inspect client-rendered pages and actual interactions.', notice };
  }
  const root = resolve(target), stat = await lstat(root);
  if (stat.isSymbolicLink()) throw new Error('Inspect a real file or directory, not a symlink.');
  if (!stat.isDirectory()) return { target: root, kind: 'file', extension: extname(root), bytes: stat.size, limitation: 'Editable source or a supported native theme API is needed to restyle an app.', notice };
  const files = []; let truncated = false;
  const ignored = new Set(['node_modules', 'vendor', 'dist', 'build', 'coverage', '_site', '__pycache__']);
  async function walk(path, depth = 0) {
    if (depth > 3) return;
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ignored.has(entry.name) || entry.isSymbolicLink()) continue;
      if (files.length >= 160) { truncated = true; return; }
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else if (/\.(html?|css|scss|[cm]?[jt]sx?|json|vue|svelte|py|rs|swift|kt|xml|qml|toml)$/i.test(entry.name) && !/secret|credential|token|password|lock\./i.test(entry.name)) files.push(full.slice(root.length + 1));
    }
  }
  await walk(root);
  let packages = [];
  try { const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')); packages = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]; } catch { /* Not every project has a package manifest. */ }
  return { target: root, kind: 'source-project', files, packages, truncated, limitation: 'Bounded file inventory and package names; no source execution, secret reads, or automatic modifications.', notice };
}

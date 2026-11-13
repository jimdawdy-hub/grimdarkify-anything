import { readFile, writeFile, mkdir, readdir, lstat } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forge, noticeText, noticeHtml, watermarkSvg, buildBrief, cssVariables, escapeHtml } from './forge.mjs';
import { studySvg } from './study.mjs';
import { compileTheme } from './assets.mjs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export async function loadData() {
  const [factions, notice, baseCss] = await Promise.all([
    readFile(new URL('../data/factions.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../data/notice.json', import.meta.url), 'utf8').then(JSON.parse),
    compileTheme()
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
  const bodyOpen = tags.find((tag) => tag.name === 'body' && !tag.closing);
  if (!root || !head || !headClose || !bodyOpen || !bodyClose) throw new Error('Expected a complete HTML document with html, head, and closing body tags. Use kit for source components.');
  if (tags.some((tag) => /\bdata-grimdark(?:\s|=|>)/i.test(tag.text))) throw new Error('This document is already themed. Reforge its original source to create another variation.');
  if (tags.some((tag) => tag.name === 'meta' && /http-equiv\s*=\s*["']?content-security-policy/i.test(tag.text))) throw new Error('This page declares a Content Security Policy. Use kit and integrate the stylesheet through the source project instead.');
  const css = renderCss(design, notice, baseCss).replace(/<\/style/gi, '<\\/style');
  const changes = [
    { at: root.end - 1, value: ` ${designAttributes(design)}` },
    { at: headClose.start, value: `\n<style id="grimdarkify-theme">\n${css}\n</style>\n` },
    { at: bodyClose.start, value: `\n${noticeHtml(notice)}\n` }
  ];
  // Mascot replacement is scoped to explicit mascot/character markers. Product
  // imagery, ordinary logos, links and interactive application code remain intact.
  const mascots = tags.filter((tag) => tag.name === 'img' && /\b(nomo|owl|mascot)\b/i.test(tag.text));
  const mascotSource = baseCss.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/)?.[0];
  for (const tag of mascots) {
    let value = tag.text.replace(/^<img/i, '<img data-gd-mascot="servo-skull"');
    let replacedSource = false;
    value = value.replace(/\s+([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, (attribute, name) => {
      if (['srcset', 'sizes'].includes(name.toLowerCase())) return '';
      if (name.toLowerCase() === 'src' && mascotSource) { replacedSource = true; return ` src="${mascotSource}"`; }
      if (name.toLowerCase() === 'alt') return ' alt="A servo-skull parody of this website’s original mascot"';
      return attribute;
    });
    if (!replacedSource && mascotSource) value = value.replace(/^<img/i, `<img src="${mascotSource}"`);
    changes.push({ at: tag.start, end: tag.end, value });
  }
  if (bodyOpen) changes.push({ at: bodyOpen.end, value: `\n<div class="gd-page-crest" aria-label="Unofficial faction parody">${escapeHtml(design.name)} · ${escapeHtml(design.spectacle ?? 'An unreasonable quantity of gothic ornament')} · UNOFFICIAL FAN PARODY</div>${mascots.length ? '' : '<aside class="gd-familiar" role="img" aria-label="A flying servo-skull research familiar"></aside>'}\n` });
  if (baseUrl && !tags.some((tag) => tag.name === 'base')) changes.push({ at: head.end, value: `\n<base href="${escapeHtml(baseUrl)}">\n` });
  for (const change of changes.sort((a, b) => b.at - a.at)) html = html.slice(0, change.at) + change.value + html.slice(change.end ?? change.at);
  return html;
}

export async function fetchHtml(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Website URLs must use http or https.');
  const response = await fetch(parsed, { signal: AbortSignal.timeout(20_000), headers: { Accept: 'text/html', 'User-Agent': 'GrimdarkifyAnything/0.2 (unofficial fan toolkit)' } });
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
  return `<!doctype html><html lang="en" ${designAttributes(design)}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(design.name)} · Grimdarkify</title><link rel="stylesheet" href="theme.css"><style>body{max-width:76rem;margin:2rem auto;padding:0 1.5rem}.relic-hero{display:grid;grid-template-columns:1.2fr 1fr;align-items:center;gap:2rem;padding:3rem 0}.relic-hero h1{font-size:clamp(3.5rem,7vw,7rem);margin:.2em 0}.relic-hero .gd-familiar{float:none;width:100%;height:480px;margin:0}.relic-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin:2rem 0}.relic-grid h2{font-size:2.8rem}.relic-grid label{display:block;margin:1rem 0}.relic-grid input{max-width:100%;box-sizing:border-box}.gd-meta{line-height:1.8}@media(max-width:650px){.relic-hero,.relic-grid{grid-template-columns:1fr}.relic-hero .gd-familiar{height:320px}.relic-hero{padding:1rem 0}}</style></head><body><div class="gd-page-crest">${escapeHtml(design.name)} · Unofficial fan parody · Excess has been authorized</div><header class="relic-hero"><div><p class="gd-meta">GRIMDARKIFY ANYTHING / ${escapeHtml(design.name)}</p><h1>Your work.<br>Under oath.</h1><p>This perfectly reasonable interface has been requisitioned by the art department.</p><p class="gd-meta">${escapeHtml(design.spectacle)}<br>Ritual seed: ${escapeHtml(design.seed)}</p></div><aside class="gd-familiar" role="img" aria-label="An extravagant servo-skull research familiar"></aside></header><main class="relic-grid"><section class="gd-panel" aria-labelledby="project-title"><p class="gd-meta">DESIGNATION / A MATTER OF IMPERIAL IMPORTANCE</p><h2 id="project-title">The Great Work</h2><p>Your actual controls still work. Their sense of proportion has been confiscated.</p><label>Project designation <input value="Project Atlas"></label><button type="button" onclick="this.textContent='Writ recorded. The archive remembers.'">Consecrate this project</button></section><section class="gd-panel"><p class="gd-meta">PERPETUAL AUDIT / SCRUTINY IS MANDATORY</p><h2>The manifest endures.</h2><table><thead><tr><th>Relic</th><th>State</th></tr></thead><tbody><tr><td>Navigation</td><td>Operational</td></tr><tr><td>Keyboard access</td><td>Sanctified</td></tr><tr><td>Tasteful restraint</td><td>Excommunicated</td></tr></tbody></table></section></main>${noticeHtml(notice)}</body></html>\n`;
}

export async function createKit(out, faction, design, notice, baseCss) {
  await mkdir(out); // An existing directory is never merged with or overwritten.
  const fontFiles = (await readdir(new URL('../assets/fonts/', import.meta.url))).filter((name) => name.endsWith('-OFL.txt'));
  const licenses = await Promise.all(fontFiles.map(async (name) => `\n\n=== ${name} ===\n${await readFile(new URL(`../assets/fonts/${name}`, import.meta.url), 'utf8')}`));
  const files = {
    'theme.css': renderCss(design, notice, baseCss),
    'tokens.json': JSON.stringify({ ...design, notice }, null, 2) + '\n',
    'NOTICE.txt': noticeText(notice) + '\n',
    'FONT-LICENSES.txt': noticeText(notice) + '\n\nBundled fonts: original SIL Open Font Licences\n' + licenses.join(''),
    'notice.html': noticeHtml(notice) + '\n',
    'watermark.svg': watermarkSvg(notice),
    'study.svg': studySvg(faction, design, notice, { mascot: baseCss.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/)?.[0] }),
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

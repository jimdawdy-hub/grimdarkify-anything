import { createServer } from 'node:http';
import { readdir, lstat, realpath, mkdir, copyFile, readFile } from 'node:fs/promises';
import { join, resolve, relative, extname, sep, dirname, basename } from 'node:path';
import { startProcess, cleanEnv } from './process.mjs';

const excluded = /^(?:\.git|\.env(?:\..*)?|\.npmrc|\.netrc|\.ssh|\.aws|\.codex|\.claude|\.mcp\.json|AGENTS\.md|CLAUDE\.md|node_modules|vendor|dist|build|coverage|\.next|\.nuxt|\.venv|venv|__pycache__|\.grimdarkify|runs)$/i;
const sensitive = /(?:^|[._-])(?:secrets?|credentials?|tokens?|private[-_]key)(?:[._-]|$)|\.(?:pem|key|p12|pfx|sqlite3?|db|dump|sql|log)$/i;
const sourceDotfile = /^\.(?:gitignore|dockerignore|nvmrc|node-version|browserslistrc|eslintrc(?:\..*)?|prettierrc(?:\..*)?)$/;
const sourceCode = /\.(?:[cm]?[jt]sx?|css|scss|sass|less|vue|svelte|astro|py|go|rs|rb|php|java|kt|swift|cs|cpp|h)$/i;
export function within(root, target) { const path = relative(root, target); return !path.startsWith(`..${sep}`) && path !== '..' && !path.startsWith(sep); }
export async function canonicalDestination(path) {
  const missing = []; let current = resolve(path);
  while (true) {
    try { return resolve(await realpath(current), ...missing.reverse()); }
    catch (error) {
      if (error.code !== 'ENOENT' || dirname(current) === current) throw error;
      missing.push(basename(current)); current = dirname(current);
    }
  }
}

export async function copyProject(source, destination) {
  const skipped = []; let files = 0, bytes = 0;
  async function visit(from, to, depth = 0) {
    if (depth > 25) throw new Error('Source tree exceeds 25 directory levels. Select a smaller project.');
    await mkdir(to, { recursive: true });
    for (const item of await readdir(from, { withFileTypes: true })) {
      const path = join(from, item.name), rel = relative(source, path);
      if (excluded.test(item.name) || sensitive.test(item.name) && !sourceCode.test(item.name) || item.name.startsWith('.') && !sourceDotfile.test(item.name) || item.isSymbolicLink()) { skipped.push(rel); continue; }
      if (item.isDirectory()) await visit(path, join(to, item.name), depth + 1);
      else if (item.isFile()) {
        const stat = await lstat(path);
        if (++files > 12_000 || (bytes += stat.size) > 150 * 1024 * 1024) throw new Error('Source exceeds 12,000 files or 150 MiB. Select a smaller project.');
        await copyFile(path, join(to, item.name));
      }
    }
  }
  await visit(source, destination);
  return { files, bytes, skipped };
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/plain' };
export async function serveFiles(root, { port = 0, sandbox = false } = {}) {
  root = await realpath(root);
  const server = createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let path = resolve(root, `.${pathname}`);
      if (!within(root, path)) throw new Error('Outside root');
      if ((await lstat(path)).isDirectory()) path = join(path, 'index.html');
      path = await realpath(path);
      if (!within(root, path) || !(await lstat(path)).isFile()) throw new Error('Outside root');
      const content = await readFile(path);
      const headers = { 'Content-Type': types[extname(path)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };
      if (sandbox) {
        headers['Content-Security-Policy'] = "sandbox allow-scripts allow-forms allow-modals allow-downloads; connect-src 'none'; form-action 'none'; frame-src 'none'";
        // Sandboxed frames have an opaque origin. Fonts and JS modules still
        // need CORS even though every served resource is a local static file.
        headers['Access-Control-Allow-Origin'] = '*';
      }
      res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : content);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }) };
}

export async function previewProject(root, { start, signal, event } = {}) {
  if (!start) return serveFiles(root);
  const reservation = await serveFiles(root);
  const port = new URL(reservation.url).port;
  await reservation.close();
  if (!start.includes('{port}')) throw new Error('--start must include {port}, for example: npm run dev -- --host 127.0.0.1 --port {port}');
  const process = startProcess('/bin/sh', ['-c', start.replaceAll('{port}', port)], { cwd: root, signal, env: cleanEnv({ PORT: port, HOST: '127.0.0.1' }), timeout: 3_600_000,
    onData: (chunk) => event?.({ type: 'preview', message: chunk.slice(-600) }) });
  let failure;
  process.done.catch((error) => { failure = error; });
  const url = `http://127.0.0.1:${port}/`;
  try {
    const end = Date.now() + 60_000;
    while (Date.now() < end) {
      signal?.throwIfAborted();
      if (failure) throw failure;
      try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return { url, close: async () => { process.stop(); await process.done.catch(() => {}); } }; } catch {}
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error('Preview did not become ready within 60 seconds. Check --start and installed project dependencies.');
  } catch (error) { process.stop(); await process.done.catch(() => {}); throw error; }
}

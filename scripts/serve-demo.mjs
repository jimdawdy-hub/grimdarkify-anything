import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { buildDemo } from './build-demo.mjs';

const site = await realpath(await buildDemo());
const port = Number(process.env.GRIMDARKIFY_PORT ?? 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = await realpath(resolve(site, '.' + (path === '/' ? '/index.html' : path)));
    if (!file.startsWith(site + sep)) throw new Error('Outside site');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Grimdarkify preview: http://127.0.0.1:${port}`));

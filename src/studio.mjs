import { createServer } from 'node:http';
import { readFile, mkdir, realpath, lstat, readdir } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { runPipeline, doctor } from './pipeline.mjs';
import { loadData, ROOT } from './toolkit.mjs';
import { serveFiles, within } from './workspace.mjs';

export async function startStudio({ port = 4180, out = join(homedir(), '.local/share/grimdarkify/runs') } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be 0–65535.');
  const runs = resolve(out); await mkdir(runs, { recursive: true });
  const token = randomBytes(32).toString('hex'), jobs = new Map(), { factions, notice } = await loadData();
  let active;
  const send = (res, status, value) => res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(value));
  const emit = (job, event) => { job.events.push(event); if (job.events.length > 300) job.events.shift(); for (const res of job.listeners) res.write(`data: ${JSON.stringify(event)}\n\n`); };
  const publicJob = (job) => ({ id: job.id, status: job.status, events: job.events, preview: job.preview?.url ?? null, report: job.state ? `/runs/${job.id}/report.html` : null, error: job.error });
  for (const id of (await readdir(runs)).filter((name) => /^[a-f0-9-]{36}$/.test(name)).slice(-30)) {
    try {
      const state = JSON.parse(await readFile(join(runs, id, 'run.json'), 'utf8'));
      if (!['complete', 'needs-review', 'failed', 'cancelled'].includes(state.status)) continue;
      const job = { id, state, status: state.status, events: [], listeners: new Set(), controller: new AbortController(), error: state.status === 'failed' ? state.error : undefined };
      if (['complete', 'needs-review'].includes(state.status) && !state.start) job.preview = await serveFiles(join(runs, id, 'workspace'), { sandbox: true });
      jobs.set(id, job);
    } catch {}
  }
  const file = async (res, root, pathname) => {
    const path = await realpath(resolve(root, '.' + decodeURIComponent(pathname)));
    if (!within(await realpath(root), path) || !(await lstat(path)).isFile()) throw new Error('Not found');
    const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf' }[extname(path)] ?? 'text/plain';
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }).end(await readFile(path));
  };
  const server = createServer(async (req, res) => {
    try {
      const ownHost = `127.0.0.1:${server.address().port}`;
      if (![ownHost, `localhost:${server.address().port}`].includes(req.headers.host)) return send(res, 403, { error: 'Local access only' });
      const url = new URL(req.url, `http://${ownHost}`), path = url.pathname;
      if (req.headers.origin && ![`http://${ownHost}`, `http://localhost:${server.address().port}`].includes(req.headers.origin)) return send(res, 403, { error: 'Foreign origin' });
      if (req.method === 'GET') {
        if (path === '/') {
          const html = (await readFile(join(ROOT, 'studio/index.html'), 'utf8')).replace('__TOKEN__', token);
          return res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-src 'self' http://127.0.0.1:*; frame-ancestors 'none'; base-uri 'none'" }).end(html);
        }
        if (path === '/api/config') return send(res, 200, { factions, notice, runs, tools: await doctor(), recent: [...jobs.values()].map((job) => ({ id: job.id, label: job.state?.plan?.title ?? job.state?.faction?.name ?? 'Transformation', status: job.status })) });
        if (path.startsWith('/assets/')) return await file(res, join(ROOT, 'assets'), path.slice(7));
        if (['/studio.css', '/studio.mjs'].includes(path)) return await file(res, join(ROOT, 'studio'), path);
        const stream = path.match(/^\/api\/jobs\/([a-f0-9-]+)\/events$/);
        if (stream) {
          const job = jobs.get(stream[1]); if (!job) return send(res, 404, { error: 'Unknown job' });
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
          for (const event of job.events) res.write(`data: ${JSON.stringify(event)}\n\n`);
          job.listeners.add(res); req.on('close', () => job.listeners.delete(res)); return;
        }
        const jobMatch = path.match(/^\/api\/jobs\/([a-f0-9-]+)$/);
        if (jobMatch) return jobs.has(jobMatch[1]) ? send(res, 200, publicJob(jobs.get(jobMatch[1]))) : send(res, 404, { error: 'Unknown job' });
        const report = path.match(/^\/runs\/([a-f0-9-]+)\/(report\.html|evidence\/(?:before|after)-[a-z0-9-]+\.png)$/);
        if (report && jobs.has(report[1])) return await file(res, join(runs, report[1]), '/' + report[2]);
        return send(res, 404, { error: 'Not found' });
      }
      if (req.method !== 'POST' || req.headers['x-grimdarkify-token'] !== token) return send(res, 403, { error: 'Invalid studio request' });
      if (path === '/api/jobs') {
        if (active) return send(res, 409, { error: 'A transformation is already running. Cancel it or wait for it to finish.' });
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 16_000) return send(res, 413, { error: 'Request too large' }); }
        const options = JSON.parse(body);
        if (typeof options.target !== 'string' || !options.target.trim()) return send(res, 400, { error: 'Enter a website URL or source path.' });
        const id = randomUUID(), job = { id, controller: new AbortController(), listeners: new Set(), events: [], status: 'running' };
        jobs.set(id, job); active = id; send(res, 202, publicJob(job));
        // Only explicitly supported input fields enter the pipeline.
        job.done = runPipeline({ target: options.target.trim(), faction: options.faction, agent: options.agent, start: options.start || undefined, check: options.check || undefined, out: join(runs, id) }, { signal: job.controller.signal, onEvent: (event) => emit(job, event) }).then(async (state) => {
          job.state = state; job.status = state.status;
          if (!state.start) job.preview = await serveFiles(join(state.output, 'workspace'), { sandbox: true });
        }).catch(async (error) => {
          job.error = error.message; job.status = job.controller.signal.aborted ? 'cancelled' : 'failed';
          try { job.state = JSON.parse(await readFile(join(runs, id, 'run.json'), 'utf8')); } catch {}
        }).finally(() => { active = null; emit(job, { type: 'result', ...publicJob(job), events: undefined }); });
        return;
      }
      const cancel = path.match(/^\/api\/jobs\/([a-f0-9-]+)\/cancel$/);
      if (cancel && jobs.has(cancel[1])) { jobs.get(cancel[1]).controller.abort(); return send(res, 200, { cancelled: true }); }
      return send(res, 404, { error: 'Not found' });
    } catch (error) { if (!res.headersSent) send(res, 400, { error: error.message }); else res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Grimdarkify Studio: ${url}\nOutputs: ${runs}\nUses your saved coding-agent sign-in. Press Ctrl+C to stop.`);
  const close = async () => {
    for (const job of jobs.values()) { job.controller.abort(); for (const res of job.listeners) res.end(); job.listeners.clear(); }
    await Promise.allSettled([...jobs.values()].map((job) => job.done));
    for (const job of jobs.values()) await job.preview?.close();
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  };
  const shutdown = () => { close().finally(() => process.exit(0)); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  return { url, close, jobs };
}

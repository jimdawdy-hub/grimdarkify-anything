import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyProject, serveFiles, within } from '../src/workspace.mjs';
import { cleanEnv, execute } from '../src/process.mjs';
import { runPipeline } from '../src/pipeline.mjs';
import { startStudio } from '../src/studio.mjs';

async function temporary(fn) {
  const root = await mkdtemp(join(tmpdir(), 'grimdarkify-pipeline-'));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}
const source = '<!doctype html><html><head><title>Target</title></head><body><h1>Tasks</h1><button id="add">Add task</button></body></html>';
const inventory = { title: 'Tasks', controls: [{ id: 'add', tag: 'button' }], links: [] };
const plan = { title: 'The task krumpa', concept: 'Ork workshop', mascot: 'Notebook grot', environment: 'Forge', typography: 'Stencil', ornament: 'Rivets', preserve: ['add'], limitations: [] };
const review = { typography: true, character: true, environment: true, ornament: true, targetRecognizable: true, issues: [] };
const build = { summary: 'Rebuilt target', changedFiles: ['index.html'], artwork: ['original SVG'], limitations: [], interactions: [{ name: 'Add task', steps: [{ selector: '#add', action: 'click', value: '' }], assertion: { selector: '#status', textIncludes: 'added' } }] };
function fixtures(root, overrides = {}) {
  const calls = [];
  return { calls, dependencies: {
    selectAgent: async () => 'codex',
    capture: async (url, evidence) => { await writeFile(join(evidence, 'inventory.json'), JSON.stringify(inventory)); return { inventory }; },
    agentRunner: async (input) => {
      calls.push({ stage: input.name, readOnly: input.readOnly });
      if (input.name === 'design') return plan;
      if (input.name.startsWith('review')) return review;
      await writeFile(join(input.cwd, 'index.html'), source + '<!-- actual copied transformation -->');
      return build;
    },
    verify: async () => ({ passed: true, failures: [], images: [], viewports: [], interactions: [{ name: 'Add task', passed: true }], scope: 'Fixture entry page and task interaction' }),
    ...overrides
  } };
}

test('project copy excludes credentials, dependencies, hooks, agent instructions and symlinks', () => temporary(async (root) => {
  const from = join(root, 'source'), to = join(root, 'output'); await mkdir(from);
  for (const name of ['index.html', '.env', '.env.production', 'credentials.json', 'AGENTS.md', 'CLAUDE.md', '.mcp.json', 'server.key', '.npmrc']) await writeFile(join(from, name), name);
  await writeFile(join(from, 'design-tokens.ts'), 'export const colors = {};');
  await mkdir(join(from, 'node_modules')); await writeFile(join(from, 'node_modules', 'dependency.js'), 'dependency');
  await symlink('/etc', join(from, 'outside'));
  const result = await copyProject(from, to);
  assert.equal(result.files, 2); assert.equal(await readFile(join(to, 'index.html'), 'utf8'), 'index.html');
  assert.equal(await readFile(join(to, 'design-tokens.ts'), 'utf8'), 'export const colors = {};');
  assert.ok(result.skipped.includes('AGENTS.md')); assert.ok(result.skipped.includes('outside'));
}));

test('preview server rejects traversal and external symlinks; generated preview is sandboxed', () => temporary(async (root) => {
  await writeFile(join(root, 'index.html'), source); await symlink('/etc/passwd', join(root, 'leak.txt'));
  const server = await serveFiles(root, { sandbox: true });
  try {
    const response = await fetch(server.url); assert.equal(await response.text(), source);
    assert.match(response.headers.get('content-security-policy'), /sandbox allow-scripts/);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal((await fetch(server.url + 'leak.txt')).status, 404);
    assert.equal((await fetch(server.url + '%2e%2e%2fetc/passwd')).status, 404);
    assert.equal(within(root, root + '-other/file'), false);
  } finally { await server.close(); }
}));

test('subprocesses exclude API keys and database secrets and stop on cancellation', async () => {
  const old = process.env.ANTHROPIC_API_KEY; process.env.ANTHROPIC_API_KEY = 'do-not-pass';
  try { assert.equal(cleanEnv().ANTHROPIC_API_KEY, undefined); assert.equal(cleanEnv().HOME, process.env.HOME); }
  finally { if (old === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = old; }
  const controller = new AbortController();
  const result = execute(process.execPath, ['-e', 'setInterval(() => {}, 10000)'], { signal: controller.signal });
  setTimeout(() => controller.abort(), 40);
  await assert.rejects(result, /cancelled/);
  await assert.rejects(execute(process.execPath, ['-e', 'setInterval(() => {}, 10000)'], { timeout: 40 }), /timed out/);
});

test('pipeline preserves source and makes a real repair pass when browser checks fail', () => temporary(async (root) => {
  const input = join(root, 'input'); await mkdir(input); await writeFile(join(input, 'index.html'), source); await writeFile(join(input, '.env'), 'private');
  let checks = 0;
  const { dependencies, calls } = fixtures(root, { verify: async () => ({ passed: ++checks > 1, failures: checks === 1 ? ['390px overflow'] : [], viewports: [], interactions: [], images: [], scope: 'Real browser adapter is independently exercised in end-to-end runs' }) });
  const out = join(root, 'new-parent', 'run');
  const state = await runPipeline({ target: input, out, faction: 'orks' }, dependencies);
  assert.equal(state.status, 'complete'); assert.equal(state.attempt, 2);
  assert.deepEqual(calls.map((c) => c.stage), ['design', 'build-1', 'review-1', 'build-2', 'review-2']);
  assert.deepEqual(calls.map((c) => c.readOnly), [true, false, true, false, true]);
  assert.equal(await readFile(join(input, 'index.html'), 'utf8'), source);
  assert.match(await readFile(join(out, 'workspace/index.html'), 'utf8'), /copied transformation/);
  assert.match(await readFile(join(out, 'REPORT.md'), 'utf8'), /Games Workshop/);
  await assert.rejects(runPipeline({ target: input, out }, dependencies), { code: 'EEXIST' });
}));

test('failed agent stage resumes without copying over edits or repeating completed design', () => temporary(async (root) => {
  const input = join(root, 'input'); await mkdir(input); await writeFile(join(input, 'index.html'), source);
  const out = join(root, 'run'), { dependencies, calls } = fixtures(root);
  const workingAgent = dependencies.agentRunner;
  dependencies.agentRunner = async (input) => { if (input.name === 'build-1') throw new Error('Agent disconnected'); return workingAgent(input); };
  await assert.rejects(runPipeline({ target: input, out }, dependencies), /disconnected/);
  await writeFile(join(out, 'workspace', 'keep.txt'), 'user repair');
  dependencies.agentRunner = workingAgent;
  const state = await runPipeline({ out, resume: true }, dependencies);
  assert.equal(state.status, 'complete'); assert.equal(calls.filter((c) => c.stage === 'design').length, 1);
  assert.equal(await readFile(join(out, 'workspace/keep.txt'), 'utf8'), 'user repair');
}));

test('pipeline refuses nested output before changing the source project', () => temporary(async (root) => {
  await writeFile(join(root, 'index.html'), source);
  await assert.rejects(runPipeline({ target: root, out: join(root, 'nested') }, fixtures(root).dependencies), /outside the source/);
}));

test('studio requires same-origin authenticated mutations and confines report paths', () => temporary(async (root) => {
  const studio = await startStudio({ port: 0, out: root });
  try {
    const html = await (await fetch(studio.url)).text(); assert.match(html, /Submit a website/);
    assert.equal((await fetch(studio.url + 'api/jobs', { method: 'POST', body: '{}' })).status, 403);
    const token = /name="studio-token" content="([^"]+)"/.exec(html)[1];
    assert.equal((await fetch(studio.url + 'api/jobs', { method: 'POST', headers: { Origin: 'https://attacker.example', 'X-Grimdarkify-Token': token }, body: '{}' })).status, 403);
    assert.equal((await fetch(studio.url + 'api/jobs', { method: 'POST', headers: { 'X-Grimdarkify-Token': token }, body: '{}' })).status, 400);
    assert.equal((await fetch(studio.url + 'runs/abcd/evidence/credentials.json')).status, 404);
  } finally { await studio.close(); }
}));

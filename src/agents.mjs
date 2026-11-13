import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { available, execute } from './process.mjs';

const strings = { type: 'array', items: { type: 'string' } };
const object = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const planSchema = object({
  title: { type: 'string' }, concept: { type: 'string' }, mascot: { type: 'string' },
  environment: { type: 'string' }, typography: { type: 'string' }, ornament: { type: 'string' },
  preserve: strings, limitations: strings
});
export const buildSchema = object({
  summary: { type: 'string' }, changedFiles: strings, artwork: strings, limitations: strings,
  interactions: { type: 'array', items: object({
    name: { type: 'string' },
    steps: { type: 'array', items: object({ selector: { type: 'string' }, action: { type: 'string', enum: ['click', 'fill', 'press', 'select'] }, value: { type: 'string' } }) },
    assertion: object({ selector: { type: 'string' }, textIncludes: { type: 'string' } })
  }) }
});
export const reviewSchema = object({
  typography: { type: 'boolean' }, character: { type: 'boolean' }, environment: { type: 'boolean' }, ornament: { type: 'boolean' },
  targetRecognizable: { type: 'boolean' }, issues: strings
});

function validate(value, schema, path = 'response') {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid agent ${path}: expected object`);
    for (const key of schema.required) validate(value[key], schema.properties[key], `${path}.${key}`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > 100) throw new Error(`Invalid agent ${path}: expected bounded array`);
    value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`));
  } else if (typeof value !== schema.type || schema.enum && !schema.enum.includes(value)) throw new Error(`Invalid agent ${path}`);
  return value;
}

export async function chooseAgent(requested = 'auto') {
  if (!['auto', 'codex', 'claude'].includes(requested)) throw new Error('--agent must be auto, codex, or claude.');
  for (const name of requested === 'auto' ? ['codex', 'claude'] : [requested]) {
    if (!await available(name)) continue;
    try {
      if (name === 'codex') {
        const result = await execute(name, ['login', 'status'], { timeout: 15_000 });
        if (/api key/i.test(result.output + result.errorOutput)) continue;
      }
      else {
        const result = JSON.parse((await execute(name, ['auth', 'status'], { timeout: 15_000 })).output);
        if (result.loggedIn === false || result.isAuthenticated === false || /api.?key|bedrock|vertex|foundry/i.test(result.authMethod ?? '')) continue;
      }
      return name;
    } catch {}
  }
  throw new Error('Install and sign in to Codex or Claude Code first. Run grimdarkify doctor for setup commands.');
}

export async function runAgent({ agent, cwd, evidence, name, prompt, schema, images = [], readOnly = false, signal, timeout, event }) {
  const schemaFile = join(evidence, `${name}.schema.json`);
  const responseFile = join(evidence, `${name}.json`);
  await writeFile(schemaFile, JSON.stringify(schema));
  await writeFile(join(evidence, `${name}.prompt.md`), prompt);
  // Settings and repository hooks are deliberately excluded. Saved CLI sign-in
  // still works. No model override, API key, or unrestricted sandbox is used.
  let args;
  if (agent === 'codex') {
    args = ['-a', 'never', 'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check', '--color', 'never', '--json',
      '--sandbox', readOnly ? 'read-only' : 'workspace-write', '--output-schema', schemaFile, '-o', responseFile, '-C', cwd];
    for (const path of images) args.push('--image', path);
    args.push('-');
  } else {
    args = ['-p', '--restricted', '--add-dir', evidence, '--output-format', 'json', '--json-schema', JSON.stringify(schema), '--no-session-persistence',
      '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--permission-mode', readOnly ? 'default' : 'acceptEdits', '--tools', readOnly ? 'Read,Glob,Grep' : 'Read,Glob,Grep,Edit,Write',
      '--allowedTools', readOnly ? 'Read,Glob,Grep' : 'Read,Glob,Grep,Edit,Write'];
    prompt += `\nRead these local screenshot images with your Read tool before responding: ${images.join(', ')}`;
  }
  let lines = '', logSize = 0, logWrite = Promise.resolve();
  const logFile = join(evidence, `${name}.log`);
  await writeFile(logFile, '');
  const result = await execute(agent, args, { cwd, input: prompt, signal, timeout, onData(chunk, stream) {
    if (logSize < 4_000_000) { logSize += chunk.length; logWrite = logWrite.then(() => appendFile(logFile, chunk)); }
    if (stream !== 'stdout') return;
    lines += chunk;
    let end;
    while ((end = lines.indexOf('\n')) !== -1) {
      const line = lines.slice(0, end); lines = lines.slice(end + 1);
      try {
        const data = JSON.parse(line);
        if (data.item?.type === 'agent_message') event?.({ type: 'agent', message: data.item.text.slice(0, 1200) });
        if (data.type === 'item.started' && data.item?.type === 'command_execution') event?.({ type: 'activity', message: 'Agent is inspecting and editing the copied project.' });
        if (data.type === 'item.completed' && data.item?.type === 'file_change') event?.({ type: 'activity', message: 'Agent updated the target implementation.' });
      } catch {}
    }
  } }).finally(async () => { await logWrite; });
  let value;
  if (agent === 'codex') value = JSON.parse(await readFile(responseFile, 'utf8'));
  else {
    const envelope = JSON.parse(result.output);
    if (envelope.is_error || envelope.subtype?.includes('error')) throw new Error(`Claude failed: ${envelope.result ?? envelope.subtype}`);
    value = envelope.structured_output ?? JSON.parse(envelope.result);
    await writeFile(responseFile, JSON.stringify(value, null, 2));
  }
  return validate(value, schema);
}

import { spawn } from 'node:child_process';

// Do not silently turn a subscription-backed run into a paid API call, or pass
// the workstation's application secrets into generated code and build scripts.
export function cleanEnv(extra = {}) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TEMP|TMP|LANG|LC_.*|TERM|XDG_.*|DISPLAY|WAYLAND_DISPLAY|CODEX_HOME|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE)$/i.test(key)) env[key] = value;
  }
  return { ...env, ...extra };
}

export function startProcess(command, args, { cwd, env = cleanEnv(), input, signal, timeout = 600_000, onData = () => {} } = {}) {
  signal?.throwIfAborted();
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', errorOutput = '', stopped, forceTimer;
  const stop = (reason = 'Process cancelled') => {
    stopped ??= reason;
    const kill = (kind) => {
      try { process.platform === 'win32' ? child.kill(kind) : process.kill(-child.pid, kind); } catch {}
    };
    kill('SIGTERM');
    forceTimer ??= setTimeout(() => kill('SIGKILL'), 1500);
    forceTimer.unref();
  };
  const abort = () => stop('Run cancelled');
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => stop(`Process timed out after ${Math.round(timeout / 1000)} seconds`), timeout);
  const done = new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => { const text = chunk.toString(); output = (output + text).slice(-2_000_000); onData(text, 'stdout'); });
    child.stderr.on('data', (chunk) => { const text = chunk.toString(); errorOutput = (errorOutput + text).slice(-200_000); onData(text, 'stderr'); });
    child.stdin.on('error', () => {});
    child.once('error', reject);
    child.once('close', (code) => {
      if (stopped) reject(new Error(stopped));
      else if (code !== 0) reject(new Error(`${command} exited ${code}: ${(errorOutput || output).slice(-2500)}`));
      else resolve({ output, errorOutput, code });
    });
  }).finally(() => { clearTimeout(timer); if (!stopped) clearTimeout(forceTimer); signal?.removeEventListener('abort', abort); });
  child.stdin.end(input);
  return { done, stop, child };
}

export const execute = (command, args, options) => startProcess(command, args, options).done;

export async function available(command) {
  try { await execute(command, ['--version'], { timeout: 15_000 }); return true; } catch { return false; }
}

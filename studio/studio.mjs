const $ = (selector) => document.querySelector(selector);
const token = $('meta[name=studio-token]').content;
let stream, jobId;
const log = (message, error = false) => { const p = document.createElement('p'); p.textContent = message; if (error) p.className = 'error'; $('#log').append(p); $('#log').scrollTop = $('#log').scrollHeight; };
async function request(path, body) {
  const result = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Grimdarkify-Token': token }, body: JSON.stringify(body) });
  const value = await result.json(); if (!result.ok) throw new Error(value.error); return value;
}
function finish(job) {
  stream?.close(); $('#summon').disabled = false; $('#cancel').hidden = true;
  $('#progress-title').textContent = { complete: 'The machine has delivered', 'needs-review': 'A creature requiring scrutiny', failed: 'The ritual was interrupted', cancelled: 'The ritual was stopped' }[job.status] ?? job.status;
  if (job.error) log(job.error, true);
  if (job.report) {
    $('#result').hidden = false; $('#report').href = job.report; $('#result-title').textContent = job.status === 'complete' ? 'Behold the consequences' : 'Inspect the result';
    $('#result-note').textContent = job.status === 'complete' ? 'Desktop, mobile, listed interactions and visual review passed. The report records precisely what was checked.' : 'Some requirements need attention. Open the report for the observed results and instructions to continue.';
    $('#preview').src = job.preview ?? job.report;
  }
}
$('#forge-form').addEventListener('submit', async (event) => {
  event.preventDefault(); $('#summon').disabled = true; $('#result').hidden = true; $('#log').replaceChildren();
  for (const li of document.querySelectorAll('#stages li')) li.className = '';
  try {
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const job = await request('/api/jobs', form); jobId = job.id; $('#cancel').hidden = false;
    stream?.close(); stream = new EventSource(`/api/jobs/${job.id}/events`);
    stream.onmessage = ({ data }) => {
      const update = JSON.parse(data);
      if (update.type === 'stage') {
        const base = update.stage.split('-')[0], row = document.querySelector(`[data-stage=${base}]`);
        document.querySelector('#stages .active')?.classList.replace('active', 'done'); row?.classList.remove('done'); row?.classList.add('active');
        $('#progress-title').textContent = row?.textContent ?? update.stage;
      }
      if (update.message) log(update.message, update.type === 'failed');
      if (update.type === 'result') { document.querySelector('#stages .active')?.classList.replace('active', 'done'); finish(update); }
    };
    stream.onerror = async () => { try { const current = await request(`/api/jobs/${job.id}`); if (current.status !== 'running') finish(current); } catch { log('Studio connection lost. Run artifacts remain on disk; use the resume command to continue.', true); stream.close(); $('#summon').disabled = false; } };
  } catch (error) { log(error.message, true); $('#summon').disabled = false; }
});
$('#cancel').addEventListener('click', async () => { try { await request(`/api/jobs/${jobId}/cancel`, {}); log('Stopping the agent and preview processes…'); } catch (error) { log(error.message, true); } });
try {
  const config = await request('/api/config');
  $('#faction').replaceChildren(...config.factions.map((f) => { const option = document.createElement('option'); option.value = f.id; option.textContent = `${f.name}${f.primarch ? ` · ${f.primarch}` : ''}`; return option; }));
  $('#faction').value = 'adeptus-arbites';
  $('#setup').textContent = config.tools.browser.installed && (config.tools.codex.installed || config.tools.claude.installed) ? `Agent and browser detected. Outputs: ${config.runs}` : 'Setup needed: run grimdarkify doctor in your terminal.';
  if (config.recent.length) {
    $('#recent').hidden = false;
    for (const job of config.recent) { const li = document.createElement('li'), link = document.createElement('a'); link.href = `/?run=${job.id}`; link.textContent = `${job.label} · ${job.status}`; li.append(link); $('#recent ul').append(li); }
  }
  const previous = new URLSearchParams(location.search).get('run');
  if (previous) finish(await request(`/api/jobs/${encodeURIComponent(previous)}`));
} catch (error) { $('#setup').textContent = error.message; }

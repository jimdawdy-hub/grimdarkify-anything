#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { forge, buildBrief, noticeText } from '../src/forge.mjs';
import { loadData, selectFaction, createKit, fetchHtml, readHtml, themeHtml, writeNew, inspectTarget } from '../src/toolkit.mjs';
import { runPipeline, doctor } from '../src/pipeline.mjs';
import { startStudio } from '../src/studio.mjs';

const HELP = `Grimdarkify Anything · unofficial, non-commercial fan toolkit

Usage:
  grimdarkify run https://example.com --faction orks --out ./ork-site
  grimdarkify run ./my-app --faction drukhari --out ../dark-app --start 'npm run dev -- --host 127.0.0.1 --port {port}'
  grimdarkify resume ./ork-site                   Continue an interrupted run
  grimdarkify studio                             Open the local agent studio
  grimdarkify doctor                             Check installed agents/browser
  grimdarkify factions [--json]                    List factions and primarch styles
  grimdarkify kit --faction drukhari --out ./kit    Generate a fresh design + assets
  grimdarkify brief --faction orks                 Print a fresh agent brief
  grimdarkify html ./index.html --out ./dark.html  Theme a local HTML document
  grimdarkify website https://example.com --out ./dark.html
  grimdarkify inspect ./my-app [--json]            Inspect a source tree or URL
  grimdarkify notice                              Print the required fan notice

Options:
  --faction ID   Faction/primarch (run: adeptus-arbites; quick tools: space-marines)
  --out PATH     New directory (run/kit) or new .html file (html/website)
  --seed TEXT    Replay theme tokens; agent reconstructions remain variable
  --agent NAME   auto (Codex first), codex, or claude; uses saved CLI sign-in
  --start CMD    Source preview command, with {port}; run in the copied workspace
  --check CMD    Optional project test/build command, run in the copied workspace
  --install CMD  Override dependency installation (npm defaults to --ignore-scripts)
  --path PATH    Entry route to capture and verify (default: /)
  --attempts N   Build/review attempts, 1–4 (default: 2)
  --timeout SEC  Per-agent timeout, 30–3600 (default: 900)
  --port N       Local studio port (default: 4180)
  --json         Machine-readable faction list or inspection
  --help         Show help
  --version      Show version

run/studio use a signed-in coding agent and agent-browser. No API key is passed.
kit/html/website are quick, model-free theme tools. website is a static preview.
Run html outputs from the same directory as their source to retain local assets.
`;

try {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    faction: { type: 'string' }, out: { type: 'string' }, seed: { type: 'string' },
    agent: { type: 'string' }, start: { type: 'string' }, check: { type: 'string' }, install: { type: 'string' }, path: { type: 'string' },
    attempts: { type: 'string' }, timeout: { type: 'string' }, port: { type: 'string' },
    json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' }
  } });
  if (values.help || !positionals.length && !values.version) { console.log(HELP); process.exit(0); }
  if (values.version) { console.log(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version); process.exit(0); }
  const [command, target, ...extra] = positionals;
  const runOptions = ['faction', 'out', 'seed', 'agent', 'start', 'check', 'install', 'path', 'attempts', 'timeout'];
  const allowed = { run: runOptions, resume: ['start', 'check', 'install', 'attempts', 'timeout'], studio: ['port', 'out'], doctor: ['json'], factions: ['json'], notice: [], inspect: ['json'], kit: ['faction', 'out', 'seed'], brief: ['faction', 'seed'], html: ['faction', 'out', 'seed'], website: ['faction', 'out', 'seed'] };
  if (!allowed[command]) throw new Error(`Unknown command "${command}". Run grimdarkify --help.`);
  if (extra.length || target && !['run', 'resume', 'inspect', 'html', 'website'].includes(command)) throw new Error(`Unexpected argument for ${command}.`);
  for (const name of Object.keys(values)) if (!allowed[command].includes(name)) throw new Error(`--${name} is not supported by ${command}.`);
  if (command === 'doctor') { console.log(JSON.stringify(await doctor(), null, 2)); process.exit(0); }
  if (command === 'studio') { await startStudio({ port: values.port === undefined ? 4180 : Number(values.port), out: values.out }); }
  else if (['run', 'resume'].includes(command)) {
    if (!target) throw new Error(`${command} requires an input path or URL.`);
    const controller = new AbortController();
    process.once('SIGINT', () => controller.abort());
    process.once('SIGTERM', () => controller.abort());
    const state = await runPipeline({ ...values, target, ...(command === 'resume' ? { resume: true, out: target } : {}) }, { signal: controller.signal, onEvent(event) { console.error(`[${event.stage ?? event.type}] ${event.message}`); } });
    console.log(`${state.status}: ${state.output}\nReport: ${state.output}/report.html\nProject: ${state.output}/workspace\nSeed: ${state.design.seed}`);
    if (state.status !== 'complete') process.exitCode = 2;
  } else {
  const { factions, notice, baseCss } = await loadData();
  if (command === 'factions') {
    console.log(values.json ? JSON.stringify({ factions, notice }, null, 2) : factions.map((f) => `${f.id.padEnd(26)} ${f.name}${f.primarch ? ` · ${f.primarch}` : ''}`).join('\n') + '\n\n' + noticeText(notice));
  } else if (command === 'notice') console.log(noticeText(notice));
  else if (command === 'inspect') {
    if (!target) throw new Error('Provide a source directory, file or URL to inspect.');
    const result = await inspectTarget(target, notice);
    console.log(JSON.stringify(result, null, 2));
  } else {
    const faction = selectFaction(factions, values.faction);
    const design = forge(faction, { seed: values.seed });
    if (command === 'brief') console.log(buildBrief(faction, design, notice));
    else if (command === 'kit') {
      if (!values.out) throw new Error('kit requires --out with a new directory path.');
      const out = resolve(values.out);
      const files = await createKit(out, faction, design, notice, baseCss);
      console.log(`${faction.name}\nSeed: ${design.seed}\nCreated ${files.length} files in ${out}\nOpen preview.html and give brief.md to your coding agent.\n\n${noticeText(notice)}`);
    } else {
      if (!target || !values.out) throw new Error(`${command} requires an input and --out with a new .html file.`);
      const out = resolve(values.out);
      if (!/\.html?$/i.test(out)) throw new Error('--out must end in .html or .htm.');
      let html, baseUrl;
      if (command === 'website') ({ html, url: baseUrl } = await fetchHtml(target));
      else {
        if (dirname(resolve(target)) !== dirname(out)) throw new Error('Keep local HTML output beside its source so relative assets continue to resolve. Use kit for project-wide integration.');
        html = await readHtml(resolve(target));
      }
      await writeNew(out, themeHtml(html, design, notice, baseCss, { baseUrl }));
      console.log(`Created ${out}\nFaction: ${faction.name}\nSeed: ${design.seed}${command === 'website' ? '\nStatic preview only: remote resources and original scripts may still make network requests.' : ''}\n\n${noticeText(notice)}`);
    }
  }
  }
} catch (error) {
  const hint = error.code === 'EEXIST' ? 'Output already exists. Choose a new path; existing work is never overwritten.' : error.message;
  console.error(`grimdarkify: ${hint}`);
  process.exitCode = 1;
}

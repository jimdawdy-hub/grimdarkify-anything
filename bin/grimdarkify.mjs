#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { forge, buildBrief, noticeText } from '../src/forge.mjs';
import { loadData, selectFaction, createKit, fetchHtml, readHtml, themeHtml, writeNew, inspectTarget } from '../src/toolkit.mjs';

const HELP = `Grimdarkify Anything · unofficial, non-commercial fan toolkit

Usage:
  grimdarkify factions [--json]                    List factions and primarch styles
  grimdarkify kit --faction drukhari --out ./kit    Generate a fresh design + assets
  grimdarkify brief --faction orks                 Print a fresh agent brief
  grimdarkify html ./index.html --out ./dark.html  Theme a local HTML document
  grimdarkify website https://example.com --out ./dark.html
  grimdarkify inspect ./my-app [--json]            Inspect a source tree or URL
  grimdarkify notice                              Print the required fan notice

Options:
  --faction ID   Faction/primarch identifier (default: space-marines)
  --out PATH     New output directory (kit) or new .html file (html/website)
  --seed TEXT    Optional exact replay; omit for a new result every run
  --json         Machine-readable faction list or inspection
  --help         Show help
  --version      Show version

No model, paid API, account, or network is needed for local transformations.
URL mode is a local static preview, not a replacement for the live website.
Run html outputs from the same directory as their source to retain local assets.
`;

try {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    faction: { type: 'string' }, out: { type: 'string' }, seed: { type: 'string' },
    json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean' }
  } });
  if (values.help || !positionals.length && !values.version) { console.log(HELP); process.exit(0); }
  if (values.version) { console.log(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version); process.exit(0); }
  const [command, target, ...extra] = positionals;
  const allowed = { factions: ['json'], notice: [], inspect: ['json'], kit: ['faction', 'out', 'seed'], brief: ['faction', 'seed'], html: ['faction', 'out', 'seed'], website: ['faction', 'out', 'seed'] };
  if (!allowed[command]) throw new Error(`Unknown command "${command}". Run grimdarkify --help.`);
  if (extra.length || target && !['inspect', 'html', 'website'].includes(command)) throw new Error(`Unexpected argument for ${command}.`);
  for (const name of Object.keys(values)) if (!allowed[command].includes(name)) throw new Error(`--${name} is not supported by ${command}.`);
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
} catch (error) {
  const hint = error.code === 'EEXIST' ? 'Output already exists. Choose a new path; existing work is never overwritten.' : error.message;
  console.error(`grimdarkify: ${hint}`);
  process.exitCode = 1;
}

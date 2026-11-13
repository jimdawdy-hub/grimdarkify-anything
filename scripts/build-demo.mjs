import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadData } from '../src/toolkit.mjs';
import { noticeHtml } from '../src/forge.mjs';

export async function buildDemo() {
  const site = resolve(ROOT, '_site');
  await mkdir(site, { recursive: true });
  const { factions, notice } = await loadData();
  const html = await readFile(resolve(ROOT, 'demo/index.html'), 'utf8');
  await writeFile(resolve(site, 'index.html'), html.replace('<!-- FAN_NOTICE -->', noticeHtml(notice)));
  await writeFile(resolve(site, 'factions.json'), JSON.stringify(factions));
  await writeFile(resolve(site, 'notice.json'), JSON.stringify(notice));
  await Promise.all([
    ['demo/demo.css', 'demo.css'], ['demo/demo.mjs', 'demo.mjs'],
    ['src/forge.mjs', 'forge.mjs'], ['src/study.mjs', 'study.mjs'], ['assets/base.css', 'theme.css']
  ].map(([source, destination]) => copyFile(resolve(ROOT, source), resolve(site, destination))));
  return site;
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) console.log(`Built ${await buildDemo()}`);

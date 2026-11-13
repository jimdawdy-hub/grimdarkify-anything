import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadData } from '../src/toolkit.mjs';
import { noticeHtml } from '../src/forge.mjs';
import { compileTheme } from '../src/assets.mjs';

export async function buildDemo() {
  const site = resolve(ROOT, '_site');
  await mkdir(site, { recursive: true });
  const { factions, notice } = await loadData();
  const { version } = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  const html = await readFile(resolve(ROOT, 'demo/index.html'), 'utf8');
  await writeFile(resolve(site, 'index.html'), html.replace('<!-- FAN_NOTICE -->', noticeHtml(notice)).replace(/(href|src)="([^"?]+\.(?:css|mjs))"/g, `$1="$2?v=${version}"`));
  await writeFile(resolve(site, 'factions.json'), JSON.stringify(factions));
  await writeFile(resolve(site, 'notice.json'), JSON.stringify(notice));
  await writeFile(resolve(site, 'theme.css'), await compileTheme({ inline: false }));
  await writeFile(resolve(site, 'theme-standalone.css'), await compileTheme());
  await cp(resolve(ROOT, 'assets/fonts'), resolve(site, 'fonts'), { recursive: true });
  await Promise.all([
    ['demo/demo.css', 'demo.css'], ['demo/demo.mjs', 'demo.mjs'],
    ['src/forge.mjs', 'forge.mjs'], ['src/study.mjs', 'study.mjs'],
    ['assets/servo-skull.png', 'servo-skull.png'], ['assets/tribunal.svg', 'tribunal.svg']
  ].map(async ([source, destination]) => {
    if (destination.endsWith('.mjs')) {
      const code = (await readFile(resolve(ROOT, source), 'utf8')).replaceAll('__BUILD_VERSION__', version).replace(/from '(\.\/[^'?]+\.mjs)'/g, `from '$1?v=${version}'`);
      await writeFile(resolve(site, destination), code);
    } else await copyFile(resolve(ROOT, source), resolve(site, destination));
  }));
  return site;
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) console.log(`Built ${await buildDemo()}`);

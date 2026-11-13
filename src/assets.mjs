import { readFile, readdir } from 'node:fs/promises';

const fonts = [
  ['GD Cathedral', 'UnifrakturCook-Bold.ttf', '700'],
  ['GD Scripture', 'UnifrakturMaguntia-Book.ttf', '400'],
  ['GD Corsair', 'PirataOne-Regular.ttf', '400'],
  ['GD Stencil', 'BlackOpsOne-Regular.ttf', '400'],
  ['GD Void', 'Orbitron[wght].ttf', '400 900'],
  ['GD Ruin', 'MetalMania-Regular.ttf', '400']
];
export async function compileTheme({ inline = true } = {}) {
  const rules = await Promise.all(fonts.map(async ([family, file, weight]) => {
    const source = inline ? `data:font/ttf;base64,${(await readFile(new URL(`../assets/fonts/${file}`, import.meta.url))).toString('base64')}` : `fonts/${encodeURIComponent(file)}`;
    return `@font-face{font-family:"${family}";src:url("${source}") format("truetype");font-weight:${weight};font-display:swap}`;
  }));
  const css = await readFile(new URL('../assets/base.css', import.meta.url), 'utf8');
  const extras = await readFile(new URL('../assets/parody.css', import.meta.url), 'utf8');
  async function asset(file, mime) {
    return inline ? `data:${mime};base64,${(await readFile(new URL(`../assets/${file}`, import.meta.url))).toString('base64')}` : file;
  }
  const licenseFiles = (await readdir(new URL('../assets/fonts/', import.meta.url))).filter((name) => name.endsWith('-OFL.txt'));
  const licenses = await Promise.all(licenseFiles.map((name) => readFile(new URL(`../assets/fonts/${name}`, import.meta.url), 'utf8')));
  return '/* Bundled font copyright and licence notices\n' + licenses.join('\n\n').replaceAll('*/', '* /') + '\n*/\n' + rules.join('\n') + '\n' + css + '\n' + extras
    .replaceAll('__GD_TRIBUNAL__', await asset('tribunal.svg', 'image/svg+xml'))
    .replaceAll('__GD_SKULL__', await asset('servo-skull.png', 'image/png'));
}

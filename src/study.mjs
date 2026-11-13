import { escapeHtml } from './forge.mjs';

// Original geometric studies, built from simple line primitives. Faction names
// describe the interpretation; these are not faction insignia or copied art.
export function studySvg(faction, design, notice) {
  const accent = design.palette.accent, muted = design.palette.muted;
  const n = 7 + [...design.seed].reduce((sum, char) => sum + char.codePointAt(0), 0) % 6;
  const paths = (count, render) => Array.from({ length: count }, (_, i) => render(i)).join('');
  const ring = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  let structure;
  if (design.ornament === 'blades') {
    structure = paths(n, (i) => `<path d="M${75 + i * 17} 492L${170 + i * 9} ${90 + i * 16}L${200 + i * 8} 405M${565 - i * 17} 492L${470 - i * 9} ${90 + i * 16}L${440 - i * 8} 405"/>`) + '<path d="M320 60l55 224-55 178-55-178zM320 170l16 109-16 55-16-55z"/>';
  } else if (design.ornament === 'ceramic') {
    structure = paths(n - 2, (i) => ring(320, 265, 30 + i * 20)) + paths(18, (i) => `<path d="M320 70v20" transform="rotate(${i * 20} 320 265)"/>`) + '<path d="M88 145h75v-40h95M552 385h-75v40h-95M120 170v190l70 70h80M520 360V170l-70-70h-80M280 240h80v50h-80zM288 250h64"/>';
  } else if (design.ornament === 'scrap') {
    structure = paths(n, (i) => { const x = 110 + (i % 3) * 135, y = 85 + Math.floor(i / 3) * 95; return `<g transform="rotate(${(i * n) % 15 - 7} ${x + 50} ${y + 40})"><path d="M${x} ${y}h110v75H${x}zM${x + 8} ${y + 8}h94v59H${x + 8}z"/>${ring(x + 13, y + 13, 3)}${ring(x + 97, y + 62, 3)}<path d="M${x + 30} ${y + 20}l45 35m-35-35 45 35"/></g>`; });
  } else if (design.ornament === 'monolith') {
    structure = paths(n, (i) => { const x = 120 + i * 13; return `<path d="M${x} 480V${160 - i * 5}l30-30h${580 - 2 * x}l30 30V480M${x} ${205 + i * 16}h${640 - 2 * x}"/>`; }) + '<path d="M290 120v280l30 35 30-35V120M305 178h30v183h-30z"/>';
  } else if (design.ornament === 'chitin' || design.ornament === 'wraithbone') {
    structure = paths(n, (i) => `<path d="M320 ${65 + i * 22}C${20 + i * 8} ${170 + i * 8} ${105 + i * 11} ${470 - i * 13} 320 492C${535 - i * 11} ${470 - i * 13} ${620 - i * 8} ${170 + i * 8} 320 ${65 + i * 22}Z"/>`) + '<path d="M320 165C230 265 285 330 320 391c35-61 90-126 0-226Z"/>';
  } else if (design.ornament === 'machine') {
    structure = paths(n - 2, (i) => ring(320, 270, 25 + i * 19)) + paths(24, (i) => `<path d="M313 85h14v25h-14z" transform="rotate(${i * 15} 320 270)"/>`) + paths(6, (i) => `<path d="M${100 + i * 14} 465V${180 + i * 13}h45M${540 - i * 14} 465V${180 + i * 13}h-45"/>`) + '<path d="M280 245h80v50h-80zM300 260h40M300 280h40"/>';
  } else {
    structure = paths(n, (i) => { const x = 80 + i * 18; return `<path d="M${x} 491V${190 - i * 7}Q${x} ${125 - i * 7} 320 ${40 + i * 7}Q${640 - x} ${125 - i * 7} ${640 - x} ${190 - i * 7}V491"/>`; }) + paths(5, (i) => ring(320, 255, 40 + i * 21)) + '<path d="M267 346v-92l53-66 53 66v92M285 349h70l15 39h-100zM292 388v26m56-26v26"/>';
    if (design.ornament === 'fractured') structure += '<path d="M320 45l-47 130 80 22-100 138 62 29-50 132M130 220l100 30-42 56M510 200l-120 80 35 65"/>';
  }
  const steps = paths(6, (i) => `<path d="M${245 - i * 23} ${436 + i * 13}h${150 + i * 46}"/>`);
  const lines = [notice.heading, notice.short, 'Warhammer 40,000 IP belongs to Games Workshop Limited. Free distribution only.'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 600" role="img" aria-label="Original geometric study for ${escapeHtml(faction.name)}"><title>${escapeHtml(faction.name)} · original geometric study</title><rect width="640" height="600" fill="${design.palette.background}"/><g fill="none" stroke="${accent}" stroke-width="1" opacity=".65">${structure}${steps}</g>${lines.map((line, i) => `<text x="320" y="${550 + i * 18}" fill="${muted}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${i ? 11 : 12}">${escapeHtml(line)}</text>`).join('')}</svg>`;
}

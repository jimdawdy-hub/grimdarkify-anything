import { escapeHtml } from './forge.mjs';

// Original geometric studies, built from simple line primitives. Faction names
// describe the interpretation; these are not faction insignia or copied art.
export function studySvg(faction, design, notice, { mascot } = {}) {
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
  const artwork = mascot && (faction.group === 'Imperium' || faction.group === 'Primarchs')
    ? `<image href="${escapeHtml(mascot)}" x="65" y="15" width="510" height="505"/>`
    : parodyCharacter(design);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 620" role="img" aria-label="Original excessive fan crest for ${escapeHtml(faction.name)}"><title>${escapeHtml(faction.name)} · unofficial fan-parody crest</title><defs><linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#fff0ae"/><stop offset=".3" stop-color="${accent}"/><stop offset=".6" stop-color="#6c462b"/><stop offset="1" stop-color="#e8c77d"/></linearGradient><linearGradient id="bone" x2=".6" y2="1"><stop stop-color="#fff3cb"/><stop offset=".6" stop-color="#c5ad83"/><stop offset="1" stop-color="#786348"/></linearGradient><radialGradient id="energy"><stop stop-color="${accent}"/><stop offset=".3" stop-color="${design.palette.secondary}"/><stop offset="1" stop-color="#050b12"/></radialGradient></defs><rect width="640" height="620" fill="${design.palette.background}"/><path d="M20 590V115L80 20h480l60 95v475Z" fill="${design.palette.surface}" stroke="url(#gold)" stroke-width="14"/><path d="M35 580V122L89 36h462l54 86v458Z" fill="${design.palette.background}" stroke="url(#gold)" stroke-width="3"/><g fill="none" stroke="${accent}" stroke-width="3" opacity=".3">${structure}${steps}</g>${artwork}<rect x="42" y="530" width="556" height="72" fill="#0b0e16" stroke="url(#gold)" stroke-width="3"/>${lines.map((line, i) => `<text x="320" y="${550 + i * 18}" fill="${muted}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${i ? 10 : 12}">${escapeHtml(line)}</text>`).join('')}</svg>`;
}

function parodyCharacter(design) {
  const a=design.palette.accent,s=design.palette.secondary;
  const bolts=Array.from({length:10},(_,i)=>`<circle cx="${125+i*43}" cy="106" r="5" fill="url(#gold)" stroke="#231b13" stroke-width="2"/>`).join('');
  if(design.ornament==='ceramic')return `<g stroke="${a}" stroke-width="4"><path d="M140 225l-70-25 30 80 70 30M500 225l70-25-30 80-70 30" fill="#e6dac2"/><ellipse cx="320" cy="270" rx="175" ry="130" fill="#d9d4c2"/><ellipse cx="320" cy="255" rx="142" ry="93" fill="#162d43"/><path d="M185 232h270v52H185z" fill="#09111c"/><circle cx="320" cy="257" r="65" fill="url(#energy)"/><circle cx="320" cy="257" r="25" fill="#d4ffff"/><path d="M220 365l-22 65h244l-22-65M265 430v45m110-45v45" fill="#b5b2a1"/><path d="M320 125V70m-32 0h64" fill="none"/>${bolts}</g>`;
  if(design.ornament==='scrap')return `<g stroke="#121708" stroke-width="5"><path d="M170 165l-50 75 40 170 65 70h190l65-70 40-170-50-75Z" fill="${a}"/><path d="M144 220l35-120h287l35 120-63-35-218 18Z" fill="#683328" stroke="url(#gold)" stroke-width="9"/><path d="M190 250l100 24-20 55-70-22Zm260 0-100 24 20 55 70-22Z" fill="#0c1308"/><circle cx="243" cy="282" r="12" fill="#ff4c29"/><circle cx="397" cy="282" r="12" fill="#ff4c29"/><path d="M195 360h250l-40 80H235Z" fill="#251609"/><path d="M208 359l22 39 20-39 22 39 20-39 24 39 20-39 22 39 20-39 22 39 28-39" fill="#fff2c3"/><path d="M180 370l-20-65 45 34m255 31 20-65-45 34" fill="#ffebb1"/>${bolts}</g>`;
  const headFill=design.ornament==='chitin'?s:design.ornament==='blades'?'#193b34':'url(#bone)';
  return `<g stroke="#211b16" stroke-width="4"><path d="M135 245L60 190l50 140 65 30m330-115 75-55-50 140-65 30" fill="url(#gold)" stroke="${a}"/><path d="M180 164Q320 64 460 164l14 145-56 42-14 85H236l-14-85-56-42Z" fill="${headFill}" stroke="url(#gold)" stroke-width="9"/><path d="M168 208l18-97 135-49 135 49 19 97-155-40Z" fill="${design.palette.surface}" stroke="url(#gold)" stroke-width="11"/><path d="M300 80v83h42V80" fill="#862736" stroke="url(#gold)"/><path d="M190 250q43-56 105 9l-14 53-78-12Zm260 0q-43-56-105 9l14 53 78-12Z" fill="#04090e"/><circle cx="247" cy="269" r="32" fill="url(#energy)" stroke="url(#gold)" stroke-width="9"/><circle cx="393" cy="269" r="32" fill="url(#energy)" stroke="url(#gold)" stroke-width="9"/><path d="M320 298l-25 49h50Z" fill="#20160f"/><path d="M246 370h148v42H246z" fill="#1a110d"/><path d="M258 372v35m24-35v35m25-35v35m25-35v35m25-35v35m25-35v35" stroke="#f1dfad" stroke-width="13"/><path d="M210 335Q125 420 200 466h94m136-131q85 85 10 131h-94" fill="none" stroke="url(#gold)" stroke-width="14"/><path d="M260 440v30h120v-30" fill="${s}" stroke="url(#gold)" stroke-width="6"/>${bolts}</g>`;
}

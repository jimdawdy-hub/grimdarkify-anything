import { forge, buildBrief, noticeText } from './forge.mjs';
import { studySvg } from './study.mjs';

const $ = (selector) => document.querySelector(selector);
const [factions, notice] = await Promise.all(['factions.json', 'notice.json'].map(async (file) => {
  const response = await fetch(file); if (!response.ok) throw new Error(`Could not load ${file}`); return response.json();
}));
let faction = factions.find((entry) => entry.id === 'imperial-agents') ?? factions[0];
let design, strikes = 0;
const groups = [...new Set(factions.map((entry) => entry.group))];
function fillOptions(query = '') {
  const matching = factions.filter((entry) => `${entry.name} ${entry.primarch ?? ''} ${entry.legion ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  $('#faction').replaceChildren();
  if (!matching.length) {
    const option = new Option('No matching faction', ''); option.disabled = true; $('#faction').add(option); return;
  }
  for (const group of groups) {
    const entries = matching.filter((entry) => entry.group === group); if (!entries.length) continue;
    const optgroup = document.createElement('optgroup'); optgroup.label = group;
    entries.forEach((entry) => { const option = new Option(entry.name, entry.id); option.selected = entry.id === faction.id; optgroup.append(option); });
    $('#faction').append(optgroup);
  }
}
function artSvg() { return studySvg(faction, design, notice); }

function reforge() {
  design = forge(faction); strikes++;
  for (const [key, value] of Object.entries(design.tokens)) document.documentElement.style.setProperty(key, value);
  document.documentElement.dataset.grimdark = faction.id;
  document.documentElement.dataset.gdFrame = design.frame;
  document.documentElement.dataset.gdOrnament = design.ornament;
  document.documentElement.dataset.gdTexture = design.texture;
  document.documentElement.dataset.gdLayout = design.layout;
  $('#faction-description').textContent = faction.summary;
  $('#palette').replaceChildren(...['background', 'surface', 'accent', 'secondary', 'text'].map((key) => {
    const swatch = document.createElement('span'); swatch.style.backgroundColor = design.palette[key]; swatch.title = `${key}: ${design.palette[key]}`; swatch.setAttribute('role', 'img'); swatch.setAttribute('aria-label', swatch.title); return swatch;
  }));
  $('#frame-value').textContent = design.frame;
  $('#texture-value').textContent = design.texture;
  $('#layout-value').textContent = design.layout;
  $('#specimen-faction').textContent = faction.name;
  $('#variation-status').textContent = `VARIATION ${String(strikes).padStart(3, '0')} / ${faction.name.toUpperCase()}`;
  $('#seed-value').textContent = `SEED ${design.seed.slice(0, 12)}`;
  $('#reliquary').innerHTML = artSvg();
  $('#art-direction').textContent = design.frame.toUpperCase() + ' / ' + design.texture.toUpperCase();
  window.grimdarkify = { design, faction, factions, strikes };
}
fillOptions(); reforge();
$('#faction-count').textContent = factions.length;
$('#faction-search').addEventListener('input', (event) => fillOptions(event.target.value));
$('#faction').addEventListener('change', (event) => { const selected = factions.find((entry) => entry.id === event.target.value); if (selected) { faction = selected; reforge(); } });
$('#reforge').addEventListener('click', reforge);
for (const id of ['before', 'after']) $(`#${id}`).addEventListener('click', () => {
  $('#specimen').toggleAttribute('data-before', id === 'before');
  $('#before').setAttribute('aria-pressed', String(id === 'before'));
  $('#after').setAttribute('aria-pressed', String(id === 'after'));
});
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
  $('#app-title').textContent = { Overview: 'Command overview', Projects: 'Active projects', Activity: 'Campaign activity' }[button.dataset.view];
  $('#app-kicker').textContent = { Overview: 'YOUR WORK, IN ORDER', Projects: 'PROJECT PORTFOLIO', Activity: 'RECENT OPERATIONS' }[button.dataset.view];
}));
function updateTasks() {
  $('#completed-count').textContent = 24 + document.querySelectorAll('.task input:checked').length;
  $('.mission-heading>span').textContent = `${document.querySelectorAll('.task').length} ASSIGNED`;
}
$('.mission-panel').addEventListener('change', updateTasks);
$('#new-task').addEventListener('click', () => { $('#task-form').hidden = false; $('#task-name').focus(); });
$('#task-form').addEventListener('submit', (event) => {
  event.preventDefault(); const name = $('#task-name').value.trim(); if (!name) return;
  const label = document.createElement('label'); label.className = 'task';
  const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
  const text = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small');
  strong.textContent = name; small.textContent = 'Your workspace · New directive'; text.append(strong, small); label.append(checkbox, text);
  $('#task-form').before(label); $('#task-name').value = ''; $('#task-form').hidden = true; updateTasks();
});
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a');
  a.href = url; a.download = `${faction.id}-${design.seed.slice(0, 8)}-${name}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export-css').addEventListener('click', async () => {
  const baseCss = await fetch('theme.css').then((response) => response.text());
  const variables = Object.entries(design.tokens).map(([key, value]) => `  ${key}: ${value};`).join('\n');
  download('theme.css', `/* ${noticeText(notice).replaceAll('\n', ' ')} */\n[data-grimdark] {\n${variables}\n}\n${baseCss}`, 'text/css');
});
$('#export-tokens').addEventListener('click', () => download('tokens.json', JSON.stringify({ ...design, notice }, null, 2), 'application/json'));
$('#export-brief').addEventListener('click', () => download('brief.md', buildBrief(faction, design, notice), 'text/markdown'));
$('#export-svg').addEventListener('click', () => download('study.svg', artSvg(), 'image/svg+xml'));
$('#copy-command').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText('git clone https://github.com/jimdawdy-hub/grimdarkify-anything.git\ncd grimdarkify-anything\nnode bin/grimdarkify.mjs kit --faction drukhari --out ./my-kit'); $('#copy-command').textContent = 'Copied'; }
  catch { $('#copy-command').textContent = 'Select the commands to copy'; }
});

import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execute, cleanEnv } from './process.mjs';

export class Browser {
  constructor(signal, domains) { this.session = `grimdarkify-${randomUUID().slice(0, 12)}`; this.signal = signal; this.domains = domains; }
  async command(...args) {
    const { output } = await execute('agent-browser', [...(this.domains ? ['--allowed-domains', this.domains.join(',')] : []), ...args, '--json'], {
      signal: this.signal, timeout: 45_000, env: cleanEnv({ AGENT_BROWSER_SESSION: this.session, AGENT_BROWSER_DEFAULT_TIMEOUT: '15000' })
    });
    const value = JSON.parse(output);
    if (!value.success) throw new Error(value.error ?? 'Browser command failed');
    return value.data;
  }
  async eval(script) { return (await this.command('eval', script)).result; }
  async open(url, width = 1440) {
    await this.command('set', 'viewport', String(width), '1000');
    await this.command('open', url);
    await this.eval('document.fonts.ready.then(() => true)');
  }
  async close() {
    await execute('agent-browser', ['close', '--json'], { timeout: 10_000, env: cleanEnv({ AGENT_BROWSER_SESSION: this.session }) }).catch(() => {});
  }
}

function pageInventory() {
  const visible = (e) => Boolean(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  const text = (e) => (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240);
  const all = (selector) => [...document.querySelectorAll(selector)];
  return {
    title: document.title, url: location.href, text: document.body.innerText.slice(0, 16_000),
    headings: all('h1,h2,h3').filter(visible).map((e) => ({ level: e.tagName, text: text(e) })).slice(0, 60),
    controls: all('input,textarea,select,button').filter(visible).map((e) => ({
      tag: e.tagName.toLowerCase(), type: e.getAttribute('type') || '', id: e.id, name: e.getAttribute('name') || '',
      label: e.getAttribute('aria-label') || e.labels?.[0]?.innerText || text(e), placeholder: e.getAttribute('placeholder') || ''
    })).slice(0, 80),
    links: all('a[href]').filter(visible).map((e) => ({ text: text(e), href: e.getAttribute('href') })).filter((e) => e.text).slice(0, 60),
    forms: all('form').map((e) => ({ id: e.id, action: e.getAttribute('action'), method: e.method })),
    images: all('img').map((e) => ({ src: e.currentSrc.slice(0, 300), alt: e.alt, width: e.width, height: e.height })).slice(0, 30)
  };
}

async function stamp(browser, notice) {
  await browser.eval(`(() => {
    document.getElementById('gd-capture-notice')?.remove();
    const note = document.createElement('div'); note.id = 'gd-capture-notice';
    note.textContent = ${JSON.stringify(notice.heading + ' · ' + notice.short)};
    note.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:8px;background:#141419;color:#fff;font:11px/1.5 sans-serif;z-index:2147483647;text-align:center';
    document.body.append(note);
  })()`);
}

export async function captureInput(url, evidence, notice, signal) {
  const browser = new Browser(signal);
  try {
    await browser.open(url);
    const inventory = await browser.eval(`(${pageInventory.toString()})()`);
    const html = await browser.eval('document.documentElement.outerHTML');
    if (html.length > 5 * 1024 * 1024) throw new Error('Rendered page exceeds the 5 MiB capture limit.');
    await writeFile(join(evidence, 'original.html'), html);
    await writeFile(join(evidence, 'inventory.json'), JSON.stringify(inventory, null, 2));
    const images = [];
    for (const width of [1440, 390]) {
      await browser.command('set', 'viewport', String(width), '1000');
      await stamp(browser, notice);
      const path = join(evidence, `before-${width}.png`);
      await browser.command('screenshot', path); images.push(path);
    }
    return { inventory, images };
  } finally { await browser.close(); }
}

function pageHealth() {
  const main = document.querySelector('h1,h2,[role=heading]');
  const notice = [...document.querySelectorAll('footer,[data-gd-notice]')].find((e) => /UNOFFICIAL/i.test(e.textContent) && /Games Workshop/.test(e.textContent));
  const styles = main && getComputedStyle(main);
  const family = styles?.fontFamily.split(',')[0].trim().replace(/["']/g, '');
  const face = family && [...document.fonts].find((f) => f.family.replace(/["']/g, '') === family && f.status === 'loaded');
  return {
    title: document.title, notice: Boolean(notice && notice.getClientRects().length && getComputedStyle(notice).visibility !== 'hidden' && getComputedStyle(notice).display !== 'none'),
    overflow: document.documentElement.scrollWidth > innerWidth + 2,
    heading: main?.textContent?.slice(0, 200), font: family, bundledFontLoaded: Boolean(face), headingSize: parseFloat(styles?.fontSize || '0'),
    brokenImages: [...document.images].filter((e) => e.getClientRects().length && (!e.complete || !e.naturalWidth)).map((e) => e.getAttribute('src')?.slice(0, 200)),
    artwork: [...document.querySelectorAll('[data-gd-art],img,svg')].some((e) => {
      const box = e.getBoundingClientRect(); return box.width >= 100 && box.height >= 100 && box.top < innerHeight && box.bottom > 0;
    }),
    bodyTextLength: document.body.innerText.length
  };
}

export async function verifyInBrowser(url, { evidence, notice, signal, inventory, build, attempt }) {
  const browser = new Browser(signal, ['127.0.0.1', 'localhost']);
  const failures = [], viewports = [], interactions = [], images = [];
  try {
    for (const width of [1440, 390]) {
      await browser.open(url, width);
      await browser.eval('Promise.all([...document.images].map(e => e.decode().catch(() => {}))).then(() => true)');
      const health = await browser.eval(`(${pageHealth.toString()})()`);
      viewports.push({ width, ...health });
      if (!health.notice) failures.push(`${width}px: missing visible full fan notice in footer or [data-gd-notice]`);
      if (health.overflow) failures.push(`${width}px: horizontal page overflow`);
      if (!health.bundledFontLoaded) failures.push(`${width}px: heading does not use a loaded bundled display font`);
      if (!health.artwork) failures.push(`${width}px: no substantial visible character or illustration in the first viewport`);
      if (health.brokenImages.length) failures.push(`${width}px: ${health.brokenImages.length} broken images`);
      if (health.bodyTextLength < 120) failures.push(`${width}px: page content is missing`);
      await stamp(browser, notice);
      const image = join(evidence, `after-${attempt}-${width}.png`);
      await browser.command('screenshot', image); images.push(image);
      await browser.eval("document.getElementById('gd-capture-notice')?.remove()");
    }
    await browser.open(url);
    const after = await browser.eval(`(${pageInventory.toString()})()`);
    const anchors = inventory?.controls.filter((e) => e.id || e.name) ?? [];
    for (const original of anchors) {
      const present = after.controls.some((e) => e.tag === original.tag && (original.id ? e.id === original.id : e.name === original.name));
      if (!present) failures.push(`Original ${original.tag} control ${original.id || original.name} is missing or hidden`);
    }
    for (const link of inventory?.links ?? []) {
      if (!link.href || /^(javascript:|data:)/i.test(link.href)) continue;
      if (!after.links.some((e) => e.href === link.href)) failures.push(`Original navigation destination is missing: ${link.href}`);
    }
    if ((inventory?.controls.length ?? 0) > 0 && !build.interactions.length) failures.push('No interaction checks were supplied for this interactive target');
    for (const test of build.interactions.slice(0, 8)) {
      let passed = false, error;
      try {
        if (!test.steps.length || !test.assertion.textIncludes.trim()) throw new Error('Interaction check needs real actions and a nonempty expected result');
        await browser.open(url);
        for (const step of test.steps.slice(0, 12)) {
          // Test only the local reconstruction. Do not follow remote navigation
          // or submit live forms on a captured third-party website.
          const current = (await browser.command('get', 'url')).url;
          if (new URL(current).origin !== new URL(url).origin) throw new Error('Interaction left the local preview');
          await browser.eval(`document.querySelector(${JSON.stringify(step.selector)})?.scrollIntoView({behavior:'instant',block:'center'})`);
          if (step.action === 'press') { await browser.command('focus', step.selector); await browser.command('press', step.value); }
          else await browser.command(step.action, step.selector, ...(['fill', 'select'].includes(step.action) ? [step.value] : []));
        }
        const finalUrl = (await browser.command('get', 'url')).url;
        if (new URL(finalUrl).origin !== new URL(url).origin) throw new Error('Interaction left the local preview');
        await browser.command('wait', '--fn', `(() => { const e = document.querySelector(${JSON.stringify(test.assertion.selector)}); return !!e && !!e.getClientRects().length && e.textContent.includes(${JSON.stringify(test.assertion.textIncludes)}); })()`);
        passed = true;
      } catch (e) { error = e.message; failures.push(`Interaction "${test.name}": ${error}`); }
      interactions.push({ name: test.name, passed, ...(error ? { error } : {}) });
    }
    const errors = (await browser.command('errors')).errors;
    if (errors.length) failures.push(`${errors.length} browser JavaScript errors: ${JSON.stringify(errors).slice(0, 1500)}`);
    return { passed: failures.length === 0, failures, viewports, interactions, errors, images, preservation: { controlsChecked: anchors.length, navigationDestinationsChecked: inventory?.links.length ?? 0 }, scope: 'Entry page at 1440px and 390px, visible control identifiers, navigation destinations, and the listed local interaction checks. Backend behavior and other routes are not inferred.' };
  } finally { await browser.close(); }
}

const { chromium, expect } = require('../frontend/node_modules/@playwright/test');
const { randomUUID } = require('node:crypto');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ baseURL: process.env.DESIGN_BASE_URL || 'http://127.0.0.1:3000', viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  const errors = [], violations = [], overflow = [];
  let accessibilityChecks = 0, layoutChecks = 0;
  const output = path.resolve(__dirname, '../docs/screenshots');
  const minimalFinal = process.env.DESIGN_CHECK_MODE === 'minimal-final';
  mkdirSync(output, { recursive: true });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true });
  async function theme(mode) {
    if (await toggle.getAttribute('aria-checked') !== String(mode === 'dark')) await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  }
  async function audit(route, mode, width) {
    await page.addScriptTag({ path: path.resolve(__dirname, '../frontend/node_modules/axe-core/axe.min.js') });
    const found = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
    accessibilityChecks++;
    if (found.length) {
      violations.push({ mode, route, width, violations: found });
      console.log(JSON.stringify({mode,route,width,issues:found.map(v=>v.id)}));
    }
  }
  try {
    for (const mode of ['light', 'dark']) for (const route of ['/login', '/signup']) {
      await page.goto(route);
      await expect(toggle).toBeVisible();
      await theme(mode);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 960 });
        await audit(route, mode, width);
        if (route === '/login') await page.screenshot({ path: path.join(output, `whistle-login-${mode}-${width}.png`) });
      }
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/signup');
    await page.screenshot({ path: path.join(output, 'theme-signup-dark.png') });
    await page.getByLabel('Full name', { exact: true }).fill('Theme Reviewer');
    await page.getByLabel('Email address', { exact: true }).fill(`theme-${randomUUID()}@example.invalid`);
    await page.getByLabel('Password', { exact: true }).fill(randomUUID() + 'Aa1!');
    await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Start with one company.', exact: true })).toBeVisible();
    for (const mode of ['light', 'dark']) {
      await theme(mode);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 960 });
        for (const route of minimalFinal ? [] : ['/', '/pipeline', '/portfolio']) {
          await page.goto(route);
          await expect(page.locator(route === '/pipeline' ? '.pipeline-first-company' : '.welcome-desk')).toBeVisible();
          const measure = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
          layoutChecks++;
          if (measure.scroll > measure.width) overflow.push({ mode, route: `${route}#empty`, ...measure });
          await audit(`${route}#empty`, mode, width);
          if (route === '/') await page.screenshot({ path: path.join(output, `whistle-welcome-${mode}-${width}.png`) });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open demonstration scenario', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your research desk' })).toBeVisible();
    const routes = minimalFinal ? ['/', '/pipeline'] : ['/', '/discover', '/pipeline', '/portfolio', '/library?section=Investment%20thesis', '/companies/atlasops', '/companies/atlasops?tab=Evidence', '/companies/atlasops?tab=Diligence', '/companies/atlasops?tab=Model', '/companies/atlasops?tab=Memo'];
    for (const mode of ['light', 'dark']) {
      await theme(mode);
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 960 });
        for (const route of routes) {
          await page.goto(route);
          await expect(page.locator('#workspace-main .page-content')).toBeVisible();
          await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
          const measure = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
          layoutChecks++;
          if (measure.scroll > measure.width) overflow.push({ mode, route, ...measure });
          if (width === 1440 || width === 390) await audit(route, mode, width);
          if ((route === '/' || route === '/library?section=Investment%20thesis') && (width === 1440 || width === 390)) {
            await page.screenshot({ path: path.join(output, `whistle-${route === '/' ? 'today' : 'library'}-${mode}-${width}.png`) });
          }
          if (route === '/pipeline' && (width === 1440 || width === 390)) {
            await page.screenshot({ path: path.join(output, `whistle-pipeline-${mode}-${width}.png`) });
            await page.getByRole('button', { name: 'Board', exact: true }).click();
            await audit('/pipeline#board', mode, width);
            const boardOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
            layoutChecks++;
            if (boardOverflow) overflow.push({ mode, route: '/pipeline#board', width });
            await page.screenshot({ path: path.join(output, `whistle-board-${mode}-${width}.png`) });
            await page.getByRole('button', { name: 'Companies', exact: true }).click();
          }
          if (mode === 'dark' && ['/','/discover','/companies/atlasops','/library?section=Investment%20thesis','/pipeline'].includes(route) && (width === 1440 || route === '/')) {
            const name = route === '/' ? 'today' : route.includes('companies') ? 'company' : route.split('?')[0].slice(1);
            await page.screenshot({ path: path.join(output, `theme-${name}-dark-${width}.png`) });
          }
        }
      }
      await page.goto('/companies/atlasops');
      await expect(page.getByRole('heading', { name: /^AtlasOps/ })).toBeVisible();
      await page.keyboard.press('e');
      await expect(page.getByRole('dialog')).toBeVisible();
      await audit('/companies/atlasops#sources', mode, 390);
      await page.keyboard.press('Escape');
      await page.locator('summary[aria-label="Account options"]').click();
      await audit('/#account-menu', mode, 390);
      await page.keyboard.press('Escape');
      console.log(`${mode}: page, layout and dialog checks completed.`);
    }
    mkdirSync(path.resolve(__dirname, '../scratch'), { recursive: true });
    writeFileSync(path.resolve(__dirname, '../scratch/theme-accessibility.json'), JSON.stringify(violations, null, 2));
    console.log(JSON.stringify({ layoutChecks, accessibilityChecks, overflow, errors, violations }, null, 2));
    expect(overflow).toEqual([]);
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
  } finally {
    mkdirSync(path.resolve(__dirname, '../scratch'), { recursive: true });
    writeFileSync(path.resolve(__dirname, '../scratch/theme-accessibility.json'), JSON.stringify(violations, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exit(1); });

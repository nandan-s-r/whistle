const { chromium, expect } = require('../frontend/node_modules/@playwright/test');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ baseURL: 'http://127.0.0.1:3000', reducedMotion: 'reduce' });
  const output = path.resolve(__dirname, '../docs/screenshots');
  mkdirSync(output, { recursive: true });
  const errors = []; let aligned = 0, accessibilityChecks = 0;
  page.on('pageerror', error => errors.push(error.message));
  async function theme(mode) {
    const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true });
    if (await toggle.getAttribute('aria-checked') !== String(mode === 'dark')) await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
  }
  async function checkBrand() {
    const brand = page.locator('.scope-brand');
    await expect(brand).toBeVisible();
    const image = brand.locator('.whistle-mark');
    await expect(image).toHaveAttribute('src', '/brand/whistle-logo.png');
    await expect(image).toHaveAttribute('alt', '');
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    const geometry = await brand.evaluate(el => {
      const frame = el.querySelector('.brand-symbol').getBoundingClientRect();
      const img = el.querySelector('.whistle-mark'); const artwork = img.getBoundingClientRect();
      const word = el.querySelector('.brand-wordmark'); const text = word.getBoundingClientRect();
      const paint = getComputedStyle(img); const darkChrome = Boolean(el.closest('.auth-story, .research-sidebar')) || document.documentElement.dataset.theme === 'dark';
      if (darkChrome && (paint.filter !== 'grayscale(1) invert(1) contrast(6)' || getComputedStyle(el.closest('.auth-story') ? el : el.querySelector('.brand-symbol')).mixBlendMode !== 'screen')) throw Error('White logo treatment is missing');
      if (!darkChrome && paint.filter !== 'none') throw Error('Light public logo must remain readable');
      return { frame: [frame.width, frame.height], artwork: [artwork.width, artwork.height], square: img.naturalWidth === img.naturalHeight, fit: getComputedStyle(img).objectFit,
        centered: Math.abs(artwork.x + artwork.width / 2 + 3 - frame.x - frame.width / 2) < 1 && Math.abs(artwork.y + artwork.height / 2 - frame.y - frame.height / 2) < 1,
        textAligned: !text.width || Math.abs(text.y + text.height / 2 - frame.y - frame.height / 2) < 2,
        separated: !text.width || text.x >= frame.right + 8 };
    });
    expect(geometry).toEqual({ frame: [48, 48], artwork: [60, 60], square: true, fit: 'contain', centered: true, textAligned: true, separated: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    aligned++;
  }
  async function audit() {
    await page.addScriptTag({ path: path.resolve(__dirname, '../frontend/node_modules/axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => ({target:n.target, summary:n.failureSummary})) })));
    if (violations.length) console.log(JSON.stringify({route:page.url(),width:page.viewportSize().width,mode:await page.locator('html').getAttribute('data-theme'),violations}));
    expect(violations).toEqual([]); accessibilityChecks++;
  }
  try {
    const original = readFileSync(path.resolve(__dirname, '../frontend/public/brand/whistle-logo.png'));
    const response = await page.request.get('/brand/whistle-logo.png');
    expect(response.status()).toBe(200);
    expect(createHash('sha256').update(await response.body()).digest('hex')).toBe(createHash('sha256').update(original).digest('hex'));
    for (const mode of ['light', 'dark']) for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const route of ['/login', '/signup', '/about']) {
        await page.goto(route); await theme(mode); await checkBrand(); await audit();
        if (route === '/login' && [1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `whistle-supplied-logo-login-${mode}-${width}.png`) });
        if (route === '/login' && width === 1440) await page.locator('.scope-brand').screenshot({ path: path.join(output, `whistle-supplied-logo-lockup-${mode}.png`) });
      }
    }
    await page.goto('/signup');
    await page.getByLabel('Full name', { exact: true }).fill('Logo Reviewer');
    await page.getByLabel('Email address', { exact: true }).fill(`logo-${randomUUID()}@example.invalid`);
    await page.getByLabel('Password', { exact: true }).fill(randomUUID() + 'Aa1!');
    const signedUp = page.waitForResponse(r => r.url().endsWith('/api/auth/signup') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
    expect((await signedUp).ok()).toBe(true);
    await page.goto('/pipeline');
    for (const mode of ['light', 'dark']) for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 960 }); await theme(mode);
      if (width >= 768) await checkBrand(); else await expect(page.locator('.scope-brand')).not.toBeVisible();
      await audit();
      await page.screenshot({ path: path.join(output, `whistle-supplied-logo-sidebar-${mode}-${width}.png`) });
    }
    for (const asset of ['/icon.svg', '/favicon.ico', '/apple-icon.png']) expect((await page.request.get(asset)).status()).toBe(200);
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ aligned, accessibilityChecks, errors, originalArtworkServed: true }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

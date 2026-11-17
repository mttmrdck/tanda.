import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSettings, seedSignals, startDemo } from './helpers';

const ROUTES = ['/', '/teach', '/signals', '/timeline', '/handover', '/settings', '/about'];

async function seeded(page: import('@playwright/test').Page) {
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable', 'coverEars'], true);
}

for (const lang of ['en', 'ms'] as const) {
  for (const theme of ['light', 'dim'] as const) {
    test(`axe: every page (${lang}, ${theme})`, async ({ page, guard }) => {
      void guard;
      test.setTimeout(120_000);
      await seeded(page);
      await page.evaluate(([l, th]) => localStorage.setItem('isyarat.settings.v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('isyarat.settings.v1') ?? '{}'), lang: l, theme: th })), [lang, theme] as const);
      for (const r of ROUTES) {
        await page.goto(`/#${r}`);
        await page.reload();
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        await expectAccessible(page, `${r} ${lang} ${theme}`);
      }
      // dialogs and the More sheet
      await page.goto('/#/');
      await page.locator('header button').filter({ hasText: lang === 'en' ? 'On this device only' : 'Pada peranti ini sahaja' }).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('dialog').evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
      await expectAccessible(page, `privacy dialog ${lang} ${theme}`);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  }
}

test('full click-through: live recognition, teach, every page — no external requests, no console problems, no long tasks', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await seeded(page);
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ type: 'longtask', buffered: false });
  });
  await startDemo(page);
  await page.waitForTimeout(2500);
  for (const g of ['Wave', 'Tap the table', 'Rock']) {
    await page.getByRole('button', { name: g, exact: true }).click();
    await page.waitForTimeout(3500);
  }
  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  expect(long.filter((d) => d > 100), 'long tasks > 100 ms during live demo').toEqual([]);
  for (const r of ROUTES) {
    await page.goto(`/#${r}`);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  await page.getByRole('button', { name: /Theme:/ }).click();
  await page.getByRole('button', { name: /Switch language/ }).click();
  for (const r of ROUTES) {
    await page.goto(`/#${r}`);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
});

test('camera tracks stop when leaving camera pages', async ({ page, guard }) => {
  void guard;
  test.setTimeout(150_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  const tracks = () => page.evaluate(() => (window as unknown as { __isyaratDebug: { liveTracks: () => number } }).__isyaratDebug.liveTracks());
  // MediaPipe's WASM compile competes with other parallel workers for CPU; allow time to reach 'running'.
  await expect.poll(tracks, { timeout: 100_000 }).toBeGreaterThan(0);
  await page.getByRole('link', { name: 'Signals' }).first().click();
  await expect.poll(tracks).toBe(0);
  const state = await page.evaluate(() => (window as unknown as { __isyaratDebug: { state: () => { phase: string } } }).__isyaratDebug.state().phase);
  expect(state).toBe('idle');
});

test('reflow: no horizontal scrolling at 320 px (≈ 400% zoom of 1280) on every page', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await seeded(page);
  await page.setViewportSize({ width: 320, height: 640 });
  for (const r of ROUTES) {
    await page.goto(`/#${r}`);
    await page.reload();
    await expect(page.locator('main h1').first()).toBeVisible();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, `horizontal overflow on ${r}`).toBeLessThanOrEqual(0);
  }
});

test('reduced motion: transforms disabled, app fully usable', async ({ page, guard }) => {
  void guard;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seeded(page);
  await page.goto('/#/signals');
  const anim = await page.evaluate(() => {
    const btn = document.querySelector('main button');
    return btn ? getComputedStyle(btn).transitionProperty : '';
  });
  expect(anim).not.toContain('transform'); // movement removed; only fades remain
  await page.getByRole('button', { name: /Play how “Hello” looks/ }).click();
  await expect(page.getByRole('img', { name: 'Stick-figure replay of “Hello”' })).toBeVisible();
});

test('keyboard only: complete onboarding without a pointer', async ({ page, guard }) => {
  void guard;
  await seedSettings(page, { lang: 'en' });
  await page.goto('/');
  await expect(page).toHaveURL(/#\/onboarding/);
  // skip link is first
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.getByRole('button', { name: 'Get started' }).focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox').nth(i)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox').nth(i)).toBeChecked();
  }
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  await page.keyboard.press('Tab'); // privacy link
  await page.keyboard.press('Tab'); // back
  await page.keyboard.press('Tab'); // continue
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Child’s nickname')).toBeFocused();
  await page.keyboard.type('Mei');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'All set for Mei' })).toBeVisible();
});

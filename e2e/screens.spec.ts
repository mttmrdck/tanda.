/**
 * Visual review helper (not part of the normal run): SCREENS=1 npx playwright test e2e/screens.spec.ts
 * Writes PNGs to e2e/__screens__/ (gitignored).
 */
import { test } from '@playwright/test';
import { onboard, seedSettings } from './helpers';

const ROUTES = (process.env.SCREEN_ROUTES ?? '/').split(',');
const WIDTHS = (process.env.SCREEN_WIDTHS ?? '390,768,1280').split(',').map(Number);
const COMBOS = (process.env.SCREEN_COMBOS ?? 'en-light').split(',');

test.skip(!process.env.SCREENS, 'visual review only');

for (const combo of COMBOS) {
  const [lang, theme] = combo.split('-') as ['en' | 'ms', 'light' | 'dim'];
  test(`screens ${combo}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    if (process.env.SCREEN_ONBOARDING) {
      await seedSettings(page, { lang, theme });
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto('/');
        await page.waitForTimeout(300);
        await page.screenshot({ path: `e2e/__screens__/onboarding-${combo}-${w}.png`, fullPage: true });
      }
      return;
    }
    await onboard(page);
    await page.getByRole('button', { name: 'Try the demo first' }).click();
    await page.evaluate((s) => localStorage.setItem('isyarat.settings.v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('isyarat.settings.v1') ?? '{}'), ...s })), { lang, theme });
    if (process.env.SCREEN_SETUP) await page.evaluate(process.env.SCREEN_SETUP);
    for (const r of ROUTES) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(`/#${r}`);
        await page.reload();
        await page.waitForTimeout(Number(process.env.SCREEN_WAIT ?? 800));
        const name = r.replace(/\//g, '_') || '_';
        await page.screenshot({ path: `e2e/__screens__/${name}-${combo}-${w}.png`, fullPage: true });
      }
    }
  });
}

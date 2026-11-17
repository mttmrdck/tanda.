import { test } from '@playwright/test';
import { onboard, seedSignals, startDemo } from './helpers';
test.skip(!process.env.SCREENS, 'visual review only');
for (const [w, theme] of [[1280, 'light'], [390, 'dim']] as const) {
  test(`live ${w}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme === 'dim' ? 'dark' : 'light' });
    await page.setViewportSize({ width: w, height: 900 });
    await onboard(page);
    await page.getByRole('button', { name: 'Use camera' }).click();
    await seedSignals(page, ['wave', 'tapTable'], true);
    await startDemo(page);
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Wave', exact: true }).click();
    await page.getByTestId('saying-name').waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `e2e/__screens__/live-rec-${w}.png`, fullPage: true });
  });
}

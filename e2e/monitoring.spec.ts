import { test, expect } from './fixtures';
import { onboard, expectAccessible } from './helpers';

test('hybrid demonstration: consent, baseline, temporal event, review persistence, disconnection and category isolation', async ({
  page,
  guard,
}) => {
  void guard;
  test.setTimeout(120000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera', exact: true }).click();
  await page.goto('/#/overview');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(page.getByText('No observations yet')).toBeVisible();
  await expectAccessible(page, 'monitoring overview');
  await page.goto('/#/devices');
  await expect(page.getByRole('heading', { level: 1, name: 'Devices & Cameras' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Individual category', exact: true }).click();
  await page.getByRole('option', { name: 'Older adult', exact: true }).click();
  await expect(page.getByRole('switch',{name:'Enable experimental movement comparison',exact:true})).not.toBeChecked();
  await page.getByLabel('Room or environment name').fill('Living room');
  await page
    .getByRole('switch', { name: 'I am authorised to configure monitoring for this individual', exact: true })
    .check();
  await page
    .getByRole('switch', { name: 'I have appropriate consent for visible video observation', exact: true })
    .check();
  await page.getByRole('switch', { name: 'Enable experimental movement comparison', exact: true }).check();
  await page.getByRole('switch', { name: 'I reviewed this context for baseline collection', exact: true }).check();
  await page.getByRole('button', { name: 'Save monitoring configuration', exact: true }).click();
  await page.goto('/#/monitoring');
  await page.getByRole('button', { name: 'Start simulated camera', exact: true }).click();
  await page.getByRole('button', { name: 'Collect reviewed demo baseline', exact: true }).click();
  await expect(page.getByTestId('monitor-baseline')).toHaveText('Baseline available · experimental');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Simulate sustained unusual activity', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate sustained unusual activity', exact: true }).click();
  await page.goto('/#/events');
  const event = page
    .getByTestId('monitor-event')
    .filter({ has: page.getByRole('heading', { name: 'Unusual activity pattern', exact: true }) });
  await expect(event).toHaveCount(1);
  await expect(event.getByText('Simulated event', { exact: true })).toBeVisible();
  await event.getByRole('button', { name: 'Acknowledge', exact: true }).click();
  await expect(event.getByTestId('review-state')).toHaveText('Acknowledged');
  await event.getByRole('button', { name: 'Add context', exact: true }).click();
  await page.getByLabel('Caregiver note').fill('Reviewed: ordinary exercise.');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await expect(event.getByText('Reviewed: ordinary exercise.', {exact:true})).toBeVisible();
  await page.context().setOffline(false);
  await page.reload();
  await expect(event.getByText('Reviewed: ordinary exercise.', { exact: true })).toBeVisible();
  await event.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(event.getByTestId('review-state')).toHaveText('Dismissed');
  await expectAccessible(page, 'monitoring event review');
  await page.goto('/#/monitoring');
  await page.getByRole('button', { name: 'Start simulated camera', exact: true }).click();
  await page.getByRole('button', { name: 'Disconnect camera', exact: true }).click();
  await page.goto('/#/events');
  await expect(page.getByRole('heading', { name: 'Camera disconnected', exact: true })).toHaveCount(1);
  await page.goto('/#/devices');
  await expect(page.getByRole('combobox', { name: 'Individual category', exact: true })).toHaveText('Older adult');
  for (const route of ['/overview', '/monitoring', '/events', '/devices']) {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/#${route}`);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(0);
    if (process.env.SCREENS) await page.screenshot({path:`docs/screenshots/platform-${route.slice(1)}-320.png`,fullPage:true});
  }
  if (process.env.SCREENS) {
    for (const route of ['/overview', '/monitoring', '/events', '/devices']) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`/#${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      await page.screenshot({ path: `docs/screenshots/platform-${route.slice(1)}.png`, fullPage: true });
    }
  }
});

for (const lang of ['en', 'ms'] as const)
  for (const theme of ['light', 'dim'] as const) {
    test(`monitoring pages accessible (${lang}, ${theme})`, async ({ page, guard }) => {
      void guard;
      await onboard(page);
      await page.getByRole('button', { name: 'Use camera', exact: true }).click();
      await page.evaluate(
        ([lang, theme]) =>
          localStorage.setItem(
            'isyarat.settings.v1',
            JSON.stringify({ ...JSON.parse(localStorage.getItem('isyarat.settings.v1') ?? '{}'), lang, theme }),
          ),
        [lang, theme],
      );
      for (const route of ['/overview', '/monitoring', '/events', '/devices']) {
        await page.goto(`/#${route}`);
        await page.reload();
        await expect(page.locator('main h1')).toBeVisible();
        await expectAccessible(page, `platform ${route} ${lang} ${theme}`);
      }
    });
  }

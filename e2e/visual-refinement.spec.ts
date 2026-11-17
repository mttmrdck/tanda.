import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSignals } from './helpers';

const routes = ['/overview', '/monitoring', '/events', '/individuals', '/devices', '/home', '/timeline', '/settings'];
for (const theme of ['light', 'dim'] as const) {
  test(`refined workspace: responsive composition and navigation (${theme})`, async ({ page, guard }) => {
    void guard;
    test.setTimeout(240000);
    await onboard(page);
    await page.getByRole('button', { name: 'Use camera', exact: true }).click();
    await seedSignals(page, ['wave', 'tapTable', 'coverEars'], true);
    await page.goto('/#/devices');
    await page.getByLabel('Room or environment name').fill('Living room');
    for (const name of [
      'I am authorised to configure monitoring for this individual',
      'I have appropriate consent for visible video observation',
      'Enable experimental movement comparison',
      'I reviewed this context for baseline collection',
    ])
      await page.getByRole('switch', { name, exact: true }).check();
    await page.getByRole('button', { name: 'Save monitoring configuration', exact: true }).click();
    await page.goto('/#/monitoring');
    await page.getByRole('button', { name: 'Start simulated camera', exact: true }).click();
    await page.getByRole('button', { name: 'Collect reviewed demo baseline', exact: true }).click();
    await page.getByRole('button', { name: 'Simulate sustained unusual activity', exact: true }).click();
    await page.goto('/#/settings');
    await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).check();
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(`/#${route}`);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('main .route-shell')).toHaveAttribute('aria-busy', 'false');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          `${route} ${width} ${theme} overflow`,
        ).toBeLessThanOrEqual(0);
        if (width === 1440) await expectAccessible(page, `${route} populated ${theme}`);
        if (process.env.VISUAL && [390, 1440].includes(width))
          await page.screenshot({
            path: `docs/screenshots/refinement/${route.slice(1)}-${theme}-${width}.png`,
            fullPage: true,
            animations: 'disabled',
          });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/overview');
    const menu = page.getByRole('button', { name: 'Show menu', exact: true });
    await menu.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Explore Tanda' });
    await expect(dialog).toBeVisible();
    await expectAccessible(page, `mobile navigation ${theme}`);
    if (process.env.VISUAL)
      await page.screenshot({
        path: `docs/screenshots/refinement/navigation-${theme}-390.png`,
        animations: 'disabled',
      });
    await dialog.getByRole('link', { name: 'Devices & Cameras', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Devices & Cameras' })).toBeVisible();
    await page.getByRole('button', { name: 'Show menu', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // A new individual must show genuinely unconfigured states, without inherited monitoring consent.
    await page.goto('/#/individuals');
    await page.getByRole('main').getByRole('button',{name:'Add an individual',exact:true}).click();
    await page.getByLabel('Individual’s nickname').fill('Rina');
    await page.getByRole('button',{name:'Create profile',exact:true}).click();
    await page.getByRole('button',{name:'Use camera',exact:true}).click();
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      for(const route of ['/overview','/monitoring','/events','/devices']) {
        await page.goto(`/#${route}`);
        await expect(page.locator('main h1').first()).toBeVisible();
        if(route==='/overview') await expect(page.getByText('No observations yet',{exact:true})).toBeVisible();
        if(route==='/monitoring') await expect(page.getByRole('button',{name:'Start simulated camera',exact:true})).toBeDisabled();
        if(process.env.VISUAL) await page.screenshot({path:`docs/screenshots/refinement/${route.slice(1)}-empty-${theme}-${width}.png`,fullPage:true,animations:'disabled'});
      }
    }

  });
}

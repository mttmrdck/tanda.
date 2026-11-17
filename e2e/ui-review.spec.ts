import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSignals, startDemo } from './helpers';

for (const theme of ['light', 'dim'] as const) {
  test(`UI review: overview, styleguide, responsive charts and sheets (${theme})`, async ({ page, guard }) => {
    void guard;
    test.setTimeout(120_000);
    await onboard(page);
    await page.getByRole('button', { name: 'Use camera' }).click();
    await seedSignals(page, ['wave', 'tapTable', 'coverEars'], true);
    await page.evaluate(th => localStorage.setItem('isyarat.settings.v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('isyarat.settings.v1') ?? '{}'), theme:th })), theme);
    await page.goto('/#/home'); await page.reload();
    await expect(page.getByRole('heading', { level:1, name:'Communication' })).toBeVisible();
    await expectAccessible(page, `Home ${theme}`);
    await page.goto('/#/timeline');
    await expect(page.getByRole('button',{name:'Export CSV'})).not.toBeVisible();
    await page.getByRole('checkbox',{name:'Export options'}).press('Space');
    await expect(page.getByRole('button',{name:'Export CSV'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Export JSON'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Print timeline'})).toBeVisible();
    await page.locator('.export-fan').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
    await expectAccessible(page, `Export fan ${theme}`);
    await page.getByRole('checkbox',{name:'Export options'}).press('Space');
    await page.setViewportSize({width:1280,height:900});
    const plots = page.locator('.daily-chart-plot');
    await expect(plots).toHaveCount(2);
    const firstPlot = await plots.nth(0).boundingBox();
    const secondPlot = await plots.nth(1).boundingBox();
    expect(Math.abs(firstPlot!.y - secondPlot!.y)).toBeLessThanOrEqual(1);
    for (const route of ['/home','/timeline','/styleguide']) {
      await page.goto(`/#${route}`);
      await expect(page.locator('main h1').first()).toBeVisible();
      if (route === '/timeline') {
        await page.getByRole('radio', { name:'7 days', exact:true }).press('Space');
        await expect(page.getByText('7 days ending on the selected day').first()).toBeVisible();
        await expectAccessible(page, `Seven-day insights ${theme}`);
        await page.getByRole('radio', { name:'31 days', exact:true }).press('Space');
        await expect(page.getByText('31 days ending on the selected day').first()).toBeVisible();
        await page.getByRole('radio', { name:'Day', exact:true }).press('Space');
      }
      await page.setViewportSize({ width:320, height:844 });
      await page.waitForTimeout(250);
      const overflowing = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el=>`${el.tagName}.${el.className}`).slice(0,8));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), overflowing.join('\n')).toBeLessThanOrEqual(0);
      if (route === '/styleguide') {
        await expectAccessible(page, `Styleguide ${theme}`);
        await page.getByRole('button', { name:'Open sheet' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('dialog').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
        await expectAccessible(page, `Sheet ${theme}`);
        await page.getByRole('button', {name:'Expand sheet'}).click();
        await expect(page.getByRole('button', {name:'Collapse sheet'})).toHaveAttribute('aria-expanded','true');
        await page.keyboard.press('Escape');
      }
    }
    if (process.env.SCREENS) {
      for (const route of ['/home','/','/teach','/timeline','/settings','/styleguide']) {
        for (const width of [390,1280]) {
          await page.setViewportSize({width,height:900});
          await page.goto(`/#${route}`); await page.waitForTimeout(350);
          await page.screenshot({path:`docs/screenshots/${route.replaceAll('/','') || 'live'}-${theme}-${width}.png`,fullPage:true});
        }
      }
      await page.setViewportSize({width:1280,height:900});
      await page.goto('/#/home');
      await page.getByRole('region', {name:'Gestures taught',exact:true}).screenshot({path:`docs/screenshots/component-stat-card-${theme}.png`});
      await page.goto('/#/timeline');
      for (const [title,slug] of [['Gesture frequency','bar-chart'],['Gesture distribution','donut-chart'],['When gestures happen','activity-heatmap']] as const) {
        await page.getByRole('heading',{name:title,exact:true}).locator('..').screenshot({path:`docs/screenshots/component-${slug}-${theme}.png`});
      }
      await page.getByRole('checkbox',{name:'Export options'}).press('Space');
      await page.locator('.export-fan').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
      const fanBox = (await page.locator('.export-fan').boundingBox())!;
      await page.screenshot({path:`docs/screenshots/export-fan-${theme}.png`,clip:{x:fanBox.x-18,y:fanBox.y-4,width:Math.min(176,1280-fanBox.x+18),height:150}});
      await page.getByRole('checkbox',{name:'Export options'}).press('Space');
      await page.getByRole('table',{name:'Events',exact:true}).screenshot({path:`docs/screenshots/component-data-table-${theme}.png`});
      await page.goto('/#/styleguide');
      await page.getByRole('button',{name:'Secondary',exact:true}).screenshot({path:`docs/screenshots/component-press-button-${theme}.png`});
      await page.getByRole('button',{name:'Open sheet'}).click();
      await page.getByRole('dialog').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
      await page.getByRole('dialog').screenshot({path:`docs/screenshots/component-sheet-${theme}.png`});
      await page.keyboard.press('Escape');
      await page.goto('/#/settings');
      const handover = page.getByRole('button',{name:'Hand over to another carer',exact:true});
      await expect(handover).toBeVisible();
      await handover.click();
      await expect(page.getByRole('heading',{level:1})).toContainText('Hand');
      await page.goto('/#/individuals');
      await page.getByRole('button',{name:'Save profile',exact:true}).click();
      await page.locator('[data-sonner-toast]').first().screenshot({path:`docs/screenshots/component-undo-toast-${theme}.png`});
      await page.goto('/#/');
      await startDemo(page);
      await page.getByRole('button',{name:'Rock',exact:true}).click();
      await page.waitForTimeout(3000);
      await page.locator('.motion-trace').screenshot({path:`docs/screenshots/component-live-line-chart-${theme}.png`});
      await page.screenshot({path:`docs/screenshots/live-rec-${theme}-1280.png`,fullPage:true});
      await page.setViewportSize({width:390,height:900});
      await page.getByRole('navigation',{name:'Main navigation'}).last().screenshot({path:`docs/screenshots/component-pill-navigation-${theme}.png`});
    }
  });
}


test('Tanda keeps preferences in Settings and uses skeleton page transitions', async ({page,guard}) => {
  void guard;
  await page.setViewportSize({width:390,height:844});
  await onboard(page);
  await page.getByRole('button',{name:'Use camera'}).click();
  await expect(page.getByRole('heading',{level:1,name:'Live recognition'})).toBeVisible();
  await expect(page).toHaveTitle('Tanda');
  await expect(page.locator('header').getByRole('button',{name:/Switch language|Theme:/})).toHaveCount(0);
  await page.getByRole('navigation').last().getByRole('link',{name:'Communication',exact:true}).click();
  await expect(page.locator('.route-skeleton-cover')).toBeVisible();
  expect(await page.locator('.route-skeleton-cover .ld-shimmer i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('page-shimmer');
  await expect(page.getByRole('heading',{level:1,name:'Communication'})).toBeVisible();
  await expect(page.locator('.route-skeleton-cover')).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('navigation').last().getByRole('link',{name:'Insights',exact:true}).click();
  await expect(page.locator('.route-skeleton-cover')).toBeVisible();
  expect(await page.locator('.route-skeleton-cover .ld-shimmer i').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await expect(page.getByRole('heading',{level:1,name:'Insights'})).toBeVisible();
});

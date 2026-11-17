import { test, expect } from './fixtures';
import { expectAccessible } from './helpers';

test.use({viewport:{width:393,height:852},deviceScaleFactor:3});

test('Tanda splash preview and reduced-motion composition', async ({page,guard}) => {
  void guard;
  await page.goto('/#/splash');
  await expect(page.getByRole('heading',{level:1,name:'tanda.'})).toBeVisible();
  await expect(page.locator('.splash-stroke')).toHaveCount(4);
  await page.locator('.tanda-splash').evaluate(el => Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished)));
  await expectAccessible(page,'Tanda splash');
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.screenshot({path:'docs/screenshots/tanda-splash-1179x2556.png'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();
  await expect(page.getByRole('heading',{name:'tanda.'})).toBeVisible();
  expect(await page.locator('.splash-stroke').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

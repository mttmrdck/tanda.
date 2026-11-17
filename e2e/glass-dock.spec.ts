import { test, expect } from './fixtures';
import { onboard, expectAccessible } from './helpers';
for (const theme of ['light', 'dim'] as const) {
  test(`glass dock stays at the viewport edge and follows navigation (${theme})`, async ({ page, guard }) => {
    void guard;
    await page.setViewportSize({ width: 390, height: 844 });
    await onboard(page);
    await page.getByRole('button', { name: 'Use camera', exact: true }).click();
    await page.goto('/#/settings');
    await page.getByRole('radio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).check();
    await page.goto('/#/overview');
    await expect(page.locator('main h1')).toBeVisible();
    const dock = page.locator('.tab-bar ul');
    for (const height of [667, 844, 900]) {
      await page.setViewportSize({ width: 390, height });
      const box = await dock.boundingBox();
      expect(box).not.toBeNull();
      expect(height - box!.y - box!.height).toBeCloseTo(8, 0);
      expect(box!.height).toBe(62);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const material = await dock.evaluate((el) => {
      const s = getComputedStyle(el);
      return { blur: s.backdropFilter, radius: s.borderRadius, bg: s.backgroundColor };
    });
    expect(material.blur).toContain('blur(26px)');
    expect(material.radius).toBe('999px');
    expect(material.bg).toMatch(/rgba\(/);
    await page.locator('.tab-bar').getByRole('link', { name: 'Events & Alerts', exact: true }).click();
    await expect(dock).toHaveCSS('--dock-index', '2');
    await expect(page.getByRole('heading', { level: 1, name: 'Events & Alerts' })).toBeVisible();
    await expectAccessible(page, `curved glass dock ${theme}`);
    await page.goto('/#/overview');
    await expect(page.getByRole('heading',{level:1,name:'Overview'})).toBeVisible();
    await expect(page.locator('.route-shell')).toHaveAttribute('aria-busy','false');
    await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>undefined)));window.scrollTo(0,80);});
    if (process.env.VISUAL)
      await page.screenshot({
        path: `docs/screenshots/refinement/dock-viewport-${theme}-390.png`,
        animations: 'disabled',
      });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await dock.evaluate((el) => getComputedStyle(el, '::after').transitionProperty)).not.toContain('transform');
  });
}

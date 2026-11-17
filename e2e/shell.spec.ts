import { test, expect } from './fixtures';
import { onboard } from './helpers';

test('desktop: hide the side menu → main tabs move into the top bar, remembered after reload', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  const rail = page.locator('#nav-rail');
  await expect(rail).toBeVisible();
  await page.getByRole('button', { name: 'Hide menu' }).click();
  await expect(page.getByRole('button', { name: 'Show menu' })).toHaveAttribute('aria-expanded', 'false');
  // rail is out of the tab order and the accessibility tree
  await expect(rail).toHaveAttribute('inert', '');
  await expect.poll(() => page.locator('.rail-slot').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  const topNav = page.locator('.top-nav');
  await topNav.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Show menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Show menu' }).click();
  await expect(rail).not.toHaveAttribute('inert', '');
  await expect(topNav).toHaveAttribute('inert', '');
});

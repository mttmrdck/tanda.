import { test, expect } from './fixtures';
import { expectAccessible, onboard } from './helpers';

test('Tanda introduction: four strokes construct the symbol, then hand over to Home without replaying', async ({ page, guard }) => {
  void guard;
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    (window as unknown as { __gum: number }).__gum = 0;
    const md = navigator.mediaDevices;
    if (md) {
      const original = md.getUserMedia.bind(md);
      md.getUserMedia = (c) => {
        (window as unknown as { __gum: number }).__gum++;
        return original(c);
      };
    }
  });
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Live recognition' })).toBeVisible();

  // A fresh visit to the root URL (new document) plays the introduction.
  await page.goto('/');
  await page.reload();
  const intro = page.locator('.tanda-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.intro-stroke')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1, name: 'tanda' })).toBeVisible();
  await expectAccessible(page, 'Tanda introduction');

  // It hands over to Home (replacing the entry) and never asks for the camera.
  await expect(page).toHaveURL(/#\/overview$/, { timeout: 8000 });
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)$/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __gum: number }).__gum)).toBe(0);

  // Within the session it does not replay: refresh, or the root again.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)$/ })).toBeVisible();
  await expect(intro).toHaveCount(0);
  await page.evaluate(() => {
    location.hash = '#/';
  });
  await expect(page).toHaveURL(/#\/overview$/);
  await expect(intro).toHaveCount(0);

  // Reduced motion: the finished symbol appears at once and the hand-over is quick.
  const reduced = await page.context().newPage();
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.goto('/');
  await expect(reduced.locator('.intro-stroke')).toHaveCount(4);
  await expect(reduced).toHaveURL(/#\/overview$/, { timeout: 4000 });
  await reduced.close();
});

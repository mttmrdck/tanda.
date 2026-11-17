import { test, expect } from './fixtures';
import { expectAccessible, onboard, teachWithDemo } from './helpers';

test('teach "wave" and "tap table" with the demo performer; both appear in Signals with glyphs', async ({ page, guard }) => {
  void guard;
  test.setTimeout(180_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Try the demo first' }).click();

  await teachWithDemo(page, { name: 'Water', meaning: 'I want water, please.', gesture: 'Tap the table' });
  await expect(page.getByTestId('coach-ok')).toBeVisible();
  await expect(page.locator('[data-testid^="coach-"]:not([data-testid="coach-ok"])')).toHaveCount(0);
  await expectAccessible(page, 'teach-check');
  await page.getByRole('button', { name: 'Save signal' }).click();
  await expect(page.getByRole('heading', { name: '“Water” is ready' })).toBeVisible();

  await page.getByRole('button', { name: 'Teach another' }).click();
  await teachWithDemo(page, { name: 'Hello', meaning: 'Hello! Look at me.', gesture: 'Wave' });
  await expect(page.getByTestId('coach-ok')).toBeVisible();
  await expect(page.locator('[data-testid^="coach-"]:not([data-testid="coach-ok"])')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save signal' }).click();
  await expect(page.getByRole('heading', { name: '“Hello” is ready' })).toBeVisible();

  await page.goto('/#/signals');
  const grid = page.getByTestId('signal-grid');
  await expect(grid.getByRole('heading', { name: 'Water' })).toBeVisible();
  await expect(grid.getByRole('heading', { name: 'Hello' })).toBeVisible();
  await expect(grid.getByRole('img', { name: 'Stick-figure replay of “Water”' })).toBeVisible();
  await expect(grid.getByRole('img', { name: 'Stick-figure replay of “Hello”' })).toBeVisible();
  await expect(grid.getByText('5 examples')).toHaveCount(2);
  await expectAccessible(page, 'signals');

  // the camera/demo stops when leaving camera pages
  expect(await page.evaluate(() => (window as unknown as { __isyaratDebug: { state: () => { phase: string } } }).__isyaratDebug.state().phase)).toBe('idle');

  // edit + search + delete
  await page.getByRole('button', { name: 'Edit: Water' }).click();
  await page.getByRole('dialog').getByLabel('Signal name').first().fill('Drink');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(grid.getByRole('heading', { name: 'Drink' })).toBeVisible();
  await page.getByPlaceholder('Search signals').fill('hel');
  await expect(grid.getByRole('heading')).toHaveCount(1);
  await page.getByPlaceholder('Search signals').fill('');
  await page.getByRole('button', { name: 'Delete: Drink' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(grid.getByRole('heading')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Edit: Drink' })).toHaveCount(0);
});

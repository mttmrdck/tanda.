import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSignals, startDemo } from './helpers';

test('demo performer waves → meaning shown → Yes → event persists after reload', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable', 'armsUp']);
  await expect(page.getByRole('heading', { level: 1, name: 'Live' })).toBeVisible();
  await startDemo(page);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Wave', exact: true }).click();
  await expect(page.getByTestId('saying-name')).toHaveText('Hello', { timeout: 10_000 });
  await expect(page.getByTestId('saying-meaning')).toHaveText('Hello! Look at me.');
  await expect(page.getByTestId('announcer')).toHaveText('Hello: Hello! Look at me.');
  await expect(page.getByText(/^Confidence: /)).toBeVisible();
  await expectAccessible(page, 'live-recognition');
  await page.getByRole('button', { name: 'Yes, that’s it' }).click();
  const recent = page.getByTestId('recent-events');
  await expect(recent.getByText('Hello')).toBeVisible();
  await expect(recent.getByText('Confirmed')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('recent-events').getByText('Hello')).toBeVisible();
  await expect(page.getByTestId('recent-events').getByText('Confirmed')).toBeVisible();
});

test('Not quite → relabel to another signal', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable']);
  await startDemo(page);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Wave', exact: true }).click();
  await expect(page.getByTestId('saying-name')).toHaveText('Hello', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Not quite' }).click();
  const dialog = page.getByRole('dialog', { name: 'What did they mean?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Water/ }).click();
  await expect(page.getByTestId('recent-events').getByText('Corrected')).toBeVisible();
  await expect(page.getByTestId('recent-events').getByText('Water')).toBeVisible();
});

test('rocking performer → Calm Watch reaches Rising within 20 s with a translated reason', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave']);
  await startDemo(page);
  await page.waitForTimeout(3000); // a few calm seconds
  await expect(page.getByTestId('calm-meter')).toHaveAttribute('data-tier', 'calm');
  await page.getByRole('button', { name: 'Rock', exact: true }).click();
  await expect(page.getByTestId('calm-meter')).toHaveAttribute('data-tier', /rising|high/, { timeout: 20_000 });
  await expect(page.getByTestId('calm-reasons')).toContainText('A repeating rhythm');
  await expect(page.getByTestId('recent-events').getByText(/Calm Watch: (Rising|High)/).first()).toBeVisible();
  await expect(page.getByText('Movement pattern only — not a diagnosis.')).toBeVisible();
  // BM translation of the reason
  await page.getByRole('button', { name: /Switch language to Bahasa Malaysia/ }).click();
  await expect(page.getByTestId('calm-reasons')).toContainText('Irama berulang');
});

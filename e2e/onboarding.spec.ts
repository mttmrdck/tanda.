import { test, expect } from './fixtures';
import { expectAccessible, gumCalls, onboard, seedSettings, spyCamera } from './helpers';

test('onboarding: consent gate, profile, demo start — no camera before a button press', async ({ page, guard }) => {
  void guard;
  await spyCamera(page);
  await page.goto('/');
  await expect(page).toHaveURL(/#\/onboarding/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let’s learn the signals your child already uses.');
  await page.getByRole('button', { name: 'Get started' }).click();

  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeDisabled();
  const boxes = await page.getByRole('checkbox').all();
  expect(boxes).toHaveLength(3);
  await boxes[0]!.check({ force: true });
  await boxes[1]!.check({ force: true });
  await expect(cont).toBeDisabled();
  await boxes[2]!.check({ force: true });
  await expect(cont).toBeEnabled();
  await cont.click();

  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByText('Please enter a nickname.')).toBeVisible();
  await page.getByLabel('Child’s nickname').fill('Aisyah');
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByRole('heading', { name: 'All set for Aisyah' })).toBeVisible();
  expect(await gumCalls(page)).toBe(0);

  await page.getByRole('button', { name: 'Try the demo first' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Live' })).toBeVisible();
  await expect(page.getByTestId('status-line')).toHaveText('Seeing the child');
  await expect(page.getByRole('heading', { name: 'No signals taught yet' })).toBeVisible();
  expect(await gumCalls(page)).toBe(0);

  // reload keeps the profile and consent
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Live' })).toBeVisible();
});

test('language preference lives in Settings and persists', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name:'Use camera' }).click();
  await page.goto('/#/settings');
  await page.getByRole('radio', { name:'Bahasa Malaysia', exact:true }).press('Space');
  await expect(page.locator('html')).toHaveAttribute('lang','ms');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','ms');
  await expect(page.getByRole('radio', { name:'Bahasa Malaysia', exact:true })).toBeChecked();
});

test('theme preference lives in Settings and persists', async ({ page, guard }) => {
  void guard;
  await page.emulateMedia({ colorScheme:'light' });
  await onboard(page);
  await page.getByRole('button', { name:'Use camera' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dim');
  await page.goto('/#/settings');
  await page.getByRole('radio', { name:'Light', exact:true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});

for (const lang of ['en', 'ms'] as const) {
  for (const theme of ['light', 'dim'] as const) {
    test(`onboarding is accessible (${lang}, ${theme})`, async ({ page, guard }) => {
      void guard;
      await seedSettings(page, { lang, theme });
      await page.goto('/');
      await expect(page).toHaveURL(/#\/onboarding/);
      await expectAccessible(page, 'welcome');
      await page.locator('main button').first().click();
      await expectAccessible(page, 'consent');
      for (const box of await page.getByRole('checkbox').all()) await box.check({ force: true });
      await page.locator('main button').last().click();
      await expect(page.locator('main form')).toBeVisible();
      await expectAccessible(page, 'profile');
      await page.locator('main input').first().fill('Ali');
      await page.locator('main button[type=submit]').click();
      await expect(page.locator('main h1')).toContainText('Ali');
      await expectAccessible(page, 'ready');
    });
  }
}

test('onboarded Live page is accessible', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Try the demo first' }).click();
  await expect(page.getByTestId('status-line')).toHaveText('Seeing the child');
  await expectAccessible(page, 'live');
});

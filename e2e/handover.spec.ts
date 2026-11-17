import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSignals, startDemo } from './helpers';

test('export → delete all → wrong passphrase error → import → signals restored and recognised; CSV export', async ({ page, guard }) => {
  void guard;
  test.setTimeout(180_000);
  await onboard(page, 'Adam');
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable'], true);

  // CSV export from Timeline
  await page.goto('/#/timeline');
  await expect(page.getByRole('heading', { level: 1, name: 'Timeline' })).toBeVisible();
  await expect(page.getByTestId('events-table')).toBeVisible();
  await expectAccessible(page, 'timeline');
  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  expect(csvDl.suggestedFilename()).toMatch(/^adam-timeline-\d{8}\.csv$/);
  const csv = readFileSync((await csvDl.path())!, 'utf8');
  expect(csv.split('\n')[0]).toBe('time_utc,local_time,kind,signal,meaning,confidence,feedback,calm_tier,calm_score');
  expect(csv).toContain('Water');

  // Export handover file
  await page.goto('/#/handover');
  await expectAccessible(page, 'handover-export');
  await page.getByLabel('Passphrase', { exact: true }).fill('blue kettle under stairs');
  await page.getByLabel('Type the passphrase again').fill('blue kettle under stairs');
  await expect(page.getByText('Strength: Strong')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Create file' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^adam-\d{8}\.isyarat$/);
  const filePath = (await dl.path())!;
  const fileText = readFileSync(filePath, 'utf8');
  expect(JSON.parse(fileText)).toMatchObject({ format: 'isyarat-profile', v: 1, kdf: { iterations: 310000 } });
  expect(fileText).not.toContain('Water');

  // Delete everything
  await page.goto('/#/settings');
  await expectAccessible(page, 'settings');
  await page.getByRole('button', { name: 'Delete all data on this device' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/#\/onboarding/);
  const dbState = await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const names = dbs.map((d) => d.name);
    if (!names.includes('isyarat')) return { exists: false, profiles: 0 };
    const d = window as unknown as { __isyaratDebug: { repo: { listProfiles: () => Promise<unknown[]> } } };
    return { exists: true, profiles: (await d.__isyaratDebug.repo.listProfiles()).length };
  });
  expect(dbState.profiles).toBe(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('isyarat.')).length)).toBe(0);

  // Re-consent, then import from onboarding
  await page.getByRole('button', { name: 'Get started' }).click();
  for (const box of await page.getByRole('checkbox').all()) await box.check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('link', { name: /Import it/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Import a handover file' })).toBeVisible();
  await page.locator('#import-file').setInputFiles(filePath);
  await page.getByLabel('Passphrase', { exact: true }).fill('wrong passphrase');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByTestId('import-error')).toHaveText('That passphrase is not right. Check with the person who sent the file.', { timeout: 20_000 });
  await page.getByLabel('Passphrase', { exact: true }).fill('blue kettle under stairs');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByTestId('import-preview')).toHaveText('Adam: 2 signals, 10 examples', { timeout: 20_000 });
  await expectAccessible(page, 'import-preview');
  await page.getByRole('button', { name: 'Import as a new profile' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Live' })).toBeVisible();

  // restored signals still recognise
  await startDemo(page);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Wave', exact: true }).click();
  await expect(page.getByTestId('saying-name')).toHaveText('Hello', { timeout: 10_000 });
});

test('a non-isyarat file and a corrupted file give specific errors', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.goto('/#/handover');
  await page.getByRole('tab', { name: 'Import' }).click();
  await page.locator('#import-file').setInputFiles({ name: 'notes.isyarat', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await page.getByLabel('Passphrase', { exact: true }).fill('anything123');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByTestId('import-error')).toHaveText('This is not an Isyarat file.');
  const v2 = JSON.stringify({ format: 'isyarat-profile', v: 2 });
  await page.locator('#import-file').setInputFiles({ name: 'new.isyarat', mimeType: 'application/json', buffer: Buffer.from(v2) });
  await page.getByLabel('Passphrase', { exact: true }).fill('anything123');
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByTestId('import-error')).toHaveText('This file was made by a newer version of Isyarat. Update the app and try again.');
});

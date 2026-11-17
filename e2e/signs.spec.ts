import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { onboard } from './helpers';

async function enableSignPacks(page: Page) {
  await page.goto('/#/settings');
  const sw = page.getByRole('switch', { name: 'Sign packs' });
  await expect(sw).not.toBeChecked();
  await sw.click();
  await page.getByRole('button', { name: 'Open sign packs' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign packs' })).toBeVisible();
}

async function startDemo(page: Page) {
  await page.getByRole('button', { name: 'Demo performer', exact: true }).click();
  await expect(page.getByTestId('status-line')).toHaveText('Seeing the child');
}

test('sign packs are off by default: no nav entry, routes redirect to Settings', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await expect(page.getByRole('link', { name: 'Sign packs' })).toHaveCount(0);
  await page.goto('/#/signs/pack/demo');
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('switch', { name: 'Sign packs' })).not.toBeChecked();
});

test('framing, notice, badges; demo practice gives "Close" and "Try again" with the part that differed', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await enableSignPacks(page);
  await expect(page.getByTestId('practice-aid').first()).toHaveText('A practice aid for learning and checking isolated signs. It is not a translator or interpreter.');
  await expect(page.getByText('Malaysian Sign Language (BIM) is a different language', { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId('signs-notice')).toContainText('Seeking review by Deaf signers');
  await page.getByRole('button', { name: 'I understand' }).click();
  await expect(page.getByTestId('signs-notice')).toHaveCount(0);

  const asl = page.getByTestId('pack-asl');
  await expect(asl).toContainText('ASL (American Sign Language)');
  await expect(asl).toContainText('Not yet reviewed by a Deaf signer');
  await expect(page.getByTestId('pack-demo')).toContainText('Demo only, not real signs');
  await asl.click();
  await expect(page.getByRole('heading', { name: 'No signs yet' })).toBeVisible();

  await page.goto('/#/signs/pack/demo');
  await page.getByLabel('Search signs').fill('wave');
  await page.getByRole('link', { name: 'Practise: Demo: wave' }).click();
  await expect(page.getByTestId('practice-gloss')).toContainText('Demo: wave');
  await expect(page.getByRole('img', { name: 'Skeleton replay of the reference for Demo: wave' })).toBeVisible();
  await startDemo(page);
  await page.getByRole('button', { name: 'Check my sign' }).click();
  await expect(page.getByTestId('practice-feedback')).toHaveText('Close. That matches the reference.', { timeout: 15_000 });
  await expect(page.getByTestId('practice-progress')).toContainText('Practice attempts: 1');

  await page.getByRole('button', { name: 'Demo: tap the table' }).click();
  await page.getByRole('button', { name: 'Check my sign' }).click();
  const fb = page.getByTestId('practice-feedback');
  await expect(fb).toContainText('Not quite yet. Try again.', { timeout: 15_000 });
  await expect(fb).toContainText(/looked different from the reference/);
});

test('fingerspelling with the demo pack checks a sequence of held handshapes', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await enableSignPacks(page);
  await page.goto('/#/signs/pack/demo/spell');
  await startDemo(page);
  await page.getByRole('button', { name: 'Demo: point' }).click();
  await page.getByRole('button', { name: 'Demo: fist' }).click();
  await expect(page.getByTestId('spell-now')).toHaveText('Now: Demo: point');
  await page.getByRole('button', { name: 'Check my sign' }).click();
  await expect(page.getByTestId('practice-feedback')).toHaveText('Close. That matches the reference.', { timeout: 15_000 });
  await expect(page.getByTestId('spell-now')).toHaveText('Now: Demo: fist');
});

test('recognise mode shows one candidate with "Is this …?" and otherwise "Not sure"', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await enableSignPacks(page);
  await page.goto('/#/signs/pack/demo/recognise');
  await expect(page.getByTestId('recognise-not-sure')).toHaveText('Not sure');
  await startDemo(page);
  await page.getByRole('button', { name: 'Arms up', exact: true }).click();
  await expect(page.getByTestId('recognise-candidate')).toHaveText('Demo: arms up', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(page.getByText('Thanks. Noted on this device only.')).toBeVisible();
});

test('author a pack: consent, record 5 takes, save; export, delete, import shows licence and credits; withdraw', async ({ page, guard }) => {
  void guard;
  test.setTimeout(180_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await enableSignPacks(page);
  await page.getByRole('link', { name: 'Author a pack' }).click();

  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeDisabled();
  for (const box of await page.getByRole('checkbox').all()) await box.check({ force: true });
  await page.getByLabel('Credit me as (optional)').fill('Volunteer A');
  await cont.click();
  await page.getByLabel('Pack name (English)').fill('Test ASL');
  await page.getByRole('button', { name: 'Create pack' }).click();

  await page.getByLabel('Gloss (English label)').fill('HELLO');
  await startDemo(page);
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: `Record take ${i}` }).click();
    await expect(page.getByTestId('author-takes')).toHaveText(`${i} takes (5 or more)`, { timeout: 15_000 });
  }
  await page.getByRole('button', { name: 'Save sign' }).click();
  await expect(page.getByText('"HELLO" saved to the pack')).toBeVisible();

  await page.getByRole('link', { name: 'Test ASL' }).click();
  await expect(page.getByRole('link', { name: 'Practise: HELLO' })).toBeVisible();
  await expect(page.getByTestId('pack-credits')).toContainText('Volunteer A');
  await expect(page.getByTestId('review-status')).toHaveText('Not yet reviewed by a Deaf signer');

  // plain export → delete → import shows licence and credits
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export', exact: true }).click()]);
  const plain = await readFile((await dl.path())!, 'utf8');
  // landmarks only: every template has exactly the landmark fields, and nothing in the file is an image
  const parsed = JSON.parse(plain) as { signs: { templates: Record<string, unknown>[] }[] };
  for (const s of parsed.signs) for (const tpl of s.templates) expect(Object.keys(tpl).every((k) => ['n', 'd', 'data', 'hand', 'signerId', 'recordedAt'].includes(k))).toBe(true);
  expect(plain).not.toContain('data:image');
  await page.getByRole('button', { name: 'Delete pack' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete pack' }).click();
  await expect(page).toHaveURL(/#\/signs$/);
  await expect(page.getByText('Test ASL')).toHaveCount(0);
  await page.locator('#signpack-file').setInputFiles({ name: 'test.signpack', mimeType: 'application/json', buffer: Buffer.from(plain) });
  const preview = page.getByTestId('import-preview');
  await expect(preview).toContainText('CC BY 4.0');
  await expect(preview).toContainText('Volunteer A');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(page.getByText('Pack imported')).toBeVisible();
  await page.getByText('Test ASL').click();

  // encrypted export round-trip (a wrong passphrase is refused)
  await page.getByRole('button', { name: 'Export encrypted' }).click();
  await page.getByLabel('Passphrase', { exact: true }).fill('a long passphrase');
  const [edl] = await Promise.all([page.waitForEvent('download'), page.getByRole('dialog').getByRole('button', { name: 'Export', exact: true }).click()]);
  const enc = await readFile((await edl.path())!, 'utf8');
  expect(enc).not.toContain('HELLO');

  // the signer withdraws: their recordings go
  await page.getByRole('button', { name: 'Withdraw signer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Withdraw signer' }).click();
  await expect(page.getByRole('heading', { name: 'No signs yet' })).toBeVisible();

  await page.goto('/#/signs');
  await page.locator('#signpack-file').setInputFiles({ name: 'enc.signpack', mimeType: 'application/json', buffer: Buffer.from(enc) });
  await page.getByLabel('Passphrase', { exact: true }).fill('not the passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('That passphrase did not open the file.')).toBeVisible();
  await page.getByLabel('Passphrase', { exact: true }).fill('a long passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('import-preview')).toContainText('1 signs');
});

test('benchmark: honest empty state; synthetic run is labelled synthetic', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await enableSignPacks(page);
  await page.getByRole('link', { name: 'Benchmark' }).click();
  await expect(page.getByText('No clips yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run benchmark' })).toBeDisabled();
  await page.getByRole('button', { name: 'Run synthetic benchmark (demo pack)' }).click();
  const res = page.getByTestId('bench-result');
  await expect(res).toContainText('Synthetic: simulator clips on the demo pack. Not real signs, not real signers.', { timeout: 30_000 });
  await expect(res).toContainText(/Accuracy \d+%/);
});

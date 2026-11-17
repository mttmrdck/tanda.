import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { expectAccessible, onboard } from './helpers';

async function openTranslate(page: Page) {
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.goto('/#/settings');
  await page.getByRole('switch', { name: 'Sign packs' }).click();
  // Translate now lives under Sign language research
  await page.goto('/#/research');
  await page.getByRole('link', { name: 'Open the word ↔ sign prototype' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Word ↔ sign prototype' })).toBeVisible();
}
const tab = (page: Page, name: string) => page.getByRole('tab', { name });
const banner = (page: Page) => page.getByTestId('demo-banner');

test('Translate is behind the Labs flag', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await expect(page.getByRole('link', { name: 'Open the word ↔ sign prototype' })).toHaveCount(0);
  await page.goto('/#/translate');
  await expect(page).toHaveURL(/#\/settings$/);
});

test('empty pack: every mode says "This pack has no signs yet" with Author and Import', async ({ page, guard }) => {
  void guard;
  await openTranslate(page);
  await page.getByRole('combobox', { name: 'Active pack' }).click();
  await page.getByRole('option', { name: 'ASL (American Sign Language)' }).click();
  await expect(page.getByTestId('review-status')).toHaveText('Not yet reviewed by a Deaf signer');
  await expect(banner(page)).toHaveCount(0);
  for (const name of ['Sign to word', 'Word to sign', 'Fingerspell']) {
    await tab(page, name).click();
    await expect(page.getByRole('heading', { name: 'This pack has no signs yet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Author a pack' }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Import a .signpack file' })).toBeVisible();
  }
  await expect(page.getByTestId('translate-stage')).toHaveCount(0);
  await expectAccessible(page, 'translate-empty');
});

test('sign to word (demo pack): capture → candidates → confirm into the strip; undo / clear; banner always visible', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await openTranslate(page);
  await expect(banner(page)).toHaveText('Demo only, not real signs');
  await expect(page.getByTestId('translate-scope')).toContainText('this shows individual signs, not full sentences');
  await expect(page.getByText('Facial expression is part of signing and this tool cannot check it.')).toBeVisible();
  await expect(page.getByTestId('translate-status')).toHaveText('Hands and shoulders in view', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Demo: tap the table' }).click();
  await page.getByRole('button', { name: 'Capture a sign' }).click();
  const first = page.getByTestId('translate-candidate').first();
  await expect(first).toContainText('Demo: tap the table', { timeout: 15_000 });
  const latency = Number(await page.getByTestId('translate-result').getAttribute('data-latency'));
  console.log(`sign→word latency (sign end → result on screen): ${latency} ms`);
  expect(latency).toBeLessThan(1000);
  await expect(banner(page)).toBeVisible();
  await expectAccessible(page, 'translate-sign-result');

  await page.getByRole('button', { name: 'Replay: Demo: tap the table' }).click();
  await expect(page.getByTestId('skeleton-player')).toBeVisible();
  await first.click();
  const strip = page.getByTestId('translate-strip-items');
  await expect(strip).toHaveText('Demo: tap the table');
  await expect(page.getByText('this is not a sentence translation', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(strip).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).isDisabled();

  // a still performer is never forced into a match
  await page.getByRole('button', { name: 'Demo: wave' }).click();
  await page.getByRole('button', { name: 'Capture a sign' }).click();
  await expect(page.getByTestId('translate-candidate').first()).toContainText('Demo: wave', { timeout: 15_000 });
  await page.getByRole('button', { name: 'None of these' }).click();
  await expect(page.getByTestId('translate-candidate')).toHaveCount(0);
});

test('word to sign (demo pack): suggestions, replay controls, several words, not-in-pack with fingerspelling', async ({ page, guard }) => {
  void guard;
  await openTranslate(page);
  await tab(page, 'Word to sign').click();
  await expect(banner(page)).toBeVisible();
  await expect(page.getByTestId('translate-stage')).toHaveCount(0); // no camera on this tab
  await page.getByLabel('Type a word, or several words').fill('lamb');
  await page.getByRole('button', { name: 'Demo: lambai' }).or(page.getByRole('button', { name: 'Demo: wave' })).first().click();
  const player = page.getByTestId('word-player');
  await expect(player).toContainText('Demo: wave');
  await expect(page.getByRole('img', { name: /Demo: wave: frame \d+ of 16/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.getByRole('button', { name: 'Next frame' }).click();
  await expect(page.getByRole('img', { name: /frame \d+ of 16/ })).toBeVisible();
  await page.getByRole('radio', { name: '0.5×' }).check({ force: true });
  await page.getByRole('switch', { name: 'Mirror (left-handed)' }).click();
  await expect(page.getByRole('switch', { name: 'Mirror (left-handed)' })).toBeChecked();

  await page.getByLabel('Type a word, or several words').fill('wave banana');
  await page.getByRole('button', { name: 'Show signs' }).click();
  const queue = page.getByTestId('word-queue');
  await expect(queue).toContainText('1. wave');
  await expect(queue).toContainText('2. banana');
  await expect(page.getByText('One sign per word, in the order you typed', { exact: false })).toBeVisible();
  await queue.getByRole('button', { name: /2\. banana/ }).click();
  await expect(page.getByTestId('word-missing')).toHaveText('“banana”: Not in this pack');
  await page.getByRole('button', { name: 'Fingerspell it' }).click();
  const steps = page.getByTestId('spell-steps');
  await expect(steps).toContainText('Demo letter B');
  await expect(steps).toContainText('N: not in this pack');
  await expectAccessible(page, 'translate-word');
});

test('fingerspell (demo pack): letters seen by the camera are confirmed into a word; reverse spelling marks J unsupported', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await openTranslate(page);
  await tab(page, 'Fingerspell').click();
  await expect(banner(page)).toBeVisible();
  await expect(page.getByTestId('translate-status')).toHaveText('Hands and shoulders in view', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Demo: point' }).click();
  const add = page.getByRole('button', { name: /^Add Demo letter C/ });
  await expect(add).toBeVisible({ timeout: 15_000 });
  await add.click();
  await page.getByRole('button', { name: 'Space' }).click();
  await add.click({ timeout: 10_000 }).catch(() => undefined);
  const word = page.getByTestId('fs-word');
  await expect(word).toHaveText(/^C/);
  await page.getByRole('button', { name: 'Delete last letter' }).click();
  await page.getByLabel('Type a word').fill('abj');
  const steps = page.getByTestId('spell-steps');
  await expect(steps).toContainText('Demo letter A');
  await expect(steps).toContainText('J: involves movement, not supported in this pack');
  await steps.getByRole('button', { name: 'Demo letter B' }).click();
  await expect(page.getByTestId('skeleton-player')).toBeVisible();
  await expectAccessible(page, 'translate-spell');
});

test('camera lifecycle: starts on the sign tab, stops on another tab and when leaving Translate', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const w = window as unknown as { __streams: MediaStream[] };
    w.__streams = [];
    const md = navigator.mediaDevices;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c?: MediaStreamConstraints) => {
      const s = await orig(c);
      w.__streams.push(s);
      return s;
    };
  });
  const liveTracks = () => page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length);
  await openTranslate(page);
  await page.getByRole('radio', { name: 'Camera' }).check({ force: true });
  await expect.poll(liveTracks, { timeout: 60_000 }).toBeGreaterThan(0);
  await tab(page, 'Word to sign').click();
  await expect.poll(liveTracks).toBe(0);
  await tab(page, 'Sign to word').click();
  await expect.poll(liveTracks, { timeout: 60_000 }).toBeGreaterThan(0);
  await page.goto('/#/home');
  await expect.poll(liveTracks).toBe(0);
});

import { test, expect, debugReady } from './fixtures';

test('demo pipeline: the demo performer waves → a taught signal is recognised', async ({ page, guard }) => {
  void guard;
  await page.goto('/#/debug');
  await debugReady(page);
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('phase')).toHaveText('running');
  await page.evaluate(() => {
    const d = (window as unknown as { __isyaratDebug: { teachSimulated: (g: string[]) => void } }).__isyaratDebug;
    d.teachSimulated(['wave', 'tapTable', 'armsUp']);
  });
  await page.waitForTimeout(2500); // let the recogniser buffer fill with the resting performer
  await expect(page.getByTestId('emissions')).toHaveText('–');
  await page.getByRole('button', { name: 'wave', exact: true }).click();
  await expect(page.getByTestId('emissions')).toContainText('wave', { timeout: 10_000 });
  await expect(page.getByTestId('emissions')).not.toContainText('armsUp');
});

test('fake camera smoke: camera starts, MediaPipe initialises, no person → shoulders coach', async ({ page, guard }) => {
  void guard;
  await page.goto('/#/debug');
  await debugReady(page);
  await page.getByRole('button', { name: 'Camera', exact: true }).click();
  await expect(page.getByTestId('vision')).toHaveText(/ready (GPU|CPU)/, { timeout: 60_000 });
  await expect(page.getByTestId('phase')).toHaveText('running', { timeout: 30_000 });
  const playing = await page.evaluate(() => {
    const v = document.querySelector('video');
    return !!v && !v.paused && v.readyState >= 2 && v.videoWidth > 0;
  });
  expect(playing).toBe(true);
  await expect(page.getByTestId('seeing')).toHaveText('lost', { timeout: 15_000 });
  // stop releases the camera
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __isyaratDebug: { liveTracks: () => number } }).__isyaratDebug.liveTracks())).toBe(0);
});

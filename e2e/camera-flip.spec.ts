import { test, expect } from './fixtures';
import { onboard } from './helpers';

// Two fake cameras. Chromium's fake devices report no side (like most laptop webcams), so this exercises the
// fallback: flip moves to the other camera.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream=device-count=2'] } });

const currentDevice = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (document.querySelector('video')?.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId ?? '');

test('flip camera switches to the other camera, remembers it, and keeps running', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  const flip = page.getByRole('button', { name: 'Flip camera' });
  await expect(flip).toBeEnabled({ timeout: 60_000 });
  const before = await currentDevice(page);
  expect(before).not.toBe('');
  await flip.click();
  await expect.poll(() => currentDevice(page), { timeout: 30_000 }).not.toBe(before);
  await expect(flip).toBeEnabled({ timeout: 30_000 });
  const after = await currentDevice(page);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.includes('settings')) ?? '') ?? '{}') as { cameraDeviceId?: string });
  expect(saved.cameraDeviceId).toBe(after);
  // flipping again goes back
  await flip.click();
  await expect.poll(() => currentDevice(page), { timeout: 30_000 }).toBe(before);
});

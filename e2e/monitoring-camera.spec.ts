import { test, expect } from './fixtures';
import { onboard } from './helpers';

test('actual browser adapter persists quality metadata without treating a missing person as inactivity', async ({
  page,
  guard,
}) => {
  void guard;
  test.setTimeout(120000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera', exact: true }).click();
  await page.goto('/#/devices');
  for (const name of [
    'I am authorised to configure monitoring for this individual',
    'I have appropriate consent for visible video observation',
    'Enable experimental movement comparison',
    'I reviewed this context for baseline collection',
  ]) {
    await page.getByRole('switch', { name, exact: true }).check();
  }
  await page.getByRole('button', { name: 'Save monitoring configuration', exact: true }).click();
  await page.goto('/#/monitoring');
  await page.getByRole('button', { name: 'Start camera', exact: true }).click();
  await expect(page.getByText('Browser webcam processing is running', { exact: true })).toBeVisible({ timeout: 90000 });
  const read = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const q = indexedDB.open('isyarat');
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      try {
        return await new Promise<
          {
            health: {
              camera: { simulated: boolean; integration: string };
              gateway: { state: string };
              observationQuality: string;
            };
            baseline: { count: number };
            events: { type: string; simulated: boolean }[];
          }[]
        >((resolve, reject) => {
          const q = db.transaction('monitoring').objectStore('monitoring').getAll();
          q.onsuccess = () => resolve(q.result);
          q.onerror = () => reject(q.error);
        });
      } finally {
        db.close();
      }
    });
  await expect
    .poll(async () => (await read())[0]?.health.camera.integration, { timeout: 90000 })
    .toBe('browser-webcam');
  const [s] = await read();
  expect(s.health.camera.simulated).toBe(false);
  expect(s.baseline.count).toBe(0); // Chromium's synthetic camera has no reliably visible person.
  expect(s.events.some((e) => e.type === 'movement-deviation')).toBe(false);
  expect(s.events.every((e) => !e.simulated)).toBe(true);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(async () => (await read())[0]?.health.gateway.state).toBe('stopped');
});

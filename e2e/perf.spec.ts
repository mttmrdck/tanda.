/** Frame-time probe (not part of the normal run): PERF=1 npx playwright test e2e/perf.spec.ts */
import { test } from '@playwright/test';
import { onboard, seedSignals, startDemo } from './helpers';

test.skip(!process.env.PERF, 'performance probe only');

async function frameStats(page: import('@playwright/test').Page, ms: number) {
  return page.evaluate(async (dur) => {
    const deltas: number[] = [];
    const long: number[] = [];
    const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => long.push(e.duration)));
    po.observe({ type: 'longtask' });
    let last = performance.now();
    const end = last + dur;
    await new Promise<void>((res) => {
      const f = (t: number) => {
        deltas.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(f);
        else res();
      };
      requestAnimationFrame(f);
    });
    po.disconnect();
    deltas.sort((a, b) => a - b);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return { frames: deltas.length, avgMs: +avg.toFixed(2), p95Ms: +deltas[Math.floor(deltas.length * 0.95)]!.toFixed(2), over50: deltas.filter((d) => d > 50).length, longTasks: long.length };
  }, ms);
}

test('frame time: Live with demo performer, and with fake camera + MediaPipe', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable']);
  await page.goto('/#/live');
  await startDemo(page);
  await page.getByRole('button', { name: 'Rock', exact: true }).click();
  console.log('DEMO', JSON.stringify(await frameStats(page, 8000)));
  await page.evaluate(() => (window as unknown as { __isyaratDebug: { session: { start: (k: string) => Promise<void> } } }).__isyaratDebug.session.start('camera'));
  await page.waitForFunction(() => (window as unknown as { __isyaratDebug: { state: () => { phase: string; stats: unknown } } }).__isyaratDebug.state().stats !== null, null, { timeout: 90_000 });
  await page.waitForTimeout(3000);
  const fs = await frameStats(page, 8000);
  const st = await page.evaluate(() => (window as unknown as { __isyaratDebug: { state: () => { stats: { fps: number; inferenceMs: number; targetFps: number } } } }).__isyaratDebug.state().stats);
  console.log('CAMERA', JSON.stringify({ ...fs, detectFps: st.fps, targetFps: st.targetFps, inferenceMs: +st.inferenceMs.toFixed(1) }));
});

import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { expectAccessible, onboard, seedSignals, startDemo } from './helpers';

const rejectCamera = (page: Page, name: string) =>
  page.addInitScript((n) => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked for test', n));
  }, name);

test('camera permission denied → a clear message and a way to the demo performer', async ({ page, guard }) => {
  void guard;
  await rejectCamera(page, 'NotAllowedError');
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByRole('alert')).toContainText('Camera permission was not given');
  await page.getByRole('button', { name: 'Try Demo mode' }).click();
  await expect(page.getByTestId('demo-stage-note')).toHaveText('Simulated demonstration, not a live camera');
});

test('no camera on the device → a clear message', async ({ page, guard }) => {
  void guard;
  await rejectCamera(page, 'NotFoundError');
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByRole('alert')).toHaveText(/No camera was found on this device/);
});

test('model files fail to load → recognition error, demo still offered', async ({ page, guard }) => {
  void guard;
  test.setTimeout(90_000);
  await page.route('**/models/**', (r) => r.abort());
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('button', { name: 'Start camera' }).click();
  await expect(page.getByRole('alert')).toContainText('On-device recognition could not run', { timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Try Demo mode' })).toBeVisible();
  // the browser's own "failed to load" line for the blocked model files is expected here
  guard.consoleProblems.splice(0, guard.consoleProblems.length, ...guard.consoleProblems.filter((m) => !/Failed to load resource|models\/|ERR_FAILED|tasks-vision|vision_wasm|Unable to|Failed to fetch|graph/i.test(m)));
});

test('demo results are labelled simulated everywhere: stage, result, library, recent events, Insights', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable']);
  await startDemo(page);
  await expect(page.getByTestId('mode-chip')).toContainText('Demo performer (simulated)');
  await expect(page.getByTestId('demo-stage-note')).toBeVisible();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Tap the table', exact: true }).click();
  await expect(page.getByTestId('saying-name')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('demo-result-note')).toHaveText('Simulated demonstration, not a live human recognition result.');
  await page.getByRole('button', { name: 'Yes, that’s it' }).click();
  await expect(page.getByTestId('recent-events').getByTestId('simulated-tag').first()).toHaveText('Simulated');
  await page.goto('/#/signals');
  await expect(page.getByTestId('library-demo-tag').first()).toContainText('Taught with the demo performer (simulated)');
  await page.goto('/#/timeline');
  await expect(page.getByTestId('insights-demo-note')).toContainText('came from the demo performer');
  await page.getByRole('switch', { name: 'Include simulated (demo) activity' }).click();
  await expect(page.getByTestId('insights-demo-note')).toBeVisible();
  await expectAccessible(page, 'insights-demo');
});

test('individuals: add a second individual, switch, and each keeps its own gestures', async ({ page, guard }) => {
  void guard;
  await onboard(page, 'Adam');
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave', 'tapTable']);
  await page.goto('/#/individuals');
  await expect(page.getByRole('heading', { level: 1, name: 'People' })).toBeVisible();
  await expect(page.getByText('These are local profiles, not accounts', { exact: false })).toBeVisible();
  await expect(page.getByTestId('individuals')).toContainText('2 gestures');
  await page.getByRole('main').getByRole('button', { name: 'Add an individual' }).click();
  await page.getByLabel('Individual’s nickname').fill('Siti');
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByRole('heading', { name: 'All set for Siti' })).toBeVisible();
  await page.goto('/#/individuals');
  await expect(page.getByTestId('current-individual')).toContainText('Siti');
  await expect(page.getByTestId('individuals')).toContainText('0 gestures');
  await page.getByRole('button', { name: 'Switch to Adam' }).click();
  await expect(page.getByTestId('current-individual')).toContainText('Adam');
  await page.goto('/#/signals');
  await expect(page.getByTestId('signal-grid').getByRole('heading')).toHaveCount(2);
  await expectAccessible(page, 'individuals');
});

test('Movement Insights: experimental, explains limits, and keeps caregiver notes apart from measurements', async ({ page, guard }) => {
  void guard;
  test.setTimeout(120_000);
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await seedSignals(page, ['wave'], true);
  await page.goto('/#/movement');
  await expect(page.getByRole('heading', { level: 1, name: 'Movement Insights' })).toBeVisible();
  await expect(page.getByText('Experimental').first()).toBeVisible();
  await expect(page.getByText('Repetitive movement such as rocking or hand flapping is not good or bad', { exact: false })).toBeVisible();
  await expect(page.getByTestId('mv-baseline')).toContainText('settled readings');
  await expect(page.getByTestId('mv-summary')).toContainText('changes in movement level in the last 7 days');
  const obs = page.getByTestId('mv-observations');
  await expect(obs.getByText('Measured by Tanda').first()).toBeVisible();
  await expect(obs.getByTestId('simulated-tag').first()).toBeVisible();
  await obs.getByRole('button', { name: 'Add observation' }).first().click();
  await page.getByLabel('What did you notice?').fill('Rocking while waiting for lunch; seemed content.');
  await obs.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(obs.locator('.caregiver-note').first()).toContainText('Your observation');
  await page.reload();
  await expect(page.getByTestId('mv-observations').locator('.caregiver-note').first()).toContainText('Rocking while waiting for lunch');
  await expectAccessible(page, 'movement');
});

test('Sign language research: honest status; prototypes only behind Labs', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.getByRole('link', { name: /Sign language research/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign Language Research' })).toBeVisible();
  await expect(page.getByTestId('research-tag')).toHaveText('Research, not a working feature');
  await expect(page.getByText('Tanda does not translate BIM or ASL.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open sign packs' })).toHaveCount(0);
  await page.getByRole('link', { name: /Turn them on in Settings/ }).click();
  await page.getByRole('switch', { name: 'Sign packs' }).click();
  await page.goto('/#/research');
  await expect(page.getByRole('link', { name: 'Open sign packs' })).toBeVisible();
  await expectAccessible(page, 'research');
});

test('Communication overview: principle, workflow, real counts, and a labelled demo path', async ({ page, guard }) => {
  void guard;
  await onboard(page);
  await page.getByRole('button', { name: 'Use camera' }).click();
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { level: 1, name: 'Communication' })).toBeVisible();
  await expect(page.getByText('Tanda recognises movement. People provide the meaning.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Communication sections' }).getByRole('link')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Gestures taught' })).toContainText('0');
  await expect(page.getByRole('heading', { name: 'Simulated demonstration' })).toBeVisible();
  await expectAccessible(page, 'overview');
});

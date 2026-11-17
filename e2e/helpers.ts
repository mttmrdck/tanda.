import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Pre-seed settings before the app loads (localStorage). */
export async function seedSettings(page: Page, s: Record<string, unknown>) {
  await page.addInitScript((v) => {
    const key = 'isyarat.settings.v1';
    const cur = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
    localStorage.setItem(key, JSON.stringify({ ...cur, ...v }));
  }, s);
}

/** Count getUserMedia calls (to prove the consent gate / button-press rule). */
export async function spyCamera(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __gumCalls: number };
    w.__gumCalls = 0;
    const md = navigator.mediaDevices;
    if (!md) return;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = (c?: MediaStreamConstraints) => {
      w.__gumCalls++;
      return orig(c);
    };
  });
}

export const gumCalls = (page: Page) => page.evaluate(() => (window as unknown as { __gumCalls: number }).__gumCalls);

/** Complete onboarding through the UI and land on Live. */
export async function onboard(page: Page, name = 'Adam') {
  await page.goto('/');
  await expect(page).toHaveURL(/#\/onboarding/);
  await page.getByRole('button', { name: 'Get started' }).click();
  for (const box of await page.getByRole('checkbox').all()) await box.check({ force: true });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Child’s nickname').fill(name);
  await page.getByRole('button', { name: 'Create profile' }).click();
  await expect(page.getByRole('heading', { name: `All set for ${name}` })).toBeVisible();
}

/** Axe: zero serious or critical violations. */
export async function expectAccessible(page: Page, context: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    bad.map((v) => `${context}: ${v.id} (${v.impact}) — ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`),
    'serious/critical axe violations',
  ).toEqual([]);
}

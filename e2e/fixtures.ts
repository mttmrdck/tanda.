import { test as base, expect, type Page } from '@playwright/test';

/**
 * Known third-party diagnostics that are not produced by Isyarat code and cannot be switched off from JS:
 * - MediaPipe's native (glog-format) warnings, e.g. "W1117 04:36:52.5 gl_context.cc:1118] OpenGL error checking is disabled"
 * - Chromium's own WebGL driver performance notes, e.g. "[.WebGL-0x…]GL Driver Message (OpenGL, Performance, …)"
 * Only WARNINGS matching these exact shapes are tolerated; every console ERROR still fails the test.
 * Documented in DECISIONS.md and README "Troubleshooting".
 */
export const KNOWN_THIRD_PARTY_WARNINGS = [/^warning: W\d{4} [\d:.]+ +\d+ [\w.]+\.cc:\d+\] /, /^warning: \[\.WebGL-0x[0-9a-f]+\]GL Driver Message \(OpenGL, Performance/];

export interface Guard {
  consoleProblems: string[];
  externalRequests: string[];
}

/**
 * Every test gets: a console guard (errors + warnings) and a network guard (any request that leaves the
 * localhost origin is recorded and aborted). Both are asserted empty after the test.
 */
export const test = base.extend<{ guard: Guard }>({
  guard: async ({ page }, use) => {
    const g: Guard = { consoleProblems: [], externalRequests: [] };
    page.on('console', (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return;
      const line = `${m.type()}: ${m.text()}`;
      if (m.type() === 'warning' && KNOWN_THIRD_PARTY_WARNINGS.some((r) => r.test(line))) return;
      g.consoleProblems.push(line);
    });
    page.on('pageerror', (e) => g.consoleProblems.push(`pageerror: ${e.message}`));
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      g.externalRequests.push(url.href);
      return route.abort();
    });
    await use(g);
    expect(g.externalRequests, 'requests left the device').toEqual([]);
    expect(g.consoleProblems, 'console errors/warnings').toEqual([]);
  },
});

export { expect };

/** Wait until the debug hook is installed. */
export async function debugReady(page: Page) {
  await page.waitForFunction(() => '__isyaratDebug' in window);
}

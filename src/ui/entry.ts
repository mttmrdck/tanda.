/**
 * First-visit introduction. The splash plays once per browser session when Tanda is opened at its root URL;
 * deep links, refreshes inside the app and internal navigation never replay it. The flag lives in
 * sessionStorage (a per-tab UI convenience, not a setting), and the app still works if storage is blocked.
 */
const KEY = 'tanda.intro.seen';

export function shouldPlayIntro(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== '1';
  } catch {
    return true;
  }
}

export function markIntroSeen() {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* storage blocked: the intro may play again next time, which is harmless */
  }
}

/** Set as the splash hands over, so the app shell can make its one-time arrival. */
export const entry = { fromIntro: false };

/** One shared load of the Home/Activity code: the introduction warms it, the routes reuse the same promise. */
let platform: Promise<typeof import('./pages/Platform')> | undefined;
export const loadPlatform = () => (platform ??= import('./pages/Platform'));

import { create } from 'zustand';
import { z } from 'zod';
import { defaultLang } from '../i18n';

const SETTINGS_KEY = 'isyarat.settings.v1';

export const settingsSchema = z.object({
  lang: z.enum(['en', 'ms']),
  theme: z.enum(['system', 'light', 'dim']),
  sensitivity: z.number().min(0.7).max(1.4),
  windowMs: z.number().min(1000).max(4000),
  targetFps: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)]),
  batterySaver: z.boolean(),
  skeletonTeach: z.boolean(),
  skeletonLive: z.boolean(),
  speakAloud: z.boolean(),
  vibration: z.boolean(),
  cameraDeviceId: z.string(),
  cameraFacing: z.enum(['user', 'environment']),
  /** desktop: side menu hidden (main tabs move into the top bar) */
  navHidden: z.boolean(),
  consented: z.boolean(),
  activeProfileId: z.string(),
});
export type Settings = z.infer<typeof settingsSchema>;

export function defaultSettings(navLang?: string): Settings {
  return {
    lang: defaultLang(navLang),
    theme: 'dim',
    sensitivity: 1,
    windowMs: 2000,
    targetFps: 15,
    batterySaver: false,
    skeletonTeach: true,
    skeletonLive: false,
    speakAloud: false,
    vibration: false,
    cameraDeviceId: '',
    cameraFacing: 'user',
    navHidden: false,
    consented: false,
    activeProfileId: '',
  };
}

function load(): Settings {
  const base = defaultSettings(typeof navigator !== 'undefined' ? navigator.language : undefined);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return base;
    const parsed = settingsSchema.partial().safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? { ...base, ...parsed.data } : base;
  } catch {
    return base;
  }
}

interface SettingsState extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>((setState, get) => ({
  ...load(),
  set: (patch) => {
    setState(patch);
    const { set: _s, reset: _r, ...rest } = get();
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
    } catch {
      // storage unavailable (private mode): settings still apply for this session
    }
  },
  reset: () => {
    try {
      localStorage.removeItem(SETTINGS_KEY);
    } catch {
      // ignore
    }
    setState(defaultSettings(navigator.language));
  },
}));

import { clsx } from 'clsx';
import { Activity, BookOpen, ChartColumn, House, Info, Lock, Moon, Radio, Settings, Share2, Sun, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useT, type MsgKey } from '../../i18n';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button } from './Button';
import { Select } from './Controls';
import { Dialog } from './Dialog';

interface NavItem {
  href: string;
  label: MsgKey;
  Icon: LucideIcon;
}

/** The four bottom tabs (phone) — the desktop rail adds the rest. */
const TABS: NavItem[] = [
  { href: '/home', label: 'navHome', Icon: House },
  { href: '/teach', label: 'navTeach', Icon: Activity },
  { href: '/', label: 'navLive', Icon: Radio },
  { href: '/timeline', label: 'navInsights', Icon: ChartColumn },
];
const MORE: NavItem[] = [
  { href: '/signals', label: 'navSignals', Icon: BookOpen },
  { href: '/handover', label: 'navHandover', Icon: Share2 },
  { href: '/settings', label: 'navProfile', Icon: Settings },
  { href: '/about', label: 'navAbout', Icon: Info },
];

const STROKE = 1.75;

function isActive(loc: string, href: string) {
  return href === '/' ? loc === '/' : loc === href || loc.startsWith(`${href}/`);
}

/** Abstract mark: a raised hand made of three strokes and a dot. */
function Mark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#7ED957" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${id})`} />
      <path d="M12 27c3-7 5-10 8-10s5 3 8 10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="11.5" r="3.2" fill="#fff" />
    </svg>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="size-9" />
      <span className="text-xl font-extrabold tracking-tight max-[379px]:sr-only">Isyarat</span>
    </span>
  );
}

/** Neutral avatar: the child's initial on a gradient — never a photo or a face. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      aria-hidden
      className={clsx(
        'grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#2F6BFF,#7ED957)] font-extrabold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]',
        size === 'lg' ? 'size-14 text-2xl' : 'size-11 text-lg',
      )}
    >
      {initial}
    </span>
  );
}

export function PrivacyChip() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-calm-bg px-4 text-sm font-bold text-calm-fg"
      >
        <Lock aria-hidden strokeWidth={STROKE} className="size-4" />
        {t('privacyChip')}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('privacyTitle')}
        footer={
          <Link href="/about" onClick={() => setOpen(false)} className="press inline-flex min-h-12 items-center rounded-full px-5 font-bold text-primary hover:bg-primary-soft">
            {t('privacyMore')}
          </Link>
        }
      >
        <ul className="mt-2 space-y-3">
          {(['privacyBody1', 'privacyBody2', 'privacyBody3', 'privacyBody4', 'noFaces'] as const).map((k) => (
            <li key={k} className="flex gap-3">
              <Lock aria-hidden strokeWidth={STROKE} className="mt-1 size-4 shrink-0 text-calm-fg" />
              <span>{t(k)}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

export function LanguageToggle() {
  const t = useT();
  const lang = useSettings((s) => s.lang);
  const set = useSettings((s) => s.set);
  return (
    <button
      type="button"
      onClick={() => set({ lang: lang === 'en' ? 'ms' : 'en' })}
      title={t('langSwitch')}
      className="press inline-flex size-12 items-center justify-center rounded-full bg-surface-2 text-sm font-extrabold shadow-[var(--hairline)] hover:text-primary"
    >
      <span lang={lang === 'en' ? 'ms' : 'en'}>{t('langShort')}</span>
      <span className="sr-only">: {t('langSwitch')}</span>
    </button>
  );
}

export function ThemeToggle() {
  const t = useT();
  const theme = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dim' : 'light') : theme;
  return (
    <button
      type="button"
      aria-label={`${t('themeLabel')}: ${t(resolved === 'dim' ? 'themeDim' : 'themeLight')}`}
      title={`${t('themeLabel')}: ${t(resolved === 'dim' ? 'themeDim' : 'themeLight')}`}
      aria-pressed={resolved === 'dim'}
      onClick={() => set({ theme: resolved === 'dim' ? 'light' : 'dim' })}
      className="press inline-flex size-12 items-center justify-center rounded-full bg-surface-2 shadow-[var(--hairline)] hover:text-primary"
    >
      {resolved === 'dim' ? <Moon aria-hidden strokeWidth={STROKE} className="size-5" /> : <Sun aria-hidden strokeWidth={STROKE} className="size-5" />}
    </button>
  );
}

function ProfileButton() {
  const t = useT();
  const profile = useData((s) => s.profile);
  if (!profile) return null;
  return (
    <Link href="/settings" className="press rounded-full" aria-label={`${t('navProfile')}: ${profile.nickname}`}>
      <Avatar name={profile.nickname} />
    </Link>
  );
}

function ProfileSwitcher() {
  const t = useT();
  const profiles = useData((s) => s.profiles);
  const profile = useData((s) => s.profile);
  const select = useData((s) => s.selectProfile);
  const [, navigate] = useLocation();
  if (!profile) return null;
  return (
    <div className="space-y-2">
      {profiles.length > 1 ? (
        <Select label={t('profileLabel')} value={profile.id} onChange={(id) => void select(id)} options={profiles.map((p) => ({ value: p.id, label: p.nickname }))} />
      ) : (
        <div className="flex items-center gap-3">
          <Avatar name={profile.nickname} />
          <div className="min-w-0">
            <span className="block text-sm text-ink-muted">{t('profileLabel')}</span>
            <span className="block truncate font-bold">{profile.nickname}</span>
          </div>
        </div>
      )}
      <Button variant="quiet" className="w-full justify-start px-3" onClick={() => navigate('/onboarding/profile')}>
        {t('addProfile')}
      </Button>
    </div>
  );
}

function NavRail() {
  const t = useT();
  const [loc] = useLocation();
  const link = (it: NavItem) => {
    const active = isActive(loc, it.href);
    return (
      <li key={it.href}>
        <Link
          href={it.href}
          aria-current={active ? 'page' : undefined}
          className={clsx(
            'press flex min-h-12 items-center gap-3 rounded-full px-4 font-bold transition-colors duration-200',
            active ? 'bg-primary-fill text-on-primary shadow-[0_6px_24px_-6px_rgb(42_99_242/0.7)]' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          <it.Icon aria-hidden strokeWidth={STROKE} className="size-5" />
          {t(it.label)}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label={t('navMain')} className="sticky top-0 hidden h-dvh flex-col gap-6 px-4 py-6 lg:flex">
      <Link href="/home" className="rounded-full px-2">
        <Logo />
      </Link>
      <ul className="space-y-1">{TABS.map(link)}</ul>
      <ul className="space-y-1 border-t border-border-soft pt-4">{MORE.map(link)}</ul>
      <div className="mt-auto rounded-[24px] bg-surface p-4 shadow-[var(--hairline)]">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}

function TabBar() {
  const t = useT();
  const [loc] = useLocation();
  const prev = useRef(loc);
  const [bounce, setBounce] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current !== loc) setBounce(loc);
    prev.current = loc;
  }, [loc]);
  return (
    <nav aria-label={t('navMain')} className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
      <ul className="glass mx-auto flex max-w-md gap-1 rounded-[28px] p-1.5">
        {TABS.map((it) => {
          const active = isActive(loc, it.href);
          return (
            <li key={it.href} className="flex flex-1">
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-xs font-bold transition-colors duration-200',
                  active ? 'bg-primary-fill text-on-primary shadow-[0_6px_24px_-4px_rgb(42_99_242/0.75)]' : 'text-ink-muted hover:text-ink',
                )}
              >
                <it.Icon aria-hidden strokeWidth={STROKE} className={clsx('size-6', active && bounce === loc && 'tab-bounce')} />
                {t(it.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] sm:px-6 lg:px-10">
      <div className="glass mx-auto flex max-w-[1200px] items-center justify-between gap-2 rounded-[28px] py-1.5 pl-4 pr-1.5 lg:bg-transparent lg:shadow-none">
        <Link href="/home" className="rounded-full lg:hidden">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden sm:inline-flex">
            <PrivacyChip />
          </span>
          <LanguageToggle />
          <ThemeToggle />
          <ProfileButton />
        </div>
      </div>
      <div className="mt-2 flex justify-center sm:hidden">
        <PrivacyChip />
      </div>
    </header>
  );
}

export function Backdrop() {
  return <div aria-hidden className="bg-blobs" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [loc] = useLocation();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <Backdrop />
      <a href="#main" className="sr-only z-50 rounded-full bg-primary-fill px-5 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('skipToContent')}
      </a>
      <NavRail />
      <div className="min-w-0">
        <TopBar />
        <main
          id="main"
          key={'startViewTransition' in document ? undefined : loc}
          tabIndex={-1}
          className={clsx('mx-auto max-w-[1200px] px-4 pb-36 pt-5 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-6', !('startViewTransition' in document) && 'page-enter')}
        >
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}

/** Minimal shell for onboarding (no navigation). */
export function BareShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-dvh">
      <Backdrop />
      <a href="#main" className="sr-only z-50 rounded-full bg-primary-fill px-5 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('skipToContent')}
      </a>
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 pb-16 outline-none sm:px-6">
        {children}
      </main>
    </div>
  );
}

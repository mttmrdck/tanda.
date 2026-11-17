import { clsx } from 'clsx';
import { Activity, BookOpen, Clock, Ellipsis, Info, Lock, Moon, Radio, Settings, Share2, Sun, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useT, type MsgKey } from '../../i18n';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { Button, IconButton } from './Button';
import { Select } from './Controls';
import { Dialog } from './Dialog';

interface NavItem {
  href: string;
  label: MsgKey;
  Icon: typeof Radio;
}

const PRIMARY: NavItem[] = [
  { href: '/', label: 'navLive', Icon: Radio },
  { href: '/teach', label: 'navTeach', Icon: Activity },
  { href: '/signals', label: 'navSignals', Icon: BookOpen },
  { href: '/timeline', label: 'navTimeline', Icon: Clock },
];
const SECONDARY: NavItem[] = [
  { href: '/handover', label: 'navHandover', Icon: Share2 },
  { href: '/settings', label: 'navSettings', Icon: Settings },
  { href: '/about', label: 'navAbout', Icon: Info },
];

function isActive(loc: string, href: string) {
  return href === '/' ? loc === '/' : loc === href || loc.startsWith(`${href}/`);
}

function Logo() {
  return (
    <span className="flex items-center gap-3">
      <svg aria-hidden viewBox="0 0 64 64" className="size-10">
        <rect width="64" height="64" rx="16" fill="var(--primary)" />
        <path d="M20 40c4-10 8-16 12-16s8 6 12 16" fill="none" stroke="var(--on-primary)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="32" cy="18" r="5" fill="var(--on-primary)" />
      </svg>
      <span className="font-display text-2xl font-semibold">Isyarat</span>
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
        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-calm-fg/40 bg-calm-bg px-4 text-sm font-bold text-calm-fg transition-transform duration-[120ms] active:scale-[0.98]"
      >
        <Lock aria-hidden className="size-4" />
        {t('privacyChip')}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('privacyTitle')}
        footer={
          <Link href="/about" onClick={() => setOpen(false)} className="inline-flex min-h-12 items-center rounded-[12px] px-4 font-bold text-primary hover:bg-primary-soft">
            {t('privacyMore')}
          </Link>
        }
      >
        <ul className="mt-2 space-y-3">
          {(['privacyBody1', 'privacyBody2', 'privacyBody3', 'privacyBody4', 'noFaces'] as const).map((k) => (
            <li key={k} className="flex gap-3">
              <Lock aria-hidden className="mt-1 size-4 shrink-0 text-calm-fg" />
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
      className="inline-flex size-12 items-center justify-center rounded-[12px] border border-border bg-surface font-bold transition-transform duration-[120ms] hover:bg-surface-2 active:scale-[0.98]"
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
  const next = resolved === 'dim' ? 'light' : 'dim';
  return (
    <IconButton
      variant="secondary"
      label={`${t('themeLabel')}: ${t(resolved === 'dim' ? 'themeDim' : 'themeLight')}`}
      aria-pressed={resolved === 'dim'}
      onClick={() => set({ theme: next })}
    >
      {resolved === 'dim' ? <Moon aria-hidden className="size-5" /> : <Sun aria-hidden className="size-5" />}
    </IconButton>
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
        <div>
          <span className="block text-sm text-ink-muted">{t('profileLabel')}</span>
          <span className="flex min-h-12 items-center gap-2 font-bold">
            <UserRound aria-hidden className="size-5 text-primary" />
            {profile.nickname}
          </span>
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
  const link = (it: NavItem) => (
    <li key={it.href}>
      <Link
        href={it.href}
        aria-current={isActive(loc, it.href) ? 'page' : undefined}
        className={clsx(
          'flex min-h-12 items-center gap-3 rounded-[12px] px-3 font-bold transition-colors duration-[120ms]',
          isActive(loc, it.href) ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
        )}
      >
        <it.Icon aria-hidden className="size-5" />
        {t(it.label)}
      </Link>
    </li>
  );
  return (
    <nav aria-label={t('navMain')} className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border-soft bg-surface px-4 py-6 lg:flex">
      <Link href="/" className="rounded-[12px] px-2">
        <Logo />
      </Link>
      <ul className="space-y-1">{PRIMARY.map(link)}</ul>
      <ul className="space-y-1 border-t border-border-soft pt-4">{SECONDARY.map(link)}</ul>
      <div className="mt-auto border-t border-border-soft pt-4">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}

function TabBar() {
  const t = useT();
  const [loc] = useLocation();
  const [more, setMore] = useState(false);
  const moreActive = SECONDARY.some((i) => isActive(loc, i.href));
  const cls = (active: boolean) =>
    clsx('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[12px] text-xs font-bold', active ? 'text-primary' : 'text-ink-muted');
  return (
    <nav aria-label={t('navMain')} className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-xl gap-1">
        {PRIMARY.map((it) => (
          <li key={it.href} className="flex flex-1">
            <Link href={it.href} aria-current={isActive(loc, it.href) ? 'page' : undefined} className={cls(isActive(loc, it.href))}>
              <it.Icon aria-hidden className="size-6" />
              {t(it.label)}
            </Link>
          </li>
        ))}
        <li className="flex flex-1">
          <button type="button" className={cls(moreActive)} onClick={() => setMore(true)} aria-haspopup="dialog">
            <Ellipsis aria-hidden className="size-6" />
            {t('navMore')}
          </button>
        </li>
      </ul>
      <Dialog open={more} onOpenChange={setMore} title={t('moreTitle')} sheet>
        <ul className="mt-2 space-y-1">
          {SECONDARY.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={() => setMore(false)}
                aria-current={isActive(loc, it.href) ? 'page' : undefined}
                className="flex min-h-14 items-center gap-3 rounded-[12px] px-3 text-lg font-bold hover:bg-surface-2"
              >
                <it.Icon aria-hidden className="size-6 text-primary" />
                {t(it.label)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-border-soft pt-4">
          <ProfileSwitcher />
        </div>
      </Dialog>
    </nav>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border-soft bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-10">
        <span className="lg:hidden">
          <Logo />
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex">
            <PrivacyChip />
          </span>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="flex justify-center pb-2 sm:hidden">
        <PrivacyChip />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a href="#main" className="sr-only z-50 rounded-[12px] bg-primary px-4 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('skipToContent')}
      </a>
      <NavRail />
      <div className="min-w-0">
        <TopBar />
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1200px] px-4 pb-32 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">
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
      <a href="#main" className="sr-only z-50 rounded-[12px] bg-primary px-4 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('skipToContent')}
      </a>
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
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

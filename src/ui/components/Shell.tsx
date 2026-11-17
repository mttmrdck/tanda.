import { PillNavigation } from '../vendor/pill-navigation';
import { clsx } from 'clsx';
import { Hand, BookOpen, ChartColumn, FlaskConical, House, Info, Lock, PanelLeftClose, PanelLeftOpen, Radio, Settings, Share2, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
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
  { href: '/teach', label: 'navTeach', Icon: Hand },
  { href: '/', label: 'navLive', Icon: Radio },
  { href: '/timeline', label: 'navInsights', Icon: ChartColumn },
];
const MORE: NavItem[] = [
  { href: '/signals', label: 'navSignals', Icon: BookOpen },
  { href: '/handover', label: 'navHandover', Icon: Share2 },
  { href: '/settings', label: 'navProfile', Icon: Settings },
  { href: '/about', label: 'navAbout', Icon: Info },
];

const SIGNS: NavItem = { href: '/signs', label: 'navSigns', Icon: FlaskConical };

const STROKE = 1.75;

function isActive(loc: string, href: string) {
  return href === '/' ? loc === '/' : loc === href || loc.startsWith(`${href}/`);
}

/** The supplied Tanda icon is used directly, without redrawing the mark. */
function Mark({ className }: { className?: string }) {
  return <img aria-hidden alt="" width={40} height={40} className={clsx('brand-mark',className)} src={`${import.meta.env.BASE_URL}brand/tanda-icon.png`} />;
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="size-9" />
      <span className="text-xl font-extrabold tracking-tight">tanda.</span>
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
        'grid shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-semibold',
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
        className="privacy-button press inline-flex min-h-12 items-center gap-2 rounded-full bg-calm-bg px-4 text-sm font-bold text-calm-fg"
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

function NavRail({ hidden }: { hidden: boolean }) {
  const t = useT();
  const signsOn = useSettings((s) => s.labsSignPacks);
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
            active ? 'bg-primary-fill text-on-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          <it.Icon aria-hidden strokeWidth={STROKE} className="size-5" />
          {t(it.label)}
        </Link>
      </li>
    );
  };
  return (
    <nav id="nav-rail" aria-label={t('navMain')} inert={hidden} className="nav-rail sticky top-0 hidden h-dvh flex-col gap-6 px-4 py-6 lg:flex">
      <Link href="/home" className="rounded-full px-2">
        <Logo />
      </Link>
      <ul className="space-y-1">{TABS.map(link)}</ul>
      <ul className="space-y-1 border-t border-border-soft pt-4">{(signsOn ? [...MORE, SIGNS] : MORE).map(link)}</ul>
      <div className="mt-auto rounded-[24px] bg-surface p-4 ">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}

function TabBar() {
  const t = useT();
  const [loc] = useLocation();
  return (
    <nav aria-label={t('navMain')} className="tab-bar fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
      <PillNavigation className="glass mx-auto flex max-w-md gap-1 rounded-[28px] p-1.5">
        {TABS.map((it) => {
          const active = isActive(loc, it.href);
          return (
            <li key={it.href} className="flex flex-1">
              <Link
                href={it.href}
                title={t(it.label)}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'press flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] text-xs font-bold transition-colors duration-200',
                  active ? 'bg-primary-fill text-on-primary' : 'text-ink-muted hover:text-ink',
                )}
              >
                <it.Icon aria-hidden strokeWidth={STROKE} className="size-6" />
                <span className="sr-only">{t(it.label)}</span>
              </Link>
            </li>
          );
        })}
      </PillNavigation>
    </nav>
  );
}

function TopBar() {
  const t = useT();
  const [loc] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > 92);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const item = [...TABS, ...MORE, SIGNS].find(it => isActive(loc, it.href));
  const navHidden = useSettings((s) => s.navHidden);
  const setSettings = useSettings((s) => s.set);
  return (
    <header className="top-bar sticky top-0 z-20 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] sm:px-6 lg:px-10">
      <div className="glass mx-auto flex max-w-[1160px] items-center justify-between gap-2 rounded-[28px] py-1.5 pl-4 pr-1.5">
        <Link href="/home" className="rounded-full lg:hidden">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setSettings({ navHidden: !navHidden })}
          aria-expanded={!navHidden}
          aria-controls="nav-rail"
          aria-label={t(navHidden ? 'navShowMenu' : 'navHideMenu')}
          title={t(navHidden ? 'navShowMenu' : 'navHideMenu')}
          className="nav-toggle press hidden size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink lg:grid"
        >
          {navHidden ? <PanelLeftOpen aria-hidden strokeWidth={STROKE} className="size-5" /> : <PanelLeftClose aria-hidden strokeWidth={STROKE} className="size-5" />}
        </button>
        {/* With the side menu hidden, the logo and the main tabs move into the bar. */}
        <div className="top-nav hidden items-center gap-4 lg:flex" inert={!navHidden} aria-hidden={!navHidden}>
          <Link href="/home" className="rounded-full">
            <Logo />
          </Link>
          <nav aria-label={t('navMain')}>
            <ul className="flex items-center gap-1">
              {TABS.map((it) => {
                const active = isActive(loc, it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'press flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors duration-200',
                        active ? 'bg-primary-soft text-primary' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                      )}
                    >
                      <it.Icon aria-hidden strokeWidth={STROKE} className="size-[18px]" />
                      {t(it.label)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <span aria-hidden className="inline-title hidden font-semibold lg:block" style={{ visibility: collapsed && !navHidden ? 'visible' : 'hidden' }}>{item ? t(item.label) : 'Tanda'}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <ProfileButton />
        </div>
      </div>

    </header>
  );
}

export function Backdrop() {
  return <div aria-hidden className="bg-blobs" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const navHidden = useSettings((s) => s.navHidden);
  return (
    <div className="app-shell min-h-dvh" data-nav={navHidden ? 'hidden' : 'shown'}>
      <Backdrop />
      <a href="#main" className="sr-only z-50 rounded-full bg-primary-fill px-5 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t('skipToContent')}
      </a>
      <div className="rail-slot hidden lg:block">
        <NavRail hidden={navHidden} />
      </div>
      <div className="min-w-0">
        <TopBar />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-[1160px] px-4 pb-36 pt-5 outline-none sm:px-6 lg:px-10 lg:pb-16 lg:pt-6"
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
      <header className="bare-header mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)] sm:px-6">
        <Logo />

      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-2xl px-4 pb-16 outline-none sm:px-6">
        {children}
      </main>
    </div>
  );
}

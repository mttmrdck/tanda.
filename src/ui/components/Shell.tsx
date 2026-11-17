import { PillNavigation } from '../vendor/pill-navigation';
import { clsx } from 'clsx';
import {
  Bell,
  Cpu,
  Activity,
  BookOpen,
  Camera,
  ChartColumn,
  FlaskConical,
  Hand,
  Info,
  LayoutGrid,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronRight,
  Radio,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useT, type MsgKey } from '../../i18n';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { useSession } from '../../store/useSession';
import { useTranslateCam } from '../../store/translateSession';
import { Button } from './Button';
import { Select } from './Controls';
import { Dialog } from './Dialog';

interface NavItem {
  href: string;
  label: MsgKey;
  Icon: LucideIcon;
  /** other routes that belong to this destination */
  match?: string[];
  /** a short status word shown next to the label (e.g. Experimental) */
  tag?: MsgKey;
}

/**
 * Information architecture. Communication (the core product) comes first and has four sections; Movement
 * Insights is marked experimental; Sign language research is set apart. Paths are unchanged from earlier
 * versions so bookmarks and tests keep working.
 */
export const COMM: NavItem[] = [
  { href: '/home', label: 'navHome', Icon: LayoutGrid },
  { href: '/teach', label: 'navTeach', Icon: Hand },
  { href: '/', label: 'navLive', Icon: Radio },
  { href: '/signals', label: 'navSignals', Icon: BookOpen },
];
const PLATFORM: NavItem[] = [
  { href: '/overview', label: 'monOverview', Icon: LayoutGrid },
  { href: '/monitoring', label: 'monLiveMonitoring', Icon: Camera },
  { href: '/events', label: 'monEvents', Icon: Bell },
  { href: '/devices', label: 'monDevices', Icon: Cpu },
];
const AREAS: NavItem[] = [
  { href: '/movement', label: 'navMovement', Icon: Activity, tag: 'tagExperimental' },
  { href: '/individuals', label: 'navIndividuals', Icon: Users, match: ['/handover'] },
  { href: '/timeline', label: 'navInsights', Icon: ChartColumn },
];
const RESEARCH: NavItem = {
  href: '/research',
  label: 'navResearch',
  Icon: FlaskConical,
  tag: 'tagResearch',
  match: ['/signs', '/translate'],
};
const UTIL: NavItem[] = [
  { href: '/settings', label: 'navProfile', Icon: Settings },
  { href: '/about', label: 'navAbout', Icon: Info },
];
/** Phone tab bar: the core actions stay one tap away. */
const TABS: NavItem[] = [
  { href: '/overview', label: 'monOverview', Icon: LayoutGrid },
  { href: '/monitoring', label: 'monLiveMonitoring', Icon: Camera },
  { href: '/events', label: 'monEvents', Icon: Bell },
  { href: '/home', label: 'navCommunication', Icon: Hand, match: ['/teach', '/signals', '/'] },
  { href: '/timeline', label: 'navInsights', Icon: ChartColumn },
];
const PRIMARY: NavItem[] = [
  PLATFORM[0]!,
  PLATFORM[1]!,
  AREAS[1]!,
  PLATFORM[2]!,
  { href: '/home', label: 'navCommunication', Icon: Hand, match: ['/teach', '/signals', '/'] },
  AREAS[2]!,
  PLATFORM[3]!,
  UTIL[0]!,
];
const ALL: NavItem[] = [...PLATFORM, ...COMM, ...AREAS, RESEARCH, ...UTIL];

const STROKE = 1.75;

const onPath = (loc: string, href: string) => (href === '/' ? loc === '/' : loc === href || loc.startsWith(`${href}/`));
function isActive(loc: string, it: NavItem | string) {
  if (typeof it === 'string') return onPath(loc, it);
  return onPath(loc, it.href) || (it.match ?? []).some((m) => onPath(loc, m));
}
export const isCommunicationRoute = (loc: string) => COMM.some((it) => onPath(loc, it.href));

/** The supplied Tanda icon is used directly, without redrawing the mark. */
function Mark({ className }: { className?: string }) {
  return (
    <img
      aria-hidden
      alt=""
      width={40}
      height={40}
      className={clsx('brand-mark', className)}
      src={`${import.meta.env.BASE_URL}brand/tanda-icon.png`}
    />
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="size-9" />
      <span className="text-xl font-extrabold tracking-tight">tanda.</span>
    </span>
  );
}

/** Neutral avatar: the individual's initial — never a photo or a face. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      aria-hidden
      className={clsx(
        'individual-avatar grid shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-semibold',
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
          <Link
            href="/about"
            onClick={() => setOpen(false)}
            className="press inline-flex min-h-12 items-center rounded-full px-5 font-bold text-primary hover:bg-primary-soft"
          >
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

/** The selected individual, always visible; opens Individuals. Initial only — never a photo. */
function ProfileButton() {
  const t = useT();
  const profile = useData((s) => s.profile);
  if (!profile) return null;
  return (
    <Link
      href="/individuals"
      className="press flex min-h-12 items-center gap-2 rounded-full pl-1 pr-1 sm:pl-3"
      data-testid="current-individual"
    >
      {/* the accessible name contains the visible name: "Individual: Adam" */}
      <span className="sr-only">{t('profileLabel')}: </span>
      <span className="max-w-[12rem] truncate text-sm font-semibold max-sm:sr-only">{profile.nickname}</span>
      <Avatar name={profile.nickname} />
    </Link>
  );
}

/** Which video source is running anywhere in the app: real camera, or the simulated demo performer. */
function ModeChip() {
  const t = useT();
  const live = useSession((s) => (s.phase === 'running' || s.phase === 'starting' ? s.kind : null));
  const tr = useTranslateCam((s) => (s.phase === 'running' || s.phase === 'starting' ? s.kind : null));
  const kind = live ?? tr;
  if (!kind) return null;
  return (
    <span
      role="status"
      className={clsx(
        'mode-chip inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold',
        kind === 'demo' ? 'bg-rising-bg text-rising-fg' : 'bg-calm-bg text-calm-fg',
      )}
      data-testid="mode-chip"
    >
      {kind === 'demo' ? <FlaskConical aria-hidden className="size-4" /> : <Camera aria-hidden className="size-4" />}
      {t(kind === 'demo' ? 'modeDemo' : 'modeCamera')}
    </span>
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
        <Select
          label={t('profileLabel')}
          value={profile.id}
          onChange={(id) => void select(id)}
          options={profiles.map((p) => ({ value: p.id, label: p.nickname }))}
        />
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
  const [loc] = useLocation();
  const link = (it: NavItem, nested = false) => {
    const active = isActive(loc, it);
    return (
      <li key={it.href}>
        <Link
          href={it.href}
          aria-current={active ? 'page' : undefined}
          className={clsx(
            'nav-link press flex min-h-12 items-center gap-3 rounded-[14px] px-3 font-semibold transition-colors duration-200',
            nested && 'pl-4',
            active ? 'is-active' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
          )}
        >
          <it.Icon aria-hidden strokeWidth={STROKE} className="size-5 shrink-0" />
          <span className="min-w-0 flex-1 break-words text-sm leading-snug">{t(it.label)}</span>
          {it.tag && <span className="nav-tag">{t(it.tag)}</span>}
        </Link>
      </li>
    );
  };
  const commActive = isCommunicationRoute(loc);
  return (
    <nav
      id="nav-rail"
      aria-label={t('navMain')}
      inert={hidden}
      className="nav-rail sticky top-0 hidden h-dvh flex-col gap-5 overflow-y-auto px-3 py-6 lg:flex"
    >
      <Link href="/home" className="rounded-full px-3">
        <Logo />
      </Link>
      <p className="rail-caption">{t('vdWorkspace')}</p>
      <ul className="rail-primary">{PRIMARY.map((it) => link(it))}</ul>
      {commActive && (
        <div className="rail-communication">
          <p className="nav-group-title">{t('navCommSections')}</p>
          <ul>{COMM.map((it) => link(it, true))}</ul>
        </div>
      )}
      <div className="rail-secondary">
        <ul>
          {link(AREAS[0]!)}
          {link(RESEARCH)}
          {link(UTIL[1]!)}
        </ul>
      </div>
      <div className="mt-auto rounded-[20px] bg-surface p-4">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}

/** Second-level navigation for the four Communication sections (all screen sizes). */
function MobileMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('navShowMenu')}
        aria-expanded={open}
        className="mobile-menu-button lg:hidden"
      >
        <Menu aria-hidden size={21} />
      </button>
      <Dialog open={open} onOpenChange={setOpen} title={t('vdAllDestinations')} sheet>
        <nav aria-label={t('vdAllDestinations')} className="mobile-menu-list">
          <ul>
            {[...PRIMARY, AREAS[0]!, RESEARCH, UTIL[1]!].map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(loc, it) ? 'page' : undefined}
                >
                  <it.Icon aria-hidden size={20} />
                  <span>{t(it.label)}</span>
                  <ChevronRight aria-hidden size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Dialog>
    </>
  );
}

export function CommunicationNav() {
  const t = useT();
  const [loc] = useLocation();
  return (
    <nav aria-label={t('navCommSections')} className="comm-nav -mx-1 mb-5 overflow-x-auto px-1">
      <ul className="inline-flex min-w-full gap-1 rounded-[16px] bg-surface-2 p-1 sm:min-w-0">
        {COMM.map((it) => {
          const active = isActive(loc, it);
          return (
            <li key={it.href} className="flex-1 sm:flex-none">
              <Link
                href={it.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'press flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] px-3 text-sm font-semibold sm:px-4',
                  active ? 'bg-surface text-ink shadow-[0_1px_4px_rgb(0_0_0/.12)]' : 'text-ink-muted hover:text-ink',
                )}
              >
                <it.Icon aria-hidden strokeWidth={STROKE} className="size-[18px] shrink-0" />
                {t(it.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabBar() {
  const t = useT();
  const [loc] = useLocation();
  return (
    <nav
      aria-label={t('navMain')}
      className="tab-bar fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
    >
      <PillNavigation className="glass mx-auto flex max-w-md gap-1 rounded-[28px] p-1.5">
        {TABS.map((it) => {
          const active = isActive(loc, it);
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
                <span className="tab-label sr-only">{t(it.label)}</span>
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
  const item = ALL.find((it) => isActive(loc, it));
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
          {navHidden ? (
            <PanelLeftOpen aria-hidden strokeWidth={STROKE} className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden strokeWidth={STROKE} className="size-5" />
          )}
        </button>
        {/* With the side menu hidden, the logo and the main tabs move into the bar. */}
        <div className="top-nav hidden items-center gap-4 lg:flex" inert={!navHidden} aria-hidden={!navHidden}>
          <Link href="/home" className="rounded-full">
            <Logo />
          </Link>
          <nav aria-label={t('navMain')}>
            <ul className="flex items-center gap-1">
              {[...PLATFORM, ...TABS.slice(0, 1), ...AREAS].map((it) => {
                const active = isActive(loc, it);
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
        <div className="workspace-context hidden lg:flex">
          <span>{t('vdWorkspace')}</span>
          <ChevronRight aria-hidden size={14} />
          <span>{item ? t(item.label) : 'Tanda'}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ModeChip />
          <MobileMenu />
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
  const [loc] = useLocation();
  return (
    <div className="app-shell min-h-dvh" data-nav={navHidden ? 'hidden' : 'shown'}>
      <Backdrop />
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary-fill px-5 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
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
          {isCommunicationRoute(loc) && <CommunicationNav />}
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
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary-fill px-5 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
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

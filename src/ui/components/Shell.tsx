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
  House,
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
  ChevronDown,
} from 'lucide-react';
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'motion/react';
import { indicator } from '../motion';
import { useT, type MsgKey } from '../../i18n';
import { useSettings } from '../../store/useApp';
import { useData } from '../../store/useData';
import { useSession } from '../../store/useSession';
import { useTranslateCam } from '../../store/translateSession';
import { Button } from './Button';
import { Select } from './Controls';
import { BrandMark } from './TandaSymbol';
import { entry } from '../entry';
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
  { href: '/live', label: 'navLive', Icon: Radio },
  { href: '/signals', label: 'navSignals', Icon: BookOpen },
];
const PLATFORM: NavItem[] = [
  { href: '/overview', label: 'navHomeTab', Icon: House },
  { href: '/monitoring', label: 'monLiveMonitoring', Icon: Camera },
  { href: '/events', label: 'monEvents', Icon: Bell },
  { href: '/devices', label: 'monDevices', Icon: Cpu },
];
const AREAS: NavItem[] = [
  { href: '/movement', label: 'navMovement', Icon: Activity, tag: 'tagExperimental' },
  { href: '/individuals', label: 'navGroupPeople', Icon: Users, match: ['/handover'] },
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
const COMMUNICATION: NavItem = { href: '/home', label: 'navCommunication', Icon: Hand, match: ['/teach', '/signals', '/live'] };

/**
 * Caregiver-first structure: four destinations (Home · People · Activity · Settings) carry everyday care;
 * tools that a caregiver opens on purpose sit one level down. Paths are unchanged so bookmarks keep working.
 */
const CARE: NavItem[] = [PLATFORM[0]!, AREAS[1]!, PLATFORM[2]!, UTIL[0]!];
const GROUPS: { label: MsgKey; items: NavItem[] }[] = [
  { label: 'navGroupCare', items: CARE },
  { label: 'navGroupTools', items: [COMMUNICATION, PLATFORM[1]!, AREAS[2]!, PLATFORM[3]!] },
];
/** Quieter tier: experimental and research areas, and About. */
const LAB: NavItem[] = [AREAS[0]!, RESEARCH, UTIL[1]!];
/** Phone dock: the four care destinations; everything else behind "More". Order is a tested contract. */
const TABS: NavItem[] = CARE;
const PRIMARY: NavItem[] = GROUPS.flatMap((g) => g.items);
const ALL: NavItem[] = [...PLATFORM, ...COMM, ...AREAS, RESEARCH, ...UTIL];

const STROKE = 1.75;

const onPath = (loc: string, href: string) => (href === '/' ? loc === '/' : loc === href || loc.startsWith(`${href}/`));
function isActive(loc: string, it: NavItem | string) {
  if (typeof it === 'string') return onPath(loc, it);
  return onPath(loc, it.href) || (it.match ?? []).some((m) => onPath(loc, m));
}
export const isCommunicationRoute = (loc: string) => COMM.some((it) => onPath(loc, it.href));

function Logo() {
  return (
    <span className="brand-lockup">
      <BrandMark className="size-8 text-ink" />
      <span className="brand-word">tanda</span>
    </span>
  );
}

/** Neutral avatar: the individual's initial — never a photo or a face. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      aria-hidden
      className={clsx(
        'individual-avatar grid shrink-0 place-items-center rounded-full bg-primary-soft text-primary font-semibold',
        size === 'lg' ? 'size-14 text-2xl' : size === 'sm' ? 'size-8 text-sm' : 'size-11 text-lg',
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
      className="profile-pill press"
      data-testid="current-individual"
    >
      <Avatar name={profile.nickname} size="sm" />
      {/* the accessible name contains the visible name: "Individual: Adam" */}
      <span className="sr-only">{t('profileLabel')}: </span>
      <span className="profile-pill-name">{profile.nickname}</span>
      <ChevronDown size={15} aria-hidden className="profile-pill-chevron" />
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
        <Link href={it.href} aria-current={active ? 'page' : undefined} className={clsx('nav-link press', nested && 'is-nested', active && 'is-active')}>
          {active && <motion.span layoutId="rail-active" className="nav-indicator" transition={indicator} aria-hidden />}
          <it.Icon aria-hidden strokeWidth={STROKE} className="nav-icon" />
          <span className="nav-label">{t(it.label)}</span>
          {it.tag && <span className="nav-tag">{t(it.tag)}</span>}
        </Link>
      </li>
    );
  };
  const commActive = isCommunicationRoute(loc);
  return (
    <nav id="nav-rail" aria-label={t('navMain')} inert={hidden} className="nav-rail sticky top-0 hidden h-dvh flex-col lg:flex">
      <Link href="/overview" className="rail-brand">
        <Logo />
      </Link>
      <div className="rail-groups">
        {GROUPS.map((g) => (
          <div key={g.label} className="rail-group">
            <p className="rail-group-title" id={`rail-${g.label}`}>
              {t(g.label)}
            </p>
            <ul aria-labelledby={`rail-${g.label}`}>
              {g.items.map((it) => (
                <Fragment key={it.href}>
                  {link(it)}
                  {it === COMMUNICATION && commActive && (
                    <li className="rail-sub">
                      <ul aria-label={t('navCommSections')}>{COMM.map((c) => link(c, true))}</ul>
                    </li>
                  )}
                </Fragment>
              ))}
            </ul>
          </div>
        ))}
        <ul className="rail-lab">{LAB.map((it) => link(it))}</ul>
      </div>
      <div className="rail-footer">
        <ProfileSwitcher />
      </div>
    </nav>
  );
}

/** Every destination, in one sheet (phones and tablets). Opened from the dock's "More". */
function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const [loc] = useLocation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('vdAllDestinations')} sheet>
      <nav aria-label={t('vdAllDestinations')} className="mobile-menu-list">
        {[...GROUPS, { label: 'navMore' as MsgKey, items: LAB }].map((g) => (
          <div key={g.label} className="menu-group">
            <p className="rail-group-title">{t(g.label)}</p>
            <ul>
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} onClick={() => onOpenChange(false)} aria-current={isActive(loc, it) ? 'page' : undefined}>
                    <it.Icon aria-hidden size={20} strokeWidth={STROKE} />
                    <span>{t(it.label)}</span>
                    {it.tag && <span className="nav-tag">{t(it.tag)}</span>}
                    <ChevronRight aria-hidden size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Dialog>
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
  const [menu, setMenu] = useState(false);
  const activeIndex = TABS.findIndex((it) => isActive(loc, it));
  const onMore = activeIndex < 0;
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => setKeyboard(viewport.scale === 1 && window.innerHeight - viewport.height > 160);
    sync();
    viewport.addEventListener('resize', sync);
    return () => viewport.removeEventListener('resize', sync);
  }, []);
  return (
    <nav aria-label={t('navMain')} data-keyboard={keyboard} className="tab-bar fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden">
      <PillNavigation className="glass" data-active="true" style={{ '--dock-index': onMore ? 4 : activeIndex } as CSSProperties}>
        {TABS.map((it) => {
          const active = isActive(loc, it);
          return (
            <li key={it.href} className="flex flex-1">
              <Link href={it.href} title={t(it.label)} aria-current={active ? 'page' : undefined} className="press">
                <it.Icon aria-hidden strokeWidth={STROKE} className="size-6" />
                <span className="tab-label sr-only">{t(it.label)}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button type="button" onClick={() => setMenu(true)} aria-label={t('navShowMenu')} aria-expanded={menu} aria-current={onMore ? 'page' : undefined} className="press dock-more">
            <Menu aria-hidden strokeWidth={STROKE} className="size-6" />
          </button>
        </li>
      </PillNavigation>
      <MobileMenu open={menu} onOpenChange={setMenu} />
    </nav>
  );
}

function TopBar() {
  const t = useT();
  const [loc] = useLocation();
  const item = ALL.find((it) => isActive(loc, it));
  const group = GROUPS.find((g) => g.items.some((it) => isActive(loc, it)));
  const navHidden = useSettings((s) => s.navHidden);
  const setSettings = useSettings((s) => s.set);
  return (
    <header className="top-bar sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-10">
      <div className="top-bar-inner mx-auto flex max-w-[1240px] items-center gap-3">
        <Link href="/overview" className="rounded-full lg:hidden">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setSettings({ navHidden: !navHidden })}
          aria-expanded={!navHidden}
          aria-controls="nav-rail"
          aria-label={t(navHidden ? 'navShowMenu' : 'navHideMenu')}
          title={t(navHidden ? 'navShowMenu' : 'navHideMenu')}
          className="nav-toggle press hidden size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink lg:grid"
        >
          {navHidden ? <PanelLeftOpen aria-hidden strokeWidth={STROKE} className="size-5" /> : <PanelLeftClose aria-hidden strokeWidth={STROKE} className="size-5" />}
        </button>
        {/* With the side menu hidden, the main destinations move into the bar. */}
        <div className="top-nav hidden items-center gap-4 lg:flex" inert={!navHidden} aria-hidden={!navHidden}>
          <Link href="/overview" className="rounded-full">
            <Logo />
          </Link>
          <nav aria-label={t('navMain')}>
            <ul className="flex items-center gap-1">
              {PRIMARY.map((it) => {
                const active = isActive(loc, it);
                return (
                  <li key={it.href}>
                    <Link href={it.href} aria-current={active ? 'page' : undefined} className={clsx('top-nav-link press', active && 'is-active')}>
                      {active && <motion.span layoutId="top-active" className="top-nav-indicator" transition={indicator} aria-hidden />}
                      <span className="top-nav-text">{t(it.label)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <p className="workspace-context hidden lg:flex">
          <span>{group ? t(group.label) : t('vdWorkspace')}</span>
          <ChevronRight aria-hidden size={14} />
          <span>{item ? t(item.label) : 'Tanda'}</span>
        </p>
        <div className="ml-auto flex items-center gap-2">
          <ModeChip />
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
  // Coming straight from the introduction: navigation and content make one arrival, then never again.
  const [arriving] = useState(() => entry.fromIntro);
  useEffect(() => {
    entry.fromIntro = false;
  }, []);
  return (
    <div className="app-shell min-h-dvh" data-nav={navHidden ? 'hidden' : 'shown'} data-arrive={arriving || undefined}>
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

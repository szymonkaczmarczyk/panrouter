import { useSignal } from '@preact/signals';
import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import {
  Award,
  BookA,
  FlaskConical,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Router,
  Settings,
  X,
} from 'lucide-preact';
import { lang, t } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { RANK_THRESHOLDS, rankIndex, xp } from '../state/progress';
import { LogoMark } from '../ui/Logo';
import { ToastRegion } from '../ui/toast';
import { href, path } from './router';

interface NavItem {
  to: string;
  label: StringKey;
  icon: typeof LayoutDashboard;
}

const LEARN: NavItem[] = [
  { to: '/', label: 'nav.home', icon: LayoutDashboard },
  { to: '/nauka', label: 'nav.learn', icon: GraduationCap },
  { to: '/laboratoria', label: 'nav.labs', icon: FlaskConical },
  { to: '/symulator', label: 'nav.sim', icon: Network },
];

const PRACTICE: NavItem[] = [
  { to: '/gry', label: 'nav.games', icon: Gamepad2 },
  { to: '/quizy', label: 'nav.quizzes', icon: ListChecks },
  { to: '/egzamin', label: 'nav.exam', icon: Award },
];

const LIBRARY: NavItem[] = [
  { to: '/slownik', label: 'nav.glossary', icon: BookA },
  { to: '/urzadzenia', label: 'nav.devices', icon: Router },
  { to: '/ustawienia', label: 'nav.settings', icon: Settings },
];

function isActive(to: string, current: string): boolean {
  if (to === '/') return current === '/';
  if (to === '/nauka') return current.startsWith('/nauka');
  if (to === '/laboratoria') return current.startsWith('/laborator') || current.startsWith('/lab/');
  if (to === '/gry') return current.startsWith('/gry');
  if (to === '/quizy') return current.startsWith('/quiz');
  if (to === '/egzamin') return current.startsWith('/egzamin');
  return current === to;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  const current = path.value;
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to, current);
        return (
          <a key={item.to} href={href(item.to)} aria-current={active ? 'page' : undefined} onClick={onNavigate} title={t(item.label)}>
            <Icon aria-hidden="true" />
            <span>{t(item.label)}</span>
          </a>
        );
      })}
    </>
  );
}

function RankCard() {
  const index = rankIndex.value;
  const next = RANK_THRESHOLDS[index + 1];
  const start = RANK_THRESHOLDS[index];
  const value = xp.value;
  const percent = next ? Math.min(100, ((value - start) / (next - start)) * 100) : 100;
  return (
    <div class="rank-card">
      <strong>
        <span>{t(`rank.${index}` as StringKey)}</span>
        <span class="mono dim">{value} XP</span>
      </strong>
      <div class="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={t('rank.label')}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <span class="dim">{next ? t('rank.next', { rank: t(`rank.${index + 1}` as StringKey), xp: next - value }) : t('rank.max')}</span>
    </div>
  );
}

export function LangSwitch() {
  return (
    <div class="segmented sidebar-lang" role="group" aria-label={t('lang.label')}>
      <button type="button" aria-pressed={lang.value === 'pl'} onClick={() => (lang.value = 'pl')} title={t('lang.pl')}>
        PL
      </button>
      <button type="button" aria-pressed={lang.value === 'en'} onClick={() => (lang.value = 'en')} title={t('lang.en')}>
        EN
      </button>
    </div>
  );
}

export function Shell({ children, wide }: { children: ComponentChildren; wide: boolean }) {
  const drawer = useSignal(false);
  const userCollapsed = useSignal<boolean | null>(null);
  const collapsed = userCollapsed.value ?? wide;
  const close = () => (drawer.value = false);
  const current = path.value;

  useEffect(() => {
    userCollapsed.value = null;
  }, [wide]);

  useEffect(() => {
    if (!drawer.value) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') drawer.value = false;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer.value]);

  return (
    <div class="shell" data-collapsed={String(collapsed)} data-drawer={String(drawer.value)} data-wide={String(wide)}>
      <a class="skip-link" href="#main">
        {t('a11y.skip')}
      </a>
      <aside class="sidebar" aria-label={t('a11y.mainNav')}>
        <a class="brand" href={href('/')} onClick={close}>
          <LogoMark />
          <span>
            PanRouter
            <small>{t('app.tagline')}</small>
          </span>
        </a>
        <nav class="nav" aria-label={t('a11y.mainNav')}>
          <NavLinks items={LEARN} onNavigate={close} />
          <div class="nav-label">{lang.value === 'pl' ? 'Ćwiczenia' : 'Practice'}</div>
          <NavLinks items={PRACTICE} onNavigate={close} />
          <div class="nav-label">{lang.value === 'pl' ? 'Biblioteka' : 'Library'}</div>
          <NavLinks items={LIBRARY} onNavigate={close} />
        </nav>
        <div class="sidebar-foot">
          <RankCard />
          <LangSwitch />
          <button
            type="button"
            class="btn btn-ghost btn-icon collapse-btn"
            onClick={() => (userCollapsed.value = !collapsed)}
            aria-label={collapsed ? t('a11y.expand') : t('a11y.collapse')}
            title={collapsed ? t('a11y.expand') : t('a11y.collapse')}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
          </button>
        </div>
      </aside>
      <div class="drawer-backdrop" onClick={close} aria-hidden="true" />
      <div class="main" data-wide={String(wide)}>
        <header class="topbar">
          <button type="button" class="btn btn-ghost btn-icon" onClick={() => (drawer.value = !drawer.value)} aria-label={drawer.value ? t('a11y.closeMenu') : t('a11y.menu')} aria-expanded={drawer.value}>
            {drawer.value ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
          <a class="brand" href={href('/')}>
            <LogoMark />
            <span>PanRouter</span>
          </a>
          <div class="spacer" />
          <div class="segmented" role="group" aria-label={t('lang.label')}>
            <button type="button" aria-pressed={lang.value === 'pl'} onClick={() => (lang.value = 'pl')}>
              PL
            </button>
            <button type="button" aria-pressed={lang.value === 'en'} onClick={() => (lang.value = 'en')}>
              EN
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        {!wide && (
          <footer class="footer">
            <span>
              © 2026 PanRouter. {t('footer.local')}
            </span>
            <nav aria-label={t('nav.more')}>
              <a href={href('/prywatnosc')}>{t('nav.privacy')}</a>
              <a href={href('/regulamin')}>{t('nav.terms')}</a>
              <a href={href('/ustawienia')}>{t('nav.settings')}</a>
            </nav>
          </footer>
        )}
      </div>
      <nav class="bottomnav" aria-label={t('a11y.mainNav')}>
        {[
          { to: '/', label: 'nav.home' as StringKey, icon: LayoutDashboard },
          { to: '/nauka', label: 'nav.learnShort' as StringKey, icon: GraduationCap },
          { to: '/symulator', label: 'nav.sim' as StringKey, icon: Network },
          { to: '/gry', label: 'nav.gamesShort' as StringKey, icon: Gamepad2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <a key={item.to} href={href(item.to)} aria-current={isActive(item.to, current) ? 'page' : undefined}>
              <Icon aria-hidden="true" />
              {t(item.label)}
            </a>
          );
        })}
        <button type="button" onClick={() => (drawer.value = true)} aria-expanded={drawer.value}>
          <Menu aria-hidden="true" />
          {t('nav.more')}
        </button>
      </nav>
      <ToastRegion />
    </div>
  );
}

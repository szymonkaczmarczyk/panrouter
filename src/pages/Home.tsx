import { ArrowRight, Award, Flame, FlaskConical, Gamepad2, GraduationCap, ListChecks, Network, Trophy } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { LABS, LEVELS, MODULES } from '../content';
import { plural, t, tr, tx } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { labsDone, levelPercent, nextModule, overallPercent } from '../state/learning';
import { progress, rankIndex, xp } from '../state/progress';
import { DeviceShape, categoryColor } from '../sim/ui/DeviceGlyph';
import type { DeviceKind } from '../sim/types';

function HeroTopology() {
  const nodes: { kind: DeviceKind; x: number; y: number; label: string }[] = [
    { kind: 'laptop', x: 40, y: 150, label: 'LAPTOP1' },
    { kind: 'pc', x: 40, y: 40, label: 'PC1' },
    { kind: 'switch', x: 170, y: 95, label: 'SW1' },
    { kind: 'router', x: 300, y: 95, label: 'R1' },
    { kind: 'firewall', x: 350, y: 205, label: 'FW1' },
    { kind: 'internet', x: 440, y: 205, label: 'ISP' },
  ];
  const center = (i: number) => ({ x: nodes[i].x + 24, y: nodes[i].y + 24 });
  const links: [number, number][] = [
    [1, 2],
    [0, 2],
    [2, 3],
    [3, 4],
    [4, 5],
  ];
  const route = [1, 2, 3, 4, 5].map((i) => center(i));
  const d = `M${route.map((p) => `${p.x} ${p.y}`).join(' L')}`;
  return (
    <svg class="hero-topo" viewBox="0 0 500 270" role="img" aria-label={tx('Przykładowa sieć: komputery, przełącznik, router, zapora i internet', 'Sample network: computers, switch, router, firewall and the internet')}>
      {links.map(([a, b]) => {
        const p = center(a);
        const q = center(b);
        return <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} class="hero-link" />;
      })}
      {links.map(([a, b]) => {
        const p = center(a);
        const q = center(b);
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy);
        return (
          <g key={`led-${a}-${b}`}>
            <circle cx={p.x + (dx / len) * 34} cy={p.y + (dy / len) * 34} r="3.5" class="hero-led" />
            <circle cx={q.x - (dx / len) * 34} cy={q.y - (dy / len) * 34} r="3.5" class="hero-led" />
          </g>
        );
      })}
      <rect class="hero-packet" width="16" height="11" rx="2" style={{ offsetPath: `path('${d}')` }} />
      {nodes.map((node) => (
        <g key={node.label} transform={`translate(${node.x} ${node.y})`} style={{ color: categoryColor(node.kind) }}>
          <rect x="1.5" y="1.5" width="45" height="45" rx="11" class="hero-tile" />
          <DeviceShape kind={node.kind} />
          <text x="24" y="64" class="hero-label">
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

const QUICK = [
  { to: '/laboratoria', icon: FlaskConical, title: ['Laboratoria z oceną', 'Graded labs'], text: ['Zadania w symulatorze, które sprawdzają się same.', 'Simulator tasks that grade themselves.'] },
  { to: '/gry', icon: Gamepad2, title: ['Minigry', 'Mini-games'], text: ['Podsieci, binarnie, porty, OSI i diagnostyka na czas.', 'Subnetting, binary, ports, OSI and troubleshooting against the clock.'] },
  { to: '/quizy', icon: ListChecks, title: ['Quizy i powtórki', 'Quizzes and reviews'], text: ['Pytania z każdego modułu i powtórka błędów.', 'Questions from every module and a mistake review.'] },
  { to: '/egzamin', icon: Award, title: ['Egzamin końcowy', 'Final exam'], text: ['Teoria i zadanie praktyczne w symulatorze, ocena automatyczna.', 'Theory and a practical simulator task, graded automatically.'] },
];

export function Home() {
  useEffect(() => setMeta(t('meta.home'), t('meta.homeDesc')), []);
  const next = nextModule.value;
  const started = Object.keys(progress.value.sections).length > 0 || Object.keys(progress.value.quizzes).length > 0;
  const p = progress.value;
  return (
    <div class="page fade-in">
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">{tx('Akademia sieci po polsku', 'A networking academy')}</span>
          <h1>{tx('Sieci komputerowe od zera do eksperta', 'Computer networking from zero to expert')}</h1>
          <p class="lead">
            {tx(
              'Budujesz sieci w symulatorze w przeglądarce: routery, przełączniki, Wi-Fi 7, zapory i serwery. Każdy pakiet możesz zatrzymać i zobaczyć, co z nim robi urządzenie. Sprzęt i technologie aktualne na 2026 rok.',
              'You build networks in a browser simulator: routers, switches, Wi-Fi 7, firewalls and servers. You can pause any packet and see what each device does with it. Hardware and technology current as of 2026.',
            )}
          </p>
          <div class="hero-actions">
            {next ? (
              <a class="btn btn-primary btn-lg" href={href(`/nauka/${next.id}`)}>
                {started ? `${t('common.continue')}: ${tr(next.title)}` : tx('Zacznij pierwszą lekcję', 'Start the first lesson')}
                <ArrowRight aria-hidden="true" />
              </a>
            ) : (
              <a class="btn btn-primary btn-lg" href={href('/egzamin')}>
                {tx('Podejdź do egzaminu', 'Take the exam')}
                <ArrowRight aria-hidden="true" />
              </a>
            )}
            <a class="btn btn-lg" href={href('/symulator')}>
              <Network aria-hidden="true" />
              {tx('Otwórz symulator', 'Open the simulator')}
            </a>
          </div>
        </div>
        <div class="hero-art">
          <HeroTopology />
        </div>
      </section>

      <section class="stats" aria-label={tx('Twój postęp', 'Your progress')}>
        <div class="stat">
          <span class="stat-label">{tx('Postęp kursu', 'Course progress')}</span>
          <strong>{overallPercent.value}%</strong>
          <div class="progress">
            <span style={{ width: `${overallPercent.value}%` }} />
          </div>
        </div>
        <div class="stat">
          <span class="stat-label">{t('rank.label')}</span>
          <strong>{t(`rank.${rankIndex.value}` as StringKey)}</strong>
          <span class="dim mono">{xp.value} XP</span>
        </div>
        <div class="stat">
          <span class="stat-label">
            <Flame aria-hidden="true" /> {t('streak.days')}
          </span>
          <strong>{p.streak.days}</strong>
          <span class="dim">{tx('dni nauki z rzędu', 'learning days in a row')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">
            <Trophy aria-hidden="true" /> {t('nav.labs')}
          </span>
          <strong>
            {labsDone.value}/{LABS.length}
          </strong>
          <span class="dim">{tx('zaliczone na 100%', 'completed at 100%')}</span>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{tx('Pięć poziomów', 'Five levels')}</h2>
          <a class="btn btn-ghost" href={href('/nauka')}>
            <GraduationCap aria-hidden="true" />
            {tx('Cała ścieżka', 'Full path')}
          </a>
        </div>
        <ol class="level-track">
          {LEVELS.map((level) => {
            const percent = levelPercent(level.id);
            const count = MODULES.filter((m) => m.level === level.id).length;
            return (
              <li key={level.id}>
                <a class="card card-link level-card" href={href(`/nauka#poziom-${level.id}`)}>
                  <span class="level-num">{level.id}</span>
                  <div class="stack" style={{ gap: 'var(--space-2)' }}>
                    <span class="badge">{tr(level.rank)}</span>
                    <h4>{tr(level.title)}</h4>
                    <p class="muted small">{tr(level.summary)}</p>
                    <span class="dim small">{plural(count, { pl: ['moduł', 'moduły', 'modułów'], en: ['module', 'modules'] })}</span>
                    <div class="progress progress-ok">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{tx('Ćwicz po swojemu', 'Practice your way')}</h2>
        </div>
        <div class="bento">
          <a class="card card-link bento-main" href={href('/symulator')}>
            <Network aria-hidden="true" class="bento-icon" />
            <h3>{tx('Symulator sieci', 'Network simulator')}</h3>
            <p class="muted">
              {tx(
                'Przeciągnij urządzenia, połącz je kablem miedzianym albo światłowodem i skonfiguruj w CLI lub w panelu. Tryb symulacji pokazuje każdą ramkę krok po kroku: ARP, DHCP, DNS, TCP, NAT i decyzje routingu.',
                'Drag devices in, connect them with copper or fiber and configure them in the CLI or a panel. Simulation mode shows every frame step by step: ARP, DHCP, DNS, TCP, NAT and routing decisions.',
              )}
            </p>
            <span class="btn btn-primary">
              {tx('Zbuduj własną sieć', 'Build your own network')}
              <ArrowRight aria-hidden="true" />
            </span>
          </a>
          {QUICK.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.to} class="card card-link bento-item" href={href(item.to)}>
                <Icon aria-hidden="true" class="bento-icon" />
                <h4>{tx(item.title[0], item.title[1])}</h4>
                <p class="muted small">{tx(item.text[0], item.text[1])}</p>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}

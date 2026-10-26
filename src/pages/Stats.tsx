import { ArrowRight, Award, ChartColumn, CircleCheck, CircleX, FlaskConical, RotateCcw, Siren } from 'lucide-preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { LABS, MODULES } from '../content';
import { EXAM } from '../content/exam';
import { lang, plural, t, tr, tx } from '../i18n';
import { labsDone } from '../state/learning';
import { progress, type ExamAttempt } from '../state/progress';
import { dueCount } from '../state/reviewStatus';

const CHART_ATTEMPTS = 12;
const PLOT = { height: 240, left: 40, right: 12, top: 16, bottom: 44 };

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang.value === 'en' ? 'en-GB' : 'pl-PL', { day: 'numeric', month: 'short' });
}

function attemptText(attempt: ExamAttempt, number: number): string {
  return tx(
    `Podejście ${number}, ${formatDay(attempt.at)}: wynik ${attempt.total}% (teoria ${attempt.theory}%, praktyka ${attempt.practical}%), ${attempt.passed ? 'zdany' : 'niezdany'}`,
    `Attempt ${number}, ${formatDay(attempt.at)}: ${attempt.total}% (theory ${attempt.theory}%, practice ${attempt.practical}%), ${attempt.passed ? 'passed' : 'not passed'}`,
  );
}

function ExamChart({ history }: { history: ExamAttempt[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const shown = history.slice(-CHART_ATTEMPTS);
  const offset = history.length - shown.length;
  const plotW = width - PLOT.left - PLOT.right;
  const plotH = PLOT.height - PLOT.top - PLOT.bottom;
  const slot = plotW / CHART_ATTEMPTS;
  const barW = Math.min(28, slot * 0.6);
  const y = (value: number) => PLOT.top + plotH - (value / 100) * plotH;
  const passY = y(EXAM.passMark);

  return (
    <figure class="exam-chart">
      <div class="exam-chart-tip" aria-hidden="true">
        {active !== null ? attemptText(shown[active], offset + active + 1) : tx('Najedź na słupek albo przejdź do niego klawiszem Tab, żeby zobaczyć szczegóły.', 'Hover over a bar or tab to it to see the details.')}
      </div>
      <div ref={box} class="exam-chart-box">
      <svg width={width} height={PLOT.height} viewBox={`0 0 ${width} ${PLOT.height}`} role="group" aria-label={tx('Wyniki kolejnych podejść do egzaminu w procentach', 'Scores of consecutive exam attempts in percent')}>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={PLOT.left} x2={width - PLOT.right} y1={y(tick)} y2={y(tick)} class="chart-grid" />
            <text x={PLOT.left - 8} y={y(tick) + 4} class="chart-axis" text-anchor="end">
              {tick}
            </text>
          </g>
        ))}
        <line x1={PLOT.left} x2={width - PLOT.right} y1={passY} y2={passY} class="chart-pass" />
        <text x={width - PLOT.right} y={passY - 6} class="chart-axis chart-pass-label" text-anchor="end">
          {tx(`próg ${EXAM.passMark}%`, `pass ${EXAM.passMark}%`)}
        </text>
        {shown.map((attempt, i) => {
          const cx = PLOT.left + slot * i + slot / 2;
          const top = y(Math.max(attempt.total, 1));
          const height = PLOT.top + plotH - top;
          const radius = Math.min(4, height / 2);
          const x = cx - barW / 2;
          const path = `M${x} ${top + height}V${top + radius}Q${x} ${top} ${x + radius} ${top}H${x + barW - radius}Q${x + barW} ${top} ${x + barW} ${top + radius}V${top + height}Z`;
          return (
            <g
              key={i}
              tabIndex={0}
              role="img"
              aria-label={attemptText(attempt, offset + i + 1)}
              class={`chart-bar ${active === i ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <rect x={cx - slot / 2} y={PLOT.top} width={slot} height={plotH} class="chart-hit" />
              <path d={path} class="chart-bar-fill" />
              <text x={cx} y={top - 6} class="chart-value" text-anchor="middle">
                {attempt.total}
              </text>
              <text x={cx} y={PLOT.height - PLOT.bottom + 18} class="chart-axis" text-anchor="middle">
                {offset + i + 1}
              </text>
            </g>
          );
        })}
        <text x={PLOT.left + plotW / 2} y={PLOT.height - 4} class="chart-axis" text-anchor="middle">
          {tx('numer podejścia', 'attempt number')}
        </text>
      </svg>
      </div>
      <figcaption class="small dim">{tx(`Wynik końcowy w procentach. Linia przerywana to próg zdania ${EXAM.passMark}%.`, `Final score in percent. The dashed line is the ${EXAM.passMark}% pass mark.`)}</figcaption>
    </figure>
  );
}

interface Weak {
  id: string;
  title: string;
  quiz: number | null;
  exam: number | null;
  score: number;
}

function weakestModules(): Weak[] {
  const p = progress.value;
  const totals = new Map<string, [number, number]>();
  for (const attempt of p.examHistory) {
    for (const [id, [asked, wrong]] of Object.entries(attempt.modules)) {
      const [a, w] = totals.get(id) ?? [0, 0];
      totals.set(id, [a + asked, w + wrong]);
    }
  }
  return MODULES.map((m) => {
    const quiz = p.quizzes[m.id] ? p.quizzes[m.id].best : null;
    const pair = totals.get(m.id);
    const exam = pair && pair[0] > 0 ? Math.round(((pair[0] - pair[1]) / pair[0]) * 100) : null;
    const parts = [quiz, exam].filter((v): v is number => v !== null);
    return { id: m.id, title: tr(m.title), quiz, exam, score: parts.length ? Math.min(...parts) : 101 };
  })
    .filter((m) => m.score < 100)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
}

export function StatsPage() {
  useEffect(() => setMeta(tx('Twoje statystyki', 'Your statistics'), tx('Historia podejść do egzaminu, najsłabsze moduły, rozwiązane awarie i powtórki.', 'Exam attempt history, weakest modules, solved faults and reviews.')), [lang.value]);
  const p = progress.value;
  const history = p.examHistory;
  const weak = weakestModules();
  const due = dueCount();

  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{tx('Statystyki', 'Statistics')}</span>
        <h2>{tx('Jak Ci idzie', 'How you are doing')}</h2>
        <p>{tx('Wszystko liczy się w tej przeglądarce. Wyniki nie trafiają na żaden serwer.', 'Everything is counted in this browser. Results never reach any server.')}</p>
      </header>

      <section class="stats" aria-label={tx('Podsumowanie', 'Summary')}>
        <div class="stat">
          <span class="stat-label">
            <Award aria-hidden="true" /> {t('nav.exam')}
          </span>
          <strong>{p.exam.attempts ? `${p.exam.best}%` : '-'}</strong>
          <span class="dim">{p.exam.attempts ? tx(`najlepiej z ${plural(p.exam.attempts, { pl: ['podejścia', 'podejść', 'podejść'], en: ['attempt', 'attempts'] })}`, `best of ${plural(p.exam.attempts, { pl: ['podejścia', 'podejść', 'podejść'], en: ['attempt', 'attempts'] })}`) : tx('jeszcze bez podejścia', 'no attempts yet')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">
            <Siren aria-hidden="true" /> {t('nav.incidents')}
          </span>
          <strong>{p.incidents.solved}</strong>
          <span class="dim">{tx(`rozwiązane, w tym ${p.incidents.clean} bez podglądania`, `solved, ${p.incidents.clean} without peeking`)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">
            <FlaskConical aria-hidden="true" /> {t('nav.labs')}
          </span>
          <strong>
            {labsDone.value}/{LABS.length}
          </strong>
          <span class="dim">{tx('zaliczone na 100%', 'completed at 100%')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">
            <RotateCcw aria-hidden="true" /> {tx('Powtórki', 'Reviews')}
          </span>
          <strong>{Object.keys(p.reviews).length}</strong>
          <span class="dim">{tx(`zaplanowane, na dziś ${due}`, `scheduled, ${due} for today`)}</span>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{tx('Podejścia do egzaminu', 'Exam attempts')}</h2>
        </div>
        {history.length === 0 ? (
          <div class="empty card">
            <ChartColumn aria-hidden="true" />
            <strong>{tx('Tu pojawi się wykres Twoich podejść', 'A chart of your attempts will appear here')}</strong>
            <p>{tx('Po każdym egzaminie zapiszemy wynik teorii, praktyki i to, z których modułów były błędy.', 'After every exam we save the theory and practice scores and which modules had mistakes.')}</p>
            <a class="btn btn-primary" href={href('/egzamin')}>
              <Award aria-hidden="true" />
              {tx('Przejdź do egzaminu', 'Go to the exam')}
            </a>
          </div>
        ) : (
          <div class="stack" style={{ gap: 'var(--space-5)' }}>
            <div class="card">
              <ExamChart history={history} />
            </div>
            <div class="table-wrap" tabIndex={0} role="region" aria-label={tx('Tabela podejść do egzaminu', 'Exam attempts table')}>
              <table class="table">
                <caption class="sr-only">{tx('Wszystkie podejścia do egzaminu', 'All exam attempts')}</caption>
                <thead>
                  <tr>
                    <th>{tx('Nr', 'No.')}</th>
                    <th>{tx('Data', 'Date')}</th>
                    <th>{tx('Teoria', 'Theory')}</th>
                    <th>{tx('Praktyka', 'Practice')}</th>
                    <th>{tx('Wynik', 'Score')}</th>
                    <th>{tx('Status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((attempt, i) => (
                    <tr key={i}>
                      <td class="mono">{history.length - i}</td>
                      <td class="nowrap">{formatDay(attempt.at)}</td>
                      <td class="mono">{attempt.theory}%</td>
                      <td class="mono">{attempt.practical}%</td>
                      <td class="mono">
                        <strong>{attempt.total}%</strong>
                      </td>
                      <td>
                        <span class={`badge ${attempt.passed ? 'badge-ok' : 'badge-warn'}`}>
                          {attempt.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                          {attempt.passed ? tx('zdany', 'passed') : tx('niezdany', 'not passed')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>{tx('Najsłabsze moduły', 'Weakest modules')}</h2>
        </div>
        {weak.length === 0 ? (
          <div class="empty card">
            <CircleCheck aria-hidden="true" />
            <strong>{tx('Brak słabych punktów do pokazania', 'No weak spots to show')}</strong>
            <p>{tx('Zrób quizy z modułów albo egzamin. Moduły z najniższym wynikiem pojawią się tutaj razem z linkiem do lekcji.', 'Take module quizzes or the exam. Modules with the lowest score will appear here with a link to the lesson.')}</p>
            <a class="btn btn-primary" href={href('/quizy')}>
              {tx('Przejdź do quizów', 'Go to quizzes')}
            </a>
          </div>
        ) : (
          <div class="table-wrap" tabIndex={0} role="region" aria-label={tx('Tabela najsłabszych modułów', 'Weakest modules table')}>
            <table class="table">
              <thead>
                <tr>
                  <th>{t('common.module')}</th>
                  <th>{tx('Quiz (najlepiej)', 'Quiz (best)')}</th>
                  <th>{tx('Trafność na egzaminie', 'Exam accuracy')}</th>
                </tr>
              </thead>
              <tbody>
                {weak.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <a class="table-link" href={href(`/nauka/${m.id}`)}>
                        {m.title}
                        <ArrowRight aria-hidden="true" />
                      </a>
                    </td>
                    <td class="mono">{m.quiz === null ? <span class="dim">-</span> : `${m.quiz}%`}</td>
                    <td class="mono">{m.exam === null ? <span class="dim">-</span> : `${m.exam}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

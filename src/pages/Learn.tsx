import { CircleCheck, Clock, FlaskConical } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { LEVELS, labsOfLevel, modulesOfLevel } from '../content';
import { plural, t, tr, tx } from '../i18n';
import { levelPercent, modulePercent, moduleStatus, QUIZ_PASS } from '../state/learning';
import { progress } from '../state/progress';
import { iconFor } from '../ui/icons';

export function Learn() {
  useEffect(() => {
    setMeta(tx('Ścieżka nauki', 'Learning path'), tx('Pięć poziomów kursu sieci komputerowych: od podstaw po projektowanie i bezpieczeństwo. Lekcje, quizy i laboratoria.', 'Five levels of a networking course: from basics to design and security. Lessons, quizzes and labs.'));
    const hash = window.location.hash.split('#')[2];
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, []);
  const p = progress.value;
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.learn')}</span>
        <h2>{tx('Od laika do eksperta w pięciu krokach', 'From newcomer to expert in five steps')}</h2>
        <p>
          {tx(
            'Każdy moduł ma kilka krótkich rozdziałów i quiz. Laboratoria sprawdzają, czy umiesz to zrobić w symulatorze. Możesz iść po kolei albo skakać do tematów, które Cię interesują.',
            'Each module has a few short chapters and a quiz. Labs check that you can actually do it in the simulator. Go in order or jump to the topics you care about.',
          )}
        </p>
      </header>
      {LEVELS.map((level) => {
        const modules = modulesOfLevel(level.id);
        const labs = labsOfLevel(level.id);
        const percent = levelPercent(level.id);
        return (
          <section key={level.id} id={`poziom-${level.id}`} class="level-block">
            <div class="level-head">
              <span class="level-badge">{level.id}</span>
              <div>
                <span class="badge">{tr(level.rank)}</span>
                <h3>{tr(level.title)}</h3>
                <p class="muted small">{tr(level.summary)}</p>
              </div>
              <div class="level-meter">
                <span class="dim">{tx(`Ukończono ${percent}%`, `${percent}% complete`)}</span>
                <div class="progress progress-ok">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>
            <div class="module-grid">
              {modules.map((module, index) => {
                const Icon = iconFor(module.icon);
                const status = moduleStatus(module);
                const quiz = p.quizzes[module.id];
                return (
                  <a key={module.id} class="card card-link module-card" data-status={status} href={href(`/nauka/${module.id}`)}>
                    <span class="module-icon">{status === 'done' ? <CircleCheck aria-hidden="true" /> : <Icon aria-hidden="true" />}</span>
                    <div class="stack" style={{ gap: 'var(--space-2)' }}>
                      <span class="dim small">
                        {t('common.module')} {level.id}.{index + 1}
                      </span>
                      <h4>{tr(module.title)}</h4>
                      <p class="muted small">{tr(module.summary)}</p>
                      <div class="module-meta">
                        <span class="row" style={{ gap: '4px' }}>
                          <Clock aria-hidden="true" style={{ width: 14, height: 14 }} /> {module.minutes} min
                        </span>
                        <span>· {plural(module.sections.length, { pl: ['rozdział', 'rozdziały', 'rozdziałów'], en: ['chapter', 'chapters'] })}</span>
                        {quiz && <span class={`badge ${quiz.best >= QUIZ_PASS ? 'badge-ok' : 'badge-warn'}`}>quiz {quiz.best}%</span>}
                        {status === 'progress' && <span class="badge badge-accent">{t('common.inProgress')}</span>}
                      </div>
                      <div class="progress progress-ok" aria-hidden="true">
                        <span style={{ width: `${modulePercent(module)}%` }} />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            {labs.length > 0 && (
              <div class="lab-strip">
                {labs.map((lab) => {
                  const result = p.labs[lab.id];
                  return (
                    <a key={lab.id} class="card card-link lab-chip" href={href(`/lab/${lab.id}`)}>
                      <FlaskConical aria-hidden="true" />
                      <div class="stack" style={{ gap: '2px' }}>
                        <strong class="small">{tr(lab.title)}</strong>
                        <span class="dim small">{result ? tx(`Najlepszy wynik: ${result.best}%`, `Best score: ${result.best}%`) : tx(`Laboratorium · ${lab.minutes} min`, `Lab · ${lab.minutes} min`)}</span>
                      </div>
                      {result?.done && <CircleCheck aria-label={tx('ukończone', 'completed')} style={{ color: 'var(--ok)', marginLeft: 'auto' }} />}
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

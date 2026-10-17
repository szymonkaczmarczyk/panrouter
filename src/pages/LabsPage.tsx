import { CircleCheck, Clock, FlaskConical } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { LEVELS, labsOfLevel } from '../content';
import { t, tr, tx } from '../i18n';
import { progress } from '../state/progress';

export function LabsPage() {
  useEffect(() => setMeta(tx('Laboratoria', 'Labs'), tx('Zadania w symulatorze sieci z automatyczną oceną: od pierwszej sieci po projekt kampusu.', 'Network simulator tasks with automatic grading: from a first network to a campus design.')), []);
  const p = progress.value;
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.labs')}</span>
        <h2>{tx('Sprawdź się w praktyce', 'Prove it in practice')}</h2>
        <p>{tx('Każde laboratorium to gotowa topologia i konkretne zadania. Przycisk „Sprawdź wyniki” sam oceni, czy sieć działa tak, jak trzeba.', 'Each lab is a ready topology with concrete tasks. The "Check results" button grades whether the network works as required.')}</p>
      </header>
      {LEVELS.map((level) => {
        const labs = labsOfLevel(level.id);
        if (!labs.length) return null;
        return (
          <section key={level.id} class="section">
            <div class="section-head">
              <h2>
                {t('common.level')} {level.id}: {tr(level.title)}
              </h2>
            </div>
            <div class="grid-3">
              {labs.map((lab) => {
                const result = p.labs[lab.id];
                return (
                  <a key={lab.id} class="card card-link stack lab-card" href={href(`/lab/${lab.id}`)}>
                    <div class="row" style={{ justifyContent: 'space-between' }}>
                      <FlaskConical aria-hidden="true" class="bento-icon" />
                      {result?.done ? (
                        <span class="badge badge-ok">
                          <CircleCheck aria-hidden="true" /> 100%
                        </span>
                      ) : result ? (
                        <span class="badge badge-warn">{result.best}%</span>
                      ) : (
                        <span class="badge">{t('common.new')}</span>
                      )}
                    </div>
                    <h4>{tr(lab.title)}</h4>
                    <p class="muted small">{tr(lab.summary)}</p>
                    <span class="dim small row" style={{ gap: '4px' }}>
                      <Clock aria-hidden="true" style={{ width: 14, height: 14 }} /> {lab.minutes} min · {lab.checks.length} {tx('zadań do sprawdzenia', 'checks')}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

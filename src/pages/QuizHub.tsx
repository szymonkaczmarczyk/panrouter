import { CircleCheck, RotateCcw, Shuffle } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { LEVELS, modulesOfLevel } from '../content';
import { plural, t, tr, tx } from '../i18n';
import { progress } from '../state/progress';

export function QuizHub() {
  useEffect(() => setMeta(tx('Quizy', 'Quizzes'), tx('Quizy z każdego modułu, szybki miks i powtórka błędów.', 'Quizzes for every module, a quick mix and a mistake review.')), []);
  const p = progress.value;
  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{t('nav.quizzes')}</span>
        <h2>{tx('Sprawdź, co już wiesz', 'Check what you already know')}</h2>
        <p>{tx('Krótkie quizy z wyjaśnieniem po każdej odpowiedzi. Błędne pytania wracają w powtórce.', 'Short quizzes with an explanation after every answer. Wrong answers come back in the review.')}</p>
      </header>
      <div class="grid-2">
        <a class="card card-link stack" href={href('/quiz/mix')}>
          <Shuffle aria-hidden="true" class="bento-icon" />
          <h4>{tx('Szybki miks', 'Quick mix')}</h4>
          <p class="muted small">{tx('10 losowych pytań z modułów, które już zacząłeś lub zaczęłaś.', '10 random questions from the modules you have started.')}</p>
        </a>
        <a class="card card-link stack" href={href('/quiz/powtorka')}>
          <RotateCcw aria-hidden="true" class="bento-icon" />
          <h4>
            {tx('Powtórka błędów', 'Mistake review')} {p.mistakes.length > 0 && <span class="badge badge-warn">{p.mistakes.length}</span>}
          </h4>
          <p class="muted small">
            {p.mistakes.length
              ? tx(`Do powtórzenia: ${plural(p.mistakes.length, { pl: ['pytanie', 'pytania', 'pytań'], en: ['question', 'questions'] })}.`, `To review: ${plural(p.mistakes.length, { pl: ['pytanie', 'pytania', 'pytań'], en: ['question', 'questions'] })}.`)
              : tx('Na razie nie masz błędów do powtórki.', 'You have no mistakes to review yet.')}
          </p>
        </a>
      </div>
      {LEVELS.map((level) => (
        <section key={level.id} class="section">
          <div class="section-head">
            <h2>
              {t('common.level')} {level.id}: {tr(level.title)}
            </h2>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{t('common.module')}</th>
                  <th>{tx('Pytania', 'Questions')}</th>
                  <th>{t('common.best')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {modulesOfLevel(level.id).map((module) => {
                  const result = p.quizzes[module.id];
                  return (
                    <tr key={module.id}>
                      <td>
                        <span class="row" style={{ gap: 'var(--space-2)' }}>
                          {result && result.best >= 70 && <CircleCheck aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--ok)' }} />}
                          {tr(module.title)}
                        </span>
                      </td>
                      <td class="dim">{module.quiz.length}</td>
                      <td>{result ? <span class={`badge ${result.best >= 70 ? 'badge-ok' : 'badge-warn'}`}>{result.best}%</span> : <span class="dim">-</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <a class="btn btn-sm" href={href(`/quiz/${module.id}`)}>
                          {result ? tx('Powtórz', 'Retake') : t('common.start')}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

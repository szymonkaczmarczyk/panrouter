import { ArrowLeft, ArrowRight, Circle, CircleCheck, FlaskConical, Gamepad2, ListChecks } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href, navigate } from '../app/router';
import { Blocks } from '../content/Blocks';
import { labById, MODULES, moduleById } from '../content';
import { GAMES } from '../games/registry';
import { lang, t, tr, tx } from '../i18n';
import { markSection, progress } from '../state/progress';
import { NotFound } from './NotFound';

export function ModulePage({ id }: { id: string }) {
  const module = moduleById(id);
  const done = progress.value.sections[id] ?? [];
  const firstOpen = module ? Math.max(0, module.sections.findIndex((s) => !done.includes(s.id))) : 0;
  const [index, setIndex] = useState(firstOpen);

  useEffect(() => {
    if (module) setMeta(tr(module.title), tr(module.summary));
  }, [id, lang.value]);

  useEffect(() => {
    setIndex(firstOpen);
  }, [id]);

  if (!module) return <NotFound />;
  const section = module.sections[index];
  const position = MODULES.indexOf(module);
  const nextModule = MODULES[position + 1];
  const last = index === module.sections.length - 1;
  const quiz = progress.value.quizzes[module.id];

  const go = (next: number) => {
    setIndex(next);
    document.getElementById('main')?.scrollTo?.({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const complete = () => {
    markSection(module.id, section.id);
    if (last) navigate(`/quiz/${module.id}`);
    else go(index + 1);
  };

  return (
    <div class="page fade-in">
      <nav class="crumbs" aria-label={tx('Okruszki', 'Breadcrumbs')}>
        <a href={href('/nauka')}>
          <ArrowLeft aria-hidden="true" />
          {t('nav.learn')}
        </a>
        <span>/</span>
        <span>
          {t('common.level')} {module.level}
        </span>
      </nav>
      <header class="page-head">
        <h2>{tr(module.title)}</h2>
        <p>{tr(module.summary)}</p>
      </header>
      <div class="module-layout">
        <aside class="toc" aria-label={tx('Rozdziały', 'Chapters')}>
          <span class="toc-title">{tx('Rozdziały', 'Chapters')}</span>
          {module.sections.map((s, i) => {
            const isDone = done.includes(s.id);
            return (
              <button key={s.id} type="button" class={isDone ? 'done' : ''} aria-current={i === index ? 'step' : undefined} onClick={() => go(i)}>
                {isDone ? <CircleCheck aria-hidden="true" /> : <Circle aria-hidden="true" />}
                {i + 1}. {tr(s.title)}
              </button>
            );
          })}
          <a href={href(`/quiz/${module.id}`)}>
            <ListChecks aria-hidden="true" />
            {tx('Quiz modułu', 'Module quiz')}
            {quiz && <span class={`badge ${quiz.best >= 70 ? 'badge-ok' : 'badge-warn'}`}>{quiz.best}%</span>}
          </a>
          {module.labs.map((labId) => {
            const lab = labById(labId);
            if (!lab) return null;
            return (
              <a key={labId} href={href(`/lab/${labId}`)}>
                <FlaskConical aria-hidden="true" />
                {tr(lab.title)}
              </a>
            );
          })}
          {module.games.map((gameId) => {
            const game = GAMES.find((g) => g.id === gameId);
            if (!game) return null;
            return (
              <a key={gameId} href={href(`/gry/${gameId}`)}>
                <Gamepad2 aria-hidden="true" />
                {tr(game.title)}
              </a>
            );
          })}
        </aside>
        <article aria-labelledby="section-title" key={section.id} class="fade-in">
          <span class="eyebrow">
            {tx('Rozdział', 'Chapter')} {index + 1} / {module.sections.length}
          </span>
          <h3 id="section-title" style={{ margin: 'var(--space-2) 0 var(--space-6)' }}>
            {tr(section.title)}
          </h3>
          <Blocks blocks={section.body[lang.value]} />
          <div class="section-nav">
            {index > 0 ? (
              <button type="button" class="btn" onClick={() => go(index - 1)}>
                <ArrowLeft aria-hidden="true" />
                {t('common.prev')}
              </button>
            ) : (
              <span />
            )}
            <button type="button" class="btn btn-primary btn-lg" onClick={complete}>
              {last ? tx('Zakończ i przejdź do quizu', 'Finish and take the quiz') : tx('Rozumiem, dalej', 'Got it, next')}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          {last && nextModule && quiz && quiz.best >= 70 && (
            <p class="muted small" style={{ marginTop: 'var(--space-4)' }}>
              {tx('Następny moduł:', 'Next module:')} <a href={href(`/nauka/${nextModule.id}`)}>{tr(nextModule.title)}</a>
            </p>
          )}
        </article>
      </div>
    </div>
  );
}

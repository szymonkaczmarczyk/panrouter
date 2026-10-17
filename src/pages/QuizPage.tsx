import { ArrowLeft, ArrowRight, FlaskConical, ListChecks, RotateCcw, Shuffle } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { MODULES, moduleById } from '../content';
import type { Question } from '../content/types';
import { lang, t, tr, tx } from '../i18n';
import { progress, recordQuiz } from '../state/progress';
import { Quiz } from '../ui/Quiz';
import { NotFound } from './NotFound';

export function allQuestions(): { question: Question; module: string }[] {
  return MODULES.flatMap((m) => m.quiz.map((question) => ({ question, module: m.id })));
}

function pick<T>(items: T[], count: number, seed: number): T[] {
  const copy = [...items];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function QuizPage({ id }: { id: string }) {
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const module = moduleById(id);
  const questions = useMemo(() => {
    if (module) return module.quiz;
    if (id === 'mix') {
      const started = new Set([...Object.keys(progress.value.sections), ...Object.keys(progress.value.quizzes)]);
      const pool = allQuestions().filter((q) => started.size === 0 || started.has(q.module));
      return pick(pool.length >= 10 ? pool : allQuestions(), 10, seed).map((q) => q.question);
    }
    if (id === 'powtorka') {
      const set = new Set(progress.value.mistakes);
      return pick(allQuestions().filter((q) => set.has(q.question.id)), 15, seed).map((q) => q.question);
    }
    return [];
  }, [id, seed]);

  const title = module ? `${tx('Quiz', 'Quiz')}: ${tr(module.title)}` : id === 'mix' ? tx('Szybki miks 10 pytań', 'Quick mix of 10 questions') : tx('Powtórka błędów', 'Mistake review');

  useEffect(() => {
    setMeta(title, tx('Sprawdź wiedzę z sieci komputerowych w krótkim quizie z wyjaśnieniami.', 'Test your networking knowledge in a short quiz with explanations.'));
  }, [id, lang.value]);

  if (!module && id !== 'mix' && id !== 'powtorka') return <NotFound />;
  const position = module ? MODULES.indexOf(module) : -1;
  const next = position >= 0 ? MODULES[position + 1] : undefined;

  return (
    <div class="page fade-in">
      <nav class="crumbs" aria-label={tx('Okruszki', 'Breadcrumbs')}>
        <a href={href(module ? `/nauka/${module.id}` : '/quizy')}>
          <ArrowLeft aria-hidden="true" />
          {module ? tr(module.title) : t('nav.quizzes')}
        </a>
      </nav>
      <header class="page-head">
        <span class="eyebrow">
          <ListChecks aria-hidden="true" style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px' }} /> {t('nav.quizzes')}
        </span>
        <h2>{title}</h2>
        <p>{tx('Po każdej odpowiedzi zobaczysz wyjaśnienie. Do zaliczenia potrzeba 70%.', 'After each answer you will see an explanation. You need 70% to pass.')}</p>
      </header>
      {questions.length === 0 ? (
        <div class="empty card">
          <ListChecks aria-hidden="true" />
          <strong>{tx('Brak pytań do powtórki', 'No questions to review')}</strong>
          <p>{tx('Pytania, na które odpowiesz błędnie w quizach, trafią tutaj.', 'Questions you answer wrong in quizzes will appear here.')}</p>
          <a class="btn btn-primary" href={href('/quiz/mix')}>
            <Shuffle aria-hidden="true" />
            {tx('Zrób szybki miks', 'Take a quick mix')}
          </a>
        </div>
      ) : (
        <Quiz
          key={`${id}-${seed}`}
          questions={questions}
          seed={seed}
          mode="practice"
          onFinish={(result) => recordQuiz(module ? module.id : `quiz-${id}`, result.percent, result.wrong, result.right)}
          onRestart={() => setSeed(seed + 1)}
          resultExtra={(result) => (
            <div class="row-wrap">
              {module && result.percent >= 70 && next && (
                <a class="btn btn-primary" href={href(`/nauka/${next.id}`)}>
                  {tx('Następny moduł', 'Next module')}: {tr(next.title)}
                  <ArrowRight aria-hidden="true" />
                </a>
              )}
              {module && module.labs[0] && (
                <a class="btn" href={href(`/lab/${module.labs[0]}`)}>
                  <FlaskConical aria-hidden="true" />
                  {tx('Laboratorium do modułu', 'Module lab')}
                </a>
              )}
              {module && result.percent < 70 && (
                <a class="btn" href={href(`/nauka/${module.id}`)}>
                  <RotateCcw aria-hidden="true" />
                  {tx('Wróć do lekcji', 'Back to the lesson')}
                </a>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}

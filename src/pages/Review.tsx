import { BookA, CalendarCheck, Check, Eye, RotateCcw, Shuffle } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { GLOSSARY, type Term } from '../content/glossary';
import type { Question } from '../content/types';
import { lang, plural, t, tr, tx } from '../i18n';
import { progress, recordReview, today } from '../state/progress';
import { nextReviewText } from '../state/reviewStatus';
import { dueKeys, questionKey, REVIEW_DAYS, termKey } from '../state/reviews';
import { Quiz } from '../ui/Quiz';
import { allQuestions } from './QuizPage';

const COUNT_FORMS = { pl: ['powtórka', 'powtórki', 'powtórek'] as [string, string, string], en: ['review', 'reviews'] as [string, string] };

function Flashcards({ terms }: { terms: Term[] }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [again, setAgain] = useState(0);
  const card = terms[index];

  const grade = (remembered: boolean) => {
    if (!card || !shown) return;
    const key = termKey(card.term);
    recordReview(remembered ? [key] : [], remembered ? [] : [key]);
    if (!remembered) setAgain(again + 1);
    setShown(false);
    setIndex(index + 1);
  };

  const keys = useRef({ shown, card, grade });
  keys.current = { shown, card, grade };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]') || event.metaKey || event.ctrlKey || event.altKey) return;
      const current = keys.current;
      if (event.key === ' ' && !current.shown && current.card && !target?.closest('button, a')) {
        event.preventDefault();
        setShown(true);
      } else if (event.key === '1') current.grade(false);
      else if (event.key === '2') current.grade(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!card) {
    return (
      <div class="card stack review-done" role="status">
        <CalendarCheck aria-hidden="true" class="bento-icon" />
        <strong>{tx('Hasła powtórzone', 'Terms reviewed')}</strong>
        <p class="muted small">
          {again
            ? tx(`Do jutra wraca: ${plural(again, { pl: ['hasło', 'hasła', 'haseł'], en: ['term', 'terms'] })}. Pozostałe przechodzą do dłuższej przerwy.`, `Coming back tomorrow: ${plural(again, { pl: ['hasło', 'hasła', 'haseł'], en: ['term', 'terms'] })}. The rest move to a longer break.`)
            : tx('Wszystkie zapamiętane. Wrócą po dłuższej przerwie albo znikną z powtórek po ostatnim etapie.', 'All remembered. They come back after a longer break or leave the reviews after the last stage.')}
        </p>
      </div>
    );
  }

  return (
    <div class="card stack flashcard" aria-live="polite">
      <div class="row flashcard-head">
        <span class="dim small">
          {tx('Hasło', 'Term')} {index + 1} / {terms.length}
        </span>
        <span class="badge">{tx('Słownik', 'Glossary')}</span>
      </div>
      <h3 class="flashcard-term">{card.term}</h3>
      {shown ? (
        <p class="flashcard-def">{tr(card.def)}</p>
      ) : (
        <p class="muted small">{tx('Przypomnij sobie, co oznacza to hasło, a potem odsłoń definicję.', 'Recall what this term means, then reveal the definition.')}</p>
      )}
      <div class="row-wrap flashcard-actions">
        {shown ? (
          <>
            <button type="button" class="btn btn-danger" onClick={() => grade(false)}>
              <RotateCcw aria-hidden="true" />
              {tx('Nie pamiętam', 'I forgot')}
              <kbd class="key">1</kbd>
            </button>
            <button type="button" class="btn btn-primary" onClick={() => grade(true)}>
              <Check aria-hidden="true" />
              {tx('Pamiętam', 'I remember')}
              <kbd class="key">2</kbd>
            </button>
          </>
        ) : (
          <button type="button" class="btn btn-primary" onClick={() => setShown(true)}>
            <Eye aria-hidden="true" />
            {tx('Pokaż definicję', 'Show the definition')}
            <kbd class="key">{tx('Spacja', 'Space')}</kbd>
          </button>
        )}
      </div>
    </div>
  );
}

export function ReviewPage() {
  useEffect(() => {
    setMeta(tx('Powtórki na dziś', 'Reviews for today'), tx('Błędne odpowiedzi z quizów i wybrane hasła ze słownika wracają po 1, 3 i 7 dniach.', 'Wrong quiz answers and chosen glossary terms come back after 1, 3 and 7 days.'));
  }, [lang.value]);

  const session = useMemo(() => {
    const keys = dueKeys(progress.value.reviews, today());
    const byId = new Map(allQuestions().map((q) => [q.question.id, q.question]));
    const byTerm = new Map(GLOSSARY.map((g) => [g.term, g]));
    const questions = keys.filter((k) => k.startsWith('q:')).map((k) => byId.get(k.slice(2))).filter((q): q is Question => Boolean(q));
    const terms = keys.filter((k) => k.startsWith('t:')).map((k) => byTerm.get(k.slice(2))).filter((g): g is Term => Boolean(g));
    return { questions, terms };
  }, []);
  const [seed] = useState(() => Date.now() % 100000);
  const total = session.questions.length + session.terms.length;

  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{tx('Powtórki', 'Reviews')}</span>
        <h2>{total ? tx(`Na dziś: ${plural(total, COUNT_FORMS)}`, `For today: ${plural(total, COUNT_FORMS)}`) : tx('Na dziś wszystko powtórzone', 'Everything reviewed for today')}</h2>
        <p>
          {tx(
            `Błędna odpowiedź wraca po ${REVIEW_DAYS[0]} dniu. Każda dobra przesuwa pytanie dalej: na ${REVIEW_DAYS[1]} dni, potem na ${REVIEW_DAYS[2]}. Po trzech dobrych odpowiedziach z rzędu pytanie znika z powtórek.`,
            `A wrong answer comes back after ${REVIEW_DAYS[0]} day. Each right one pushes it further: to ${REVIEW_DAYS[1]} days, then ${REVIEW_DAYS[2]}. After three right answers in a row it leaves the reviews.`,
          )}
        </p>
      </header>
      {total === 0 ? (
        <div class="empty card">
          <CalendarCheck aria-hidden="true" />
          <strong>{nextReviewText()}</strong>
          <p>{tx('Pytania z błędną odpowiedzią trafiają tu same. Hasła ze słownika dodasz przyciskiem „Powtarzaj” przy definicji.', 'Wrongly answered questions land here on their own. Add glossary terms with the “Review” button next to the definition.')}</p>
          <div class="row-wrap" style={{ justifyContent: 'center' }}>
            <a class="btn btn-primary" href={href('/quiz/mix')}>
              <Shuffle aria-hidden="true" />
              {tx('Zrób szybki miks', 'Take a quick mix')}
            </a>
            <a class="btn" href={href('/slownik')}>
              <BookA aria-hidden="true" />
              {t('nav.glossary')}
            </a>
          </div>
        </div>
      ) : (
        <div class="stack review-parts">
          {session.questions.length > 0 && (
            <section class="stack" aria-labelledby="review-questions">
              <h3 id="review-questions">{tx('Pytania z quizów', 'Quiz questions')}</h3>
              <Quiz
                questions={session.questions}
                seed={seed}
                mode="practice"
                onFinish={(result) => recordReview(result.right.map(questionKey), result.wrong.map(questionKey))}
                resultExtra={() => <p class="muted small">{nextReviewText()}</p>}
              />
            </section>
          )}
          {session.terms.length > 0 && (
            <section class="stack" aria-labelledby="review-terms">
              <h3 id="review-terms">{tx('Hasła ze słownika', 'Glossary terms')}</h3>
              <Flashcards terms={session.terms} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

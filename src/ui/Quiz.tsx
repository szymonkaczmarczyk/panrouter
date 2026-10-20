import { ArrowDown, ArrowUp, CircleCheck, CircleX, Lightbulb, RotateCcw, Timer } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Question } from '../content/types';
import { tr, tx } from '../i18n';

export interface QuizResult {
  correct: number;
  total: number;
  percent: number;
  wrong: string[];
  right: string[];
}

type Answer = number | number[] | string | number[];

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let s = seed || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,/g, '.').replace(/^\//, '');
}

export function isCorrect(question: Question, answer: Answer | undefined): boolean {
  if (answer === undefined) return false;
  switch (question.kind) {
    case 'single':
      return answer === question.answer;
    case 'multi': {
      const chosen = [...(answer as number[])].sort();
      const expected = [...question.answer].sort();
      return chosen.length === expected.length && chosen.every((v, i) => v === expected[i]);
    }
    case 'input':
      return question.answer.some((a) => normalizeAnswer(a) === normalizeAnswer(answer as string));
    case 'order':
      return (answer as number[]).every((v, i) => v === i);
  }
}

interface Prepared {
  question: Question;
  optionOrder: number[];
}

function prepare(questions: Question[], seed: number): Prepared[] {
  return questions.map((question, index) => {
    if (question.kind === 'single' || question.kind === 'multi') {
      return { question, optionOrder: shuffle(question.options.map((_, i) => i), seed + index * 31) };
    }
    if (question.kind === 'order') {
      let order = shuffle(question.items.map((_, i) => i), seed + index * 17);
      if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
      return { question, optionOrder: order };
    }
    return { question, optionOrder: [] };
  });
}

function QuestionView({ item, answer, onAnswer, revealed }: { item: Prepared; answer: Answer | undefined; onAnswer: (a: Answer) => void; revealed: boolean }) {
  const q = item.question;
  if (q.kind === 'single' || q.kind === 'multi') {
    return (
      <ul class="options" role={q.kind === 'single' ? 'radiogroup' : 'group'}>
        {item.optionOrder.map((optionIndex, position) => {
          const selected = q.kind === 'single' ? answer === optionIndex : Array.isArray(answer) && answer.includes(optionIndex);
          const isRight = q.kind === 'single' ? q.answer === optionIndex : q.answer.includes(optionIndex);
          const cls = revealed ? (isRight ? 'correct' : selected ? 'wrong' : '') : '';
          return (
            <li key={optionIndex}>
              <button
                type="button"
                class={`option ${cls}`}
                aria-pressed={selected}
                disabled={revealed}
                onClick={() => {
                  if (q.kind === 'single') onAnswer(optionIndex);
                  else {
                    const current = Array.isArray(answer) ? answer : [];
                    onAnswer(current.includes(optionIndex) ? current.filter((v) => v !== optionIndex) : [...current, optionIndex]);
                  }
                }}
              >
                <kbd class="key">{String.fromCharCode(65 + position)}</kbd>
                <span>{tr(q.options[optionIndex])}</span>
                {revealed && isRight && <CircleCheck aria-label={tx('poprawna', 'correct')} />}
                {revealed && !isRight && selected && <CircleX aria-label={tx('błędna', 'wrong')} />}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
  if (q.kind === 'input') {
    return (
      <div class="field" style={{ marginTop: 'var(--space-5)', maxWidth: '420px' }}>
        <label for={`ans-${q.id}`}>{tx('Twoja odpowiedź', 'Your answer')}</label>
        <input
          id={`ans-${q.id}`}
          class="input mono"
          value={(answer as string) ?? ''}
          placeholder={q.placeholder}
          disabled={revealed}
          onInput={(e) => onAnswer((e.currentTarget as HTMLInputElement).value)}
          autoComplete="off"
          spellcheck={false}
        />
        {revealed && (
          <span class={isCorrect(q, answer) ? 'badge badge-ok' : 'field-error'}>
            {tx('Poprawna odpowiedź', 'Correct answer')}: <span class="mono">{q.answer[0]}</span>
          </span>
        )}
      </div>
    );
  }
  const order = (answer as number[] | undefined) ?? item.optionOrder;
  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onAnswer(next);
  };
  return (
    <ol class="order-list">
      {order.map((itemIndex, position) => (
        <li key={itemIndex} class={`order-item ${revealed ? (itemIndex === position ? 'option correct' : 'option wrong') : ''}`}>
          <span class="num">{position + 1}.</span>
          <span class="text">{tr(q.items[itemIndex])}</span>
          {!revealed && (
            <>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" onClick={() => move(position, -1)} disabled={position === 0} aria-label={tx('Przesuń wyżej', 'Move up')}>
                <ArrowUp aria-hidden="true" />
              </button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" onClick={() => move(position, 1)} disabled={position === order.length - 1} aria-label={tx('Przesuń niżej', 'Move down')}>
                <ArrowDown aria-hidden="true" />
              </button>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

function hasAnswer(question: Question, answer: Answer | undefined): boolean {
  if (answer === undefined) return question.kind === 'order';
  if (question.kind === 'multi') return (answer as number[]).length > 0;
  if (question.kind === 'input') return (answer as string).trim().length > 0;
  return true;
}

export function ScoreRing({ percent, pass }: { percent: number; pass: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const color = percent >= pass ? 'var(--ok)' : percent >= pass / 2 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div class="score-ring" role="img" aria-label={`${percent}%`}>
      <svg viewBox="0 0 140 140">
        <circle class="track" cx="70" cy="70" r={r} />
        <circle class="value" cx="70" cy="70" r={r} style={{ stroke: color, strokeDasharray: c, strokeDashoffset: c * (1 - percent / 100) }} />
      </svg>
      <strong>{percent}%</strong>
    </div>
  );
}

interface Props {
  questions: Question[];
  seed: number;
  mode: 'practice' | 'exam';
  pass?: number;
  timeLimit?: number;
  onFinish: (result: QuizResult) => void;
  resultExtra?: (result: QuizResult) => ComponentChildren;
  onRestart?: () => void;
}

export function Quiz({ questions, seed, mode, pass = 70, timeLimit, onFinish, resultExtra, onRestart }: Props) {
  const items = useMemo(() => prepare(questions, seed), [questions, seed]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(Answer | undefined)[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [left, setLeft] = useState(timeLimit ?? 0);
  const item = items[index];
  const latest = useRef(answers);
  const quizRef = useRef<HTMLDivElement>(null);
  latest.current = answers;

  const finish = () => {
    const right: string[] = [];
    const wrong: string[] = [];
    const given = latest.current;
    items.forEach((it, i) => {
      const answer = it.question.kind === 'order' && given[i] === undefined ? it.optionOrder : given[i];
      (isCorrect(it.question, answer) ? right : wrong).push(it.question.id);
    });
    const res = { correct: right.length, total: items.length, percent: Math.round((right.length / Math.max(1, items.length)) * 100), wrong, right };
    setResult(res);
    onFinish(res);
  };

  useEffect(() => {
    if (result) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
      if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
      const position = event.key.toUpperCase().charCodeAt(0) - 65;
      const option = quizRef.current?.querySelectorAll<HTMLButtonElement>('.options .option')[position];
      if (!option || option.disabled) return;
      event.preventDefault();
      option.click();
      option.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result]);

  useEffect(() => {
    if (!timeLimit || result) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          finish();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timeLimit, result]);

  if (result) {
    const passed = result.percent >= pass;
    return (
      <div class="quiz-result fade-in">
        <ScoreRing percent={result.percent} pass={pass} />
        <h3>{passed ? tx('Zaliczone', 'Passed') : tx('Jeszcze nie tym razem', 'Not this time')}</h3>
        <p class="muted">
          {tx(`Poprawne odpowiedzi: ${result.correct} z ${result.total}. Próg zaliczenia: ${pass}%.`, `Correct answers: ${result.correct} of ${result.total}. Pass mark: ${pass}%.`)}
        </p>
        {resultExtra?.(result)}
        {result.wrong.length > 0 && (
          <>
            <h4>{tx('Do powtórki', 'To review')}</h4>
            <ul class="review-list">
              {items
                .filter((it) => result.wrong.includes(it.question.id))
                .map((it) => (
                  <li key={it.question.id}>
                    <strong>{tr(it.question.q)}</strong>
                    <span class="muted small">
                      <Lightbulb aria-hidden="true" style={{ width: 14, height: 14, display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
                      {tr(it.question.explain)}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
        {onRestart && (
          <button type="button" class="btn" onClick={onRestart}>
            <RotateCcw aria-hidden="true" />
            {tx('Spróbuj ponownie', 'Try again')}
          </button>
        )}
      </div>
    );
  }

  if (!item) return <p class="muted">{tx('Brak pytań.', 'No questions.')}</p>;
  const answer = answers[index];
  const isRevealed = mode === 'practice' && revealed[index];
  const setAnswer = (value: Answer) => setAnswers((list) => Object.assign([...list], { [index]: value }));
  const last = index === items.length - 1;
  const answered = hasAnswer(item.question, answer);
  const correct = isRevealed && isCorrect(item.question, item.question.kind === 'order' && answer === undefined ? item.optionOrder : answer);
  const instant = mode === 'practice' && item.question.kind === 'single';
  const reveal = () => setRevealed((list) => Object.assign([...list], { [index]: true }));
  const onAnswer = (value: Answer) => {
    setAnswer(value);
    if (instant) reveal();
  };

  return (
    <div class="quiz" ref={quizRef}>
      <div class="quiz-top">
        <span class="badge">
          {index + 1} / {items.length}
        </span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${((index + (isRevealed ? 1 : 0)) / items.length) * 100}%` }} />
        </div>
        {timeLimit ? (
          <span class={`badge ${left < 120 ? 'badge-danger' : ''}`} aria-label={tx('Pozostały czas', 'Time left')}>
            <Timer aria-hidden="true" />
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        ) : null}
      </div>
      <section class="question card fade-in" key={item.question.id}>
        <span class="eyebrow">
          {item.question.kind === 'multi'
            ? tx('Wybierz wszystkie poprawne', 'Select all that apply')
            : item.question.kind === 'input'
              ? tx('Wpisz odpowiedź', 'Type the answer')
              : item.question.kind === 'order'
                ? tx('Ułóż we właściwej kolejności', 'Put in the right order')
                : instant
                  ? tx('Kliknij poprawną odpowiedź', 'Click the correct answer')
                  : tx('Jedna poprawna odpowiedź', 'One correct answer')}
        </span>
        <h3>{tr(item.question.q)}</h3>
        <QuestionView item={item} answer={answer} onAnswer={onAnswer} revealed={Boolean(isRevealed)} />
        {isRevealed && (
          <div class={`callout ${correct ? 'callout-ok' : 'callout-warn'} feedback`} style={{ marginTop: 'var(--space-5)' }} role="status">
            {correct ? <CircleCheck aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
            <div>
              <strong class="callout-title">{correct ? tx('Dobrze!', 'Correct!') : tx('Nie do końca.', 'Not quite.')}</strong>
              <p>{tr(item.question.explain)}</p>
            </div>
          </div>
        )}
      </section>
      <div class="row-wrap">
        {mode === 'exam' && index > 0 && (
          <button type="button" class="btn" onClick={() => setIndex(index - 1)}>
            {tx('Poprzednie', 'Previous')}
          </button>
        )}
        <div class="spacer" />
        {mode === 'practice' && !isRevealed && !instant && (
          <button type="button" class="btn btn-primary" disabled={!answered} onClick={reveal}>
            {tx('Sprawdź', 'Check')}
          </button>
        )}
        {(mode === 'exam' || isRevealed) &&
          (last ? (
            <button type="button" class="btn btn-primary" onClick={finish} disabled={mode === 'exam' && !answered && item.question.kind !== 'order'}>
              {mode === 'exam' ? tx('Zakończ i oddaj', 'Finish and submit') : tx('Zobacz wynik', 'See the result')}
            </button>
          ) : (
            <button type="button" class="btn btn-primary" onClick={() => setIndex(index + 1)} disabled={mode === 'exam' && !answered && item.question.kind !== 'order'}>
              {tx('Następne pytanie', 'Next question')}
            </button>
          ))}
      </div>
    </div>
  );
}

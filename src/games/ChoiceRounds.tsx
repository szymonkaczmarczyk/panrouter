import { CircleCheck, CircleX } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { tx } from '../i18n';

export interface Round {
  prompt: ComponentChildren;
  options: string[];
  answer: number;
  explain: string;
}

export function ChoiceRounds({ rounds, onFinish, mono }: { rounds: Round[]; onFinish: (score: number) => void; mono?: boolean }) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const round = rounds[index];

  const choose = (option: number) => {
    if (chosen !== null) return;
    setChosen(option);
    if (option === round.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (chosen === null) return;
    if (index === rounds.length - 1) {
      onFinish(Math.round(((correct) / rounds.length) * 100));
      return;
    }
    setIndex(index + 1);
    setChosen(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea')) return;
      const n = Number(event.key);
      if (n >= 1 && n <= round.options.length) choose(n - 1);
      if (event.key === 'Enter') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div class="game-round">
      <div class="quiz-top">
        <span class="badge">
          {index + 1} / {rounds.length}
        </span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${((index + (chosen !== null ? 1 : 0)) / rounds.length) * 100}%` }} />
        </div>
        <span class="badge badge-ok">
          {tx('Punkty', 'Score')}: {correct}
        </span>
      </div>
      <div class="card game-prompt" key={index}>
        {round.prompt}
      </div>
      <ul class="options game-options">
        {round.options.map((option, i) => {
          const cls = chosen === null ? '' : i === round.answer ? 'correct' : i === chosen ? 'wrong' : '';
          return (
            <li key={option}>
              <button type="button" class={`option ${cls}`} disabled={chosen !== null} onClick={() => choose(i)}>
                <span class="key">{i + 1}</span>
                <span class={mono ? 'mono' : ''}>{option}</span>
                {chosen !== null && i === round.answer && <CircleCheck aria-hidden="true" />}
                {chosen !== null && i === chosen && i !== round.answer && <CircleX aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      {chosen !== null && (
        <div class={`callout ${chosen === round.answer ? 'callout-ok' : 'callout-warn'} feedback`} role="status">
          {chosen === round.answer ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
          <div class="row-wrap" style={{ justifyContent: 'space-between', width: '100%' }}>
            <p>{round.explain}</p>
            <button type="button" class="btn btn-primary" onClick={next}>
              {index === rounds.length - 1 ? tx('Wynik', 'Result') : tx('Dalej', 'Next')} <kbd>Enter</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'preact/hooks';
import { tx } from '../i18n';
import { rand } from './util';

const WEIGHTS = [128, 64, 32, 16, 8, 4, 2, 1];
const DURATION = 60;

export function BinarySprint({ onFinish }: { onFinish: (score: number) => void }) {
  const [target, setTarget] = useState(() => rand(256));
  const [bits, setBits] = useState<boolean[]>(() => Array(8).fill(false));
  const [hits, setHits] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [flash, setFlash] = useState(false);
  const value = bits.reduce((sum, on, i) => sum + (on ? WEIGHTS[i] : 0), 0);

  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0) onFinish(Math.min(100, hits * 8));
  }, [left]);

  useEffect(() => {
    if (value !== target) return;
    setHits((h) => h + 1);
    setFlash(true);
    const id = window.setTimeout(() => {
      setFlash(false);
      setBits(Array(8).fill(false));
      let next = rand(256);
      while (next === target) next = rand(256);
      setTarget(next);
    }, 350);
    return () => window.clearTimeout(id);
  }, [value, target]);

  const toggle = (i: number) => setBits((b) => b.map((v, j) => (j === i ? !v : v)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key);
      if (n >= 1 && n <= 8) toggle(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class="stack game-binary">
      <div class="quiz-top">
        <span class={`badge ${left <= 10 ? 'badge-danger' : ''}`}>{left} s</span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${(left / DURATION) * 100}%` }} />
        </div>
        <span class="badge badge-ok">
          {tx('Trafione', 'Hits')}: {hits}
        </span>
      </div>
      <div class={`card binary-target ${flash ? 'binary-hit' : ''}`}>
        <span class="muted small">{tx('Ułóż liczbę', 'Build the number')}</span>
        <strong>{target}</strong>
        <span class="mono dim">
          {tx('Teraz', 'Now')}: {value}
        </span>
      </div>
      <div class="bit-row" role="group" aria-label={tx('Bity oktetu', 'Octet bits')}>
        {WEIGHTS.map((weight, i) => (
          <button key={weight} type="button" class="bit" aria-pressed={bits[i]} onClick={() => toggle(i)} aria-label={`${tx('bit o wadze', 'bit worth')} ${weight}`}>
            <span class="bit-value">{bits[i] ? 1 : 0}</span>
            <span class="bit-weight">{weight}</span>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
      <p class="muted small">{tx('Klikaj bity albo naciskaj klawisze 1-8. Każda trafiona liczba to punkt.', 'Click bits or press keys 1-8. Each number you hit scores a point.')}</p>
    </div>
  );
}

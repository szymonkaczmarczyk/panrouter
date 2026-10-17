import { CircleCheck, CircleX } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { tx } from '../i18n';
import { broadcastOf, hostCount, ipToStr, networkOf, prefixToMask } from '../sim/ip';
import { compressIpv6, expandIpv6 } from './ipv6';
import { pick, rand } from './util';

type Props = { onFinish: (score: number) => void };

interface Field {
  key: string;
  label: string;
  answer: string;
}

function FieldRounds({ rounds, onFinish }: { rounds: { prompt: preact.ComponentChildren; fields: Field[]; explain: string }[]; onFinish: (score: number) => void }) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [points, setPoints] = useState(0);
  const total = rounds.reduce((sum, r) => sum + r.fields.length, 0);
  const round = rounds[index];
  const norm = (v: string) => v.trim().toLowerCase().replace(/^\//, '');
  const ok = (f: Field) => norm(values[f.key] ?? '') === norm(f.answer);

  const check = (event: Event) => {
    event.preventDefault();
    if (checked) {
      if (index === rounds.length - 1) onFinish(Math.round((points / total) * 100));
      else {
        setIndex(index + 1);
        setValues({});
        setChecked(false);
      }
      return;
    }
    setChecked(true);
    setPoints((p) => p + round.fields.filter(ok).length);
  };

  return (
    <form class="stack" onSubmit={check} noValidate>
      <div class="quiz-top">
        <span class="badge">
          {index + 1} / {rounds.length}
        </span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${((index + (checked ? 1 : 0)) / rounds.length) * 100}%` }} />
        </div>
        <span class="badge badge-ok">
          {tx('Punkty', 'Score')}: {points}/{total}
        </span>
      </div>
      <div class="card game-prompt" key={index}>
        {round.prompt}
      </div>
      <div class="form-grid game-fields">
        {round.fields.map((f, i) => (
          <div class="field" key={f.key}>
            <label for={`f-${index}-${f.key}`}>{f.label}</label>
            <input
              id={`f-${index}-${f.key}`}
              class="input mono"
              value={values[f.key] ?? ''}
              disabled={checked}
              autoFocus={i === 0}
              autoComplete="off"
              spellcheck={false}
              aria-invalid={checked && !ok(f) ? 'true' : undefined}
              onInput={(e) => setValues({ ...values, [f.key]: (e.currentTarget as HTMLInputElement).value })}
            />
            {checked && (
              <span class={ok(f) ? 'badge badge-ok' : 'field-error'}>
                {ok(f) ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                {ok(f) ? tx('dobrze', 'correct') : `${tx('poprawnie', 'correct')}: ${f.answer}`}
              </span>
            )}
          </div>
        ))}
      </div>
      {checked && <p class="muted small">{round.explain}</p>}
      <div>
        <button type="submit" class="btn btn-primary">
          {checked ? (index === rounds.length - 1 ? tx('Wynik', 'Result') : tx('Następne zadanie', 'Next task')) : tx('Sprawdź', 'Check')} <kbd>Enter</kbd>
        </button>
      </div>
    </form>
  );
}

export function SubnetSprint({ onFinish }: Props) {
  const rounds = useMemo(() => {
    return Array.from({ length: 5 }, () => {
      const prefix = pick([20, 22, 24, 25, 26, 27, 28, 29, 30]);
      const firstOctet = pick([10, 172, 192]);
      const second = firstOctet === 172 ? 16 + rand(16) : firstOctet === 192 ? 168 : rand(256);
      const ip = ((firstOctet << 24) | (second << 16) | (rand(256) << 8) | (rand(254) + 1)) >>> 0;
      const net = networkOf(ip, prefix);
      const bc = broadcastOf(ip, prefix);
      return {
        prompt: (
          <div class="stack" style={{ gap: 'var(--space-2)' }}>
            <span class="muted small">{tx('Wyznacz parametry podsieci dla adresu', 'Work out the subnet for')}</span>
            <strong class="game-big mono">
              {ipToStr(ip)}/{prefix}
            </strong>
            <span class="dim small mono">{tx('maska', 'mask')} {ipToStr(prefixToMask(prefix))}</span>
          </div>
        ),
        fields: [
          { key: 'net', label: tx('Adres sieci', 'Network address'), answer: ipToStr(net) },
          { key: 'bc', label: tx('Adres rozgłoszeniowy', 'Broadcast address'), answer: ipToStr(bc) },
          { key: 'first', label: tx('Pierwszy host', 'First host'), answer: ipToStr(net + 1) },
          { key: 'last', label: tx('Ostatni host', 'Last host'), answer: ipToStr(bc - 1) },
          { key: 'hosts', label: tx('Liczba hostów', 'Host count'), answer: String(hostCount(prefix)) },
        ],
        explain: tx(`Blok /${prefix} ma ${2 ** (32 - prefix)} adresów. Sieć ${ipToStr(net)}, rozgłoszenie ${ipToStr(bc)}.`, `A /${prefix} block has ${2 ** (32 - prefix)} addresses. Network ${ipToStr(net)}, broadcast ${ipToStr(bc)}.`),
      };
    });
  }, []);
  return <FieldRounds rounds={rounds} onFinish={onFinish} />;
}

function randomGroups(): number[] {
  const groups = [0x2001, 0x0db8, rand(4) === 0 ? 0 : rand(0xffff), rand(3) === 0 ? 0 : rand(0x100), 0, 0, 0, 0];
  const zeroRun = rand(4);
  for (let i = 4; i < 8; i++) groups[i] = i - 4 < zeroRun ? 0 : rand(3) === 0 ? rand(0x10) : rand(0xffff);
  if (groups.slice(2).every((g) => g === 0)) groups[7] = 1;
  return groups;
}

export function Ipv6Compressor({ onFinish }: Props) {
  const rounds = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const groups = randomGroups();
        const full = expandIpv6(groups);
        const short = compressIpv6(groups);
        const compress = i % 2 === 0;
        return {
          prompt: (
            <div class="stack" style={{ gap: 'var(--space-2)' }}>
              <span class="muted small">{compress ? tx('Skróć adres zgodnie z RFC 5952', 'Shorten the address per RFC 5952') : tx('Rozwiń adres do pełnej postaci (8 grup po 4 cyfry)', 'Expand the address to full form (8 groups of 4 digits)')}</span>
              <strong class="game-big mono game-ipv6">{compress ? full : short}</strong>
            </div>
          ),
          fields: [{ key: 'a', label: compress ? tx('Postać skrócona', 'Short form') : tx('Pełna postać', 'Full form'), answer: compress ? short : full }],
          explain: tx('Zera wiodące znikają, a najdłuższy ciąg co najmniej dwóch zerowych grup zastępuje :: (tylko raz). Litery małe.', 'Leading zeros go away and the longest run of at least two zero groups becomes :: (only once). Lowercase letters.'),
        };
      }),
    [],
  );
  return <FieldRounds rounds={rounds} onFinish={onFinish} />;
}

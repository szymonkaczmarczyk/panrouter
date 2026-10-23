import { ArrowLeft, CircleCheck, CircleX, ClipboardCheck, Dices, Eye, Lightbulb, LoaderCircle, Siren, X } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href, navigate } from '../app/router';
import { buildIncident, LAYER_HINT, LEVELS, randomSeed, runTests, type IncidentLevel } from '../content/incidents';
import { lang, tr, tx } from '../i18n';
import { normalizeNetwork } from '../sim/normalize';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { progress, recordIncidentSolved, saveIncidentNet, setIncident, takeIncidentHint, type IncidentRun } from '../state/progress';
import { toast } from '../ui/toast';

const RUN_PATH = '/awaria/zgloszenie';

export function IncidentSetup() {
  useEffect(() => setMeta(tx('Generator awarii', 'Fault generator'), tx('Losowa awaria w sieci do znalezienia i naprawienia. Ćwicz diagnostykę jak na dyżurze w dziale IT.', 'A random network fault to find and fix. Practice troubleshooting like an IT on-call shift.')), []);
  const [level, setLevel] = useState<IncidentLevel>(1);
  const [seedText, setSeedText] = useState('');
  const [busy, setBusy] = useState(false);
  const active = progress.value.incident;
  const stats = progress.value.incidents;
  const seedError = seedText && !/^\d{1,9}$/.test(seedText.trim()) ? tx('Numer zgłoszenia to same cyfry, np. 48213.', 'A ticket number is digits only, e.g. 48213.') : '';

  const start = () => {
    if (seedError) return;
    if (active && !window.confirm(tx('Masz otwarte zgłoszenie. Porzucić je i wylosować nowe?', 'You have an open ticket. Abandon it and draw a new one?'))) return;
    setBusy(true);
    window.setTimeout(() => {
      const seed = seedText.trim() ? Number(seedText.trim()) : randomSeed();
      const incident = buildIncident(seed, level);
      const results = runTests(incident.net, incident.tests);
      setIncident({ ...incident, symptoms: incident.tests.filter((t) => !results[t.id]).map((t) => t.id), hints: 0, revealed: false });
      setBusy(false);
      navigate(RUN_PATH);
    }, 30);
  };

  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{tx('Generator awarii', 'Fault generator')}</span>
        <h2>{tx('Dyżur w dziale IT', 'IT on-call shift')}</h2>
        <p>{tx('Symulator psuje sieć, a Ty dostajesz zgłoszenia od użytkowników. Znajdź usterki i napraw je tak, żeby wszystko znów działało. Liczy się działająca sieć, nie to, czy cofniesz dokładnie tę samą zmianę.', 'The simulator breaks the network and you get tickets from users. Find the faults and fix them so everything works again. A working network is what counts, not undoing the exact same change.')}</p>
      </header>
      {active && (
        <div class="callout callout-info incident-resume">
          <Siren aria-hidden="true" />
          <div>
            <strong class="callout-title">{tx(`Zgłoszenie #${active.seed} czeka na naprawę`, `Ticket #${active.seed} is waiting for a fix`)}</strong>
            <p>{tx('Możesz wrócić do niego w każdej chwili. Postęp na planszy jest zapisany.', 'You can return to it any time. The canvas progress is saved.')}</p>
          </div>
          <a class="btn btn-primary" href={href(RUN_PATH)}>
            {tx('Wróć do zgłoszenia', 'Back to the ticket')}
          </a>
        </div>
      )}
      <section class="section">
        <div class="section-head">
          <h2>{tx('Wybierz trudność', 'Pick the difficulty')}</h2>
          <span class="muted small">{tx(`Rozwiązane: ${stats.solved}, bez podglądania rozwiązania: ${stats.clean}`, `Solved: ${stats.solved}, without revealing the solution: ${stats.clean}`)}</span>
        </div>
        <div class="grid-3" role="radiogroup" aria-label={tx('Trudność', 'Difficulty')}>
          {LEVELS.map((item) => (
            <button key={item.level} type="button" role="radio" aria-checked={level === item.level} class={`card stack incident-level ${level === item.level ? 'is-active' : ''}`} onClick={() => setLevel(item.level)}>
              <span class="row" style={{ justifyContent: 'space-between' }}>
                <strong>{tr(item.title)}</strong>
                <span class="badge">{tx(`${item.faults} ${item.faults === 1 ? 'usterka' : 'usterki'}`, `${item.faults} ${item.faults === 1 ? 'fault' : 'faults'}`)}</span>
              </span>
              <span class="muted small">{tr(item.summary)}</span>
            </button>
          ))}
        </div>
        <div class="incident-start">
          <div class="field">
            <label for="incident-seed">{tx('Numer zgłoszenia (opcjonalnie)', 'Ticket number (optional)')}</label>
            <input
              id="incident-seed"
              class="input mono"
              inputMode="numeric"
              value={seedText}
              placeholder={tx('losowy', 'random')}
              aria-invalid={seedError ? 'true' : undefined}
              aria-describedby="incident-seed-help"
              onInput={(e) => setSeedText((e.currentTarget as HTMLInputElement).value)}
            />
            <span id="incident-seed-help" class={seedError ? 'field-error' : 'small dim'}>
              {seedError || tx('Ten sam numer i poziom dają tę samą awarię. Podaj go innej osobie, a dostanie to samo zadanie.', 'The same number and level give the same fault. Share it so a friend solves the same one.')}
            </span>
          </div>
          <button type="button" class="btn btn-primary btn-lg" onClick={start} disabled={busy || Boolean(seedError)}>
            {busy ? <LoaderCircle aria-hidden="true" class="spin" /> : <Dices aria-hidden="true" />}
            {busy ? tx('Psuję sieć…', 'Breaking the network…') : tx('Wylosuj awarię', 'Draw a fault')}
          </button>
        </div>
      </section>
    </div>
  );
}

function IncidentPanel({ run, ctrl, onClose }: { run: IncidentRun; ctrl: SimController; onClose: () => void }) {
  const [results, setResults] = useState<Record<string, boolean> | null>(null);
  const [checking, setChecking] = useState(false);
  const symptoms = run.tests.filter((t) => run.symptoms.includes(t.id));

  const check = () => {
    setChecking(true);
    window.setTimeout(() => {
      const next = runTests(ctrl.net, run.tests);
      setResults(next);
      setChecking(false);
      if (Object.values(next).every(Boolean)) {
        recordIncidentSolved(!run.revealed);
        toast(run.revealed ? tx('Sieć działa. Zgłoszenie zamknięte.', 'The network works. Ticket closed.') : tx('Sieć działa i obyło się bez podglądania rozwiązania. Świetna diagnostyka!', 'The network works and you did not peek at the solution. Great troubleshooting!'), 'ok', 5000);
        navigate('/awaria');
      }
    }, 30);
  };

  const reveal = () => {
    if (!window.confirm(tx('Pokazać rozwiązanie? Zgłoszenie zaliczysz dalej, ale za mniej punktów.', 'Show the solution? You can still close the ticket, but for fewer points.'))) return;
    takeIncidentHint(true);
  };

  const failing = results ? run.tests.filter((t) => !results[t.id]).length : symptoms.length;

  return (
    <aside class="lab-side" aria-label={tx('Zgłoszenie', 'Ticket')}>
      <div class="lab-side-head">
        <button type="button" class="btn btn-ghost btn-icon lab-close" onClick={onClose} aria-label={tx('Zwiń zgłoszenie', 'Collapse the ticket')}>
          <X aria-hidden="true" />
        </button>
        <span class="eyebrow">
          {tx('Zgłoszenie', 'Ticket')} #{run.seed} · {tr(LEVELS[run.level - 1].title)}
        </span>
        <h4>{tx('Użytkownicy zgłaszają problemy', 'Users report problems')}</h4>
        <p class="muted small">{tx(`W sieci są usterki: ${run.faults.length}. Znajdź je w CLI i panelach urządzeń, a potem sprawdź naprawę.`, `There are ${run.faults.length} faults in the network. Find them in the CLI and device panels, then check your fix.`)}</p>
      </div>
      <div class="lab-side-body">
        <section aria-live="polite">
          <strong class="small">{results ? tx('Wynik sprawdzenia', 'Check result') : tx('Objawy', 'Symptoms')}</strong>
          <ul class="check-list">
            {(results ? run.tests : symptoms).map((test) => {
              const ok = results ? results[test.id] : false;
              return (
                <li key={test.id} class={ok ? 'ok' : 'fail'}>
                  {ok ? <CircleCheck aria-label={tx('działa', 'works')} /> : <CircleX aria-label={tx('nie działa', 'broken')} />}
                  <div>
                    <span>{tr(test.label)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {results && failing > 0 && <p class="small muted">{tx(`Jeszcze nie działa: ${failing}. Po zmianach w DHCP sprawdzarka sama odnawia adresy komputerów.`, `Still broken: ${failing}. After DHCP changes the checker renews computer addresses by itself.`)}</p>}
        </section>
        <section class="incident-hints">
          <strong class="small">{tx('Podpowiedzi', 'Hints')}</strong>
          {run.hints === 0 && !run.revealed && <p class="small dim">{tx('Zacznij od ping i tracert z komputerów z listy objawów, a potem show ip interface brief, show vlan brief i show ip route.', 'Start with ping and tracert from the computers listed in the symptoms, then show ip interface brief, show vlan brief and show ip route.')}</p>}
          <ol class="small">
            {run.faults.map((fault, index) => (
              <li key={index}>
                {run.revealed ? (
                  tr(fault.solution)
                ) : (
                  <>
                    {run.hints >= 1 && <span>{tr(LAYER_HINT[fault.layer])} </span>}
                    {run.hints >= 2 && <strong>{tx(`Urządzenie: ${fault.device}.`, `Device: ${fault.device}.`)}</strong>}
                    {run.hints === 0 && <span class="dim">{tx('Ukryta', 'Hidden')}</span>}
                  </>
                )}
              </li>
            ))}
          </ol>
          <div class="row-wrap">
            {!run.revealed && run.hints < 2 && (
              <button type="button" class="btn btn-sm" onClick={() => takeIncidentHint(false)}>
                <Lightbulb aria-hidden="true" />
                {tx(`Podpowiedź (${run.hints + 1}/2)`, `Hint (${run.hints + 1}/2)`)}
              </button>
            )}
            {!run.revealed && (
              <button type="button" class="btn btn-sm btn-ghost" onClick={reveal}>
                <Eye aria-hidden="true" />
                {tx('Pokaż rozwiązanie', 'Show the solution')}
              </button>
            )}
          </div>
        </section>
      </div>
      <div class="lab-side-foot">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          onClick={() => {
            if (!window.confirm(tx('Porzucić to zgłoszenie? Plansza wróci do stanu z losowania przy następnej awarii.', 'Abandon this ticket? A new fault will start from a fresh network.'))) return;
            setIncident(null);
            navigate('/awaria');
          }}
        >
          {tx('Porzuć', 'Abandon')}
        </button>
        <div class="spacer" />
        <button type="button" class="btn btn-primary" onClick={check} disabled={checking}>
          {checking ? <LoaderCircle aria-hidden="true" class="spin" /> : <ClipboardCheck aria-hidden="true" />}
          {tx('Sprawdź naprawę', 'Check the fix')}
        </button>
      </div>
    </aside>
  );
}

export function IncidentRunPage() {
  const run = progress.value.incident;
  const [open, setOpen] = useState(true);
  const ctrl = useMemo(() => {
    if (!run) return null;
    return new SimController(normalizeNetwork(run.net) ?? buildIncident(run.seed, run.level).net, saveIncidentNet);
  }, [run?.seed, run?.level]);

  useEffect(() => {
    if (!run) {
      navigate('/awaria');
      return;
    }
    setMeta(tx(`Zgłoszenie #${run.seed}`, `Ticket #${run.seed}`), tx('Znajdź i napraw usterki w sieci.', 'Find and fix the network faults.'));
    ctrl?.sim.autoDhcp();
    ctrl?.bump();
  }, [run?.seed, lang.value]);

  if (!run || !ctrl) return null;
  return (
    <Workspace
      ctrl={ctrl}
      locked
      leading={
        <>
          <a class="btn btn-ghost btn-sm" href={href('/awaria')}>
            <ArrowLeft aria-hidden="true" />
            {tx('Wróć', 'Back')}
          </a>
          {!open && (
            <button type="button" class="btn btn-sm" onClick={() => setOpen(true)}>
              <Siren aria-hidden="true" />
              {tx('Zgłoszenie', 'Ticket')}
            </button>
          )}
        </>
      }
      side={open ? <IncidentPanel run={run} ctrl={ctrl} onClose={() => setOpen(false)} /> : undefined}
    />
  );
}

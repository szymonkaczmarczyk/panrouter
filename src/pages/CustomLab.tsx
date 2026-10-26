import { ArrowLeft, CircleCheck, CircleX, ClipboardCheck, Link2Off, ListTodo, LoaderCircle, Network, RotateCcw, X } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href, path } from '../app/router';
import { checkLabel, decodeCustomLab, runCustomChecks, type CustomLab } from '../content/customLab';
import { lang, tr, tx } from '../i18n';
import { normalizeNetwork } from '../sim/normalize';
import { queryParam } from '../sim/share';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { progress, saveLabNet } from '../state/progress';
import { ScoreRing } from '../ui/Quiz';
import { toast } from '../ui/toast';

export function linkLabKey(data: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 0x01000193);
  return `link-${(hash >>> 0).toString(36)}`;
}

function CustomLabPanel({ lab, ctrl, onReset, onClose }: { lab: CustomLab; ctrl: SimController; onReset: () => void; onClose: () => void }) {
  const [results, setResults] = useState<boolean[] | null>(null);
  const passed = results ? results.filter(Boolean).length : 0;
  const percent = results ? Math.round((passed / lab.checks.length) * 100) : 0;

  const check = () => {
    const next = runCustomChecks(ctrl.net, lab.checks);
    setResults(next);
    if (next.every(Boolean)) toast(tx('Wszystkie warunki spełnione!', 'All conditions met!'), 'ok');
  };

  return (
    <aside class="lab-side" aria-label={tx('Instrukcje laboratorium', 'Lab instructions')}>
      <div class="lab-side-head">
        <button type="button" class="btn btn-ghost btn-icon lab-close" onClick={onClose} aria-label={tx('Zwiń instrukcje', 'Collapse instructions')}>
          <X aria-hidden="true" />
        </button>
        <span class="eyebrow">{tx('Laboratorium z linku', 'Lab from a link')}</span>
        <h4>{lab.title}</h4>
      </div>
      <div class="lab-side-body">
        {lab.text ? (
          <div class="stack custom-lab-text">
            {lab.text.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p class="muted small">{tx('Spraw, żeby wszystkie warunki poniżej działały, i kliknij „Sprawdź wyniki”.', 'Make all the conditions below work and click “Check results”.')}</p>
        )}
        <section class="lab-results" aria-live="polite">
          <strong>
            <ListTodo aria-hidden="true" style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-3px' }} /> {tx('Warunki zaliczenia', 'Pass conditions')}
          </strong>
          <ul class="check-list">
            {lab.checks.map((item, i) => {
              const state = results?.[i];
              return (
                <li key={i} class={state === undefined ? '' : state ? 'ok' : 'fail'}>
                  {state === undefined ? <span class="check-dot" /> : state ? <CircleCheck aria-label={tx('zaliczone', 'passed')} /> : <CircleX aria-label={tx('niezaliczone', 'failed')} />}
                  <div>
                    <span>{tr(checkLabel(item))}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {results && (
            <div class="row" style={{ gap: 'var(--space-4)' }}>
              <ScoreRing percent={percent} pass={100} />
              <p class="muted small">{percent === 100 ? tx('Wszystko działa. Pokaż wynik osobie, która przysłała link.', 'Everything works. Show the result to the person who sent the link.') : tx(`Zaliczone ${passed} z ${lab.checks.length}. Popraw zaznaczone na czerwono i sprawdź ponownie.`, `Passed ${passed} of ${lab.checks.length}. Fix the red items and check again.`)}</p>
            </div>
          )}
        </section>
      </div>
      <div class="lab-side-foot">
        <button type="button" class="btn btn-ghost btn-sm" onClick={onReset}>
          <RotateCcw aria-hidden="true" />
          {tx('Od nowa', 'Restart')}
        </button>
        <div class="spacer" />
        <button type="button" class="btn btn-primary" onClick={check}>
          <ClipboardCheck aria-hidden="true" />
          {tx('Sprawdź wyniki', 'Check results')}
        </button>
      </div>
    </aside>
  );
}

function CustomLabWork({ lab, storageKey }: { lab: CustomLab; storageKey: string }) {
  const [open, setOpen] = useState(true);
  const ctrl = useMemo(() => {
    const saved = progress.value.labNets[storageKey];
    return new SimController((saved && normalizeNetwork(saved)) || structuredClone(lab.net), (net) => saveLabNet(storageKey, net));
  }, [storageKey]);

  useEffect(() => {
    setMeta(`${tx('Laboratorium', 'Lab')}: ${lab.title}`, tx('Laboratorium przygotowane przez prowadzącego i udostępnione linkiem.', 'A lab prepared by an instructor and shared as a link.'));
    ctrl.sim.autoDhcp();
    ctrl.bump();
  }, [storageKey, lang.value]);

  const reset = () => {
    if (!window.confirm(tx('Zacząć laboratorium od nowa? Twoja konfiguracja zostanie usunięta.', 'Restart the lab? Your configuration will be removed.'))) return;
    ctrl.load(structuredClone(lab.net));
    ctrl.sim.autoDhcp();
    ctrl.bump();
  };

  return (
    <Workspace
      ctrl={ctrl}
      leading={
        <>
          <a class="btn btn-ghost btn-sm" href={href('/laboratoria')}>
            <ArrowLeft aria-hidden="true" />
            {tx('Wróć', 'Back')}
          </a>
          {!open && (
            <button type="button" class="btn btn-sm" onClick={() => setOpen(true)}>
              <ListTodo aria-hidden="true" />
              {tx('Instrukcje', 'Instructions')}
            </button>
          )}
        </>
      }
      side={open ? <CustomLabPanel lab={lab} ctrl={ctrl} onReset={reset} onClose={() => setOpen(false)} /> : undefined}
    />
  );
}

export function CustomLabPage() {
  const data = queryParam(path.value, 'lab');
  const [state, setState] = useState<{ data: string; lab: CustomLab | null } | null>(null);

  useEffect(() => {
    setMeta(tx('Laboratorium z linku', 'Lab from a link'), tx('Laboratorium przygotowane przez prowadzącego i udostępnione linkiem.', 'A lab prepared by an instructor and shared as a link.'));
    if (!data) return;
    let active = true;
    void decodeCustomLab(data).then((lab) => {
      if (active) setState({ data, lab });
    });
    return () => {
      active = false;
    };
  }, [data]);

  if (data && (!state || state.data !== data)) {
    return (
      <div class="page page-loading" role="status" aria-live="polite">
        <p class="row muted">
          <LoaderCircle aria-hidden="true" class="spin" />
          {tx('Otwieram laboratorium z linku…', 'Opening the lab from the link…')}
        </p>
        <div class="skeleton page-loading-title" />
        <div class="skeleton page-loading-line" />
      </div>
    );
  }

  if (!data || !state?.lab) {
    return (
      <div class="page fade-in">
        <div class="empty card">
          <Link2Off aria-hidden="true" />
          <strong>{tx('Ten link do laboratorium jest uszkodzony albo niepełny', 'This lab link is broken or incomplete')}</strong>
          <p>{tx('Poproś osobę, która go wysłała, o nowy link. Komunikatory czasem ucinają bardzo długie adresy.', 'Ask the sender for a new link. Messengers sometimes cut very long addresses.')}</p>
          <div class="row-wrap" style={{ justifyContent: 'center' }}>
            <a class="btn btn-primary" href={href('/laboratoria')}>
              <ListTodo aria-hidden="true" />
              {tx('Laboratoria z kursu', 'Course labs')}
            </a>
            <a class="btn" href={href('/symulator')}>
              <Network aria-hidden="true" />
              {tx('Otwórz symulator', 'Open the simulator')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <CustomLabWork key={state.data} lab={state.lab} storageKey={linkLabKey(state.data)} />;
}

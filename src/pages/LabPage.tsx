import { ArrowLeft, CircleCheck, CircleX, ClipboardCheck, Lightbulb, ListTodo, RotateCcw, X } from 'lucide-preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { setMeta } from '../app/meta';
import { href } from '../app/router';
import { labById, LABS } from '../content';
import { Blocks } from '../content/Blocks';
import { makeLabContext } from '../content/labs/context';
import type { Lab } from '../content/types';
import { lang, tr, tx } from '../i18n';
import { normalizeNetwork } from '../sim/normalize';
import { SimController } from '../sim/ui/controller';
import { Workspace } from '../sim/ui/Workspace';
import { progress, recordLab, saveLabNet } from '../state/progress';
import { ScoreRing } from '../ui/Quiz';
import { toast } from '../ui/toast';
import { NotFound } from './NotFound';

function LabPanel({ lab, ctrl, onReset, onClose }: { lab: Lab; ctrl: SimController; onReset: () => void; onClose: () => void }) {
  const [results, setResults] = useState<Record<string, boolean> | null>(null);
  const best = progress.value.labs[lab.id]?.best ?? 0;

  const runChecks = () => {
    const ctx = makeLabContext(ctrl.net, ctrl.sim);
    const next: Record<string, boolean> = {};
    for (const item of lab.checks) {
      try {
        next[item.id] = item.test(ctx);
      } catch {
        next[item.id] = false;
      }
    }
    setResults(next);
    const passed = Object.values(next).filter(Boolean).length;
    const percent = Math.round((passed / lab.checks.length) * 100);
    recordLab(lab.id, percent);
    if (percent === 100) toast(tx('Laboratorium zaliczone na 100%!', 'Lab completed at 100%!'), 'ok');
  };

  const passed = results ? Object.values(results).filter(Boolean).length : 0;
  const percent = results ? Math.round((passed / lab.checks.length) * 100) : 0;
  const index = LABS.indexOf(lab);
  const next = LABS[index + 1];

  return (
    <aside class="lab-side" aria-label={tx('Instrukcje laboratorium', 'Lab instructions')}>
      <div class="lab-side-head">
        <button type="button" class="btn btn-ghost btn-icon lab-close" onClick={onClose} aria-label={tx('Zwiń instrukcje', 'Collapse instructions')}>
          <X aria-hidden="true" />
        </button>
        <span class="eyebrow">
          {tx('Laboratorium', 'Lab')} · {tx('poziom', 'level')} {lab.level} · {lab.minutes} min
        </span>
        <h4>{tr(lab.title)}</h4>
        <p class="muted small">{tr(lab.summary)}</p>
      </div>
      <div class="lab-side-body">
        <div class="lab-goals">
          <strong class="small">{tx('Nauczysz się', 'You will learn')}</strong>
          <ul class="small">
            {lab.goals.map((g) => (
              <li key={g.pl}>{tr(g)}</li>
            ))}
          </ul>
        </div>
        <Blocks blocks={lab.steps[lang.value]} />
        <section class="lab-results" aria-live="polite">
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <strong>
              <ListTodo aria-hidden="true" style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-3px' }} /> {tx('Zadania do sprawdzenia', 'Tasks to check')}
            </strong>
            {best > 0 && <span class="badge badge-accent">{tx(`najlepiej ${best}%`, `best ${best}%`)}</span>}
          </div>
          <ul class="check-list">
            {lab.checks.map((item) => {
              const state = results?.[item.id];
              return (
                <li key={item.id} class={state === undefined ? '' : state ? 'ok' : 'fail'}>
                  {state === undefined ? <span class="check-dot" /> : state ? <CircleCheck aria-label={tx('zaliczone', 'passed')} /> : <CircleX aria-label={tx('niezaliczone', 'failed')} />}
                  <div>
                    <span>{tr(item.label)}</span>
                    {state === false && (
                      <span class="hint">
                        <Lightbulb aria-hidden="true" />
                        {tr(item.hint)}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {results && (
            <div class="row" style={{ gap: 'var(--space-4)' }}>
              <ScoreRing percent={percent} pass={100} />
              <p class="muted small">{percent === 100 ? tx('Wszystko działa. Świetna robota!', 'Everything works. Great job!') : tx(`Zaliczone ${passed} z ${lab.checks.length}. Popraw zaznaczone na czerwono i sprawdź ponownie.`, `Passed ${passed} of ${lab.checks.length}. Fix the red items and check again.`)}</p>
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
        {percent === 100 && next ? (
          <a class="btn btn-sm" href={href(`/lab/${next.id}`)}>
            {tx('Następne', 'Next')}
          </a>
        ) : null}
        <button type="button" class="btn btn-primary" onClick={runChecks}>
          <ClipboardCheck aria-hidden="true" />
          {tx('Sprawdź wyniki', 'Check results')}
        </button>
      </div>
    </aside>
  );
}

export function LabPage({ id }: { id: string }) {
  const lab = labById(id);
  const [open, setOpen] = useState(true);
  const ctrl = useMemo(() => {
    if (!lab) return null;
    const saved = progress.value.labNets[lab.id];
    return new SimController((saved && normalizeNetwork(saved)) || lab.build(), (net) => saveLabNet(lab.id, net));
  }, [id]);

  useEffect(() => {
    if (!lab || !ctrl) return;
    setMeta(`${tx('Laboratorium', 'Lab')}: ${tr(lab.title)}`, tr(lab.summary));
    ctrl.sim.autoDhcp();
    ctrl.bump();
  }, [id, lang.value]);

  if (!lab || !ctrl) return <NotFound />;

  const reset = () => {
    if (!window.confirm(tx('Zacząć laboratorium od nowa? Twoja konfiguracja zostanie usunięta.', 'Restart the lab? Your configuration will be removed.'))) return;
    ctrl.load(lab.build());
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
      side={open ? <LabPanel lab={lab} ctrl={ctrl} onReset={reset} onClose={() => setOpen(false)} /> : undefined}
    />
  );
}

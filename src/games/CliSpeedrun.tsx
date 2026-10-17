import { CircleCheck, SkipForward } from 'lucide-preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { lang, tx } from '../i18n';
import { NetBuilder } from '../sim/builder';
import { cliComplete, cliExecute, cliHelp, cliPrompt, newSession, type CliSession } from '../sim/cli/ios';
import { Simulator } from '../sim/engine';
import type { Device } from '../sim/types';
import type { TermState } from '../sim/ui/controller';
import { Terminal } from '../sim/ui/Terminal';

interface Task {
  device: 'R1' | 'SW1';
  text: [string, string];
  done: (r1: Device, sw1: Device, sim: Simulator) => boolean;
}

const TASKS: Task[] = [
  { device: 'R1', text: ['Zmień nazwę routera na BRZEG.', 'Rename the router to BRZEG.'], done: (r) => r.name === 'BRZEG' },
  { device: 'R1', text: ['Nadaj Gi0/0/0 adres 10.1.1.1/24 i włącz interfejs.', 'Give Gi0/0/0 the address 10.1.1.1/24 and enable it.'], done: (r) => r.ports[0].ip === '10.1.1.1' && r.ports[0].prefix === 24 && !r.ports[0].shutdown },
  { device: 'R1', text: ['Dodaj trasę domyślną przez 10.1.1.254.', 'Add a default route via 10.1.1.254.'], done: (r) => r.routes.some((x) => x.prefix === 0 && x.via === '10.1.1.254') },
  { device: 'SW1', text: ['Utwórz VLAN 30 o nazwie KAMERY.', 'Create VLAN 30 named KAMERY.'], done: (_, s) => s.vlans.some((v) => v.id === 30 && v.name.toUpperCase() === 'KAMERY') },
  { device: 'SW1', text: ['Ustaw port Gi1/0/5 jako dostępowy w VLAN 30.', 'Make port Gi1/0/5 an access port in VLAN 30.'], done: (_, s) => s.ports[4].mode === 'access' && s.ports[4].accessVlan === 30 },
  { device: 'SW1', text: ['Ustaw Gi1/0/24 jako trunk z dozwolonymi VLAN-ami 1 i 30.', 'Make Gi1/0/24 a trunk allowing VLANs 1 and 30.'], done: (_, s) => s.ports[23].mode === 'trunk' && ['1,30', '30,1'].includes(s.ports[23].allowedVlans) },
  { device: 'R1', text: ['Ustaw enable secret i włącz szyfrowanie haseł w konfiguracji.', 'Set an enable secret and turn on password encryption.'], done: (r) => Boolean(r.mgmt.enableSecret && r.mgmt.passwordEncryption) },
  { device: 'R1', text: ['Zapisz konfigurację, żeby przetrwała restart.', 'Save the configuration so it survives a reboot.'], done: (r) => r.startup.includes('hostname') },
];

const DURATION = 420;

export function CliSpeedrun({ onFinish }: { onFinish: (score: number) => void }) {
  const env = useMemo(() => {
    const b = new NetBuilder();
    const r1 = b.add('router', 'R1', 0, 0);
    const sw1 = b.add('switch', 'SW1', 0, 0);
    const pc = b.add('pc', 'PC1', 0, 0);
    b.link(r1, 'Gi0/0/0', sw1, 'Gi1/0/24').link(pc, 'eth0', sw1, 'Gi1/0/1');
    const sim = new Simulator(b.net);
    const sessions: Record<string, CliSession> = { R1: newSession(r1.id), SW1: newSession(sw1.id) };
    const terms: Record<string, TermState> = { R1: { lines: [] }, SW1: { lines: [] } };
    return { sim, r1, sw1, sessions, terms };
  }, []);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>([]);
  const [left, setLeft] = useState(DURATION);
  const [, force] = useState(0);
  const task = TASKS[index];
  const score = done.filter(Boolean).length;

  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0) onFinish(Math.round((score / TASKS.length) * 100));
  }, [left]);

  const advancing = useRef(false);

  const advance = (solved: boolean) => {
    advancing.current = false;
    const next = [...done];
    next[index] = solved;
    setDone(next);
    if (index === TASKS.length - 1) onFinish(Math.round((next.filter(Boolean).length / TASKS.length) * 100));
    else setIndex(index + 1);
  };

  const session = env.sessions[task.device];
  const device = task.device === 'R1' ? env.r1 : env.sw1;

  return (
    <div class="stack">
      <div class="quiz-top">
        <span class={`badge ${left < 60 ? 'badge-danger' : ''}`}>
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
        </span>
        <div class="progress" aria-hidden="true">
          <span style={{ width: `${(index / TASKS.length) * 100}%` }} />
        </div>
        <span class="badge badge-ok">
          {score}/{TASKS.length}
        </span>
      </div>
      <div class="card game-prompt row-wrap" style={{ justifyContent: 'space-between' }}>
        <div class="stack" style={{ gap: 'var(--space-1)' }}>
          <span class="muted small">
            {tx('Zadanie', 'Task')} {index + 1} · {tx('urządzenie', 'device')} <strong class="mono">{task.device}</strong>
          </span>
          <strong>{tx(...task.text)}</strong>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onClick={() => advance(false)}>
          <SkipForward aria-hidden="true" />
          {tx('Pomiń', 'Skip')}
        </button>
      </div>
      <div class="game-terminal">
        <Terminal
          key={task.device}
          state={env.terms[task.device]}
          prompt={() => cliPrompt(device, session)}
          history={session.history}
          label={`CLI ${task.device}`}
          onCommand={(line) => {
            const result = cliExecute(env.sim, session, line);
            if (result.changed) env.sim.invalidate();
            force((n) => n + 1);
            if (!advancing.current && task.done(env.r1, env.sw1, env.sim)) {
              advancing.current = true;
              window.setTimeout(() => advance(true), 500);
            }
            return { lines: result.lines, secret: result.secret };
          }}
          onHelp={(line) => cliHelp(env.sim, session, line, lang.value)}
          onComplete={(line) => cliComplete(env.sim, session, line)}
          onCtrl={() => {
            const result = cliExecute(env.sim, session, 'end');
            return { lines: result.lines };
          }}
        />
      </div>
      {done.some(Boolean) && (
        <p class="small ok-text">
          <CircleCheck aria-hidden="true" style={{ width: 16, height: 16, display: 'inline', verticalAlign: '-3px' }} /> {tx('Zadanie zalicza się samo, gdy konfiguracja jest poprawna.', 'A task passes automatically once the configuration is correct.')}
        </p>
      )}
    </div>
  );
}

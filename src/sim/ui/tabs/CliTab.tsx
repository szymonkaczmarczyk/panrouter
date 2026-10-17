import { lang, tx } from '../../../i18n';
import { cliComplete, cliExecute, cliHelp, cliPrompt } from '../../cli/ios';
import type { Device } from '../../types';
import type { SimController } from '../controller';
import { Terminal } from '../Terminal';

export function CliTab({ ctrl, device }: { ctrl: SimController; device: Device }) {
  const session = ctrl.cliSession(device.id);
  const state = ctrl.terminal(device.id);
  const run = (line: string) => {
    const result = cliExecute(ctrl.sim, session, line);
    if (result.changed) ctrl.changed();
    else ctrl.bump();
    return { lines: result.lines, secret: result.secret };
  };
  const greeting = [
    ...(device.banner ? [device.banner, ''] : []),
    `${device.name} con0 ${tx('jest gotowy. Wpisz', 'is ready. Type')} enable, ${tx('a potem', 'then')} ? ${tx('po listę poleceń.', 'for the list of commands.')}`,
    '',
  ];
  return (
    <div class="tab-body tab-terminal">
      <Terminal
        key={device.id}
        state={state}
        prompt={() => cliPrompt(ctrl.sim.topo.device(device.id) ?? device, session)}
        history={session.history}
        label={`CLI ${device.name}`}
        greeting={greeting}
        onCommand={run}
        onHelp={(line) => cliHelp(ctrl.sim, session, line, lang.value)}
        onComplete={(line) => cliComplete(ctrl.sim, session, line)}
        onCtrl={(key) => {
          if (session.mode === 'user' || session.mode === 'priv') return null;
          if (key === 'z' || key === 'c') return run('end');
          return null;
        }}
      />
    </div>
  );
}

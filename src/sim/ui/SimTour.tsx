import { CircleCheck, Circle, PartyPopper, X } from 'lucide-preact';
import { useEffect } from 'preact/hooks';
import { tx } from '../../i18n';
import { isHost } from '../network';
import type { SimController } from './controller';

interface Props {
  ctrl: SimController;
  onFinish: () => void;
}

const READY_NETWORK = 5;

export function SimTour({ ctrl, onFinish }: Props) {
  ctrl.rev.value;
  const loadedReadyNetwork = ctrl.net.devices.length >= READY_NETWORK;
  useEffect(() => {
    if (loadedReadyNetwork) onFinish();
  }, [loadedReadyNetwork]);
  const hosts = ctrl.net.devices.filter((d) => isHost(d.kind));
  const steps = [
    {
      done: hosts.length >= 2,
      title: tx('Połóż dwa komputery', 'Place two computers'),
      text: tx('Przeciągnij „Komputer stacjonarny” albo „Laptop” z palety na dole na planszę. Potrzebne są dwa.', 'Drag “Desktop computer” or “Laptop” from the palette at the bottom onto the canvas. You need two.'),
    },
    {
      done: ctrl.net.links.length > 0,
      title: tx('Połącz je kablem', 'Connect them with a cable'),
      text: tx('Wybierz „Połącz kablem” (klawisz C), kliknij pierwszy komputer, a potem drugi. Diody przy porcie zrobią się zielone.', 'Choose “Connect cable” (key C), click the first computer and then the second. The port LEDs turn green.'),
    },
    {
      done: ctrl.lastPdu.value === 'reply',
      title: tx('Wyślij ping', 'Send a ping'),
      text: tx('Wybierz „Pakiet testowy” (klawisz P), kliknij nadawcę, potem odbiorcę. Zobaczysz, jak pakiet przechodzi kablem.', 'Choose “Test packet” (key P), click the sender and then the receiver. You will see the packet travel along the cable.'),
    },
  ];
  const current = steps.findIndex((step) => !step.done);
  const finished = current === -1;

  return (
    <section class="sim-tour" aria-label={tx('Samouczek symulatora', 'Simulator tutorial')} aria-live="polite">
      <div class="sim-tour-head">
        <strong>{finished ? tx('Twoja pierwsza sieć działa', 'Your first network works') : tx(`Pierwsze kroki: ${current + 1} z ${steps.length}`, `First steps: ${current + 1} of ${steps.length}`)}</strong>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" onClick={onFinish} aria-label={tx('Zamknij samouczek', 'Close the tutorial')}>
          <X aria-hidden="true" />
        </button>
      </div>
      {finished ? (
        <div class="stack sim-tour-done">
          <p class="small">
            {tx(
              'Komputery nie miały serwera DHCP, więc same nadały sobie adresy 169.254.x.x (APIPA). To wystarcza w jednym kablu, ale do internetu potrzebny jest router. Kliknij komputer, żeby zobaczyć jego adres, albo wczytaj gotową sieć z menu Plik.',
              'The computers had no DHCP server, so they gave themselves 169.254.x.x addresses (APIPA). That is enough on one cable, but the internet needs a router. Click a computer to see its address, or load a ready network from the File menu.',
            )}
          </p>
          <button type="button" class="btn btn-primary btn-sm" onClick={onFinish}>
            <PartyPopper aria-hidden="true" />
            {tx('Zakończ samouczek', 'Finish the tutorial')}
          </button>
        </div>
      ) : (
        <ol class="sim-tour-steps">
          {steps.map((step, index) => (
            <li key={index} class={step.done ? 'is-done' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}>
              {step.done ? <CircleCheck aria-label={tx('zrobione', 'done')} /> : <Circle aria-hidden="true" />}
              <div>
                <span class="sim-tour-title">{step.title}</span>
                {index === current && <p class="small muted">{step.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

import { CircleAlert, CircleCheck, Crosshair, Download, Filter } from 'lucide-preact';
import { useMemo, useState } from 'preact/hooks';
import { tx } from '../../i18n';
import { Dialog } from '../../ui/Dialog';
import { toast } from '../../ui/toast';
import { compileFilter, FILTER_EXAMPLES, hexDump, packetRow } from '../capture';
import { capturable, encodeFrame, pcapFile } from '../wire';
import { PROTO_COLOR, stepTimes } from './Canvas';
import type { SimController } from './controller';
import { Layers } from './EventPanel';

export function PacketAnalyzer({ ctrl, onClose }: { ctrl: SimController; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const [applied, setApplied] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const captured = useMemo(() => ctrl.events.value.map((event, index) => ({ event, index })).filter(({ event }) => capturable(event)), [ctrl.events.value]);
  const draftResult = compileFilter(draft);
  const filter = compileFilter(applied);
  const rows = useMemo(() => {
    const test = filter.ok ? filter.test : () => true;
    return captured.map(({ event, index }, position) => ({ index, event, row: packetRow(event, position + 1) })).filter(({ event }) => test(event));
  }, [captured, applied]);
  const current = rows.find((r) => r.index === selected) ?? null;
  const bytes = current ? encodeFrame(current.event.frame, current.event.seq) : null;

  const apply = (value: string) => {
    setDraft(value);
    if (compileFilter(value).ok) setApplied(value);
  };

  const download = () => {
    if (!rows.length) return toast(tx('Brak pakietów do zapisania. Zmień filtr albo wyślij ruch w trybie symulacji.', 'No packets to save. Change the filter or send traffic in simulation mode.'), 'warn');
    const file = pcapFile(rows.map((r) => r.event), Date.now() - 60_000);
    const url = URL.createObjectURL(new Blob([file], { type: 'application/vnd.tcpdump.pcap' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `panrouter-${new Date().toISOString().slice(0, 10)}.pcap`;
    a.click();
    URL.revokeObjectURL(url);
    toast(tx(`Zapisano ${rows.length} pakietów. Plik otworzysz w programie Wireshark.`, `Saved ${rows.length} packets. Open the file in Wireshark.`), 'ok');
  };

  const showOnCanvas = () => {
    if (!current) return;
    const filters = new Set([...ctrl.filters.value, current.event.proto]);
    ctrl.filters.value = filters;
    ctrl.playing.value = false;
    ctrl.step.value = Math.max(0, stepTimes(ctrl.events.value, filters).indexOf(current.event.time));
    ctrl.selectedEvent.value = current.index;
    onClose();
  };

  return (
    <Dialog
      wide
      title={tx('Analizator pakietów', 'Packet analyzer')}
      onClose={onClose}
      actions={
        <>
          <span class="small dim analyzer-count">{tx(`Wyświetlono ${rows.length} z ${captured.length} pakietów`, `Showing ${rows.length} of ${captured.length} packets`)}</span>
          <button type="button" class="btn" onClick={showOnCanvas} disabled={!current}>
            <Crosshair aria-hidden="true" />
            {tx('Pokaż na planszy', 'Show on the canvas')}
          </button>
          <button type="button" class="btn btn-primary" onClick={download}>
            <Download aria-hidden="true" />
            {tx('Pobierz .pcap', 'Download .pcap')}
          </button>
        </>
      }
    >
      <form
        class="analyzer-filter"
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <label for="display-filter" class="sr-only">
          {tx('Filtr wyświetlania', 'Display filter')}
        </label>
        <Filter aria-hidden="true" />
        <input
          id="display-filter"
          class={`input mono ${draft ? (draftResult.ok ? 'filter-ok' : 'filter-bad') : ''}`}
          value={draft}
          placeholder={tx('Filtr jak w Wiresharku, np. ip.addr == 10.10.10.1 and icmp', 'Wireshark-style filter, e.g. ip.addr == 10.10.10.1 and icmp')}
          spellcheck={false}
          autoComplete="off"
          data-autofocus
          aria-invalid={draft && !draftResult.ok ? 'true' : undefined}
          aria-describedby="filter-status"
          onInput={(event) => apply((event.currentTarget as HTMLInputElement).value)}
        />
        <span id="filter-status" class={`filter-status small ${draftResult.ok ? 'ok-text' : 'field-error'}`}>
          {draftResult.ok ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
          {draftResult.ok
            ? tx('Filtr poprawny', 'Valid filter')
            : draftResult.error
              ? tx(`Nie rozumiem „${draftResult.error}”. Sprawdź nazwę pola i operator (==, !=, <, >).`, `Cannot understand "${draftResult.error}". Check the field name and operator (==, !=, <, >).`)
              : tx('Filtr jest niedokończony.', 'The filter is incomplete.')}
        </span>
      </form>
      <div class="filter-examples" role="group" aria-label={tx('Przykładowe filtry', 'Example filters')}>
        {FILTER_EXAMPLES.map((example) => (
          <button key={example} type="button" class="proto-chip mono" aria-pressed={applied === example} onClick={() => apply(example)}>
            {example}
          </button>
        ))}
      </div>
      {!captured.length ? (
        <div class="empty small">
          <p>{tx('Analizator pokazuje ruch z trybu symulacji. Przełącz się na Symulację i wyślij ping albo pakiet testowy.', 'The analyzer shows traffic from simulation mode. Switch to Simulation and send a ping or a test packet.')}</p>
        </div>
      ) : (
        <div class="analyzer">
          <div class="analyzer-table" role="region" aria-label={tx('Lista pakietów', 'Packet list')} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>{tx('Czas', 'Time')}</th>
                  <th>{tx('Źródło', 'Source')}</th>
                  <th>{tx('Cel', 'Destination')}</th>
                  <th>{tx('Protokół', 'Protocol')}</th>
                  <th>{tx('Długość', 'Length')}</th>
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ index, event, row }) => (
                  <tr
                    key={event.seq}
                    class={`${selected === index ? 'row-selected' : ''} ${event.outcome === 'drop' ? 'row-drop' : ''}`}
                    aria-selected={selected === index}
                    tabIndex={0}
                    onClick={() => setSelected(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected(index);
                      }
                    }}
                  >
                    <td class="mono">{row.no}</td>
                    <td class="mono">{row.time}</td>
                    <td class="mono">{row.source}</td>
                    <td class="mono">{row.destination}</td>
                    <td>
                      <span class="dot" style={{ background: PROTO_COLOR[event.proto] }} />
                      {row.protocol}
                    </td>
                    <td class="mono">{row.length}</td>
                    <td class="info">{row.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p class="empty small">{tx('Żaden pakiet nie pasuje do filtru.', 'No packet matches the filter.')}</p>}
          </div>
          {current && bytes ? (
            <div class="analyzer-detail">
              <Layers frame={current.event.frame} />
              <pre class="hexdump" aria-label={tx('Bajty ramki', 'Frame bytes')}>
                {hexDump(bytes)
                  .map((line) => `${line.offset}  ${line.hex.padEnd(49)}  ${line.ascii}`)
                  .join('\n')}
              </pre>
            </div>
          ) : (
            <p class="small dim analyzer-hint">{tx('Kliknij pakiet, żeby zobaczyć jego warstwy i bajty.', 'Click a packet to see its layers and bytes.')}</p>
          )}
        </div>
      )}
    </Dialog>
  );
}

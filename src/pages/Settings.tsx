import { Download, RotateCcw, Upload } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { LangSwitch } from '../app/Shell';
import { setMeta } from '../app/meta';
import { tx } from '../i18n';
import { exportProgress, importProgress, progress, resetProgress, update } from '../state/progress';
import { toast } from '../ui/toast';

export function Settings() {
  useEffect(() => setMeta(tx('Ustawienia', 'Settings'), tx('Język, ruch, terminal i kopia zapasowa postępu w PanRouter.', 'Language, motion, terminal and progress backup in PanRouter.')), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = progress.value.settings;

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panrouter-postep-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(tx('Zapisano plik z postępem.', 'Progress file saved.'), 'ok');
  };

  const onFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5_000_000) return toast(tx('Plik jest za duży (limit 5 MB).', 'The file is too large (5 MB limit).'), 'danger');
    const ok = importProgress(await file.text());
    toast(ok ? tx('Wczytano postęp.', 'Progress loaded.') : tx('To nie jest plik postępu PanRouter. Wybierz plik JSON wyeksportowany z tej strony.', 'This is not a PanRouter progress file. Choose a JSON file exported from this page.'), ok ? 'ok' : 'danger');
  };

  const reset = () => {
    if (!window.confirm(tx('Na pewno usunąć cały postęp, wyniki i zapisane sieci? Tej operacji nie można cofnąć.', 'Delete all progress, scores and saved networks? This cannot be undone.'))) return;
    resetProgress();
    toast(tx('Postęp został wyzerowany.', 'Progress has been reset.'), 'warn');
  };

  return (
    <div class="page fade-in">
      <header class="page-head">
        <span class="eyebrow">{tx('Ustawienia', 'Settings')}</span>
        <h2>{tx('Dopasuj PanRouter do siebie', 'Make PanRouter yours')}</h2>
      </header>
      <div class="stack settings">
        <section class="card stack">
          <h4>{tx('Język', 'Language')}</h4>
          <p class="muted small">{tx('Cała aplikacja, lekcje i quizy są dostępne po polsku i po angielsku. Wyjście poleceń urządzeń sieciowych zostaje po angielsku, tak jak na prawdziwym sprzęcie.', 'The whole app, lessons and quizzes are available in Polish and English. Network device command output stays in English, just like on real hardware.')}</p>
          <LangSwitch />
        </section>
        <section class="card stack">
          <h4>{tx('Ruch i animacje', 'Motion and animation')}</h4>
          <label class="check">
            <input
              type="checkbox"
              checked={settings.motion === 'reduce'}
              onChange={(e) => update((d) => (d.settings.motion = (e.currentTarget as HTMLInputElement).checked ? 'reduce' : 'system'))}
            />
            <span>{tx('Ogranicz animacje (pakiety w symulacji przeskakują bez płynnego ruchu)', 'Reduce motion (packets in simulation jump without smooth movement)')}</span>
          </label>
        </section>
        <section class="card stack">
          <h4>{tx('Symulator', 'Simulator')}</h4>
          <label class="check">
            <input type="checkbox" checked={settings.showIps} onChange={(e) => update((d) => (d.settings.showIps = (e.currentTarget as HTMLInputElement).checked))} />
            <span>{tx('Pokazuj adresy IP pod urządzeniami', 'Show IP addresses under devices')}</span>
          </label>
          <label class="check">
            <input type="checkbox" checked={settings.showPorts} onChange={(e) => update((d) => (d.settings.showPorts = (e.currentTarget as HTMLInputElement).checked))} />
            <span>{tx('Pokazuj nazwy portów przy kablach', 'Show port names next to cables')}</span>
          </label>
          <div class="field" style={{ maxWidth: '240px' }}>
            <label for="term-font">{tx('Rozmiar czcionki terminala', 'Terminal font size')}</label>
            <select
              id="term-font"
              class="select"
              value={String(settings.terminalFont)}
              onChange={(e) => update((d) => (d.settings.terminalFont = Number((e.currentTarget as HTMLSelectElement).value)))}
            >
              {[12, 13, 14, 15, 16, 18].map((size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ))}
            </select>
          </div>
        </section>
        <section class="card stack">
          <h4>{tx('Kopia zapasowa', 'Backup')}</h4>
          <p class="muted small">{tx('Postęp i zapisane sieci są tylko w tej przeglądarce. Pobierz plik, żeby przenieść je na inny komputer.', 'Progress and saved networks live only in this browser. Download a file to move them to another computer.')}</p>
          <div class="row-wrap">
            <button type="button" class="btn" onClick={download}>
              <Download aria-hidden="true" />
              {tx('Pobierz postęp (JSON)', 'Download progress (JSON)')}
            </button>
            <button type="button" class="btn" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden="true" />
              {tx('Wczytaj z pliku', 'Load from file')}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
          </div>
        </section>
        <section class="card stack danger-zone">
          <h4>{tx('Zerowanie', 'Reset')}</h4>
          <p class="muted small">{tx('Usuwa wszystkie wyniki, odznaki rangi i zapisane topologie.', 'Removes all scores, rank progress and saved topologies.')}</p>
          <div>
            <button type="button" class="btn btn-danger" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              {tx('Wyzeruj postęp', 'Reset progress')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

import { RefreshCw, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { tx } from '../i18n';
import { applyUpdate, waitingWorker } from './pwa';

export function UpdateBanner() {
  const [hidden, setHidden] = useState(false);
  if (!waitingWorker.value || hidden) return null;
  return (
    <div class="update-banner" role="status">
      <button type="button" class="btn btn-ghost btn-icon" onClick={() => setHidden(true)} aria-label={tx('Zamknij komunikat', 'Close the message')}>
        <X aria-hidden="true" />
      </button>
      <span>
        <strong>{tx('Nowa wersja PanRouter', 'New PanRouter version')}</strong>
        <span class="muted small">{tx('Odśwież, żeby z niej korzystać. Twój postęp zostaje.', 'Refresh to use it. Your progress stays.')}</span>
      </span>
      <button type="button" class="btn btn-primary btn-sm" onClick={applyUpdate}>
        <RefreshCw aria-hidden="true" />
        {tx('Odśwież', 'Refresh')}
      </button>
    </div>
  );
}

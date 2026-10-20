import { RefreshCw, WifiOff } from 'lucide-preact';
import type { ComponentType, VNode } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { tx } from '../i18n';

export interface LazyPage<P> {
  (props: P): VNode;
  preload: () => Promise<unknown>;
}

export function lazyPage<P extends object>(load: () => Promise<ComponentType<P>>): LazyPage<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const fetchPage = () => {
    pending ??= load().then(
      (component) => (loaded = component),
      (error: unknown) => {
        pending = null;
        throw error;
      },
    );
    return pending;
  };

  function Lazy(props: P) {
    const [, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (loaded) return;
      let alive = true;
      fetchPage().then(
        () => alive && setReady(true),
        () => alive && setFailed(true),
      );
      return () => {
        alive = false;
      };
    }, []);
    if (loaded) {
      const Page = loaded;
      return <Page {...props} />;
    }
    if (failed) return <PageLoadError />;
    return <PageLoading />;
  }
  Lazy.preload = () => fetchPage().catch(() => undefined);
  return Lazy;
}

function PageLoading() {
  return (
    <div class="page page-loading" role="status" aria-live="polite">
      <span class="sr-only">{tx('Ładowanie strony', 'Loading the page')}</span>
      <div class="skeleton page-loading-title" />
      <div class="skeleton page-loading-line" />
      <div class="page-loading-grid">
        <div class="skeleton" />
        <div class="skeleton" />
        <div class="skeleton" />
      </div>
    </div>
  );
}

function PageLoadError() {
  return (
    <div class="page fade-in page-load-error" role="alert">
      <WifiOff aria-hidden="true" />
      <h2>{tx('Nie udało się wczytać tej strony', 'This page could not be loaded')}</h2>
      <p class="muted">
        {tx(
          'Sprawdź połączenie z internetem. Jeśli aplikacja właśnie się zaktualizowała, odświeżenie pobierze nową wersję.',
          'Check your internet connection. If the app has just been updated, refreshing downloads the new version.',
        )}
      </p>
      <button type="button" class="btn btn-primary" onClick={() => window.location.reload()}>
        <RefreshCw aria-hidden="true" />
        {tx('Odśwież stronę', 'Refresh the page')}
      </button>
    </div>
  );
}

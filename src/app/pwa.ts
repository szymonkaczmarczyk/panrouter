import { signal } from '@preact/signals';
import { tx } from '../i18n';
import { toast } from '../ui/toast';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const waitingWorker = signal<ServiceWorker | null>(null);
export const offlineReady = signal(false);
export const installPrompt = signal<InstallPromptEvent | null>(null);
export const installed = signal(false);

let reloadOnTakeover = false;

function standalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function watch(worker: ServiceWorker): void {
  worker.addEventListener('statechange', () => {
    if (worker.state !== 'installed') return;
    if (navigator.serviceWorker.controller) waitingWorker.value = worker;
    else {
      offlineReady.value = true;
      toast(tx('PanRouter działa teraz także bez internetu.', 'PanRouter now works offline too.'), 'ok');
    }
  });
}

export function setupPwa(): void {
  installed.value = standalone();
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt.value = event as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt.value = null;
    installed.value = true;
    toast(tx('Zainstalowano PanRouter.', 'PanRouter installed.'), 'ok');
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  offlineReady.value = Boolean(navigator.serviceWorker.controller);
  void navigator.serviceWorker.ready.then((registration) => {
    if (registration.active) offlineReady.value = true;
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnTakeover) window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        if (registration.active) offlineReady.value = true;
        if (registration.waiting && navigator.serviceWorker.controller) waitingWorker.value = registration.waiting;
        if (registration.installing) watch(registration.installing);
        registration.addEventListener('updatefound', () => {
          if (registration.installing) watch(registration.installing);
        });
        window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch(() => undefined);
  });
}

export function applyUpdate(): void {
  const worker = waitingWorker.value;
  if (!worker) return;
  reloadOnTakeover = true;
  worker.postMessage('skip-waiting');
}

export async function promptInstall(): Promise<void> {
  const event = installPrompt.value;
  if (!event) return;
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === 'accepted') installPrompt.value = null;
}

import { signal } from '@preact/signals';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-preact';

type Kind = 'ok' | 'warn' | 'danger' | 'info';

interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}

const toasts = signal<ToastItem[]>([]);
let counter = 0;

export function toast(text: string, kind: Kind = 'info', ms = 3600): void {
  const id = ++counter;
  toasts.value = [...toasts.value.slice(-3), { id, kind, text }];
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }, ms);
}

const ICONS = { ok: CircleCheck, warn: TriangleAlert, danger: CircleAlert, info: Info };

export function ToastRegion() {
  return (
    <div class="toast-region" role="status" aria-live="polite">
      {toasts.value.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <div key={item.id} class={`toast toast-${item.kind}`}>
            <Icon aria-hidden="true" />
            <span>{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

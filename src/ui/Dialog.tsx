import { X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { tx } from '../i18n';

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  actions?: ComponentChildren;
}

export function Dialog({ title, onClose, children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      class="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div class="dialog-head">
        <button type="button" class="btn btn-ghost btn-icon" onClick={onClose} aria-label={tx('Zamknij', 'Close')}>
          <X aria-hidden="true" />
        </button>
        <h4 id="dialog-title">{title}</h4>
      </div>
      <div class="dialog-body">{children}</div>
      {actions && <div class="dialog-actions">{actions}</div>}
    </dialog>
  );
}

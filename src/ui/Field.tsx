import { CircleAlert } from 'lucide-preact';

interface Props {
  id: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  error?: string | null;
  help?: string;
  placeholder?: string;
  mono?: boolean;
  type?: 'text' | 'password';
  disabled?: boolean;
}

export function Field({ id, label, value, onInput, error, help, placeholder, mono, type = 'text', disabled }: Props) {
  const describedBy = error ? `${id}-err` : help ? `${id}-help` : undefined;
  return (
    <div class="field">
      <label for={id}>{label}</label>
      {type === 'password' ? (
        <input
          id={id}
          class={`input ${mono ? 'mono' : ''}`}
          type="password"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          autoComplete="off"
        />
      ) : (
        <input
          id={id}
          class={`input ${mono ? 'mono' : ''}`}
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          autoComplete="off"
          spellcheck={false}
        />
      )}
      {error ? (
        <span class="field-error" id={`${id}-err`}>
          <CircleAlert aria-hidden="true" />
          {error}
        </span>
      ) : help ? (
        <span class="field-help" id={`${id}-help`}>
          {help}
        </span>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from 'preact/hooks';
import { tx } from '../../i18n';
import { progress } from '../../state/progress';
import type { TermState } from './controller';

export interface TermResult {
  lines: string[];
  clear?: boolean;
  secret?: boolean;
}

interface Props {
  state: TermState;
  prompt: () => string;
  history: string[];
  label: string;
  onCommand: (line: string) => TermResult;
  onHelp?: (line: string) => string[];
  onComplete?: (line: string) => string | null;
  onCtrl?: (key: 'c' | 'z') => TermResult | null;
  greeting?: string[];
}

export function Terminal({ state, prompt, history, label, onCommand, onHelp, onComplete, onCtrl, greeting }: Props) {
  const [input, setInput] = useState('');
  const [secret, setSecret] = useState(false);
  const [, force] = useState(0);
  const historyIndex = useRef(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const font = progress.value.settings.terminalFont;

  useEffect(() => {
    if (greeting && state.lines.length === 0) {
      state.lines.push(...greeting.map((text) => ({ text, kind: 'out' as const })));
      force((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [secret]);

  const push = (lines: string[], kind: 'out' | 'in' | 'err' = 'out') => {
    for (const text of lines) state.lines.push({ text, kind: kind === 'out' && text.startsWith('%') ? 'err' : kind });
    if (state.lines.length > 2000) state.lines.splice(0, state.lines.length - 2000);
  };

  const apply = (result: TermResult) => {
    if (result.clear) state.lines.length = 0;
    push(result.lines);
    setSecret(Boolean(result.secret));
  };

  const submit = (text: string) => {
    push([`${prompt()}${secret ? '' : text}`], 'in');
    const result = onCommand(text);
    apply(result);
    historyIndex.current = -1;
    force((n) => n + 1);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const text = input;
      setInput('');
      submit(text);
      return;
    }
    if (event.key === 'Tab' && onComplete) {
      event.preventDefault();
      const completed = onComplete(input);
      if (completed) setInput(completed);
      return;
    }
    if (event.key === '?' && onHelp && !secret) {
      event.preventDefault();
      push([`${prompt()}${input}?`], 'in');
      push(onHelp(input));
      force((n) => n + 1);
      return;
    }
    if (event.key === 'ArrowUp' && !secret) {
      event.preventDefault();
      if (!history.length) return;
      historyIndex.current = historyIndex.current < 0 ? history.length - 1 : Math.max(0, historyIndex.current - 1);
      setInput(history[historyIndex.current] ?? '');
      return;
    }
    if (event.key === 'ArrowDown' && !secret) {
      event.preventDefault();
      if (historyIndex.current < 0) return;
      historyIndex.current += 1;
      if (historyIndex.current >= history.length) {
        historyIndex.current = -1;
        setInput('');
      } else setInput(history[historyIndex.current]);
      return;
    }
    if (event.ctrlKey && (event.key === 'c' || event.key === 'z') && onCtrl) {
      const selection = window.getSelection()?.toString();
      if (event.key === 'c' && selection) return;
      event.preventDefault();
      push([`${prompt()}${input}^${event.key.toUpperCase()}`], 'in');
      setInput('');
      const result = onCtrl(event.key);
      if (result) apply(result);
      force((n) => n + 1);
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text.includes('\n')) return;
    event.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n');
    const last = lines.pop() ?? '';
    const first = `${input}${lines.shift() ?? ''}`;
    submit(first);
    for (const line of lines) submit(line);
    setInput(last);
  };

  return (
    <div class="terminal" style={{ fontSize: `${font}px` }} onClick={() => inputRef.current?.focus()}>
      <div class="terminal-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label={label}>
        {state.lines.map((line, index) => (
          <div key={index} class={`term-line term-${line.kind}`}>
            {line.text || ' '}
          </div>
        ))}
        <label class="term-input-row">
          <span class="term-prompt">{prompt()}</span>
          {secret ? (
            <input
              key="secret"
              ref={inputRef}
              class="term-input"
              type="password"
              value={input}
              onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              aria-label={`${label}: ${tx('wpisz hasło', 'type the password')}`}
            />
          ) : (
            <input
              key="text"
              ref={inputRef}
              class="term-input"
              type="text"
              value={input}
              onInput={(e) => setInput((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              autoComplete="off"
              autoCapitalize="off"
              spellcheck={false}
              aria-label={`${label}: ${tx('wpisz polecenie', 'type a command')}`}
            />
          )}
        </label>
      </div>
      <div class="term-hints">
        {onHelp && (
          <span>
            <kbd>?</kbd> {tx('pomoc', 'help')}
          </span>
        )}
        {onComplete && (
          <span>
            <kbd>Tab</kbd> {tx('dopełnij', 'complete')}
          </span>
        )}
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> {tx('historia', 'history')}
        </span>
        {onCtrl && (
          <span>
            <kbd>Ctrl</kbd>+<kbd>Z</kbd> {tx('koniec konfiguracji', 'end config')}
          </span>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

type State = 'idle' | 'copied' | 'failed';

/**
 * Copies a value and says so for a moment. The clipboard API needs a secure
 * context, which rules out plain http on anything but localhost, so there is a
 * fallback for that case rather than a button that silently does nothing.
 */
async function copy(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the older route */
  }

  try {
    const field = document.createElement('textarea');
    field.value = value;
    // Off-screen rather than hidden: a display:none field cannot be selected.
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    field.setAttribute('readonly', '');
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label = 'Copy link',
  title,
  className = 'btn btn--ghost btn--sm',
}: {
  value: string;
  label?: string;
  title?: string;
  className?: string;
}) {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<number>();

  // A pending reset must not fire onto an unmounted button.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async (): Promise<void> => {
    const ok = await copy(value);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={() => void onClick()}
      title={title ?? value}
      aria-live="polite"
      style={state === 'copied' ? { color: 'var(--on-track)' } : undefined}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </button>
  );
}

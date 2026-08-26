import { useEffect, useRef, useState } from 'react';

/**
 * A "+" affordance that becomes a single text field in place. Keeps creation
 * one click away without leaving an empty form sitting on the page, which is
 * what a permanently-open "new thing" bar amounts to.
 *
 * `variant` only changes the resting appearance: `icon` is a square button that
 * sits beside a control, `card` fills a grid cell alongside real cards.
 */
export function InlineCreate({
  label,
  placeholder,
  pending = false,
  variant = 'icon',
  onSubmit,
}: {
  label: string;
  placeholder: string;
  pending?: boolean;
  variant?: 'icon' | 'card';
  onSubmit: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = (): void => {
    setOpen(false);
    setValue('');
  };

  const submit = (): void => {
    const trimmed = value.trim();
    if (trimmed === '') {
      close();
      return;
    }
    onSubmit(trimmed);
    close();
  };

  if (!open) {
    return variant === 'card' ? (
      <button
        type="button"
        className="card"
        onClick={() => setOpen(true)}
        style={{
          borderStyle: 'dashed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 84,
          color: 'var(--ink-muted)',
          fontSize: 'var(--text-md)',
          cursor: 'pointer',
          boxShadow: 'none',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
          +
        </span>
        {label}
      </button>
    ) : (
      <button
        type="button"
        className="btn btn--icon"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
      >
        <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
          +
        </span>
      </button>
    );
  }

  const field = (
    <>
      <input
        ref={inputRef}
        className="field__input"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit();
          if (event.key === 'Escape') close();
        }}
        style={variant === 'card' ? { width: '100%' } : { width: 180, height: 36 }}
      />
      <button className="btn btn--primary btn--sm" onClick={submit} disabled={pending}>
        {pending ? 'Adding…' : 'Add'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={close} disabled={pending}>
        Cancel
      </button>
    </>
  );

  return variant === 'card' ? (
    <div className="card" style={{ borderStyle: 'dashed', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {field}
    </div>
  ) : (
    <span className="row" style={{ gap: 'var(--space-2)' }}>
      {field}
    </span>
  );
}

import { useEffect, useState } from 'react';

/**
 * Commits on blur or Enter, reverts on Escape. Editing in place is what stops
 * the grid needing a detail drawer for the most common change of all.
 */
export function TitleCell({
  value,
  onCommit,
  disabled,
}: {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  // Re-sync when the row is refetched and the server disagrees with the draft.
  useEffect(() => setDraft(value), [value]);

  const commit = (): void => {
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === value) {
      setDraft(value);
      return;
    }
    onCommit(trimmed);
  };

  return (
    <input
      aria-label="Task name"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
      style={{
        width: '100%',
        border: '1px solid transparent',
        borderRadius: 'var(--radius)',
        background: 'transparent',
        padding: '5px 6px',
        font: 'inherit',
        fontSize: 14,
        color: 'var(--ink)',
      }}
      onFocus={(event) => {
        event.currentTarget.style.borderColor = 'var(--accent)';
        event.currentTarget.style.background = 'var(--surface)';
      }}
      onBlurCapture={(event) => {
        event.currentTarget.style.borderColor = 'transparent';
        event.currentTarget.style.background = 'transparent';
      }}
    />
  );
}

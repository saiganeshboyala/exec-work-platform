import { useEffect, useState } from 'react';

/**
 * Commits on blur or Enter, reverts on Escape. Editing in place is what stops
 * the grid needing a detail drawer for the most common change of all.
 */
export function TitleCell({
  value,
  onCommit,
  disabled,
  /** "heading" is the drawer's own title, which has to look like the heading it replaced. */
  size = 'row',
}: {
  value: string;
  onCommit: (next: string) => void;
  disabled?: boolean;
  size?: 'row' | 'heading';
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
        fontSize: size === 'heading' ? 'var(--text-xl)' : 14,
        fontWeight: size === 'heading' ? 550 : 400,
        lineHeight: size === 'heading' ? 1.3 : undefined,
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

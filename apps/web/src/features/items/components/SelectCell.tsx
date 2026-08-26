/**
 * A coloured cell that is really a <select>. The native control is kept (rather
 * than a custom popover) so keyboard, screen readers and mobile all work for
 * free; it is simply painted to look like the swatch it sets.
 */
export function SelectCell<T extends string>({
  value,
  options,
  tone,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  tone: Record<T, { label: string; color: string; wash: string }>;
  onChange: (next: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const current = tone[value];

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      style={{
        appearance: 'none',
        width: '100%',
        border: 'none',
        borderRadius: 'var(--radius)',
        padding: '5px 8px',
        background: current.wash,
        color: current.color,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'inherit',
        textAlign: 'center',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {options.map((option) => (
        <option key={option} value={option} style={{ background: 'var(--surface)', color: 'var(--ink)' }}>
          {tone[option].label}
        </option>
      ))}
    </select>
  );
}

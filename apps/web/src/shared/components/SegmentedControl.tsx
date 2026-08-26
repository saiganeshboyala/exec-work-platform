/**
 * A small set of mutually exclusive choices shown all at once. Preferred over a
 * dropdown when there are three or four options and the current one matters at
 * a glance - grouping, density, view mode.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        padding: 2,
        gap: 2,
        background: 'var(--surface-sunk)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            style={{
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 11px',
              fontSize: 'var(--text-base)',
              fontWeight: active ? 600 : 400,
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-secondary)',
              boxShadow: active ? 'var(--shadow-sm)' : 'none',
              transition: 'background var(--transition), color var(--transition)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

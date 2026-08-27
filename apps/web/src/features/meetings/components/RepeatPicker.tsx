import { MAX_OCCURRENCES, type RepeatFrequency, type RepeatInput } from '@ewp/contracts';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const OPTIONS: Array<{ value: RepeatFrequency | 'NONE'; label: string }> = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Every day' },
  { value: 'WEEKDAYS', label: 'Monday to Friday' },
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'CUSTOM', label: 'Chosen days' },
];

/**
 * How often the meeting comes round. Each occurrence is created as its own
 * meeting, so the count is a real number of entries in the diary rather than a
 * rule - which is why it is asked for plainly instead of hidden behind "ends".
 */
export function RepeatPicker({
  value,
  onChange,
}: {
  value: RepeatInput | null;
  onChange: (next: RepeatInput | null) => void;
}) {
  const frequency: RepeatFrequency | 'NONE' = value?.frequency ?? 'NONE';

  const setFrequency = (next: RepeatFrequency | 'NONE'): void => {
    if (next === 'NONE') {
      onChange(null);
      return;
    }
    onChange({
      frequency: next,
      days: value?.days ?? [],
      // A fortnight of dailies, or a quarter of weeklies: enough to be useful
      // without committing somebody to a year on the first click.
      count: value?.count ?? (next === 'WEEKLY' ? 12 : 10),
    });
  };

  const toggleDay = (day: number): void => {
    if (!value) return;
    const days = value.days.includes(day)
      ? value.days.filter((d) => d !== day)
      : [...value.days, day].sort();
    onChange({ ...value, days });
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <select
          className="field__input"
          aria-label="Repeat"
          value={frequency}
          onChange={(event) => setFrequency(event.target.value as RepeatFrequency | 'NONE')}
          style={{ flex: 1, minWidth: 170 }}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {value ? (
          <label className="row" style={{ gap: 6, fontSize: 'var(--text-base)' }}>
            <span className="meta">Times</span>
            <input
              className="field__input"
              type="number"
              min={2}
              max={MAX_OCCURRENCES}
              aria-label="How many meetings"
              value={value.count}
              onChange={(event) =>
                onChange({
                  ...value,
                  count: Math.min(
                    MAX_OCCURRENCES,
                    Math.max(2, Number(event.target.value) || 2),
                  ),
                })
              }
              style={{ width: 72 }}
            />
          </label>
        ) : null}
      </div>

      {value?.frequency === 'CUSTOM' ? (
        <div className="row" style={{ gap: 4 }}>
          {WEEKDAY_LABELS.map((label, day) => {
            const on = value.days.includes(day);

            return (
              <button
                key={WEEKDAY_NAMES[day]}
                type="button"
                className="chip"
                aria-pressed={on}
                aria-label={WEEKDAY_NAMES[day]}
                title={WEEKDAY_NAMES[day]}
                onClick={() => toggleDay(day)}
                style={{
                  width: 32,
                  justifyContent: 'center',
                  padding: 0,
                  ...(on
                    ? {
                        borderColor: 'var(--on-track)',
                        color: 'var(--on-track)',
                        background: 'var(--on-track-wash)',
                        fontWeight: 600,
                      }
                    : {}),
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}

      {value ? (
        <p className="meta">
          {value.frequency === 'CUSTOM' && value.days.length === 0
            ? 'Pick at least one day.'
            : `${value.count} meetings will be created. Each can be moved or cancelled on its own.`}
        </p>
      ) : null}
    </div>
  );
}

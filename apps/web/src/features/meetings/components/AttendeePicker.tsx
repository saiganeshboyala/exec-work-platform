import type { MemberDto } from '@ewp/contracts';
import { useMemo, useState } from 'react';

import { Avatar } from '@/shared/components/Avatar';
import { WarningIcon } from '@/shared/components/icons';

/** Enough to choose from without turning the results into a second directory. */
const MAX_RESULTS = 8;

/**
 * Who is coming. Only the people already chosen are listed; everyone else is
 * found by typing. Showing the whole organisation was a wall of names that got
 * worse with every colleague added, and reading it was never the point - the
 * question is always "is this person on it", which the chosen list answers.
 *
 * `busyIds` are people already booked in the proposed window: those stay amber
 * while selected, because a clash is more urgent than the fact of being picked.
 */
export function AttendeePicker({
  members,
  selected,
  busyIds,
  onToggle,
}: {
  members: MemberDto[];
  selected: string[];
  busyIds?: Set<string>;
  onToggle: (userId: string) => void;
}) {
  const [search, setSearch] = useState('');

  const chosen = useMemo(
    () => selected.map((id) => members.find((m) => m.userId === id)).filter(Boolean) as MemberDto[],
    [members, selected],
  );

  // Results only exist while there is something to match. Already-chosen people
  // are left out: they are on screen above, and offering them again reads as a
  // way to add them twice.
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === '') return [];

    return members
      .filter((member) => !selected.includes(member.userId))
      .filter(
        (member) =>
          member.fullName.toLowerCase().includes(term) ||
          member.email.toLowerCase().includes(term) ||
          (member.jobTitle ?? '').toLowerCase().includes(term),
      )
      .slice(0, MAX_RESULTS);
  }, [members, selected, search]);

  const add = (userId: string): void => {
    onToggle(userId);
    // Cleared so the next name can be typed straight away.
    setSearch('');
  };

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <input
          className="field__input"
          type="search"
          placeholder="Search people to add…"
          aria-label="Search people to add"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            // Enter takes the top match, so a whole list can be typed without
            // reaching for the mouse.
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault();
              add(results[0].userId);
            }
            if (event.key === 'Escape') setSearch('');
          }}
          style={{ flex: 1, height: 32 }}
        />
        <span className="meta" style={{ whiteSpace: 'nowrap' }}>
          {selected.length} selected
        </span>
      </div>

      {search.trim() !== '' ? (
        results.length === 0 ? (
          <p className="meta">Nobody left to add matches “{search.trim()}”.</p>
        ) : (
          <div
            role="listbox"
            aria-label="Search results"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: 4,
            }}
          >
            {results.map((member) => (
              <button
                key={member.userId}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => add(member.userId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  background: 'transparent',
                  font: 'inherit',
                  fontSize: 'var(--text-base)',
                  color: 'var(--ink)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <Avatar id={member.userId} fullName={member.fullName} size={20} />
                <span style={{ flex: 1, minWidth: 0 }}>{member.fullName}</span>
                <span className="meta" style={{ fontSize: 'var(--text-xs)' }}>
                  {member.jobTitle ?? member.email}
                </span>
              </button>
            ))}
          </div>
        )
      ) : null}

      {chosen.length === 0 ? (
        <p className="meta">Nobody added yet — type a name above.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chosen.map((member) => {
            const busy = busyIds?.has(member.userId) ?? false;

            return (
              <button
                key={member.userId}
                type="button"
                className="chip"
                aria-pressed
                onClick={() => onToggle(member.userId)}
                title={`Remove ${member.fullName}`}
                style={
                  busy
                    ? {
                        borderColor: 'var(--at-risk)',
                        color: 'var(--at-risk)',
                        background: 'var(--at-risk-wash)',
                      }
                    : {
                        borderColor: 'var(--on-track)',
                        color: 'var(--on-track)',
                        background: 'var(--on-track-wash)',
                        fontWeight: 600,
                      }
                }
              >
                <Avatar id={member.userId} fullName={member.fullName} size={18} />
                {member.fullName}
                {busy ? (
                  <span aria-label="has a clash" style={{ display: 'inline-flex' }}>
                    <WarningIcon size={12} />
                  </span>
                ) : null}
                <span aria-hidden="true" style={{ opacity: 0.7 }}>
                  ×
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

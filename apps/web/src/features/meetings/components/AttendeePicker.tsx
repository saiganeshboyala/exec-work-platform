import type { MemberDto } from '@ewp/contracts';
import { useMemo, useState } from 'react';

import { Avatar } from '@/shared/components/Avatar';
import { WarningIcon } from '@/shared/components/icons';

/**
 * Who is coming. Chosen people turn green so the selection reads at a glance
 * rather than by hunting for ticked boxes, and the search box keeps a hundred
 * colleagues usable - the wrapped list alone stopped scaling well past a dozen.
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

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === '') return members;
    return members.filter(
      (member) =>
        member.fullName.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        (member.jobTitle ?? '').toLowerCase().includes(term),
    );
  }, [members, search]);

  return (
    <div className="stack" style={{ gap: 'var(--space-2)' }}>
      <div className="row" style={{ gap: 'var(--space-2)' }}>
        <input
          className="field__input"
          type="search"
          placeholder="Search people…"
          aria-label="Search attendees"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: 1, height: 32 }}
        />
        <span className="meta" style={{ whiteSpace: 'nowrap' }}>
          {selected.length} selected
        </span>
      </div>

      {matches.length === 0 ? (
        <p className="meta">Nobody matches “{search}”.</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            // Long lists scroll here rather than pushing the buttons off screen.
            maxHeight: 168,
            overflowY: 'auto',
          }}
        >
          {matches.map((member) => {
            const on = selected.includes(member.userId);
            const busy = on && (busyIds?.has(member.userId) ?? false);

            return (
              <button
                key={member.userId}
                type="button"
                className="chip"
                aria-pressed={on}
                onClick={() => onToggle(member.userId)}
                title={member.jobTitle ?? member.email}
                style={
                  busy
                    ? {
                        borderColor: 'var(--at-risk)',
                        color: 'var(--at-risk)',
                        background: 'var(--at-risk-wash)',
                      }
                    : on
                      ? {
                          borderColor: 'var(--on-track)',
                          color: 'var(--on-track)',
                          background: 'var(--on-track-wash)',
                          fontWeight: 600,
                        }
                      : undefined
                }
              >
                <Avatar id={member.userId} fullName={member.fullName} size={18} />
                {member.fullName}
                {busy ? (
                  <span aria-label="has a clash" style={{ display: 'inline-flex' }}>
                    <WarningIcon size={12} />
                  </span>
                ) : on ? (
                  <span aria-hidden="true">✓</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

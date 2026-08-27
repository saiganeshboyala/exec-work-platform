import type { MemberDto } from '@ewp/contracts';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Avatar } from '@/shared/components/Avatar';

const PANEL_WIDTH = 220;
const PANEL_MAX_HEIGHT = 260;

/**
 * Adds people to a task beyond its owner. A checklist rather than a native
 * multi-select, because picking several people is the normal case and
 * ctrl-clicking a listbox is not something anyone should have to know.
 *
 * The panel is portalled to <body> and positioned fixed: the board groups clip
 * their contents to keep rounded corners, which would otherwise cut it off.
 */
export function AssigneePicker({
  assignees,
  members,
  ownerId,
  disabled,
  onChange,
}: {
  assignees: Array<{ id: string; fullName: string }>;
  members: MemberDto[];
  ownerId: string | null;
  disabled?: boolean;
  onChange: (userIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    // Flip above the trigger when there is no room below it.
    const below = window.innerHeight - rect.bottom;
    const top = below < PANEL_MAX_HEIGHT ? rect.top - Math.min(PANEL_MAX_HEIGHT, rect.top) - 6 : rect.bottom + 6;

    setPosition({
      top,
      left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 12),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    // A scroll moves the trigger out from under a fixed panel, so just close.
    const onScroll = (): void => setOpen(false);

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const selected = new Set(assignees.map((person) => person.id));

  // Search covers the name and the address, since colleagues are often known
  // by one or the other.
  const term = search.trim().toLowerCase();
  const matches =
    term === ''
      ? members
      : members.filter(
          (member) =>
            member.fullName.toLowerCase().includes(term) ||
            member.email.toLowerCase().includes(term),
        );

  const toggle = (userId: string): void => {
    const next = new Set(selected);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    onChange([...next]);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {assignees.slice(0, 3).map((person, index) => (
        <span
          key={person.id}
          title={person.fullName}
          style={{
            marginLeft: index === 0 ? 0 : -7,
            border: '2px solid var(--surface)',
            borderRadius: 999,
            display: 'inline-flex',
          }}
        >
          <Avatar id={person.id} fullName={person.fullName} size={20} />
        </span>
      ))}

      {assignees.length > 3 ? (
        <span className="meta" style={{ marginLeft: 4, fontSize: 'var(--text-xs)' }}>
          +{assignees.length - 3}
        </span>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-label="Add members"
        aria-expanded={open}
        title="Add members"
        style={{
          marginLeft: assignees.length > 0 ? 5 : 0,
          width: 20,
          height: 20,
          borderRadius: 999,
          border: '1px dashed var(--line-strong)',
          background: 'transparent',
          color: 'var(--ink-muted)',
          fontSize: 13,
          lineHeight: 1,
          display: 'grid',
          placeItems: 'center',
          cursor: disabled ? 'default' : 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        +
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="group"
              aria-label="Members"
              style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                width: PANEL_WIDTH,
                maxHeight: PANEL_MAX_HEIGHT,
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 70,
                padding: 4,
              }}
            >
              <input
                className="field__input"
                type="search"
                autoFocus
                placeholder="Search people…"
                aria-label="Search people"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ height: 30, marginBottom: 4, flexShrink: 0 }}
              />

              <div style={{ overflowY: 'auto', minHeight: 0 }}>
              {matches.length === 0 ? (
                <p className="meta" style={{ padding: '6px 8px' }}>
                  Nobody matches that.
                </p>
              ) : null}

              {matches.map((member) => {
                const isOwner = member.userId === ownerId;

                return (
                  <label
                    key={member.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 'var(--radius)',
                      fontSize: 'var(--text-base)',
                      cursor: isOwner ? 'default' : 'pointer',
                      opacity: isOwner ? 0.55 : 1,
                      // Green for chosen, matching the attendee chips.
                      background:
                        isOwner || selected.has(member.userId) ? 'var(--on-track-wash)' : undefined,
                      color:
                        !isOwner && selected.has(member.userId) ? 'var(--on-track)' : undefined,
                      fontWeight: !isOwner && selected.has(member.userId) ? 600 : undefined,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isOwner || selected.has(member.userId)}
                      disabled={isOwner}
                      onChange={() => toggle(member.userId)}
                    />
                    <Avatar id={member.userId} fullName={member.fullName} size={20} />
                    <span style={{ flex: 1, minWidth: 0 }}>{member.fullName}</span>
                    {isOwner ? (
                      <span className="meta" style={{ fontSize: 'var(--text-xs)' }}>
                        owner
                      </span>
                    ) : null}
                  </label>
                );
              })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

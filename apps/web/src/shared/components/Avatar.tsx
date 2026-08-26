import { avatarColor, initials } from '@/shared/lib/item-meta';

/** Initials badge with a stable per-person colour. Purely decorative. */
export function Avatar({
  id,
  fullName,
  size = 24,
}: {
  id: string | null;
  fullName: string | null;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      title={fullName ?? 'Unassigned'}
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        fontSize: Math.round(size * 0.4),
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: '#fff',
        background: id && fullName ? avatarColor(id) : 'var(--line-strong)',
      }}
    >
      {fullName ? initials(fullName) : '–'}
    </span>
  );
}

/** Overlapping stack, capped so a 40-person meeting does not blow the row. */
export function AvatarStack({
  people,
  max = 4,
  size = 24,
}: {
  people: Array<{ id: string; fullName: string }>;
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((person, index) => (
        <span
          key={person.id}
          style={{
            marginLeft: index === 0 ? 0 : -size / 3,
            border: '2px solid var(--surface)',
            borderRadius: 999,
            display: 'inline-flex',
          }}
        >
          <Avatar id={person.id} fullName={person.fullName} size={size} />
        </span>
      ))}

      {overflow > 0 ? (
        <span
          className="meta"
          style={{ marginLeft: 6 }}
          title={people.slice(max).map((person) => person.fullName).join(', ')}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

import { ROLE_RANK, type Role } from '@ewp/contracts';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { NotificationBell } from '@/features/notifications';
import { Avatar } from '@/shared/components/Avatar';
import { useTheme } from '@/shared/hooks/useTheme';

/**
 * Grouped navigation. Executives live in the first group and never need the
 * second, which is why the two are separated rather than run together.
 */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Todo', icon: '◈', end: true },
      { to: '/meetings', label: 'Meetings', icon: '▤', end: false },
    ],
  },
  {
    label: 'Work',
    items: [
      { to: '/boards', label: 'Boards', icon: '▦', end: false },
      { to: '/people', label: 'People', icon: '◍', end: false },
      // Administration is for ADMIN and OWNER; managers run the work, not the tenant.
      { to: '/admin', label: 'Admin', icon: '⚙', end: false, minRole: 'ADMIN' as Role },
    ],
  },
];

const THEME_ICON = { light: '☀', dark: '☾', system: '◑' } as const;

export function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, cycle } = useTheme();

  const rank = user ? ROLE_RANK[user.role] : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          background: 'var(--navy)',
          borderRight: '1px solid var(--navy-line)',
          padding: 'var(--space-4) var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div
          className="row"
          style={{ padding: '0 var(--space-2)', marginBottom: 'var(--space-5)', gap: 10 }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius)',
              display: 'grid',
              placeItems: 'center',
              background: 'var(--navy-ink)',
              color: 'var(--navy)',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {(user?.organizationName ?? 'E').charAt(0)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 'var(--text-md)',
                fontWeight: 600,
                color: 'var(--navy-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.organizationName ?? 'CIS Technologies'}
            </span>
            <span
              className="meta"
              style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-ink-muted)' }}
            >
              Work platform
            </span>
          </span>
        </div>

        <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="meta"
                style={{
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '0 var(--space-2)',
                  marginBottom: 4,
                  color: 'var(--navy-ink-muted)',
                }}
              >
                {group.label}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items
                  .filter((entry) => !entry.minRole || rank >= ROLE_RANK[entry.minRole])
                  .map((entry) => (
                  <NavLink
                    key={entry.to}
                    to={entry.to}
                    end={entry.end}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px var(--space-2)',
                      borderRadius: 'var(--radius)',
                      fontSize: 'var(--text-md)',
                      fontWeight: isActive ? 600 : 450,
                      color: isActive ? 'var(--navy-active-ink)' : 'var(--navy-ink-muted)',
                      background: isActive ? 'var(--navy-active-bg)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background var(--transition), color var(--transition)',
                    })}
                  >
                    <span aria-hidden="true" style={{ fontSize: 13, width: 14, textAlign: 'center' }}>
                      {entry.icon}
                    </span>
                    {entry.label}
                  </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <NotificationBell />

          <div
            className="row"
            style={{
              gap: 8,
              padding: 'var(--space-2)',
              borderTop: '1px solid var(--navy-line)',
              marginTop: 'var(--space-2)',
            }}
          >
            <Avatar id={user?.id ?? null} fullName={user?.fullName ?? null} size={28} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 'var(--text-base)',
                  fontWeight: 500,
                  color: 'var(--navy-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.fullName}
              </span>
              <span
                className="meta"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--navy-ink-muted)' }}
              >
                {user?.role.toLowerCase()}
              </span>
            </span>

            <button
              type="button"
              className="btn btn--on-navy btn--sm btn--icon"
              onClick={cycle}
              title={`Theme: ${theme}`}
              aria-label={`Theme: ${theme}. Click to change.`}
            >
              {THEME_ICON[theme]}
            </button>
          </div>

          <button className="btn btn--on-navy btn--sm" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-6) var(--space-5)' }}>
        <div style={{ maxWidth: 'var(--shell-width)', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

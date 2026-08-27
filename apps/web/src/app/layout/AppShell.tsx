import { ROLE_RANK, type Role } from '@ewp/contracts';
import { useEffect, useState } from 'react';
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
      // Both of these are management views: the department list is how you see
      // across the organisation, and the directory is who reports where. Members
      // work from Todo, which already shows every task they are on.
      { to: '/boards', label: 'Departments', icon: '▦', end: false, minRole: 'MANAGER' as Role },
      { to: '/people', label: 'People', icon: '◍', end: false, minRole: 'MANAGER' as Role },
      // Administration is for ADMIN and OWNER; managers run the work, not the tenant.
      { to: '/admin', label: 'Admin', icon: '⚙', end: false, minRole: 'ADMIN' as Role },
    ],
  },
];

const THEME_ICON = { light: '☀', dark: '☾', system: '◑' } as const;

const COLLAPSE_KEY = 'ewp.sidebarCollapsed';
const WIDTH_OPEN = 236;
const WIDTH_COLLAPSED = 60;

export function AppShell() {
  const { user, signOut } = useAuth();
  const { theme, cycle } = useTheme();

  // Remembered per browser, so the choice survives a reload.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* private windows can throw; the layout still works */
    }
  }, [collapsed]);

  // Ctrl/Cmd + B, the convention every editor uses.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rank = user ? ROLE_RANK[user.role] : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: collapsed ? WIDTH_COLLAPSED : WIDTH_OPEN,
          flexShrink: 0,
          background: 'var(--navy)',
          borderRight: '1px solid var(--navy-line)',
          padding: collapsed ? 'var(--space-4) var(--space-2)' : 'var(--space-4) var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          transition: 'width var(--transition), padding var(--transition)',
          overflow: 'hidden',
        }}
      >
        <div
          className="row"
          style={{
            padding: collapsed ? 0 : '0 var(--space-2)',
            marginBottom: 'var(--space-4)',
            gap: 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
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
            {(user?.organizationName ?? 'C').charAt(0)}
          </span>

          {!collapsed ? (
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
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar  (Ctrl+B)`}
          style={{
            alignSelf: collapsed ? 'center' : 'flex-end',
            width: 26,
            height: 26,
            marginBottom: 'var(--space-3)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--navy-line)',
            background: 'transparent',
            color: 'var(--navy-ink-muted)',
            fontSize: 13,
            lineHeight: 1,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
        </button>

        <nav
          aria-label="Main"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {NAV_GROUPS.map((group) => ({
            ...group,
            items: group.items.filter(
              (entry) => !('minRole' in entry) || rank >= ROLE_RANK[entry.minRole as Role],
            ),
          }))
            // A member sees nothing under "Work", and a heading over an empty
            // space looks like the page failed to load.
            .filter((group) => group.items.length > 0)
            .map((group) => (
            <div key={group.label}>
              {/* The group heading is meaningless once labels are hidden. */}
              {!collapsed ? (
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
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map((entry) => (
                    <NavLink
                      key={entry.to}
                      to={entry.to}
                      end={entry.end}
                      title={collapsed ? entry.label : undefined}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 10,
                        padding: collapsed ? '9px 0' : '7px var(--space-2)',
                        borderRadius: 'var(--radius)',
                        fontSize: 'var(--text-md)',
                        fontWeight: isActive ? 600 : 450,
                        color: isActive ? 'var(--navy-active-ink)' : 'var(--navy-ink-muted)',
                        background: isActive ? 'var(--navy-active-bg)' : 'transparent',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        transition: 'background var(--transition), color var(--transition)',
                      })}
                    >
                      <span
                        aria-hidden="true"
                        style={{ fontSize: 13, width: 14, textAlign: 'center', flexShrink: 0 }}
                      >
                        {entry.icon}
                      </span>
                      {!collapsed ? entry.label : null}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {!collapsed ? <NotificationBell /> : null}

          <div
            className="row"
            style={{
              gap: 8,
              padding: 'var(--space-2)',
              borderTop: '1px solid var(--navy-line)',
              marginTop: 'var(--space-2)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <span title={collapsed ? `${user?.fullName} · ${user?.role.toLowerCase()}` : undefined}>
              <Avatar id={user?.id ?? null} fullName={user?.fullName ?? null} size={28} />
            </span>

            {!collapsed ? (
              <>
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
              </>
            ) : null}
          </div>

          <button
            className="btn btn--on-navy btn--sm"
            onClick={() => void signOut()}
            title={collapsed ? 'Sign out' : undefined}
            aria-label="Sign out"
            style={collapsed ? { padding: 0 } : undefined}
          >
            {collapsed ? '⏻' : 'Sign out'}
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatDateTime } from '@/shared/lib/format';

import { notificationsApi } from '../api/notifications.api';
import { usePushRegistration } from '../hooks/usePushRegistration';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const push = usePushRegistration();

  const feed = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.feed,
    // The bell has to move on its own; nothing else tells it to.
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = feed.data?.unreadCount ?? 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={() => {
          setOpen((value) => !value);
          if (!open && unread > 0) markRead.mutate();
        }}
        style={{
          position: 'relative',
          width: '100%',
          border: '1px solid var(--navy-line)',
          borderRadius: 'var(--radius)',
          background: 'transparent',
          color: 'var(--navy-ink-muted)',
          padding: '7px 10px',
          font: 'inherit',
          fontSize: 'var(--text-base)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        Notifications
        {unread > 0 ? (
          <span
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: 'var(--blocked)',
              color: '#fff',
              fontSize: 11,
              display: 'grid',
              placeItems: 'center',
              padding: '0 5px',
            }}
          >
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            width: 300,
            maxHeight: 380,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 32px rgba(18, 21, 28, 0.16)',
            zIndex: 20,
          }}
        >
          {push.state === 'default' ? (
            <button
              type="button"
              onClick={() => void push.enable()}
              disabled={push.busy}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid var(--line)',
                background: 'var(--accent-wash)',
                color: 'var(--accent)',
                padding: '9px 12px',
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {push.busy ? 'Enabling…' : 'Enable browser notifications'}
            </button>
          ) : push.state === 'denied' ? (
            <p className="meta" style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
              Browser notifications are blocked in your browser settings.
            </p>
          ) : push.state === 'unconfigured' ? (
            <p className="meta" style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)' }}>
              Browser push is not configured on the server.
            </p>
          ) : null}

          {(feed.data?.items.length ?? 0) === 0 ? (
            <p className="meta" style={{ padding: 'var(--space-4)' }}>Nothing yet.</p>
          ) : (
            feed.data?.items.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (notification.url) navigate(notification.url);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid var(--line)',
                  background: notification.readAt ? 'transparent' : 'var(--accent-wash)',
                  padding: '9px 12px',
                  font: 'inherit',
                  cursor: notification.url ? 'pointer' : 'default',
                }}
              >
                <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>
                  {notification.title}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-secondary)' }}>
                  {notification.body}
                </span>
                <span className="meta">{formatDateTime(notification.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

import type { MeetingDto } from '@ewp/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { boardsApi } from '@/features/boards';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { monthGrid } from '@/shared/lib/calendar';
import { formatDateTime } from '@/shared/lib/format';

import { meetingsApi } from '../api/meetings.api';
import { MonthCalendar } from '../components/MonthCalendar';
import { ScheduleMeetingForm } from '../components/ScheduleMeetingForm';

export function MeetingsPage() {
  const [params, setParams] = useSearchParams();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<MeetingDto | null>(null);

  // The grid always shows six full weeks, so query exactly that window.
  const [from, to] = useMemo(() => {
    const days = monthGrid(anchor);
    const first = days[0] as Date;
    const last = days[days.length - 1] as Date;
    return [new Date(first.setHours(0, 0, 0, 0)), new Date(last.setHours(23, 59, 59, 999))];
  }, [anchor]);

  const meetings = useQuery({
    queryKey: ['meetings', from.toISOString(), to.toISOString()],
    queryFn: () => meetingsApi.listInRange(from, to),
  });

  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const calendar = useQuery({ queryKey: ['calendar-status'], queryFn: meetingsApi.calendarStatus });

  const connect = useMutation({
    mutationFn: meetingsApi.authorizeUrl,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const banner = params.get('calendar');

  const shift = (months: number): void => {
    const next = new Date(anchor);
    next.setMonth(next.getMonth() + months);
    setAnchor(next);
  };

  if (meetings.isPending) {
    return (
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <SkeletonRows rows={1} height={44} />
        <SkeletonRows rows={1} height={520} />
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Meetings"
        subtitle={new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor)}
        actions={
          <>
            <button className="btn btn--icon" type="button" onClick={() => shift(-1)} aria-label="Previous month">
              ←
            </button>
            <button className="btn" type="button" onClick={() => setAnchor(new Date())}>
              Today
            </button>
            <button className="btn btn--icon" type="button" onClick={() => shift(1)} aria-label="Next month">
              →
            </button>
          </>
        }
      />

      {banner === 'connected' ? (
        <p className="card" style={{ color: 'var(--on-track)', background: 'var(--on-track-wash)' }}>
          Google Calendar connected. New meetings will get a Meet link automatically.
          <button className="btn" style={{ marginLeft: 'var(--space-3)' }} onClick={() => setParams({})}>
            Dismiss
          </button>
        </p>
      ) : banner === 'denied' ? (
        <p className="card" style={{ color: 'var(--blocked)', background: 'var(--blocked-wash)' }}>
          Google access was declined, so meetings will not sync.
          <button className="btn" style={{ marginLeft: 'var(--space-3)' }} onClick={() => setParams({})}>
            Dismiss
          </button>
        </p>
      ) : null}

      {calendar.data && !calendar.data.connected ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontWeight: 500 }}>Google Calendar is not connected</p>
            <p className="meta">
              {calendar.data.configured
                ? 'Connect it and every meeting you schedule gets a real calendar invite and a Meet link.'
                : 'Set CALENDAR_DRIVER=google plus the Google client credentials on the API to enable this. Until then you can paste your own join link.'}
            </p>
          </div>
          <button
            className="btn btn--primary"
            type="button"
            disabled={!calendar.data.configured || connect.isPending}
            onClick={() => connect.mutate()}
          >
            {connect.isPending ? 'Redirecting…' : 'Connect Google Calendar'}
          </button>
        </div>
      ) : calendar.data?.connected ? (
        <p className="meta">Google Calendar connected as {calendar.data.connectedEmail}</p>
      ) : null}

      {meetings.error ? <ErrorNotice error={meetings.error} /> : null}

      <MonthCalendar anchor={anchor} meetings={meetings.data ?? []} onSelect={setSelected} />

      {selected ? (
        <div className="card stack">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 500 }}>{selected.title}</h2>
              <p className="meta">{formatDateTime(selected.startsAt)}</p>
              <p className="meta">
                {selected.attendees.map((attendee) => attendee.fullName).join(', ')}
              </p>
              {selected.agendaItemIds.length > 0 ? (
                <p className="meta">{selected.agendaItemIds.length} agenda items pulled from the departments</p>
              ) : null}
            </div>
            <button className="btn" type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>

          {selected.joinUrl ? (
            <a
              className="btn btn--primary"
              href={selected.joinUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none', textAlign: 'center' }}
            >
              Join meeting
            </a>
          ) : (
            <p className="meta">No join link on this meeting.</p>
          )}
        </div>
      ) : null}

      {workspaces.data && workspaces.data.length > 0 && members.data ? (
        <ScheduleMeetingForm
          workspaces={workspaces.data}
          members={members.data}
          calendarConnected={calendar.data?.connected ?? false}
          onScheduled={() => setSelected(null)}
        />
      ) : (
        <p className="meta">Create a workspace before scheduling meetings.</p>
      )}
    </div>
  );
}

import type { MeetingDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { boardsApi } from '@/features/boards';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { CopyButton } from '@/shared/components/CopyButton';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { rangeFor, weekGrid } from '@/shared/lib/calendar';
import { formatDateTime } from '@/shared/lib/format';

import { meetingsApi } from '../api/meetings.api';
import { MonthCalendar } from '../components/MonthCalendar';
import { ScheduleMeetingForm } from '../components/ScheduleMeetingForm';
import { TimeGridCalendar } from '../components/TimeGridCalendar';

type CalendarView = 'day' | 'week' | 'month';

const VIEWS = [
  { value: 'day' as const, label: 'Day' },
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
];

/** What the header says you are looking at, per view. */
function headingFor(view: CalendarView, anchor: Date): string {
  if (view === 'day') {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(anchor);
  }

  if (view === 'week') {
    const days = weekGrid(anchor);
    const first = days[0] as Date;
    const last = days[6] as Date;
    const sameMonth = first.getMonth() === last.getMonth();

    return `${new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      ...(sameMonth ? {} : { month: 'short' }),
    }).format(first)} - ${new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(last)}`;
  }

  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(anchor);
}

export function MeetingsPage() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selected, setSelected] = useState<MeetingDto | null>(null);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  // Fetch exactly what the current view draws - rangeFor owns both.
  const [from, to] = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const meetings = useQuery({
    queryKey: ['meetings', from.toISOString(), to.toISOString()],
    queryFn: () => meetingsApi.listInRange(from, to),
  });

  // Arriving from a task's Meeting chip: the meeting may be in another month,
  // so look across a wide window rather than only the one on screen.
  const requestedId = params.get('meeting');

  const requested = useQuery({
    queryKey: ['meeting', requestedId],
    enabled: requestedId !== null,
    queryFn: async () => {
      const year = 365 * 24 * 60 * 60 * 1000;
      const found = await meetingsApi.listInRange(
        new Date(Date.now() - year),
        new Date(Date.now() + year),
      );
      return found.find((meeting) => meeting.id === requestedId) ?? null;
    },
  });

  useEffect(() => {
    if (!requested.data) return;
    setAnchor(new Date(requested.data.startsAt));
    setSelected(requested.data);
    // The detail card sits under the calendar, so bring it into view.
    window.setTimeout(
      () => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      120,
    );
    // Drop the parameter so a later reload does not keep re-opening it.
    setParams({}, { replace: true });
  }, [requested.data, setParams]);

  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });
  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const calendar = useQuery({ queryKey: ['calendar-status'], queryFn: meetingsApi.calendarStatus });

  const connect = useMutation({
    mutationFn: meetingsApi.authorizeUrl,
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const cancelMeeting = useMutation({
    mutationFn: (id: string) => meetingsApi.cancel(id),
    onSuccess: async () => {
      setConfirmingCancel(false);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ['meetings'] });
      // A cancelled meeting must stop showing on its task's Meeting chip.
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const disconnect = useMutation({
    mutationFn: meetingsApi.disconnectCalendar,
    onSuccess: async () => {
      setConfirmingDisconnect(false);
      await queryClient.invalidateQueries({ queryKey: ['calendar-status'] });
    },
  });

  // Picking a different meeting must not inherit the previous one's open
  // "are you sure" prompt.
  const select = (meeting: MeetingDto | null): void => {
    setSelected(meeting);
    setConfirmingCancel(false);
  };

  const banner = params.get('calendar');

  // The arrows move by whatever unit is on screen.
  const shift = (steps: number): void => {
    const next = new Date(anchor);
    if (view === 'day') next.setDate(next.getDate() + steps);
    else if (view === 'week') next.setDate(next.getDate() + steps * 7);
    else next.setMonth(next.getMonth() + steps);
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
        subtitle={headingFor(view, anchor)}
        actions={
          <>
            <SegmentedControl
              ariaLabel="Calendar view"
              value={view}
              options={VIEWS}
              onChange={setView}
            />
            <button
              className="btn btn--icon"
              type="button"
              onClick={() => shift(-1)}
              aria-label={`Previous ${view}`}
            >
              ←
            </button>
            <button className="btn" type="button" onClick={() => setAnchor(new Date())}>
              Today
            </button>
            <button
              className="btn btn--icon"
              type="button"
              onClick={() => shift(1)}
              aria-label={`Next ${view}`}
            >
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
        <div
          role="alert"
          className="card stack"
          style={{ color: 'var(--blocked)', background: 'var(--blocked-wash)', borderColor: 'var(--blocked)' }}
        >
          <p style={{ fontWeight: 600 }}>Google did not grant access</p>

          {params.get('reason') === 'access_denied' ? (
            <p style={{ fontSize: 'var(--text-md)' }}>
              This usually means the Google app is still in <b>Testing</b>, which only lets
              approved testers connect. Ask an administrator to add your Google address under
              <b> APIs &amp; Services → OAuth consent screen → Test users</b>, or to publish the
              app. You can still schedule meetings and paste a join link in the meantime.
            </p>
          ) : (
            <p style={{ fontSize: 'var(--text-md)' }}>
              {params.get('reason')
                ? `Google reported: ${params.get('reason')}.`
                : 'The request was declined.'}{' '}
              Meetings will not sync until this is resolved.
            </p>
          )}

          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setParams({})}>
            Dismiss
          </button>
        </div>
      ) : null}

      {calendar.data?.connected && calendar.data.canWriteEvents === false ? (
        <div
          role="alert"
          className="card stack"
          style={{ borderColor: 'var(--at-risk)', background: 'var(--at-risk-wash)' }}
        >
          <p style={{ fontWeight: 600, color: 'var(--at-risk)' }}>
            Connected, but Google withheld calendar access
          </p>
          <p style={{ fontSize: 'var(--text-md)' }}>
            Meetings save, but none of them can get a Meet link — Google refuses the event with
            &ldquo;insufficient authentication scopes&rdquo;. The grant is missing{' '}
            <code>calendar.events</code>, which happens when that scope is not registered on the
            OAuth consent screen.
          </p>
          <p className="meta">
            In Google Cloud, add <b>.../auth/calendar.events</b> under APIs &amp; Services → OAuth
            consent screen → Data access, check the Google Calendar API is enabled, then
            disconnect and connect again below.
          </p>
        </div>
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
        <div className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span className="meta">
            Google Calendar connected as {calendar.data.connectedEmail}
          </span>

          {confirmingDisconnect ? (
            <>
              <span style={{ fontSize: 'var(--text-base)' }}>
                Disconnect? New meetings will stop getting Meet links.
              </span>
              <button
                className="btn btn--sm"
                disabled={disconnect.isPending}
                style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                onClick={() => disconnect.mutate()}
              >
                {disconnect.isPending ? 'Disconnecting…' : 'Yes, disconnect'}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmingDisconnect(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmingDisconnect(true)}
            >
              Disconnect
            </button>
          )}

          {disconnect.error ? <ErrorNotice error={disconnect.error} /> : null}
        </div>
      ) : null}

      {meetings.error ? <ErrorNotice error={meetings.error} /> : null}

      {view === 'month' ? (
        <MonthCalendar
          anchor={anchor}
          meetings={meetings.data ?? []}
          selectedId={selected?.id ?? null}
          onSelect={select}
        />
      ) : (
        <TimeGridCalendar
          days={view === 'day' ? [anchor] : weekGrid(anchor)}
          meetings={meetings.data ?? []}
          selectedId={selected?.id ?? null}
          onSelect={select}
        />
      )}

      {selected ? (
        <div ref={detailRef} className="card stack">
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
            <div className="row" style={{ gap: 'var(--space-2)', alignSelf: 'flex-start' }}>
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                style={{ color: 'var(--blocked)' }}
                onClick={() => setConfirmingCancel(true)}
              >
                Cancel meeting
              </button>
              <button className="btn" type="button" onClick={() => select(null)}>
                Close
              </button>
            </div>
          </div>

          {confirmingCancel ? (
            <div
              role="alert"
              className="stack"
              style={{
                gap: 8,
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--blocked)',
                background: 'var(--blocked-wash)',
              }}
            >
              <p style={{ fontWeight: 600, color: 'var(--blocked)' }}>
                Cancel this meeting?
              </p>
              <p style={{ fontSize: 'var(--text-md)' }}>
                Everyone invited is told, and it is removed from the calendar. Any decisions
                already recorded against it are kept.
              </p>
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <button
                  className="btn btn--sm"
                  type="button"
                  disabled={cancelMeeting.isPending}
                  style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                  onClick={() => cancelMeeting.mutate(selected.id)}
                >
                  {cancelMeeting.isPending ? 'Cancelling…' : 'Yes, cancel it'}
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep it
                </button>
              </div>
              {cancelMeeting.error ? <ErrorNotice error={cancelMeeting.error} /> : null}
            </div>
          ) : null}

          {selected.joinUrl ? (
            <div className="row" style={{ gap: 'var(--space-2)' }}>
              <a
                className="btn btn--primary"
                href={selected.joinUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', textAlign: 'center', flex: 1 }}
              >
                Join meeting
              </a>
              <CopyButton value={selected.joinUrl} className="btn" />
            </div>
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
          onScheduled={() => select(null)}
        />
      ) : (
        <p className="meta">Create a workspace before scheduling meetings.</p>
      )}
    </div>
  );
}

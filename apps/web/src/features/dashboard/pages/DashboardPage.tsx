import { ROLE_RANK, type ItemDto, type UpdateItemInput } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { boardsApi } from '@/features/boards';
import {
  applyFilters,
  DEFAULT_FILTERS,
  ItemDrawer,
  itemsApi,
  QuickCreateTask,
  TaskMeetingDialog,
  type BoardFilters,
} from '@/features/items';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SkeletonCards, SkeletonRows } from '@/shared/components/Skeleton';
import { formatDateTime } from '@/shared/lib/format';

import { KpiCard } from '../components/KpiCard';
import { TodoTaskTable } from '../components/TodoTaskTable';
import { useExecutiveDashboard } from '../hooks/useExecutiveDashboard';

const selectStyle = {
  height: 30,
  padding: '0 var(--space-2)',
  border: '1px solid var(--line-strong)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  font: 'inherit',
  fontSize: 'var(--text-base)',
} as const;

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [creating, setCreating] = useState(false);
  const [meetingItem, setMeetingItem] = useState<ItemDto | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  // Kept out of BoardFilters: a department board is already one department, so
  // the shared filter shape (which saved views persist) has no use for it.
  const [departmentId, setDepartmentId] = useState('any');
  // Finished work is noise on a to-do list, so it starts hidden.
  const [filters, setFilters] = useState<BoardFilters>({ ...DEFAULT_FILTERS, hideDone: true });

  const canEdit = user ? ROLE_RANK[user.role] >= ROLE_RANK.MEMBER : false;

  const { data, isPending, error } = useExecutiveDashboard();

  // Every task the caller may see - the API already scopes this by role.
  const tasks = useQuery({
    queryKey: queryKeys.items({ scope: 'all' }),
    queryFn: () => itemsApi.listAll(),
  });

  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateItemInput }) =>
      itemsApi.update(id, patch),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['items'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const all = useMemo(() => tasks.data ?? [], [tasks.data]);

  const visible = useMemo(() => {
    const matched = applyFilters(all, filters, user?.id);
    return departmentId === 'any'
      ? matched
      : matched.filter((item) => item.boardId === departmentId);
  }, [all, filters, user?.id, departmentId]);

  // Only the departments that actually have tasks the caller can see - listing
  // empty ones just gives people a way to filter down to nothing.
  const departments = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of all) seen.set(item.boardId, item.boardName);
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);

  const openItem = all.find((item) => item.id === openItemId) ?? null;

  if (isPending) {
    return (
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <SkeletonRows rows={1} height={44} />
        <SkeletonCards cards={4} />
        <SkeletonRows rows={6} height={44} />
      </div>
    );
  }
  if (error) return <ErrorNotice error={error} />;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <PageHeader
        title="Todo"
        subtitle={`Updated ${formatDateTime(data.generatedAt)}`}
        actions={
          <>
            {canEdit ? (
              <button className="btn btn--primary" onClick={() => setCreating(true)}>
                + Create task
              </button>
            ) : null}
            <Link className="btn" to="/meetings">
              Meetings
            </Link>
          </>
        }
      />

      <section
        aria-label="Key figures"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <section className="stack" style={{ gap: 'var(--space-3)' }}>
          <div className="toolbar">
            <input
              className="field__input"
              placeholder="Search tasks…"
              aria-label="Search tasks"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              style={{ height: 30, width: 180, fontSize: 'var(--text-base)' }}
            />

            <select
              aria-label="Filter by owner"
              value={filters.ownerId}
              onChange={(event) => setFilters({ ...filters, ownerId: event.target.value })}
              style={selectStyle}
            >
              <option value="any">Anyone</option>
              <option value="me">Me</option>
              <option value="none">Unassigned</option>
              {members.data?.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.fullName}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              style={selectStyle}
            >
              <option value="any">All departments</option>
              {departments.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by due date"
              value={filters.due}
              onChange={(event) =>
                setFilters({ ...filters, due: event.target.value as BoardFilters['due'] })
              }
              style={selectStyle}
            >
              <option value="any">Any date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="week">Due this week</option>
              <option value="none">No date</option>
            </select>

            <button
              type="button"
              className="chip"
              aria-pressed={filters.hideDone}
              onClick={() => setFilters({ ...filters, hideDone: !filters.hideDone })}
            >
              Hide done
            </button>

            <span className="toolbar__spacer" />
            <span className="meta">
              {visible.length === all.length
                ? `${all.length} tasks`
                : `${visible.length} of ${all.length}`}
            </span>
          </div>

          {tasks.isPending ? (
            <SkeletonRows rows={6} height={44} />
          ) : tasks.error ? (
            <ErrorNotice error={tasks.error} />
          ) : (
            <TodoTaskTable
              items={visible}
              canEdit={canEdit}
              onPatch={(id, patch) => update.mutate({ id, patch })}
              onSchedule={setMeetingItem}
              onOpen={(item) => setOpenItemId(item.id)}
            />
          )}
      </section>

      {/* Below the tasks rather than beside them: the list is the point of this
          page, and a right rail was squeezing the task titles to nothing. */}
      <section className="card">
        <h2 className="card__title">Upcoming meetings</h2>
        {data.upcomingMeetings.length === 0 ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: 'var(--text-md)' }}>
            No meetings scheduled.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {data.upcomingMeetings.map((meeting) => (
              <li key={meeting.id}>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 500 }}>{meeting.title}</p>
                <p className="meta">{formatDateTime(meeting.startsAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating ? <QuickCreateTask onClose={() => setCreating(false)} /> : null}

      {openItem ? (
        <ItemDrawer
          item={openItem}
          items={all}
          members={members.data ?? []}
          canEdit={canEdit}
          onPatch={(patch) => update.mutate({ id: openItem.id, patch })}
          onSchedule={() => setMeetingItem(openItem)}
          onClose={() => setOpenItemId(null)}
        />
      ) : null}

      {meetingItem ? (
        <TaskMeetingDialog
          item={meetingItem}
          members={members.data ?? []}
          workspaces={workspaces.data ?? []}
          onClose={() => setMeetingItem(null)}
        />
      ) : null}
    </div>
  );
}

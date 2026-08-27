import { ROLE_RANK, type ItemDto, type ItemStatus, type SavedViewDto } from '@ewp/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  applyFilters,
  BoardToolbar,
  BulkActionBar,
  DEFAULT_FILTERS,
  groupItems,
  isFiltered,
  ItemDrawer,
  ItemGroupTable,
  TaskMeetingDialog,
  TimelineView,
  useBoardItems,
  useBulkActions,
  type BoardFilters,
} from '@/features/items';
import { membersApi } from '@/features/members';
import { SavedViewPicker , viewsApi } from '@/features/views';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { PageHeader } from '@/shared/components/PageHeader';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { SkeletonRows } from '@/shared/components/Skeleton';
import { config } from '@/shared/config/env';

import { boardsApi } from '../api/boards.api';

type Layout = 'table' | 'timeline';

export function BoardPage() {
  const { boardId = '' } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('table');
  const [openItemId, setOpenItemId] = useState<string | null>(params.get('item'));
  const [meetingItemId, setMeetingItemId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const board = useQuery({
    queryKey: queryKeys.board(boardId),
    queryFn: () => boardsApi.get(boardId),
    enabled: Boolean(boardId),
  });

  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const workspaces = useQuery({ queryKey: queryKeys.workspaces, queryFn: boardsApi.listWorkspaces });
  const { query, create, update, remove } = useBoardItems(boardId);
  const bulk = useBulkActions(boardId);

  // Open the board in its default view, once, before the user touches anything.
  const views = useQuery({ queryKey: ['views', boardId], queryFn: () => viewsApi.list(boardId) });
  const [appliedDefault, setAppliedDefault] = useState(false);

  useEffect(() => {
    if (appliedDefault || !views.data) return;
    const fallback = views.data.find((view) => view.isDefault);
    if (fallback) {
      setFilters(fallback.filters);
      setActiveViewId(fallback.id);
    }
    setAppliedDefault(true);
  }, [views.data, appliedDefault]);

  const canEdit = user ? ROLE_RANK[user.role] >= ROLE_RANK.MEMBER : false;
  // Deleting a board takes its tasks with it, so it needs a higher bar than editing.
  const canDeleteBoard = user ? ROLE_RANK[user.role] >= ROLE_RANK.MANAGER : false;
  // Matches the nav and route gate on the department list.
  const canSeeAllBoards = user ? ROLE_RANK[user.role] >= ROLE_RANK.MANAGER : false;

  const deleteBoard = useMutation({
    mutationFn: () => boardsApi.remove(boardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['boards'] });
      navigate('/boards', { replace: true });
    },
  });

  const all = useMemo(() => query.data ?? [], [query.data]);
  const visible = useMemo(() => applyFilters(all, filters, user?.id), [all, filters, user?.id]);
  // Always one plain list: the tasks, or the composer if there are none.
  // Deliberately ignores filters.groupBy - a saved view made before grouping was
  // dropped would otherwise bring the status headings back with no way to leave.
  const groups = useMemo(() => groupItems(visible, 'none'), [visible]);

  const openItem = all.find((item) => item.id === openItemId) ?? null;
  const meetingItem = all.find((item) => item.id === meetingItemId) ?? null;

  const openDrawer = (item: ItemDto): void => {
    setOpenItemId(item.id);
    setParams({ item: item.id }, { replace: true });
  };

  const closeDrawer = (): void => {
    setOpenItemId(null);
    setParams({}, { replace: true });
  };

  const applyView = (view: SavedViewDto | null): void => {
    setActiveViewId(view?.id ?? null);
    setFilters(view ? view.filters : DEFAULT_FILTERS);
  };

  if (query.isPending || board.isPending) {
    return (
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <SkeletonRows rows={1} height={44} />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  if (board.error) return <ErrorNotice error={board.error} />;
  if (query.error) return <ErrorNotice error={query.error} />;

  const done = all.filter((item) => item.status === 'DONE').length;
  const overdue = all.filter(
    (item) => item.dueDate !== null && new Date(item.dueDate) < new Date() && item.status !== 'DONE',
  ).length;

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <PageHeader
        breadcrumb={
          // Members have no department list to go back to, so send them to the
          // page they came from rather than one that would bounce them.
          canSeeAllBoards ? (
            <Link to="/boards" className="meta" style={{ textDecoration: 'none' }}>
              ← All departments
            </Link>
          ) : (
            <Link to="/" className="meta" style={{ textDecoration: 'none' }}>
              ← Todo
            </Link>
          )
        }
        title={board.data?.name ?? 'Department'}
        subtitle={
          <span className="row" style={{ gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span>{all.length === 0 ? 'No tasks yet' : `${done} of ${all.length} done`}</span>
            {overdue > 0 ? (
              <span className="badge" style={{ background: 'var(--blocked-wash)', color: 'var(--blocked)' }}>
                {overdue} overdue
              </span>
            ) : null}
            {board.data?.isPortfolio ? (
              <span className="badge" style={{ background: 'var(--accent-wash)', color: 'var(--accent)' }}>
                Rolls up to Todo
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            <SegmentedControl<Layout>
              ariaLabel="Board layout"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'table', label: 'Table' },
                { value: 'timeline', label: 'Timeline' },
              ]}
            />
            <a
              className="btn btn--sm"
              href={`${config.apiBaseUrl}${config.apiPrefix}/admin/export/board/${boardId}.csv`}
            >
              Export CSV
            </a>

            {canDeleteBoard ? (
              confirmingDelete ? (
                <>
                  <span style={{ fontSize: 'var(--text-base)', color: 'var(--blocked)' }}>
                    Delete this department and its {all.length} tasks?
                  </span>
                  <button
                    className="btn btn--sm"
                    disabled={deleteBoard.isPending}
                    style={{ borderColor: 'var(--blocked)', color: 'var(--blocked)' }}
                    onClick={() => deleteBoard.mutate()}
                  >
                    {deleteBoard.isPending ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => setConfirmingDelete(true)}>
                  Delete department
                </button>
              )
            ) : null}
          </>
        }
      />

      <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <SavedViewPicker
          boardId={boardId}
          filters={filters}
          activeViewId={activeViewId}
          onApply={applyView}
        />
      </div>

      <BoardToolbar
        filters={filters}
        members={members.data ?? []}
        matched={visible.length}
        total={all.length}
        onChange={(next) => {
          setFilters(next);
          // Editing filters means you have left the saved view behind.
          setActiveViewId(null);
        }}
      />

      {update.isError ? (
        <p className="meta" style={{ color: 'var(--blocked)' }}>
          That change did not save — it has been rolled back.
        </p>
      ) : null}

      {layout === 'timeline' ? (
        <TimelineView items={visible} onOpen={openDrawer} />
      ) : (
        <>
          {visible.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-7)' }}>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 500 }}>
                {all.length === 0 ? 'This department is empty' : 'Nothing matches those filters'}
              </p>
              <p className="meta" style={{ marginTop: 6 }}>
                {all.length === 0
                  ? 'Add your first task below to get going.'
                  : 'Try widening the filters, or reset them.'}
              </p>
              {isFiltered(filters) ? (
                <button
                  className="btn"
                  style={{ marginTop: 'var(--space-4)' }}
                  onClick={() => applyView(null)}
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="stack" style={{ gap: 'var(--space-5)' }}>
            {groups
              .filter((group) => group.items.length > 0 || (canEdit && group.createStatus !== null))
              .map((group) => (
                <ItemGroupTable
                  key={group.key}
                  group={group}
                  members={members.data ?? []}
                  canEdit={canEdit}
                  selected={bulk.selected}
                  onSelect={bulk.toggle}
                  onSelectMany={bulk.setMany}
                  onOpen={openDrawer}
                  onSchedule={(item) => setMeetingItemId(item.id)}
                  onPatch={(id, patch) => update.mutate({ id, patch })}
                  onDelete={(id) => remove.mutate(id)}
                  onCreate={(title, status: ItemStatus | null) =>
                    create.mutate({
                      boardId,
                      title,
                      status: status ?? 'NOT_STARTED',
                      priority: 'MEDIUM',
                    })
                  }
                />
              ))}
          </div>
        </>
      )}

      {bulk.selected.size > 0 ? (
        <BulkActionBar
          count={bulk.selected.size}
          members={members.data ?? []}
          pending={bulk.update.isPending || bulk.remove.isPending}
          onApply={(patch) => bulk.update.mutate(patch)}
          onDelete={() => bulk.remove.mutate()}
          onClear={bulk.clear}
        />
      ) : null}

      {meetingItem ? (
        <TaskMeetingDialog
          item={meetingItem}
          members={members.data ?? []}
          workspaces={workspaces.data ?? []}
          onClose={() => setMeetingItemId(null)}
        />
      ) : null}

      {openItem ? (
        <ItemDrawer
          item={openItem}
          items={all}
          members={members.data ?? []}
          canEdit={canEdit}
          onPatch={(patch) => update.mutate({ id: openItem.id, patch })}
          onSchedule={() => setMeetingItemId(openItem.id)}
          onClose={closeDrawer}
        />
      ) : null}
    </div>
  );
}

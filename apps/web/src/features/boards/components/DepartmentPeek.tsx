import { ROLE_RANK, type ItemDto, type ItemStatus } from '@ewp/contracts';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  BulkActionBar,
  groupItems,
  ItemDrawer,
  ItemGroupTable,
  TaskMeetingDialog,
  useBoardItems,
  useBulkActions,
} from '@/features/items';
import { membersApi } from '@/features/members';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorNotice } from '@/shared/components/ErrorNotice';
import { SkeletonRows } from '@/shared/components/Skeleton';

import { boardsApi } from '../api/boards.api';

/**
 * A department opened where it sits. This is the department itself, not a
 * preview of it: the same grid, the same inline edits, the same composer. The
 * board page still exists for a direct link, but nothing here needs it.
 */
export function DepartmentPeek({ boardId, boardName }: { boardId: string; boardName: string }) {
  const { user } = useAuth();
  const canEdit = user ? ROLE_RANK[user.role] >= ROLE_RANK.MEMBER : false;

  const { query, create, update, remove } = useBoardItems(boardId);
  const bulk = useBulkActions(boardId);

  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [meetingItemId, setMeetingItemId] = useState<string | null>(null);

  const members = useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
  const workspaces = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: boardsApi.listWorkspaces,
    // Only needed once somebody actually schedules something from here.
    enabled: meetingItemId !== null,
  });

  const items = query.data ?? [];
  const openItem = items.find((item) => item.id === openItemId) ?? null;
  const meetingItem = items.find((item) => item.id === meetingItemId) ?? null;

  if (query.isPending) {
    return (
      <section className="card">
        <SkeletonRows rows={3} height={36} />
      </section>
    );
  }
  if (query.error) {
    return (
      <section className="card">
        <ErrorNotice error={query.error} />
      </section>
    );
  }

  const done = items.filter((item) => item.status === 'DONE').length;
  // One plain list, exactly as the department page shows it.
  const group = groupItems(items, 'none')[0] as ReturnType<typeof groupItems>[number];

  return (
    <section className="stack" style={{ gap: 'var(--space-3)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 550 }}>{boardName}</h2>
        <span className="meta">
          {items.length === 0 ? 'No tasks yet' : `${done} of ${items.length} done`}
        </span>
      </div>

      <ItemGroupTable
        group={group}
        members={members.data ?? []}
        canEdit={canEdit}
        selected={bulk.selected}
        onSelect={bulk.toggle}
        onSelectMany={bulk.setMany}
        onOpen={(item: ItemDto) => setOpenItemId(item.id)}
        onSchedule={(item: ItemDto) => setMeetingItemId(item.id)}
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

      {create.error ? <ErrorNotice error={create.error} /> : null}

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

      {openItem ? (
        <ItemDrawer
          item={openItem}
          items={items}
          members={members.data ?? []}
          canEdit={canEdit}
          onPatch={(patch) => update.mutate({ id: openItem.id, patch })}
          onSchedule={() => setMeetingItemId(openItem.id)}
          onDelete={() => remove.mutate(openItem.id)}
          onClose={() => setOpenItemId(null)}
        />
      ) : null}

      {meetingItem && workspaces.data ? (
        <TaskMeetingDialog
          item={meetingItem}
          members={members.data ?? []}
          workspaces={workspaces.data}
          onClose={() => setMeetingItemId(null)}
        />
      ) : null}
    </section>
  );
}

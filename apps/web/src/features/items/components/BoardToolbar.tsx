import { PRIORITIES, type ItemStatus, type MemberDto } from '@ewp/contracts';

import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { PRIORITY_TONE, STATUS_TONE } from '@/shared/lib/item-meta';

import {
  DEFAULT_FILTERS,
  isFiltered,
  type BoardFilters,
  type DueWindow,
  type GroupBy,
} from '../lib/board-filters';

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

export function BoardToolbar({
  filters,
  members,
  matched,
  total,
  onChange,
}: {
  filters: BoardFilters;
  members: MemberDto[];
  matched: number;
  total: number;
  onChange: (next: BoardFilters) => void;
}) {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]): void =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="toolbar">
      <input
        className="field__input"
        placeholder="Search tasks…"
        aria-label="Search tasks"
        value={filters.search}
        onChange={(event) => set('search', event.target.value)}
        style={{ height: 30, width: 200, fontSize: 'var(--text-base)' }}
      />

      <span className="toolbar__divider" />

      <select
        aria-label="Filter by owner"
        value={filters.ownerId}
        onChange={(event) => set('ownerId', event.target.value as BoardFilters['ownerId'])}
        style={selectStyle}
      >
        <option value="any">Anyone</option>
        <option value="me">Me</option>
        <option value="none">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        value={filters.status}
        onChange={(event) => set('status', event.target.value as BoardFilters['status'])}
        style={selectStyle}
      >
        <option value="any">Any status</option>
        {(Object.keys(STATUS_TONE) as ItemStatus[]).map((status) => (
          <option key={status} value={status}>
            {STATUS_TONE[status].label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(event) => set('priority', event.target.value as BoardFilters['priority'])}
        style={selectStyle}
      >
        <option value="any">Any priority</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_TONE[priority].label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by due date"
        value={filters.due}
        onChange={(event) => set('due', event.target.value as DueWindow)}
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
        onClick={() => set('hideDone', !filters.hideDone)}
      >
        Hide done
      </button>

      <span className="toolbar__spacer" />

      <span className="meta">
        {matched === total ? `${total} tasks` : `${matched} of ${total}`}
      </span>

      {isFiltered(filters) ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onChange({ ...DEFAULT_FILTERS, groupBy: filters.groupBy })}
        >
          Reset
        </button>
      ) : null}

      <span className="toolbar__divider" />

      <SegmentedControl<GroupBy>
        ariaLabel="Group tasks by"
        value={filters.groupBy}
        onChange={(groupBy) => set('groupBy', groupBy)}
        options={[
          { value: 'status', label: 'Status' },
          { value: 'owner', label: 'Owner' },
          { value: 'priority', label: 'Priority' },
          { value: 'due', label: 'Due' },
        ]}
      />
    </div>
  );
}

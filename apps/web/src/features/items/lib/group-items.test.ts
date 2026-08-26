import type { ItemDto } from '@ewp/contracts';
import { describe, expect, it } from 'vitest';

import { DEFAULT_FILTERS } from './board-filters';
import { applyFilters, groupItems } from './group-items';

const day = 86_400_000;
const iso = (offsetDays: number): string => new Date(Date.now() + offsetDays * day).toISOString();

function item(overrides: Partial<ItemDto> = {}): ItemDto {
  return {
    id: Math.random().toString(36).slice(2),
    boardId: 'board-1',
    title: 'Task',
    description: null,
    status: 'NOT_STARTED',
    health: 'ON_TRACK',
    priority: 'MEDIUM',
    owner: null,
    assignees: [],
    startDate: null,
    dueDate: null,
    blockedReason: null,
    nextMeeting: null,
    parentId: null,
    subitemCount: 0,
    createdAt: iso(-10),
    updatedAt: iso(-1),
    ...overrides,
  };
}

describe('applyFilters', () => {
  it('matches titles case-insensitively', () => {
    const items = [item({ title: 'Vendor shortlist' }), item({ title: 'Budget sign-off' })];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, search: 'VENDOR' }, undefined);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('Vendor shortlist');
  });

  it('hides done and cancelled work when asked', () => {
    const items = [item({ status: 'DONE' }), item({ status: 'CANCELLED' }), item({ status: 'BLOCKED' })];
    const result = applyFilters(items, { ...DEFAULT_FILTERS, hideDone: true }, undefined);
    expect(result.map((row) => row.status)).toEqual(['BLOCKED']);
  });

  it('resolves "me" against the signed-in user', () => {
    const mine = item({ owner: { id: 'u1', fullName: 'Priya', avatarUrl: null } });
    const theirs = item({ owner: { id: 'u2', fullName: 'Marcus', avatarUrl: null } });
    const result = applyFilters([mine, theirs], { ...DEFAULT_FILTERS, ownerId: 'me' }, 'u1');
    expect(result).toEqual([mine]);
  });

  it('treats unassigned as its own owner filter', () => {
    const owned = item({ owner: { id: 'u1', fullName: 'Priya', avatarUrl: null } });
    const orphan = item();
    expect(applyFilters([owned, orphan], { ...DEFAULT_FILTERS, ownerId: 'none' }, 'u1')).toEqual([orphan]);
  });

  it('finds work where you are an assignee rather than the owner', () => {
    const theirsButMine = item({
      owner: { id: 'u2', fullName: 'Marcus', avatarUrl: null },
      assignees: [{ id: 'u1', fullName: 'Priya', avatarUrl: null }],
    });
    const unrelated = item({ owner: { id: 'u2', fullName: 'Marcus', avatarUrl: null } });

    expect(applyFilters([theirsButMine, unrelated], { ...DEFAULT_FILTERS, ownerId: 'me' }, 'u1')).toEqual([
      theirsButMine,
    ]);
  });

  it('does not call a task unassigned when it has assignees but no owner', () => {
    const staffed = item({ assignees: [{ id: 'u1', fullName: 'Priya', avatarUrl: null }] });
    const orphan = item();
    expect(applyFilters([staffed, orphan], { ...DEFAULT_FILTERS, ownerId: 'none' }, 'u1')).toEqual([orphan]);
  });

  it('counts a past due date as overdue only when the task is not done', () => {
    const late = item({ dueDate: iso(-2) });
    const finished = item({ dueDate: iso(-2), status: 'DONE' });
    const result = applyFilters([late, finished], { ...DEFAULT_FILTERS, due: 'overdue' }, undefined);
    expect(result).toEqual([late]);
  });

  it('excludes dated work from the "no date" filter', () => {
    const dated = item({ dueDate: iso(3) });
    const undated = item();
    expect(applyFilters([dated, undated], { ...DEFAULT_FILTERS, due: 'none' }, undefined)).toEqual([undated]);
  });
});

describe('groupItems', () => {
  it('keeps every status bucket so empty ones can still accept a task', () => {
    const groups = groupItems([item({ status: 'BLOCKED' })], 'status');
    expect(groups).toHaveLength(5);
    expect(groups.every((group) => group.createStatus !== null)).toBe(true);
    expect(groups.find((group) => group.key === 'BLOCKED')?.items).toHaveLength(1);
  });

  it('sorts unassigned last when grouping by owner', () => {
    const groups = groupItems(
      [item(), item({ owner: { id: 'u2', fullName: 'Marcus', avatarUrl: null } })],
      'owner',
    );
    expect(groups.map((group) => group.label)).toEqual(['Marcus', 'Unassigned']);
  });

  it('places each item in exactly one due-date bucket', () => {
    const items = [item({ dueDate: iso(-3) }), item({ dueDate: iso(2) }), item({ dueDate: iso(40) }), item()];
    const groups = groupItems(items, 'due');

    expect(groups.map((group) => group.items.length)).toEqual([1, 1, 1, 1]);
    expect(groups.flatMap((group) => group.items)).toHaveLength(items.length);
  });
});

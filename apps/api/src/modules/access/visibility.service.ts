import { ROLE_RANK } from '@ewp/contracts';
import type { Prisma } from '@prisma/client';

import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';

/**
 * Who sees the whole organisation, and who sees only their own corner of it.
 *
 * MANAGER and above run the business: they need the full picture, which is what
 * the portfolio rollup is for. Below that, people see the work they are on -
 * the boards they have been granted, plus anything assigned to them, plus the
 * meetings they attend. Nothing else.
 *
 * Every list AND every single-record lookup goes through here. Filtering only
 * the lists would leave the ids guessable through a direct URL.
 */
export function seesWholeOrganization(auth: AuthContext): boolean {
  return ROLE_RANK[auth.role] >= ROLE_RANK.MANAGER;
}

/**
 * The boards a restricted user may see: explicitly granted, inside a granted
 * workspace, or holding work that is theirs. The last clause matters - being
 * given a task is itself a reason to see the board it lives on.
 */
export async function visibleBoardIds(auth: AuthContext): Promise<string[]> {
  const grants = await prisma.scopedAccess.findMany({
    where: { organizationId: auth.organizationId, userId: auth.userId },
    select: { boardId: true, workspaceId: true },
  });

  const grantedBoards = grants.map((g) => g.boardId).filter((id): id is string => id !== null);
  const grantedWorkspaces = grants
    .map((g) => g.workspaceId)
    .filter((id): id is string => id !== null);

  const boards = await prisma.board.findMany({
    where: {
      deletedAt: null,
      workspace: { organizationId: auth.organizationId, deletedAt: null },
      OR: [
        { id: { in: grantedBoards } },
        { workspaceId: { in: grantedWorkspaces } },
        {
          items: {
            some: {
              deletedAt: null,
              OR: [{ ownerId: auth.userId }, { assignees: { some: { userId: auth.userId } } }],
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  return boards.map((board) => board.id);
}

/** Workspaces holding a visible board, plus any granted outright. */
export async function visibleWorkspaceIds(auth: AuthContext): Promise<string[]> {
  const [boardIds, grants, attended] = await Promise.all([
    visibleBoardIds(auth),
    prisma.scopedAccess.findMany({
      where: { organizationId: auth.organizationId, userId: auth.userId, workspaceId: { not: null } },
      select: { workspaceId: true },
    }),
    // A meeting you are invited to also reveals its workspace.
    prisma.meeting.findMany({
      where: {
        cancelledAt: null,
        attendees: { some: { userId: auth.userId } },
        workspace: { organizationId: auth.organizationId, deletedAt: null },
      },
      select: { workspaceId: true },
    }),
  ]);

  const fromBoards = await prisma.board.findMany({
    where: { id: { in: boardIds } },
    select: { workspaceId: true },
  });

  return [
    ...new Set([
      ...fromBoards.map((board) => board.workspaceId),
      ...grants.map((grant) => grant.workspaceId as string),
      ...attended.map((meeting) => meeting.workspaceId),
    ]),
  ];
}

/** A `where` fragment to AND into any board query. */
export async function boardFilter(auth: AuthContext): Promise<Prisma.BoardWhereInput> {
  if (seesWholeOrganization(auth)) return {};
  return { id: { in: await visibleBoardIds(auth) } };
}

export async function workspaceFilter(auth: AuthContext): Promise<Prisma.WorkspaceWhereInput> {
  if (seesWholeOrganization(auth)) return {};
  return { id: { in: await visibleWorkspaceIds(auth) } };
}

/**
 * Items on a visible board, or assigned to the caller. The second clause is
 * what keeps "my work" complete when a board grant is later withdrawn.
 */
export async function itemFilter(auth: AuthContext): Promise<Prisma.ItemWhereInput> {
  if (seesWholeOrganization(auth)) return {};

  return {
    OR: [
      { boardId: { in: await visibleBoardIds(auth) } },
      { ownerId: auth.userId },
      { assignees: { some: { userId: auth.userId } } },
    ],
  };
}

/** Restricted users see only meetings they are actually invited to. */
export function meetingFilter(auth: AuthContext): Prisma.MeetingWhereInput {
  if (seesWholeOrganization(auth)) return {};
  return { attendees: { some: { userId: auth.userId } } };
}

import type { BoardDto, CreateBoardInput, UpdateBoardInput } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { boardFilter, itemFilter, seesWholeOrganization } from '@/modules/access';
import { activityService } from '@/modules/activity';
import { meetingsService } from '@/modules/meetings';
import { workspacesService } from '@/modules/workspaces';

import { boardsRepository } from './boards.repository';

type BoardRow = Awaited<ReturnType<typeof boardsRepository.create>>;

function toDto(row: BoardRow): BoardDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    isPortfolio: row.isPortfolio,
    itemCount: row._count.items,
    createdAt: row.createdAt.toISOString(),
  };
}

export const boardsService = {
  async listForWorkspace(auth: AuthContext, workspaceId: string): Promise<BoardDto[]> {
    await workspacesService.getOrFail(auth, workspaceId);
    return (
      await boardsRepository.listForWorkspace(
        workspaceId,
        await boardFilter(auth),
        await itemFilter(auth),
      )
    ).map(toDto);
  },

  /** Used by anything that has to offer a choice of department. */
  async listAll(auth: AuthContext): Promise<BoardDto[]> {
    return (
      await boardsRepository.listForOrganization(
        auth.organizationId,
        await boardFilter(auth),
        await itemFilter(auth),
      )
    ).map(toDto);
  },

  async getOrFail(auth: AuthContext, id: string) {
    // Scoped here as well: a list filter alone leaves ids reachable by URL.
    const row = await boardsRepository.findById(
      auth.organizationId,
      id,
      await boardFilter(auth),
      await itemFilter(auth),
    );
    if (!row) throw AppError.notFound('Board');
    return row;
  },

  async get(auth: AuthContext, id: string): Promise<BoardDto> {
    return toDto(await this.getOrFail(auth, id));
  },

  async create(auth: AuthContext, input: CreateBoardInput, requestId: string): Promise<BoardDto> {
    await workspacesService.getOrFail(auth, input.workspaceId);
    const row = await boardsRepository.create(input);

    // Whoever made it can see it. Without this a member creates a department
    // and it vanishes, because visibility is granted rather than implied.
    if (!seesWholeOrganization(auth)) {
      await prisma.scopedAccess.create({
        data: {
          organizationId: auth.organizationId,
          userId: auth.userId,
          boardId: row.id,
          role: auth.role,
        },
      });
    }

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Board',
      entityId: row.id,
      verb: 'CREATED',
      after: { name: row.name, workspaceId: row.workspaceId },
      requestId,
    });

    return toDto(row);
  },

  async update(
    auth: AuthContext,
    id: string,
    input: UpdateBoardInput,
    requestId: string,
  ): Promise<BoardDto> {
    const existing = await this.getOrFail(auth, id);
    const row = await boardsRepository.update(id, input);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Board',
      entityId: id,
      verb: 'UPDATED',
      before: { name: existing.name, isPortfolio: existing.isPortfolio },
      after: { name: row.name, isPortfolio: row.isPortfolio },
      requestId,
    });

    return toDto(row);
  },

  async remove(auth: AuthContext, id: string, requestId: string): Promise<void> {
    await this.getOrFail(auth, id);
    await boardsRepository.softDelete(id);

    // Deleted here, the department's meetings used to stay live in Google -
    // still inviting, still reminding, and no longer cancellable from the app
    // because the rows had become invisible with the board.
    await meetingsService.cancelForBoard(auth, id, requestId);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Board',
      entityId: id,
      verb: 'DELETED',
      requestId,
    });
  },
};

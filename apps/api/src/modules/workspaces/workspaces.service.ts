import type { CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceDto } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { workspaceFilter } from '@/modules/access';
import { activityService } from '@/modules/activity';

import { workspacesRepository } from './workspaces.repository';

type WorkspaceRow = Awaited<ReturnType<typeof workspacesRepository.create>>;

function toDto(row: WorkspaceRow, memberCount: number): WorkspaceDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    boardCount: row._count.boards,
    memberCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export const workspacesService = {
  async list(auth: AuthContext): Promise<WorkspaceDto[]> {
    const scope = await workspaceFilter(auth);
    const [rows, memberCount] = await Promise.all([
      workspacesRepository.listForOrganization(auth.organizationId, scope),
      workspacesRepository.countMembers(auth.organizationId),
    ]);
    return rows.map((row) => toDto(row, memberCount));
  },

  /**
   * Tenant guard. Every workspace lookup goes through here so a caller can
   * never reach a workspace belonging to another organization.
   */
  async getOrFail(auth: AuthContext, id: string) {
    // Scope applies to single lookups too, or the id is simply guessable.
    const row = await workspacesRepository.findById(
      auth.organizationId,
      id,
      await workspaceFilter(auth),
    );
    if (!row) throw AppError.notFound('Workspace');
    return row;
  },

  async create(auth: AuthContext, input: CreateWorkspaceInput, requestId: string): Promise<WorkspaceDto> {
    const row = await workspacesRepository.create({ organizationId: auth.organizationId, ...input });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Workspace',
      entityId: row.id,
      verb: 'CREATED',
      after: { name: row.name },
      requestId,
    });

    return toDto(row, await workspacesRepository.countMembers(auth.organizationId));
  },

  async update(
    auth: AuthContext,
    id: string,
    input: UpdateWorkspaceInput,
    requestId: string,
  ): Promise<WorkspaceDto> {
    const existing = await this.getOrFail(auth, id);
    const row = await workspacesRepository.update(id, input);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Workspace',
      entityId: id,
      verb: 'UPDATED',
      before: { name: existing.name, description: existing.description },
      after: { name: row.name, description: row.description },
      requestId,
    });

    return toDto(row, await workspacesRepository.countMembers(auth.organizationId));
  },

  async remove(auth: AuthContext, id: string, requestId: string): Promise<void> {
    await this.getOrFail(auth, id);
    await workspacesRepository.softDelete(id);

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Workspace',
      entityId: id,
      verb: 'DELETED',
      requestId,
    });
  },
};

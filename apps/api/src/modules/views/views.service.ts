import type {
  BoardFilters,
  CreateSavedViewInput,
  SavedViewDto,
  UpdateSavedViewInput,
} from '@ewp/contracts';
import { boardFiltersSchema } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';

type Row = {
  id: string;
  name: string;
  boardId: string | null;
  userId: string | null;
  filters: unknown;
  isDefault: boolean;
  createdAt: Date;
};

function toDto(row: Row): SavedViewDto {
  return {
    id: row.id,
    name: row.name,
    boardId: row.boardId,
    // Parsed rather than cast: a view saved by an older client still loads.
    filters: boardFiltersSchema.parse(row.filters ?? {}) as BoardFilters,
    shared: row.userId === null,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

export const viewsService = {
  /** Your own views plus everything shared with the organisation. */
  async list(auth: AuthContext, boardId?: string): Promise<SavedViewDto[]> {
    const rows = await prisma.savedView.findMany({
      where: {
        organizationId: auth.organizationId,
        OR: [{ userId: auth.userId }, { userId: null }],
        ...(boardId ? { OR: [{ boardId }, { boardId: null }] } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // The board filter above competes with the ownership OR, so apply it here.
    return rows
      .filter((row) => !boardId || row.boardId === boardId || row.boardId === null)
      .filter((row) => row.userId === auth.userId || row.userId === null)
      .map(toDto);
  },

  async create(auth: AuthContext, input: CreateSavedViewInput): Promise<SavedViewDto> {
    if (input.isDefault) await this.clearDefault(auth, input.boardId ?? null);

    const row = await prisma.savedView.create({
      data: {
        organizationId: auth.organizationId,
        // A shared view belongs to the organisation, not to its author.
        userId: input.shared ? null : auth.userId,
        boardId: input.boardId ?? null,
        name: input.name,
        filters: input.filters,
        isDefault: input.isDefault,
      },
    });
    return toDto(row);
  },

  async update(auth: AuthContext, id: string, input: UpdateSavedViewInput): Promise<SavedViewDto> {
    const existing = await this.getOrFail(auth, id);
    if (input.isDefault) await this.clearDefault(auth, existing.boardId);

    const row = await prisma.savedView.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.filters === undefined ? {} : { filters: input.filters }),
        ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }),
        ...(input.shared === undefined ? {} : { userId: input.shared ? null : auth.userId }),
      },
    });
    return toDto(row);
  },

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.getOrFail(auth, id);
    await prisma.savedView.delete({ where: { id } });
  },

  async getOrFail(auth: AuthContext, id: string) {
    const row = await prisma.savedView.findFirst({
      where: {
        id,
        organizationId: auth.organizationId,
        OR: [{ userId: auth.userId }, { userId: null }],
      },
    });
    if (!row) throw AppError.notFound('View');
    return row;
  },

  /** Only one default per scope, or the board would not know which to open. */
  async clearDefault(auth: AuthContext, boardId: string | null): Promise<void> {
    await prisma.savedView.updateMany({
      where: {
        organizationId: auth.organizationId,
        boardId,
        OR: [{ userId: auth.userId }, { userId: null }],
        isDefault: true,
      },
      data: { isDefault: false },
    });
  },
};

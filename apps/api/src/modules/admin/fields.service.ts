import type { CreateFieldInput, FieldDefinitionDto } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { itemsService } from '@/modules/items';

/** A stable machine key derived from the label, so exports have sane headers. */
function toKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export const fieldsService = {
  async list(auth: AuthContext, boardId?: string): Promise<FieldDefinitionDto[]> {
    const rows = await prisma.fieldDefinition.findMany({
      where: {
        organizationId: auth.organizationId,
        ...(boardId ? { OR: [{ boardId }, { boardId: null }] } : {}),
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      boardId: row.boardId,
      key: row.key,
      label: row.label,
      type: row.type,
      config: (row.config as FieldDefinitionDto['config']) ?? null,
      position: row.position,
    }));
  },

  async create(auth: AuthContext, input: CreateFieldInput): Promise<FieldDefinitionDto> {
    const key = toKey(input.label);
    if (key === '') throw AppError.badRequest('Give the field a name with letters or numbers');

    if (input.type === 'SELECT' && (input.config?.options?.length ?? 0) === 0) {
      throw AppError.badRequest('A select field needs at least one option', [
        { field: 'config', message: 'Add options' },
      ]);
    }

    const clash = await prisma.fieldDefinition.findFirst({
      where: { organizationId: auth.organizationId, boardId: input.boardId ?? null, key },
    });
    if (clash) throw AppError.conflict('A field with that name already exists here');

    const count = await prisma.fieldDefinition.count({
      where: { organizationId: auth.organizationId, boardId: input.boardId ?? null },
    });

    const row = await prisma.fieldDefinition.create({
      data: {
        organizationId: auth.organizationId,
        boardId: input.boardId ?? null,
        key,
        label: input.label,
        type: input.type,
        config: input.config ?? {},
        position: count,
      },
    });

    return {
      id: row.id,
      boardId: row.boardId,
      key: row.key,
      label: row.label,
      type: row.type,
      config: (row.config as FieldDefinitionDto['config']) ?? null,
      position: row.position,
    };
  },

  async remove(auth: AuthContext, id: string): Promise<void> {
    const row = await prisma.fieldDefinition.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!row) throw AppError.notFound('Field');
    await prisma.fieldDefinition.delete({ where: { id } });
  },

  /** Values for a whole board in one query, keyed by item then field. */
  async valuesForBoard(
    auth: AuthContext,
    boardId: string,
  ): Promise<Record<string, Record<string, unknown>>> {
    const rows = await prisma.fieldValue.findMany({
      where: {
        item: {
          boardId,
          deletedAt: null,
          board: { workspace: { organizationId: auth.organizationId } },
        },
      },
      select: { itemId: true, fieldId: true, value: true },
    });

    const byItem: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      byItem[row.itemId] = { ...(byItem[row.itemId] ?? {}), [row.fieldId]: row.value };
    }
    return byItem;
  },

  async setValue(
    auth: AuthContext,
    itemId: string,
    fieldId: string,
    value: unknown,
  ): Promise<void> {
    await itemsService.getOrFail(auth, itemId);

    const field = await prisma.fieldDefinition.findFirst({
      where: { id: fieldId, organizationId: auth.organizationId },
    });
    if (!field) throw AppError.notFound('Field');

    await prisma.fieldValue.upsert({
      where: { itemId_fieldId: { itemId, fieldId } },
      create: { itemId, fieldId, value: value as never },
      update: { value: value as never },
    });
  },
};

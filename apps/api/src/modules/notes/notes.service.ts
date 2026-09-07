import type { CreateNoteInput, ListNotesQuery, NoteDto, UpdateNoteInput } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';

function toDto(row: {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}): NoteDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Notes are the one thing here that is nobody else's business.
 *
 * Every query is keyed on the author, not on a visibility filter, and there is
 * no branch that widens it - not for a manager, an admin, or the owner. The
 * rest of the product answers "who is allowed to see this work"; a notebook
 * answers "whose is it", and the answer is only ever one person.
 */
const ownedBy = (auth: AuthContext) => ({
  authorId: auth.userId,
  organizationId: auth.organizationId,
  deletedAt: null,
});

export const notesService = {
  async list(auth: AuthContext, query: ListNotesQuery): Promise<NoteDto[]> {
    const search = query.search?.trim();

    const rows = await prisma.note.findMany({
      where: {
        ...ownedBy(auth),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { body: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      // Pinned first, then whatever was touched most recently - which is almost
      // always the one being come back to.
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });

    return rows.map(toDto);
  },

  async getOrFail(auth: AuthContext, id: string) {
    const row = await prisma.note.findFirst({ where: { id, ...ownedBy(auth) } });
    if (!row) throw AppError.notFound('Note');
    return row;
  },

  async create(auth: AuthContext, input: CreateNoteInput): Promise<NoteDto> {
    const row = await prisma.note.create({
      data: {
        organizationId: auth.organizationId,
        authorId: auth.userId,
        title: input.title,
        body: input.body,
        pinned: input.pinned,
      },
    });

    return toDto(row);
  },

  async update(auth: AuthContext, id: string, input: UpdateNoteInput): Promise<NoteDto> {
    await this.getOrFail(auth, id);

    const row = await prisma.note.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
      },
    });

    return toDto(row);
  },

  /**
   * Soft, like everything else that can be deleted here. A note removed by a
   * mis-click is recoverable in the database rather than gone.
   */
  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.getOrFail(auth, id);
    await prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};

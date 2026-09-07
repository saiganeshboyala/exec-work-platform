import type { CreateNoteInput, ListNotesQuery, NoteDto, UpdateNoteInput } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { itemsService } from '@/modules/items';

const withItem = { item: { select: { id: true, title: true, deletedAt: true } } } as const;

function toDto(row: {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  itemId: string | null;
  item?: { id: string; title: string; deletedAt: Date | null } | null;
  createdAt: Date;
  updatedAt: Date;
}): NoteDto {
  // A deleted task is not one to link to any more, so the note reads as
  // unlinked rather than pointing at something that will not open.
  const linked = row.item && row.item.deletedAt === null ? row.item : null;

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    itemId: linked?.id ?? null,
    itemTitle: linked?.title ?? null,
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
      include: withItem,
    });

    return rows.map(toDto);
  },

  async getOrFail(auth: AuthContext, id: string) {
    const row = await prisma.note.findFirst({ where: { id, ...ownedBy(auth) } });
    if (!row) throw AppError.notFound('Note');
    return row;
  },

  /**
   * Checks a task may be linked before it is written on a note.
   *
   * Through itemsService, so it is the same visibility rule the rest of the
   * product applies: you can only attach a note to work you could already open.
   * Otherwise the note's own title field would confirm whether a guessed id
   * exists.
   */
  async assertLinkable(auth: AuthContext, itemId: string | null | undefined): Promise<void> {
    if (!itemId) return;
    await itemsService.getOrFail(auth, itemId);
  },

  async create(auth: AuthContext, input: CreateNoteInput): Promise<NoteDto> {
    await this.assertLinkable(auth, input.itemId);

    const row = await prisma.note.create({
      data: {
        organizationId: auth.organizationId,
        authorId: auth.userId,
        title: input.title,
        body: input.body,
        pinned: input.pinned,
        itemId: input.itemId ?? null,
      },
      include: withItem,
    });

    return toDto(row);
  },

  async update(auth: AuthContext, id: string, input: UpdateNoteInput): Promise<NoteDto> {
    await this.getOrFail(auth, id);
    await this.assertLinkable(auth, input.itemId);

    const row = await prisma.note.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        // Explicit null unlinks; absent leaves it alone. Both are meaningful,
        // so this reads `undefined` rather than falsiness.
        ...(input.itemId !== undefined ? { itemId: input.itemId } : {}),
      },
      include: withItem,
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

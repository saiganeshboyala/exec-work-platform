import type { CommentDto, CreateCommentInput } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { activityService } from '@/modules/activity';
import { itemsService } from '@/modules/items';
import { notificationsService } from '@/modules/notifications';

type Row = {
  id: string;
  itemId: string;
  body: string;
  mentionedIds: string[];
  editedAt: Date | null;
  createdAt: Date;
  author: { id: string; fullName: string };
};

function toDto(row: Row): CommentDto {
  return {
    id: row.id,
    itemId: row.itemId,
    body: row.body,
    author: row.author,
    mentionedIds: row.mentionedIds,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Mentions are written as `@[Full Name](userId)` by the composer. Resolving
 * them at write time means notifying is a lookup rather than a re-parse, and
 * a later rename cannot silently break the link.
 */
function extractMentions(body: string): string[] {
  const pattern = /@\[[^\]]+\]\(([0-9a-fA-F-]{36})\)/g;
  const ids = new Set<string>();
  for (const match of body.matchAll(pattern)) if (match[1]) ids.add(match[1]);
  return [...ids];
}

/** Turns the machine form into what a human should read in a notification. */
export function stripMentionMarkup(body: string): string {
  return body.replace(/@\[([^\]]+)\]\([0-9a-fA-F-]{36}\)/g, '@$1');
}

export const commentsService = {
  async list(auth: AuthContext, itemId: string): Promise<CommentDto[]> {
    // Reuse the item's own tenant check rather than trusting the id.
    await itemsService.getOrFail(auth, itemId);

    const rows = await prisma.comment.findMany({
      where: { itemId, deletedAt: null },
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDto);
  },

  async create(
    auth: AuthContext,
    input: CreateCommentInput,
    requestId: string,
  ): Promise<CommentDto> {
    const item = await itemsService.getOrFail(auth, input.itemId);
    const mentionedIds = extractMentions(input.body);

    // Never let a crafted body address somebody outside the tenant.
    const valid = await prisma.membership.findMany({
      where: { organizationId: auth.organizationId, userId: { in: mentionedIds } },
      select: { userId: true },
    });
    const allowedMentions = valid.map((membership) => membership.userId);

    const row = await prisma.comment.create({
      data: {
        organizationId: auth.organizationId,
        itemId: input.itemId,
        authorId: auth.userId,
        body: input.body,
        mentionedIds: allowedMentions,
      },
      include: { author: { select: { id: true, fullName: true } } },
    });

    await activityService.record({
      organizationId: auth.organizationId,
      actorId: auth.userId,
      entityType: 'Item',
      entityId: input.itemId,
      verb: 'COMMENTED',
      after: { commentId: row.id },
      requestId,
    });

    // The owner hears about every comment; mentions are notified explicitly.
    const recipients = new Set(allowedMentions);
    if (item.ownerId) recipients.add(item.ownerId);
    recipients.delete(auth.userId);

    if (recipients.size > 0) {
      await notificationsService.notify({
        organizationId: auth.organizationId,
        userIds: [...recipients],
        title: `${row.author.fullName} commented`,
        body: stripMentionMarkup(input.body).slice(0, 200),
        url: `/boards/${item.boardId}?item=${input.itemId}`,
      });
    }

    return toDto(row);
  },

  async remove(auth: AuthContext, id: string): Promise<void> {
    const row = await prisma.comment.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!row) throw AppError.notFound('Comment');
    if (row.authorId !== auth.userId) {
      throw AppError.forbidden('You can only delete your own comments');
    }

    await prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};

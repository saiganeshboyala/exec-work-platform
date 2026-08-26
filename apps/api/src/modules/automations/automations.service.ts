import type {
  AutomationDto,
  CreateAutomationInput,
  UpdateAutomationInput,
} from '@ewp/contracts';
import type { AutomationAction, AutomationTrigger, Item } from '@prisma/client';

import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';
import type { AuthContext } from '@/common/types/express';
import { prisma } from '@/database';
import { notificationsService } from '@/modules/notifications';

type Row = {
  id: string;
  boardId: string | null;
  name: string;
  trigger: AutomationTrigger;
  condition: unknown;
  action: AutomationAction;
  actionConfig: unknown;
  enabled: boolean;
  lastRunAt: Date | null;
  runCount: number;
};

function toDto(row: Row): AutomationDto {
  return {
    id: row.id,
    boardId: row.boardId,
    name: row.name,
    trigger: row.trigger,
    condition: (row.condition as Record<string, unknown> | null) ?? null,
    action: row.action,
    actionConfig: (row.actionConfig as Record<string, unknown> | null) ?? null,
    enabled: row.enabled,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    runCount: row.runCount,
  };
}

export const automationsService = {
  async list(auth: AuthContext, boardId?: string): Promise<AutomationDto[]> {
    const rows = await prisma.automation.findMany({
      where: {
        organizationId: auth.organizationId,
        ...(boardId ? { OR: [{ boardId }, { boardId: null }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  },

  async create(auth: AuthContext, input: CreateAutomationInput): Promise<AutomationDto> {
    const row = await prisma.automation.create({
      data: {
        organizationId: auth.organizationId,
        boardId: input.boardId ?? null,
        name: input.name,
        trigger: input.trigger,
        condition: input.condition ?? {},
        action: input.action,
        actionConfig: input.actionConfig ?? {},
        enabled: input.enabled,
        createdById: auth.userId,
      },
    });
    return toDto(row);
  },

  async update(auth: AuthContext, id: string, input: UpdateAutomationInput): Promise<AutomationDto> {
    await this.getOrFail(auth, id);
    const row = await prisma.automation.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.trigger === undefined ? {} : { trigger: input.trigger }),
        ...(input.condition === undefined ? {} : { condition: input.condition }),
        ...(input.action === undefined ? {} : { action: input.action }),
        ...(input.actionConfig === undefined ? {} : { actionConfig: input.actionConfig }),
        ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      },
    });
    return toDto(row);
  },

  async remove(auth: AuthContext, id: string): Promise<void> {
    await this.getOrFail(auth, id);
    await prisma.automation.delete({ where: { id } });
  },

  async getOrFail(auth: AuthContext, id: string) {
    const row = await prisma.automation.findFirst({
      where: { id, organizationId: auth.organizationId },
    });
    if (!row) throw AppError.notFound('Automation');
    return row;
  },

  /**
   * Runs every rule matching a trigger. Called after the change that caused it
   * has already been committed, and never allowed to throw: an automation is
   * an assistant, not a gatekeeper, so a broken rule must not block real work.
   */
  async run(
    organizationId: string,
    trigger: AutomationTrigger,
    item: Pick<Item, 'id' | 'boardId' | 'title' | 'status' | 'priority' | 'ownerId'>,
    previous?: { status?: string; ownerId?: string | null },
  ): Promise<void> {
    try {
      const rules = await prisma.automation.findMany({
        where: {
          organizationId,
          enabled: true,
          trigger,
          OR: [{ boardId: item.boardId }, { boardId: null }],
        },
      });

      for (const rule of rules) {
        const condition = (rule.condition ?? {}) as { status?: string; priority?: string };

        if (condition.status && item.status !== condition.status) continue;
        if (condition.priority && item.priority !== condition.priority) continue;
        // Only fire on an actual transition into the wanted state.
        if (trigger === 'STATUS_CHANGED' && previous?.status === item.status) continue;

        await applyAction(rule, item, organizationId);

        await prisma.automation.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date(), runCount: { increment: 1 } },
        });
      }
    } catch (error) {
      logger.error({ err: error, itemId: item.id, trigger }, 'Automation run failed');
    }
  },
};

async function applyAction(
  rule: { id: string; name: string; action: AutomationAction; actionConfig: unknown },
  item: Pick<Item, 'id' | 'boardId' | 'title' | 'ownerId'>,
  organizationId: string,
): Promise<void> {
  const config = (rule.actionConfig ?? {}) as {
    userId?: string;
    status?: string;
    priority?: string;
    message?: string;
  };

  switch (rule.action) {
    case 'NOTIFY_OWNER':
      if (!item.ownerId) return;
      await notificationsService.notify({
        organizationId,
        userIds: [item.ownerId],
        title: rule.name,
        body: config.message ?? item.title,
        url: `/boards/${item.boardId}`,
      });
      return;

    case 'NOTIFY_USER':
      if (!config.userId) return;
      await notificationsService.notify({
        organizationId,
        userIds: [config.userId],
        title: rule.name,
        body: config.message ?? item.title,
        url: `/boards/${item.boardId}`,
      });
      return;

    case 'SET_STATUS':
      if (!config.status) return;
      await prisma.item.update({
        where: { id: item.id },
        data: { status: config.status as Item['status'] },
      });
      return;

    case 'SET_PRIORITY':
      if (!config.priority) return;
      await prisma.item.update({
        where: { id: item.id },
        data: { priority: config.priority as Item['priority'] },
      });
      return;

    case 'ASSIGN_OWNER':
      if (!config.userId) return;
      await prisma.item.update({ where: { id: item.id }, data: { ownerId: config.userId } });
      return;

    default:
      return;
  }
}

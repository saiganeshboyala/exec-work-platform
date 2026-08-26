import type {
  ListMeetingsQuery,
  MeetingConflictQuery,
  RecordDecisionInput,
  ScheduleMeetingInput,
} from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { meetingsService } from './meetings.service';

export const meetingsController = {
  async listUpcoming(req: Request, res: Response): Promise<void> {
    sendOk(res, await meetingsService.listUpcoming(requireAuth(req)));
  },

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListMeetingsQuery;
    sendOk(
      res,
      await meetingsService.listInRange(
        requireAuth(req),
        query.from,
        query.to,
        query.workspaceId,
      ),
    );
  },

  async conflicts(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as MeetingConflictQuery;
    sendOk(
      res,
      await meetingsService.findConflicts(
        requireAuth(req),
        query.startsAt,
        query.endsAt,
        query.attendeeIds,
        query.excludeMeetingId,
      ),
    );
  },

  async schedule(req: Request, res: Response): Promise<void> {
    sendCreated(
      res,
      await meetingsService.schedule(
        requireAuth(req),
        req.body as ScheduleMeetingInput,
        req.requestId,
      ),
    );
  },

  async recordDecision(req: Request, res: Response): Promise<void> {
    sendCreated(
      res,
      await meetingsService.recordDecision(
        requireAuth(req),
        req.params.id as string,
        req.body as RecordDecisionInput,
        req.requestId,
      ),
    );
  },
};

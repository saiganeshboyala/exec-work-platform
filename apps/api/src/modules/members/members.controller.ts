import type {
  AcceptInvitationInput,
  ApproveMemberInput,
  ChangeRoleInput,
  InviteMemberInput,
} from '@ewp/contracts';
import type { Request, Response } from 'express';

import { sendCreated, sendNoContent, sendOk } from '@/common/http';
import { requireAuth } from '@/common/middleware';

import { membersService } from './members.service';

export const membersController = {
  async listPending(req: Request, res: Response): Promise<void> {
    sendOk(res, await membersService.listPending(requireAuth(req)));
  },

  async approve(req: Request, res: Response): Promise<void> {
    sendOk(
      res,
      await membersService.approve(
        requireAuth(req),
        req.params.userId as string,
        req.body as ApproveMemberInput,
        req.requestId,
      ),
    );
  },

  async reject(req: Request, res: Response): Promise<void> {
    await membersService.reject(requireAuth(req), req.params.userId as string, req.requestId);
    sendNoContent(res);
  },

  async list(req: Request, res: Response): Promise<void> {
    sendOk(res, await membersService.list(requireAuth(req)));
  },

  async listInvitations(req: Request, res: Response): Promise<void> {
    sendOk(res, await membersService.listInvitations(requireAuth(req)));
  },

  async invite(req: Request, res: Response): Promise<void> {
    sendCreated(
      res,
      await membersService.invite(requireAuth(req), req.body as InviteMemberInput, req.requestId),
    );
  },

  async revokeInvitation(req: Request, res: Response): Promise<void> {
    await membersService.revokeInvitation(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  },

  /** Public: the recipient has no session yet, the token is the credential. */
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    sendOk(res, await membersService.acceptInvitation(req.body as AcceptInvitationInput));
  },

  async changeRole(req: Request, res: Response): Promise<void> {
    sendOk(
      res,
      await membersService.changeRole(
        requireAuth(req),
        req.params.userId as string,
        req.body as ChangeRoleInput,
        req.requestId,
      ),
    );
  },

  async remove(req: Request, res: Response): Promise<void> {
    await membersService.remove(requireAuth(req), req.params.userId as string, req.requestId);
    sendNoContent(res);
  },
};

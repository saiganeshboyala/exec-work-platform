import { createFieldSchema, grantAccessSchema, setFieldValueSchema } from '@ewp/contracts';
import { Router, type Request, type Response } from 'express';

import { asyncHandler, sendCreated, sendNoContent, sendOk } from '@/common/http';
import { authenticate, authorize, requireAuth, validate } from '@/common/middleware';

import { accessService } from './access.service';
import { fieldsService } from './fields.service';
import { insightsService } from './insights.service';

export const adminRouter = Router();

adminRouter.use(authenticate);

/* ---- Custom fields ------------------------------------------------------ */

adminRouter.get(
  '/fields',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const boardId = typeof req.query.boardId === 'string' ? req.query.boardId : undefined;
    sendOk(res, await fieldsService.list(requireAuth(req), boardId));
  }),
);

adminRouter.post(
  '/fields',
  authorize('ADMIN'),
  validate(createFieldSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await fieldsService.create(requireAuth(req), req.body));
  }),
);

adminRouter.delete(
  '/fields/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    await fieldsService.remove(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);

adminRouter.get(
  '/fields/values',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    sendOk(res, await fieldsService.valuesForBoard(requireAuth(req), String(req.query.boardId ?? '')));
  }),
);

adminRouter.post(
  '/fields/values',
  authorize('MEMBER'),
  validate(setFieldValueSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { itemId, fieldId, value } = req.body as {
      itemId: string;
      fieldId: string;
      value: unknown;
    };
    await fieldsService.setValue(requireAuth(req), itemId, fieldId, value);
    sendNoContent(res);
  }),
);

/* ---- Insights ----------------------------------------------------------- */

// A tally of everybody's open work, which is exactly what an admin is not
// supposed to see. Whole-organisation reports belong to the owner alone.
adminRouter.get(
  '/workload',
  authorize('OWNER'),
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = typeof req.query.workspaceId === 'string' ? req.query.workspaceId : undefined;
    sendOk(res, await insightsService.workload(requireAuth(req), workspaceId));
  }),
);

adminRouter.get(
  '/audit',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;
    sendOk(res, await insightsService.activity(requireAuth(req), { entityId, take }));
  }),
);

adminRouter.get(
  '/export/board/:boardId.csv',
  authorize('VIEWER'),
  asyncHandler(async (req: Request, res: Response) => {
    const boardId = req.params.boardId as string;
    const csv = await insightsService.exportBoardCsv(requireAuth(req), boardId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="board-${boardId}.csv"`);
    res.send(csv);
  }),
);

/* ---- Scoped access ------------------------------------------------------ */

adminRouter.get(
  '/access',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    sendOk(res, await accessService.list(requireAuth(req)));
  }),
);

adminRouter.post(
  '/access',
  authorize('ADMIN'),
  validate(grantAccessSchema),
  asyncHandler(async (req: Request, res: Response) => {
    sendCreated(res, await accessService.grant(requireAuth(req), req.body));
  }),
);

adminRouter.delete(
  '/access/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    await accessService.revoke(requireAuth(req), req.params.id as string);
    sendNoContent(res);
  }),
);

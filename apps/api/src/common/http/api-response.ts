import type { ApiFailure, ApiSuccess, PageMeta } from '@ewp/contracts';
import type { Response } from 'express';

import type { FieldIssue } from '@/common/errors';

/**
 * Every controller returns through these helpers. Consistent envelopes are the
 * reason the web client needs exactly one response handler.
 */
export function sendOk<T>(res: Response, data: T, status = 200, meta?: PageMeta): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    requestId: res.locals.requestId,
    ...(meta ? { meta } : {}),
  };
  res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendOk(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: FieldIssue[],
): void {
  const body: ApiFailure = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    requestId: res.locals.requestId,
  };
  res.status(status).json(body);
}

export function buildPageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

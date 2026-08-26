import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

import { AppError, ErrorCode } from '@/common/errors';
import { sendError } from '@/common/http';
import { logger } from '@/common/logger';
import { isProduction } from '@/config';

/** 404 for anything the router did not match. */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, ErrorCode.NOT_FOUND, `No route for ${req.method} ${req.originalUrl}`);
}

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case 'P2002':
      return AppError.conflict('That value is already taken');
    case 'P2003':
      return AppError.badRequest('A referenced record does not exist');
    case 'P2025':
      return AppError.notFound('Record');
    default:
      return AppError.internal();
  }
}

/**
 * The single exit point for every failure. Operational errors are returned as
 * they are; anything else is logged with its stack and reported as a generic
 * 500 so internals never leak to the client.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrisma(error);
  } else {
    appError = AppError.internal();
  }

  const log = { requestId: req.requestId, method: req.method, path: req.originalUrl, err: error };

  if (appError.statusCode >= 500) {
    logger.error(log, 'Unhandled request failure');
  } else {
    logger.warn(log, appError.message);
  }

  const message =
    appError.statusCode >= 500 && isProduction ? 'Something went wrong on our side' : appError.message;

  sendError(res, appError.statusCode, appError.code, message, appError.details);
}

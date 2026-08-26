import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

import { AppError, type FieldIssue } from '@/common/errors';

type Source = 'body' | 'query' | 'params';

function toFieldIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

/**
 * Validates and *replaces* the request segment with the parsed result, so
 * handlers receive coerced, trimmed, correctly typed values - never raw input.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(AppError.badRequest('Check the highlighted fields', toFieldIssues(result.error)));
      return;
    }

    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}

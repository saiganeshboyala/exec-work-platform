import { ErrorCode, type ErrorCodeValue } from './error-codes';

export interface FieldIssue {
  field: string;
  message: string;
}

/**
 * The only error type controllers and services are allowed to throw on purpose.
 * Anything else reaching the error handler is treated as a bug and reported as
 * INTERNAL_ERROR with the details hidden from the client.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCodeValue;
  readonly details?: FieldIssue[];
  readonly isOperational = true;

  constructor(statusCode: number, code: ErrorCodeValue, message: string, details?: FieldIssue[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, AppError);
  }

  static badRequest(message: string, details?: FieldIssue[]): AppError {
    return new AppError(400, ErrorCode.VALIDATION_FAILED, message, details);
  }

  static unauthenticated(message = 'Sign in to continue'): AppError {
    return new AppError(401, ErrorCode.UNAUTHENTICATED, message);
  }

  static invalidCredentials(): AppError {
    // Deliberately vague: never reveal whether the address exists.
    return new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'That email or password is wrong');
  }

  static forbidden(message = 'Your role does not allow this'): AppError {
    return new AppError(403, ErrorCode.FORBIDDEN, message);
  }

  static notFound(resource: string): AppError {
    return new AppError(404, ErrorCode.NOT_FOUND, `${resource} not found`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, ErrorCode.CONFLICT, message);
  }

  static invitationInvalid(message = 'That invitation is no longer valid'): AppError {
    return new AppError(410, ErrorCode.INVITATION_INVALID, message);
  }

  static internal(message = 'Something went wrong on our side'): AppError {
    return new AppError(500, ErrorCode.INTERNAL_ERROR, message);
  }
}

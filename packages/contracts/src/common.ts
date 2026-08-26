import { z } from 'zod';

export const idSchema = z.string().uuid();
export const emailSchema = z.string().email().max(254).toLowerCase().trim();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Every successful API response has this envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
  requestId: string;
}

/** Every failed API response has this envelope. */
export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

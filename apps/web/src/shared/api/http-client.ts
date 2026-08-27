import type { ApiResponse } from '@ewp/contracts';

import { config } from '@/shared/config/env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Array<{ field: string; message: string }>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field errors keyed by field name, ready to hand to a form. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.details ?? []).map((d) => [d.field, d.message]));
  }
}

let accessToken: string | null = null;
let onUnauthenticated: (() => void) | null = null;
let refreshSession: (() => Promise<string | null>) | null = null;

/** One refresh at a time: ten queries expiring together must not send ten. */
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthenticatedHandler(handler: () => void): void {
  onUnauthenticated = handler;
}

/**
 * How to mint a new access token. Set by the auth provider, which owns the
 * refresh token; without it a 401 can only end the session.
 */
export function setSessionRefresher(refresher: (() => Promise<string | null>) | null): void {
  refreshSession = refresher;
}

async function refreshOnce(): Promise<string | null> {
  refreshInFlight ??= (refreshSession?.() ?? Promise.resolve(null)).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

/**
 * The only place fetch is called. Every response is unwrapped from the API
 * envelope here, so features receive plain data or an ApiError - never both.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  /** Set on the one retry after a refresh, so a bad token cannot loop. */
  isRetry = false,
): Promise<T> {
  const url = new URL(`${config.apiBaseUrl}${config.apiPrefix}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    // An access token lasts 15 minutes; a session lasts weeks. Expiring the
    // first should mint another, not throw somebody out mid-sentence.
    if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
      const token = await refreshOnce();
      if (token) {
        accessToken = token;
        return apiRequest<T>(path, options, true);
      }
    }

    if (response.status === 401) onUnauthenticated?.();
    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
      payload.requestId,
    );
  }

  return payload.data;
}

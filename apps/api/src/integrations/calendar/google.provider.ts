import { randomUUID } from 'node:crypto';

import { AppError } from '@/common/errors';
import { logger } from '@/common/logger';
import { env } from '@/config';
import { prisma } from '@/database';

import type { CalendarEvent, CalendarEventInput, CalendarProvider } from './calendar.types';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

/** The one scope that actually lets us write events; the rest are identity. */
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/** Calendar write access plus the email address, so we can show who is connected. */
const SCOPES = [CALENDAR_SCOPE, 'openid', 'email'];

/**
 * Google needs a zone to expand a recurrence rule against, and refuses the
 * event without one. This is the clock the deployment books against, used when
 * a caller does not name one.
 */
const DEFAULT_TIME_ZONE = 'America/Regina';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  /** Space-separated list of what Google actually granted, which can be less
   *  than what we asked for. */
  scope?: string;
}

/** True when the server actually has credentials to talk to Google. */
export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

function requireCredentials(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!isGoogleConfigured()) {
    throw AppError.badRequest(
      'Google Calendar is not configured on this server. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.',
    );
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID as string,
    clientSecret: env.GOOGLE_CLIENT_SECRET as string,
    redirectUri: env.GOOGLE_REDIRECT_URI as string,
  };
}

/**
 * The consent URL. `state` carries the user id so the callback knows whose
 * calendar it is attaching, and access_type=offline is what makes Google issue
 * the refresh token we store.
 */
export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = requireCredentials();

  const url = new URL(OAUTH_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return url.toString();
}

async function postForm(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!response.ok) {
    const detail = await response.text();
    logger.error({ status: response.status, detail }, 'Google token exchange failed');
    throw AppError.badRequest('Google rejected the authorisation. Try connecting again.');
  }

  return (await response.json()) as TokenResponse;
}

/** Exchanges the one-time code for tokens and stores them against the user. */
export async function completeOAuth(
  code: string,
  userId: string,
  organizationId: string,
): Promise<void> {
  const { clientId, clientSecret, redirectUri } = requireCredentials();

  const tokens = await postForm({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (!tokens.refresh_token) {
    throw AppError.badRequest(
      'Google did not return a refresh token. Remove this app from your Google account permissions and connect again.',
    );
  }

  // Google grants only the scopes registered on the consent screen, quietly
  // dropping the rest. Without this check the connection looks healthy and then
  // every event creation fails with "insufficient authentication scopes".
  const granted = (tokens.scope ?? '').split(' ');
  if (!granted.includes(CALENDAR_SCOPE)) {
    logger.error({ granted, userId }, 'Google withheld the calendar scope');
    throw AppError.badRequest(
      'Google did not grant calendar access, so meetings could not get a Meet link. ' +
        `Add the ${CALENDAR_SCOPE} scope under APIs & Services -> OAuth consent screen -> Data access ` +
        'in Google Cloud, check the Google Calendar API is enabled, then connect again.',
    );
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.calendarConnection.upsert({
    where: { userId },
    create: {
      userId,
      organizationId,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      provider: 'google',
    },
  });
}

/** Returns a valid access token, refreshing it first if it is close to expiry. */
async function accessTokenFor(userId: string): Promise<string> {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection) throw AppError.badRequest('Connect your Google Calendar first');

  // Refresh a minute early rather than racing the expiry.
  if (connection.expiresAt.getTime() - 60_000 > Date.now()) return connection.accessToken;

  const { clientId, clientSecret } = requireCredentials();
  const refreshed = await postForm({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: connection.refreshToken,
    grant_type: 'refresh_token',
  });

  await prisma.calendarConnection.update({
    where: { userId },
    data: {
      accessToken: refreshed.access_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });

  return refreshed.access_token;
}

export async function connectedEmail(userId: string): Promise<string | null> {
  const connection = await prisma.calendarConnection.findUnique({ where: { userId } });
  if (!connection) return null;

  try {
    const token = await accessTokenFor(userId);
    const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const profile = (await response.json()) as { email?: string };
    return profile.email ?? null;
  } catch (error) {
    logger.warn({ err: error, userId }, 'Could not read the connected Google account');
    return null;
  }
}

/**
 * Whether the stored grant can actually write events. A connection made before
 * the scope was registered on the consent screen looks fine but cannot create
 * anything, so the Meetings page needs to be able to say so.
 */
export async function hasCalendarScope(userId: string): Promise<boolean> {
  try {
    const token = await accessTokenFor(userId);
    const response = await fetch(`${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`);
    if (!response.ok) return false;

    const info = (await response.json()) as { scope?: string };
    return (info.scope ?? '').split(' ').includes(CALENDAR_SCOPE);
  } catch (error) {
    logger.warn({ err: error, userId }, 'Could not read the granted Google scopes');
    return false;
  }
}

export async function disconnect(userId: string): Promise<void> {
  await prisma.calendarConnection.deleteMany({ where: { userId } });
}

/**
 * Google Calendar adapter. Events are created as the organiser, so the meeting
 * lands in their real calendar and Google mints the Meet link for us.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = 'google';

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    if (!input.organizerUserId) {
      throw AppError.internal('Google Calendar needs to know which user is organising');
    }

    const token = await accessTokenFor(input.organizerUserId);

    const url = new URL(`${CALENDAR_API}/calendars/primary/events`);
    // Required for Google to allocate a Meet link.
    url.searchParams.set('conferenceDataVersion', '1');
    url.searchParams.set('sendUpdates', 'all');

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        location: input.location,
        start: {
          dateTime: input.startsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
        end: {
          dateTime: input.endsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
        attendees: input.attendeeEmails.map((email) => ({ email })),
        // Present for a repeat: Google then owns the whole series as one
        // event, and invites everybody once instead of once per occurrence.
        ...(input.recurrence?.length ? { recurrence: input.recurrence } : {}),
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      logger.error({ status: response.status, detail }, 'Google event creation failed');

      // Google's own wording is the useful part - "Invalid attendee email" tells
      // you what to fix, "rejected the event" does not.
      let reason = detail;
      try {
        const parsed = JSON.parse(detail) as { error?: { message?: string } };
        reason = parsed.error?.message ?? detail;
      } catch {
        /* not JSON; the raw body is still better than nothing */
      }

      throw AppError.badRequest(
        `Google Calendar rejected the event (${response.status}): ${reason.slice(0, 300)}`,
      );
    }

    const event = (await response.json()) as {
      id: string;
      hangoutLink?: string;
      htmlLink?: string;
    };

    return { externalId: event.id, joinUrl: event.hangoutLink ?? event.htmlLink ?? null };
  }

  async updateEvent(
    externalId: string,
    input: { title: string; startsAt: Date; endsAt: Date; timeZone?: string },
    organizerUserId?: string,
  ): Promise<void> {
    if (!organizerUserId) {
      throw AppError.internal('Google Calendar needs to know whose event to move');
    }

    const token = await accessTokenFor(organizerUserId);
    const url = new URL(`${CALENDAR_API}/calendars/primary/events/${externalId}`);
    url.searchParams.set('sendUpdates', 'all');

    // PATCH, so conferenceData is left alone and the Meet link survives.
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: input.title,
        start: {
          dateTime: input.startsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
        end: {
          dateTime: input.endsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      logger.error({ status: response.status, detail }, 'Google event update failed');
      throw AppError.badRequest(`Google Calendar rejected the change (${response.status})`);
    }
  }

  /**
   * Finds one occurrence of a recurring event by the time it was originally due
   * to start. Google gives each instance its own id, and that id is what has to
   * be patched to touch a single week.
   */
  private async findInstanceId(
    externalId: string,
    originalStartsAt: Date,
    token: string,
  ): Promise<string | null> {
    const url = new URL(`${CALENDAR_API}/calendars/primary/events/${externalId}/instances`);
    // A minute either side: enough to match the occurrence, narrow enough not
    // to catch its neighbours.
    url.searchParams.set('timeMin', new Date(originalStartsAt.getTime() - 60_000).toISOString());
    url.searchParams.set('timeMax', new Date(originalStartsAt.getTime() + 60_000).toISOString());

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      logger.error(
        { status: response.status, externalId },
        'Could not list the instances of a recurring event',
      );
      return null;
    }

    const body = (await response.json()) as { items?: Array<{ id: string }> };
    return body.items?.[0]?.id ?? null;
  }

  private async patchInstance(
    externalId: string,
    originalStartsAt: Date,
    body: Record<string, unknown>,
    organizerUserId: string | undefined,
    what: string,
  ): Promise<void> {
    if (!organizerUserId) throw AppError.internal('Google Calendar needs to know whose event it is');

    const token = await accessTokenFor(organizerUserId);
    const instanceId = await this.findInstanceId(externalId, originalStartsAt, token);
    if (!instanceId) {
      logger.error({ externalId, originalStartsAt }, `No instance found to ${what}`);
      return;
    }

    const url = new URL(`${CALENDAR_API}/calendars/primary/events/${instanceId}`);
    url.searchParams.set('sendUpdates', 'all');

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text();
      logger.error({ status: response.status, detail, instanceId }, `Google refused to ${what}`);
      throw AppError.badRequest(`Google Calendar rejected the change (${response.status})`);
    }
  }

  async cancelInstance(
    externalId: string,
    originalStartsAt: Date,
    organizerUserId?: string,
  ): Promise<void> {
    await this.patchInstance(
      externalId,
      originalStartsAt,
      { status: 'cancelled' },
      organizerUserId,
      'cancel one occurrence',
    );
  }

  async updateInstance(
    externalId: string,
    originalStartsAt: Date,
    input: { title: string; startsAt: Date; endsAt: Date; timeZone?: string },
    organizerUserId?: string,
  ): Promise<void> {
    await this.patchInstance(
      externalId,
      originalStartsAt,
      {
        summary: input.title,
        start: {
          dateTime: input.startsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
        end: {
          dateTime: input.endsAt.toISOString(),
          timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
        },
      },
      organizerUserId,
      'move one occurrence',
    );
  }

  async cancelEvent(externalId: string, organizerUserId?: string): Promise<void> {
    if (!organizerUserId) return;

    const token = await accessTokenFor(organizerUserId);

    const url = new URL(`${CALENDAR_API}/calendars/primary/events/${externalId}`);
    // Google does not tell anybody by default when an event is deleted, so
    // without this the meeting simply disappears from their calendar and the
    // first they know of it is the empty slot.
    url.searchParams.set('sendUpdates', 'all');

    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    // 410 means Google already considers it gone, which is the outcome we want.
    if (!response.ok && response.status !== 410 && response.status !== 404) {
      logger.error({ status: response.status, externalId }, 'Google event cancellation failed');
    }
  }
}

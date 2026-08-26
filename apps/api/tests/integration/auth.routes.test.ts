import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';

/**
 * Integration tests run against the app object, not a listening server, so they
 * need no free port. They do need the test database from docker compose.
 */
describe('POST /api/v1/auth/register', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it('rejects a weak password with field-level detail', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      organizationName: 'Test Co',
      fullName: 'Test Person',
      email: 'someone@example.com',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'password')).toBe(true);
  });

  it('returns a request id on every response', async () => {
    const response = await request(app).get('/api/v1/health/live');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });

  it('answers 404 in the standard envelope for unknown routes', async () => {
    const response = await request(app).get('/api/v1/nope');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

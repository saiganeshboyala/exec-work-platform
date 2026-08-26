import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `src/config/env.ts` validates the environment at import time and exits the
 * process when something is missing, so the variables have to exist before any
 * test file imports the app. Prefers .env.test so a test run cannot be pointed
 * at a development database by accident.
 */
const candidates = ['.env.test', '.env'].map((name) => resolve(process.cwd(), name));
const found = candidates.find((path) => existsSync(path));

if (found) process.loadEnvFile(found);

// Defaults that let unit tests run with no env file at all.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/ewp_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-that-is-at-least-32-chars';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-chars';

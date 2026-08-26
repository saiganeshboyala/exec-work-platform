import { describe, expect, it } from 'vitest';

import { daysBetween, deriveHealth } from '../../src/common/utils/health';

const NOW = new Date('2026-06-15T12:00:00Z');
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

describe('deriveHealth', () => {
  it('reports blocked work as blocked whatever the date says', () => {
    expect(deriveHealth('BLOCKED', daysFromNow(30), NOW)).toBe('BLOCKED');
  });

  it('reports a past due date as overdue', () => {
    expect(deriveHealth('IN_PROGRESS', daysFromNow(-1), NOW)).toBe('OVERDUE');
  });

  it('flags work that has not started and is due within three days', () => {
    expect(deriveHealth('NOT_STARTED', daysFromNow(2), NOW)).toBe('AT_RISK');
  });

  it('treats undated work as on track', () => {
    expect(deriveHealth('IN_PROGRESS', null, NOW)).toBe('ON_TRACK');
  });

  it('never reports finished work as a problem', () => {
    expect(deriveHealth('DONE', daysFromNow(-90), NOW)).toBe('ON_TRACK');
  });
});

describe('daysBetween', () => {
  it('counts whole elapsed days and never goes negative', () => {
    expect(daysBetween(daysFromNow(-3), NOW)).toBe(3);
    expect(daysBetween(daysFromNow(5), NOW)).toBe(0);
  });
});

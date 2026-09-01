import type { Role } from '@ewp/contracts';
import { describe, expect, it } from 'vitest';

import type { AuthContext } from '../../src/common/types/express';
import { canRunMeeting } from '../../src/modules/meetings/meetings.service';

const as = (role: Role, userId = 'organiser'): AuthContext =>
  ({ userId, organizationId: 'org', role }) as AuthContext;

const meeting = { createdById: 'organiser' };

/**
 * Arranging a meeting is not an administrative act. Anyone who can book one
 * runs it: a member's meeting is theirs in the same way an admin's is theirs.
 */
describe('who may run a meeting', () => {
  it('lets a member run the meeting they arranged', () => {
    expect(canRunMeeting(as('MEMBER'), meeting)).toBe(true);
  });

  it('lets a manager run the meeting they arranged', () => {
    expect(canRunMeeting(as('MANAGER'), meeting)).toBe(true);
  });

  it('gives every role the same say over their own meeting', () => {
    const roles: Role[] = ['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'];

    expect(roles.map((role) => canRunMeeting(as(role), meeting))).toEqual(roles.map(() => true));
  });

  it('keeps a member out of somebody else’s meeting', () => {
    expect(canRunMeeting(as('MEMBER', 'someone-else'), meeting)).toBe(false);
  });

  it('lets a manager and above run a meeting they did not arrange', () => {
    expect(canRunMeeting(as('MANAGER', 'someone-else'), meeting)).toBe(true);
    expect(canRunMeeting(as('ADMIN', 'someone-else'), meeting)).toBe(true);
    expect(canRunMeeting(as('OWNER', 'someone-else'), meeting)).toBe(true);
  });

  it('does not let a viewer run somebody else’s meeting', () => {
    expect(canRunMeeting(as('VIEWER', 'someone-else'), meeting)).toBe(false);
  });
});

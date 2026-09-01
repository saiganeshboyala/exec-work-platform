import type { Role } from '@ewp/contracts';
import { describe, expect, it } from 'vitest';

import type { AuthContext } from '../../src/common/types/express';
import { itemFilter, meetingFilter, seesWholeOrganization } from '../../src/modules/access';

const as = (role: Role): AuthContext =>
  ({ userId: 'me', organizationId: 'org', role }) as AuthContext;

/**
 * The rule the whole application leans on: administering the tenant and reading
 * everybody's work are different privileges. An admin manages people, roles and
 * settings, and still sees only the work they raised or were put on.
 */
describe('who sees the whole organization', () => {
  it('is the owner, and nobody else', () => {
    expect(seesWholeOrganization(as('OWNER'))).toBe(true);

    for (const role of ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as Role[]) {
      expect(seesWholeOrganization(as(role))).toBe(false);
    }
  });

  it('leaves an owner unfiltered', async () => {
    expect(await itemFilter(as('OWNER'))).toEqual({});
    expect(meetingFilter(as('OWNER'))).toEqual({});
  });

  it('narrows an admin to their own work, exactly like a member', async () => {
    const admin = await itemFilter(as('ADMIN'));
    const member = await itemFilter(as('MEMBER'));

    expect(admin).toEqual(member);
    // Raised it, owns it, or was put on it - nothing else.
    expect(admin).toEqual({
      OR: [
        { ownerId: 'me' },
        { createdById: 'me' },
        { assignees: { some: { userId: 'me' } } },
      ],
    });
  });

  it('narrows an admin to their own meetings too', () => {
    expect(meetingFilter(as('ADMIN'))).toEqual(meetingFilter(as('MEMBER')));
    expect(meetingFilter(as('ADMIN'))).toEqual({
      OR: [{ attendees: { some: { userId: 'me' } } }, { createdById: 'me' }],
    });
  });
});

import type { InvitationStatus, Role } from '@prisma/client';

import { prisma } from '@/database';

export const membersRepository = {
  /** Approved people only - pending requests have their own list. */
  listMembers(organizationId: string) {
    return prisma.membership.findMany({
      where: { organizationId, status: 'ACTIVE', user: { deletedAt: null } },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  },

  listPending(organizationId: string) {
    return prisma.membership.findMany({
      where: { organizationId, status: 'PENDING', user: { deletedAt: null } },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });
  },

  findMembership(organizationId: string, userId: string) {
    return prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { user: true },
    });
  },

  updateRole(organizationId: string, userId: string, role: Role) {
    return prisma.membership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { role },
      include: { user: true },
    });
  },

  removeMembership(organizationId: string, userId: string) {
    return prisma.membership.delete({
      where: { userId_organizationId: { userId, organizationId } },
    });
  },

  countOwners(organizationId: string) {
    return prisma.membership.count({ where: { organizationId, role: 'OWNER' } });
  },

  listInvitations(organizationId: string, status?: InvitationStatus) {
    return prisma.invitation.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  },

  findPendingInvitation(organizationId: string, email: string) {
    return prisma.invitation.findFirst({ where: { organizationId, email, status: 'PENDING' } });
  },

  findInvitationByHash(tokenHash: string) {
    return prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });
  },

  findInvitationById(id: string) {
    return prisma.invitation.findUnique({ where: { id }, include: { organization: true } });
  },

  createInvitation(data: {
    organizationId: string;
    email: string;
    role: Role;
    tokenHash: string;
    invitedById: string;
    message?: string;
    expiresAt: Date;
  }) {
    return prisma.invitation.create({ data });
  },

  markInvitationDelivered(id: string) {
    return prisma.invitation.update({ where: { id }, data: { emailDeliveredAt: new Date() } });
  },

  updateInvitationStatus(id: string, status: InvitationStatus) {
    return prisma.invitation.update({
      where: { id },
      data: { status, ...(status === 'ACCEPTED' ? { acceptedAt: new Date() } : {}) },
    });
  },
};

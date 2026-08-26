import type { UpdateProfileInput, UserDto } from '@ewp/contracts';

import { AppError } from '@/common/errors';
import { prisma } from '@/database';

export function toUserDto(user: {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  createdAt: Date;
}): UserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
    createdAt: user.createdAt.toISOString(),
  };
}

export const usersService = {
  async getById(organizationId: string, userId: string): Promise<UserDto> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null, memberships: { some: { organizationId } } },
    });
    if (!user) throw AppError.notFound('User');
    return toUserDto(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await prisma.user.update({ where: { id: userId }, data: input });
    return toUserDto(user);
  },
};

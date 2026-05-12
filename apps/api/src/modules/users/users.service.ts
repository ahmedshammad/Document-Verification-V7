import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN'];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(requestingUser: any, page = 1, limit = 20) {
    if (!ADMIN_ROLES.includes(requestingUser?.role)) {
      throw new ForbiddenException('Only administrators can list users.');
    }
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, page, limit };
  }

  async findById(id: string, requestingUser?: any) {
    if (requestingUser && id !== requestingUser.id && !ADMIN_ROLES.includes(requestingUser.role)) {
      throw new ForbiddenException('You can only access your own profile.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: { firstName?: string; lastName?: string; locale?: string }, requestingUser?: any) {
    if (requestingUser && id !== requestingUser.id && !ADMIN_ROLES.includes(requestingUser.role)) {
      throw new ForbiddenException('You can only update your own profile.');
    }

    const safeData = {
      ...(typeof data.firstName === 'string' ? { firstName: data.firstName.trim() } : {}),
      ...(typeof data.lastName === 'string' ? { lastName: data.lastName.trim() } : {}),
      ...(typeof data.locale === 'string' && ['en', 'ar'].includes(data.locale) ? { locale: data.locale } : {}),
    };

    return this.prisma.user.update({
      where: { id },
      data: safeData,
    });
  }
}

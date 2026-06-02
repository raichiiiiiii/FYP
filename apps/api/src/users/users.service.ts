import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../audit-events/audit-events.service';
import { PrismaService } from '../database/prisma.service';

export type CreateUserInput = {
  email: string;
  displayName: string;
  passwordHash?: string;
  status?: string;
  organizationId?: string;
  actorUserId?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateUserInput) {
    if (!input.email?.trim() || !input.displayName?.trim()) {
      throw new BadRequestException('email and displayName are required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException('User email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        status: input.status || 'active',
      },
    });

    await this.auditEvents.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId || user.id,
      eventType: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        displayName: user.displayName,
      },
    });

    return user;
  }

  list() {
    return this.prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}

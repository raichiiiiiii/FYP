import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../audit-events/audit-events.service';
import { PrismaService } from '../../database/prisma.service';
import {
  normalizeInboxText,
  normalizeRecipientRoleCode,
} from './inbox.contract';

type InboxActorInput = {
  organizationId?: string;
  actorUserId?: string;
};

export type CreateInboxMessageInput = InboxActorInput & {
  recipientUserId?: string;
  recipientRoleCode?: string;
  subject?: string;
  body?: string;
};

export type CreatePermissionRequestInput = InboxActorInput & {
  requestedRoleCode?: string;
  requestedPermissionCode?: string;
  reason?: string;
};

export type MarkInboxItemReadInput = InboxActorInput;

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async list(input: InboxActorInput) {
    const actor = await this.assertActiveMembership(input);
    const recipientFilter = this.buildRecipientFilter(actor);
    const items = await this.prisma.inboxItem.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [recipientFilter, { senderUserId: actor.userId }],
      },
      include: {
        sender: true,
        recipient: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
    const unreadCount = await this.prisma.inboxItem.count({
      where: {
        organizationId: actor.organizationId,
        status: 'unread',
        ...recipientFilter,
      },
    });

    return {
      unreadCount,
      items: items.map((item) => this.toDto(item)),
    };
  }

  async createMessage(input: CreateInboxMessageInput) {
    const actor = await this.assertActiveMembership(input);
    const subject = normalizeInboxText(input.subject, 'subject', 160);
    const body = normalizeInboxText(input.body, 'body', 2000);
    const recipientRoleCode = normalizeRecipientRoleCode(
      input.recipientRoleCode,
    );

    if (!input.recipientUserId?.trim() && !recipientRoleCode) {
      throw new BadRequestException(
        'recipientUserId or recipientRoleCode is required',
      );
    }

    if (input.recipientUserId?.trim()) {
      await this.assertUserInOrganization(
        actor.organizationId,
        input.recipientUserId,
      );
    }

    const item = await this.prisma.inboxItem.create({
      data: {
        organizationId: actor.organizationId,
        senderUserId: actor.userId,
        recipientUserId: input.recipientUserId?.trim() || undefined,
        recipientRoleCode,
        itemType: 'message',
        subject,
        body,
      },
      include: {
        sender: true,
        recipient: true,
      },
    });

    await this.auditEvents.create({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventType: 'INBOX_MESSAGE_CREATED',
      entityType: 'InboxItem',
      entityId: item.id,
      metadata: {
        recipientUserId: item.recipientUserId,
        recipientRoleCode: item.recipientRoleCode,
        itemType: item.itemType,
      },
    });

    return this.toDto(item);
  }

  async createPermissionRequest(input: CreatePermissionRequestInput) {
    const actor = await this.assertActiveMembership(input);
    const requestedRoleCode = normalizeRecipientRoleCode(
      input.requestedRoleCode,
    );
    const requestedPermissionCode = input.requestedPermissionCode?.trim();

    if (!requestedRoleCode && !requestedPermissionCode) {
      throw new BadRequestException(
        'requestedRoleCode or requestedPermissionCode is required',
      );
    }

    const reason =
      input.reason?.trim() || 'Access request submitted from profile settings.';
    const subject = requestedRoleCode
      ? `Permission request: ${requestedRoleCode}`
      : `Permission request: ${requestedPermissionCode}`;
    const item = await this.prisma.inboxItem.create({
      data: {
        organizationId: actor.organizationId,
        senderUserId: actor.userId,
        recipientRoleCode: 'ORG_ADMIN',
        itemType: 'permission_request',
        subject,
        body: normalizeInboxText(reason, 'reason', 2000),
        metadata: {
          requestedRoleCode,
          requestedPermissionCode,
          requesterRoleCodes: actor.roleCodes,
        },
      },
      include: {
        sender: true,
        recipient: true,
      },
    });

    await this.auditEvents.create({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventType: 'PERMISSION_REQUEST_CREATED',
      entityType: 'InboxItem',
      entityId: item.id,
      metadata: {
        requestedRoleCode,
        requestedPermissionCode,
        recipientRoleCode: 'ORG_ADMIN',
      },
    });

    return this.toDto(item);
  }

  async markRead(id: string, input: MarkInboxItemReadInput) {
    const actor = await this.assertActiveMembership(input);
    const item = await this.prisma.inboxItem.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
      },
      include: {
        sender: true,
        recipient: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Inbox item not found');
    }

    if (!this.canReceiveItem(actor, item)) {
      throw new ForbiddenException('Inbox item is not visible to this actor');
    }

    const updated = await this.prisma.inboxItem.update({
      where: {
        id,
      },
      data: {
        status: 'read',
        readAt: item.readAt ?? new Date(),
      },
      include: {
        sender: true,
        recipient: true,
      },
    });

    await this.auditEvents.create({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventType: 'INBOX_ITEM_READ',
      entityType: 'InboxItem',
      entityId: updated.id,
      metadata: {
        itemType: updated.itemType,
      },
    });

    return this.toDto(updated);
  }

  private async assertActiveMembership(input: InboxActorInput) {
    if (!input.organizationId?.trim() || !input.actorUserId?.trim()) {
      throw new BadRequestException(
        'organizationId and actorUserId are required',
      );
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
        status: 'active',
      },
      include: {
        role: true,
      },
    });

    if (!memberships.length) {
      throw new ForbiddenException(
        'Active organization membership is required',
      );
    }

    return {
      organizationId: input.organizationId,
      userId: input.actorUserId,
      roleCodes: memberships.map((membership) => membership.role.code),
    };
  }

  private async assertUserInOrganization(
    organizationId: string,
    userId: string | undefined,
  ) {
    if (!userId) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new BadRequestException('recipient user is not an active member');
    }
  }

  private buildRecipientFilter(actor: { userId: string; roleCodes: string[] }) {
    return {
      OR: [
        { recipientUserId: actor.userId },
        { recipientRoleCode: { in: actor.roleCodes } },
      ],
    };
  }

  private canReceiveItem(
    actor: { userId: string; roleCodes: string[] },
    item: {
      recipientUserId: string | null;
      recipientRoleCode: string | null;
    },
  ) {
    return (
      item.recipientUserId === actor.userId ||
      (item.recipientRoleCode
        ? actor.roleCodes.includes(item.recipientRoleCode)
        : false)
    );
  }

  private toDto(item: {
    id: string;
    organizationId: string;
    senderUserId: string;
    recipientUserId: string | null;
    recipientRoleCode: string | null;
    itemType: string;
    subject: string;
    body: string;
    status: string;
    metadata: unknown;
    readAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sender?: { id: string; email: string; displayName: string } | null;
    recipient?: { id: string; email: string; displayName: string } | null;
  }) {
    return {
      id: item.id,
      organizationId: item.organizationId,
      senderUserId: item.senderUserId,
      recipientUserId: item.recipientUserId,
      recipientRoleCode: item.recipientRoleCode,
      itemType: item.itemType,
      subject: item.subject,
      body: item.body,
      status: item.status,
      metadata: item.metadata,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      sender: item.sender
        ? {
            id: item.sender.id,
            email: item.sender.email,
            displayName: item.sender.displayName,
          }
        : null,
      recipient: item.recipient
        ? {
            id: item.recipient.id,
            email: item.recipient.email,
            displayName: item.recipient.displayName,
          }
        : null,
    };
  }
}

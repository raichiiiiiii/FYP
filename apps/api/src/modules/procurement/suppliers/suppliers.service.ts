import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditEventsService } from '../../../audit-events/audit-events.service';
import { PrismaService } from '../../../database/prisma.service';
import { optionalText, requireText } from '../procurement.service-utils';

export type CreateSupplierInput = {
  organizationId: string;
  actorUserId?: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
};

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(input: CreateSupplierInput) {
    const organizationId = requireText(input.organizationId, 'organizationId');
    const name = requireText(input.name, 'name');

    const supplier = await this.prisma.supplier.create({
      data: {
        organizationId,
        name,
        email: optionalText(input.email),
        phone: optionalText(input.phone),
        status: optionalText(input.status) || 'active',
      },
    });

    await this.auditEvents.create({
      organizationId: supplier.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier.id,
      metadata: {
        name: supplier.name,
        email: supplier.email,
        status: supplier.status,
      },
    });

    return supplier;
  }

  list(organizationId?: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException(
        'organizationId query parameter is required',
      );
    }

    return this.prisma.supplier.findMany({
      where: {
        organizationId,
      },
      include: {
        quotations: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            receivedAt: true,
          },
          orderBy: {
            receivedAt: 'desc',
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            totalAmount: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        quotations: {
          include: {
            rfq: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
          orderBy: {
            receivedAt: 'desc',
          },
        },
        purchaseOrders: {
          include: {
            requisition: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
            receipts: true,
            invoices: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        invoices: {
          orderBy: {
            issuedAt: 'desc',
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }
}

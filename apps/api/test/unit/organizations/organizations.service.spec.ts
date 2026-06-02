import { BadRequestException } from '@nestjs/common';
import { OrganizationsService } from '../../../src/organizations/organizations.service';

describe('FR-01 Organization validation unit rules', () => {
  function createService() {
    const prisma = {
      organization: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const auditEvents = {
      create: jest.fn(),
    };

    return {
      prisma,
      auditEvents,
      service: new OrganizationsService(prisma as never, auditEvents as never),
    };
  }

  it('requires an organization legal name', async () => {
    const { service, prisma } = createService();

    await expect(
      service.create({
        legalName: ' ',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('rejects invalid deployment modes', async () => {
    const { service, prisma } = createService();

    await expect(
      service.create({
        legalName: 'Example SME Sdn Bhd',
        deploymentMode: 'unknown_mode',
      }),
    ).rejects.toThrow('deploymentMode must be valid');
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate registration numbers before creating a record', async () => {
    const { service, prisma } = createService();
    prisma.organization.findFirst.mockResolvedValue({ id: 'org-existing' });

    await expect(
      service.create({
        legalName: 'Example SME Sdn Bhd',
        registrationNumber: '202606020001',
      }),
    ).rejects.toThrow('registrationNumber already exists');
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });

  it('creates an organization and audit event when validation passes', async () => {
    const { service, prisma, auditEvents } = createService();
    prisma.organization.findFirst.mockResolvedValue(null);
    prisma.organization.create.mockResolvedValue({
      id: 'org-1',
      legalName: 'Example SME Sdn Bhd',
      deploymentMode: 'standalone_sme',
    });

    await expect(
      service.create({
        legalName: ' Example SME Sdn Bhd ',
        registrationNumber: '202606020001',
      }),
    ).resolves.toEqual({
      organization: {
        id: 'org-1',
        legalName: 'Example SME Sdn Bhd',
        deploymentMode: 'standalone_sme',
      },
    });

    expect(prisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          legalName: 'Example SME Sdn Bhd',
          registrationNumber: '202606020001',
          deploymentMode: 'standalone_sme',
        }),
      }),
    );
    expect(auditEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'ORGANIZATION_CREATED',
        entityType: 'Organization',
        entityId: 'org-1',
      }),
    );
  });
});

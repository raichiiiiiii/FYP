import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService, HealthStatusResponse } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const response: HealthStatusResponse = {
    status: 'ok',
    service: 'mepn-api',
    database: 'ok',
    redis: 'ok',
    environment: 'test',
    timestamp: '2026-06-02T00:00:00.000Z',
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue(response),
          },
        },
      ],
    }).compile();

    controller = app.get<HealthController>(HealthController);
  });

  it('returns API and infrastructure status', async () => {
    await expect(controller.getHealth()).resolves.toEqual(response);
  });
});

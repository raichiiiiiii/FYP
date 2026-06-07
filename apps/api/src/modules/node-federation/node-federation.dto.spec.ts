import { BadRequestException } from '@nestjs/common';
import {
  assertSafeNodeFederationPayload,
  normalizeNodeChannelStatus,
  normalizeNodeChannelType,
} from './node-federation.dto';

describe('node federation DTO helpers', () => {
  it('normalizes supported local channel types and statuses', () => {
    expect(normalizeNodeChannelType('shared_tender_competition')).toBe(
      'SHARED_TENDER_COMPETITION',
    );
    expect(normalizeNodeChannelType(undefined)).toBe('LOCAL_SIMULATED');
    expect(normalizeNodeChannelStatus('SIMULATED_INVITED')).toBe(
      'simulated_invited',
    );
    expect(normalizeNodeChannelStatus(undefined)).toBe('simulated_proposed');
  });

  it('rejects unsupported local channel types and statuses', () => {
    expect(() => normalizeNodeChannelType('fabric_create_channel')).toThrow(
      BadRequestException,
    );
    expect(() => normalizeNodeChannelStatus('joined_real_fabric')).toThrow(
      BadRequestException,
    );
  });

  it('rejects secret-like payload material without echoing full content', () => {
    expect(() =>
      assertSafeNodeFederationPayload({
        channel: 'mepn-local',
        material: 'private key material placeholder',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertSafeNodeFederationPayload({
        nested: { token: 'do-not-accept' },
      }),
    ).toThrow(BadRequestException);
  });

  it('allows sanitized local federation metadata', () => {
    expect(() =>
      assertSafeNodeFederationPayload({
        channel: {
          channelName: 'mepn-business-tender-channel',
          channelType: 'SHARED_TENDER_COMPETITION',
        },
        sourceNode: {
          nodeKey: 'amanah-retail',
          organizationName: 'Amanah Retail Sdn Bhd',
        },
      }),
    ).not.toThrow();
  });
});

import { BadRequestException } from '@nestjs/common';
import {
  assertLossExceptionTransition,
  isLossExceptionClosureBlocking,
  normalizeLossExceptionClassification,
  normalizeLossExceptionStatus,
} from '../../../src/modules/finance/loss-exceptions/loss-exception-lifecycle';

describe('Loss exception lifecycle rules', () => {
  it('normalizes supported classification and status values', () => {
    expect(normalizeLossExceptionClassification(' breach ')).toBe('BREACH');
    expect(normalizeLossExceptionStatus(' under_review ')).toBe('UNDER_REVIEW');
  });

  it('rejects unsupported classification values', () => {
    expect(() => normalizeLossExceptionClassification('FIXED_RETURN')).toThrow(
      BadRequestException,
    );
  });

  it('allows the documented review lifecycle path', () => {
    expect(() =>
      assertLossExceptionTransition('OPEN', 'UNDER_REVIEW'),
    ).not.toThrow();
    expect(() =>
      assertLossExceptionTransition('UNDER_REVIEW', 'CLASSIFIED'),
    ).not.toThrow();
    expect(() =>
      assertLossExceptionTransition('CLASSIFIED', 'RESOLVED'),
    ).not.toThrow();
  });

  it('rejects direct closure or classification from an unresolved opening state', () => {
    expect(() => assertLossExceptionTransition('OPEN', 'RESOLVED')).toThrow(
      BadRequestException,
    );
    expect(() => assertLossExceptionTransition('OPEN', 'CLASSIFIED')).toThrow(
      BadRequestException,
    );
  });

  it('treats only resolved and rejected states as non-blocking for closure', () => {
    expect(isLossExceptionClosureBlocking('OPEN')).toBe(true);
    expect(isLossExceptionClosureBlocking('CLASSIFIED')).toBe(true);
    expect(isLossExceptionClosureBlocking('RESOLVED')).toBe(false);
    expect(isLossExceptionClosureBlocking('REJECTED')).toBe(false);
  });
});

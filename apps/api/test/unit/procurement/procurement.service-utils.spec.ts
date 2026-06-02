import { BadRequestException } from '@nestjs/common';
import {
  normalizeLineItems,
  totalAmount,
} from '../../../src/modules/procurement/procurement.service-utils';

describe('FR-09 Procurement line-item unit rules', () => {
  it('normalizes valid line items and calculates the total amount', () => {
    const items = normalizeLineItems([
      {
        description: 'Laptop',
        quantity: '2',
        unitPrice: '3500',
      },
      {
        description: 'Dock',
        quantity: 1,
        unitPrice: 500,
      },
    ]);

    expect(items).toEqual([
      {
        description: 'Laptop',
        category: undefined,
        quantity: 2,
        unitPrice: 3500,
      },
      {
        description: 'Dock',
        category: undefined,
        quantity: 1,
        unitPrice: 500,
      },
    ]);
    expect(totalAmount(items)).toBe(7500);
  });

  it('rejects negative quantities', () => {
    expect(() =>
      normalizeLineItems([
        {
          description: 'Laptop',
          quantity: -1,
          unitPrice: 3500,
        },
      ]),
    ).toThrow(BadRequestException);
  });
});

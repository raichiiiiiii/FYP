import { BadRequestException } from '@nestjs/common';

export type ProcurementLineItemInput = {
  description?: string;
  category?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  targetPrice?: number | string;
  rfqItemId?: string;
  requisitionItemId?: string;
};

export function requireText(value: string | undefined, field: string) {
  const text = value?.trim();

  if (!text) {
    throw new BadRequestException(`${field} is required`);
  }

  return text;
}

export function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text || undefined;
}

export function numericValue(
  value: number | string | undefined,
  field: string,
  fallback = 0,
) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException(`${field} must be a non-negative number`);
  }

  return amount;
}

export function normalizeLineItems(items: ProcurementLineItemInput[]) {
  if (!items.length) {
    throw new BadRequestException('At least one line item is required');
  }

  return items.map((item, index) => {
    const quantity = numericValue(item.quantity, `items[${index}].quantity`, 1);
    const unitPrice = numericValue(item.unitPrice, `items[${index}].unitPrice`);

    return {
      description: requireText(item.description, `items[${index}].description`),
      category: optionalText(item.category),
      quantity,
      unitPrice,
    };
  });
}

export function totalAmount(
  items: Array<{ quantity: number; unitPrice: number }>,
) {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
}

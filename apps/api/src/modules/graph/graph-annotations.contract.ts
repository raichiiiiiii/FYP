import { BadRequestException } from '@nestjs/common';

export const graphAnnotationVisibilities = ['private', 'organization'] as const;

export type GraphAnnotationVisibility =
  (typeof graphAnnotationVisibilities)[number];

export type GraphAnnotationTarget =
  | {
      viewId: string;
      nodeEntityType?: undefined;
      nodeEntityId?: undefined;
    }
  | {
      viewId?: undefined;
      nodeEntityType: string;
      nodeEntityId: string;
    };

export type GraphAnnotationInput = {
  viewId?: string | null;
  nodeEntityType?: string | null;
  nodeEntityId?: string | null;
  body?: string | null;
  visibility?: string | null;
};

export type ValidatedGraphAnnotationInput = GraphAnnotationTarget & {
  body: string;
  visibility: GraphAnnotationVisibility;
};

const maxAnnotationBodyLength = 2_000;

export function validateGraphAnnotationInput(
  input: GraphAnnotationInput,
): ValidatedGraphAnnotationInput {
  const viewId = normalizeOptionalText(input.viewId);
  const nodeEntityType = normalizeOptionalText(input.nodeEntityType);
  const nodeEntityId = normalizeOptionalText(input.nodeEntityId);
  const body = normalizeRequiredBody(input.body);
  const visibility = normalizeGraphAnnotationVisibility(input.visibility);
  const hasViewTarget = Boolean(viewId);
  const hasNodeTarget = Boolean(nodeEntityType || nodeEntityId);

  if (hasViewTarget && hasNodeTarget) {
    throw new BadRequestException(
      'Graph annotation must target either a saved view or a graph node, not both',
    );
  }

  if (!hasViewTarget && !hasNodeTarget) {
    throw new BadRequestException('Graph annotation target is required');
  }

  if (hasNodeTarget && (!nodeEntityType || !nodeEntityId)) {
    throw new BadRequestException(
      'Graph node annotations require nodeEntityType and nodeEntityId',
    );
  }

  if (viewId) {
    return {
      viewId,
      body,
      visibility,
    };
  }

  return {
    nodeEntityType: nodeEntityType as string,
    nodeEntityId: nodeEntityId as string,
    body,
    visibility,
  };
}

function normalizeGraphAnnotationVisibility(
  value?: string | null,
): GraphAnnotationVisibility {
  const normalized = value?.trim().toLowerCase() || 'private';

  if (
    !graphAnnotationVisibilities.includes(
      normalized as GraphAnnotationVisibility,
    )
  ) {
    throw new BadRequestException('Unsupported graph annotation visibility');
  }

  return normalized as GraphAnnotationVisibility;
}

function normalizeRequiredBody(value?: string | null) {
  const body = value?.trim();

  if (!body) {
    throw new BadRequestException('Graph annotation body is required');
  }

  if (body.length > maxAnnotationBodyLength) {
    throw new BadRequestException(
      `Graph annotation body must be ${maxAnnotationBodyLength} characters or less`,
    );
  }

  return body;
}

function normalizeOptionalText(value?: string | null) {
  return value?.trim() || undefined;
}

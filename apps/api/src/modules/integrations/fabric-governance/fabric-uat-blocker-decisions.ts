export type FabricUatBlockerResolutionStatus =
  | 'resolved_by_decision'
  | 'resolved_by_live_gate';

export type FabricUatBlockerDecisionDto = {
  id: 'UAT-B-003' | 'UAT-B-004';
  title: string;
  status: FabricUatBlockerResolutionStatus;
  decision: string;
  implementedBoundary: string;
  topologyMutationSupported: false;
  directFabricExecutionSupported: false;
  operatorAssistedOnly: boolean;
  localSeedCanPass: boolean;
  seededProofAccepted: boolean;
  liveEvidenceRequired: boolean;
  readAnchorRequired: boolean;
  verificationTruthRule: string;
  acceptedAdr: 'ADR-016';
  supportingAdr: 'ADR-015' | null;
  evidencePath: string;
  nextAction: string;
};

export type FabricUatBlockerDecisionResponseDto = {
  checkedAt: string;
  adr: {
    id: 'ADR-016';
    status: 'accepted';
    path: 'docs/adr/ADR-016-uat-fabric-blocker-resolution-path.md';
  };
  decisions: FabricUatBlockerDecisionDto[];
};

const fabricUatBlockerDecisions: FabricUatBlockerDecisionDto[] = [
  {
    id: 'UAT-B-003',
    title: 'Fabric topology mutation',
    status: 'resolved_by_decision',
    decision:
      'MEPN will keep Fabric topology mutation operator-assisted for the current product boundary.',
    implementedBoundary:
      'The app records network/channel governance metadata, invitations, approvals, readiness checks, and sanitized operator execution evidence only.',
    topologyMutationSupported: false,
    directFabricExecutionSupported: false,
    operatorAssistedOnly: true,
    localSeedCanPass: true,
    seededProofAccepted: false,
    liveEvidenceRequired: false,
    readAnchorRequired: false,
    verificationTruthRule:
      'A local UAT pass proves the operator-assisted boundary and must not be read as direct channel creation, channel join, or MSP onboarding.',
    acceptedAdr: 'ADR-016',
    supportingAdr: 'ADR-015',
    evidencePath: 'docs/evidence/uat/USE_CASE_BLOCKERS.md#uat-b-003',
    nextAction:
      'Use the existing Fabric governance workflow and external operator evidence; direct automation requires a future operator-agent implementation.',
  },
  {
    id: 'UAT-B-004',
    title: 'Real Fabric proof',
    status: 'resolved_by_live_gate',
    decision:
      'MEPN will only mark real Fabric proof as passed after API-side chaincode ReadAnchor verification compares matching hashes.',
    implementedBoundary:
      'Seeded records may show pending, unavailable, anchored, or mock states, but cannot set verified=true without a live ReadAnchor match.',
    topologyMutationSupported: false,
    directFabricExecutionSupported: false,
    operatorAssistedOnly: false,
    localSeedCanPass: false,
    seededProofAccepted: false,
    liveEvidenceRequired: true,
    readAnchorRequired: true,
    verificationTruthRule:
      'verified=true requires local canonical hash, stored anchor hash, and on-chain ReadAnchor hash to match.',
    acceptedAdr: 'ADR-016',
    supportingAdr: null,
    evidencePath: 'docs/evidence/qa/FABRIC_GATEWAY_UAT_EVIDENCE.md',
    nextAction:
      'Configure live Gateway material, anchor a real hash record, and run the gated Fabric proof UAT when reviewer proof is required.',
  },
];

export function getFabricUatBlockerDecisionResponse(): FabricUatBlockerDecisionResponseDto {
  return {
    checkedAt: new Date().toISOString(),
    adr: {
      id: 'ADR-016',
      status: 'accepted',
      path: 'docs/adr/ADR-016-uat-fabric-blocker-resolution-path.md',
    },
    decisions: fabricUatBlockerDecisions,
  };
}

import { getFabricUatBlockerDecisionResponse } from './fabric-uat-blocker-decisions';

describe('Fabric UAT blocker decisions', () => {
  it('records accepted decisions for UAT-B-003 and UAT-B-004 without unsafe proof claims', () => {
    const response = getFabricUatBlockerDecisionResponse();

    expect(response.adr).toEqual(
      expect.objectContaining({
        id: 'ADR-016',
        status: 'accepted',
      }),
    );
    expect(response.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'UAT-B-003',
          status: 'resolved_by_decision',
          topologyMutationSupported: false,
          directFabricExecutionSupported: false,
          operatorAssistedOnly: true,
          localSeedCanPass: true,
          seededProofAccepted: false,
          liveEvidenceRequired: false,
          readAnchorRequired: false,
          supportingAdr: 'ADR-015',
        }),
        expect.objectContaining({
          id: 'UAT-B-004',
          status: 'resolved_by_live_gate',
          topologyMutationSupported: false,
          directFabricExecutionSupported: false,
          operatorAssistedOnly: false,
          localSeedCanPass: false,
          seededProofAccepted: false,
          liveEvidenceRequired: true,
          readAnchorRequired: true,
        }),
      ]),
    );

    const proofDecision = response.decisions.find(
      (decision) => decision.id === 'UAT-B-004',
    );
    expect(proofDecision?.verificationTruthRule).toContain('ReadAnchor');
    expect(proofDecision?.verificationTruthRule).toContain('hash');
  });

  it('does not expose secret-like material in the decision response', () => {
    expect(JSON.stringify(getFabricUatBlockerDecisionResponse())).not.toMatch(
      /BEGIN|PRIVATE KEY|FABRIC_PRIVATE_KEY|password=|token=|grpcs:\/\//i,
    );
  });
});

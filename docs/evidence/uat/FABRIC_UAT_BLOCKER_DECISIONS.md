# Fabric UAT Blocker Decisions

Date: 2026-06-07

This evidence note records the accepted local UAT decisions for UAT-B-003 and
UAT-B-004. It does not claim that MEPN can directly mutate Fabric topology or
that local seeded data is real on-chain proof.

## Decision Summary

| Blocker | Decision | Implemented evidence |
|---|---|---|
| UAT-B-003 Fabric topology | Resolved by accepted boundary decision. MEPN keeps channel creation, channel joining, MSP onboarding, and topology mutation operator-assisted outside the app runtime. | `GET /api/v1/fabric/uat-blocker-decisions`; `GET /api/v1/fabric/automation/readiness`; operator-assisted governance workflows. |
| UAT-B-004 Fabric proof | Resolved by live-proof gate. MEPN can only mark real proof passed when API-side chaincode `ReadAnchor` verification compares matching hashes. | `GET /api/v1/fabric/uat-blocker-decisions`; hash-record Fabric verification endpoint; gated real Fabric proof UAT. |

ADR-017 adds a separate implementation decision for local UAT: simulated
node-federation channels may be created as application metadata through
`/api/v1/node-federation/*`. This is reviewer-visible local network metadata
only and is not real Fabric topology mutation.

## Implemented Endpoint

```http
GET /api/v1/fabric/uat-blocker-decisions?organizationId=<org>&actorUserId=<user>
```

The endpoint is Fabric-governance read protected. It returns:

- ADR-016 status;
- UAT-B-003 decision status;
- UAT-B-004 decision status;
- `topologyMutationSupported=false`;
- `directFabricExecutionSupported=false`;
- `operatorAssistedOnly=true` for topology mutation;
- `seededProofAccepted=false`;
- `readAnchorRequired=true` for real Fabric proof;
- whether local seed data can pass the UAT scenario;
- whether live evidence is required;
- the proof truth rule for `verified=true`.

The endpoint must not return PEM blocks, private key material, tokens,
passwords, endpoint credentials, Fabric admin material, or raw environment
values.

## Validation Commands

```bash
corepack pnpm --dir apps/api test:unit -- fabric-governance node-status
corepack pnpm --dir apps/api test:integration -- fabric-governance node-status
corepack pnpm --dir apps/api test:unit -- node-federation
corepack pnpm --dir apps/api test:integration -- node-federation
corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts
```

## Safety Notes

- UAT-B-003 is not resolved by adding direct channel creation or join APIs.
- UAT-B-004 is not resolved by seeded `AuditAnchor` metadata.
- Seeded `verified` metadata must remain labelled as local/stored metadata and
  must not be treated as live chaincode proof.
- Real proof screenshots require a live Fabric Gateway, a real anchored hash
  record, and successful backend `ReadAnchor` verification.

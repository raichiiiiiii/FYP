# Fabric Integration Workspace

This folder is reserved for future Hyperledger Fabric integration work.

Allowed committed content:

- chaincode source after the chaincode slice is implemented
- test-network scripts that do not contain secrets
- documentation
- test fixtures that do not contain private keys or real certificates

Ignored runtime content:

- generated organizations/MSP material
- private keys
- certificates
- channel artifacts
- ledgers
- connection profiles containing sensitive endpoint or identity details

Real Fabric Gateway implementation remains blocked until the chaincode, local
test network, identity material handling, and worker adapter slices are
implemented.

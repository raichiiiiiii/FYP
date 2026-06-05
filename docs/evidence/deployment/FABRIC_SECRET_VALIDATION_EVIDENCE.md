# Fabric Secret Validation Evidence

## Purpose

This document records the repository-side validation behavior for mounted Fabric
Gateway secret files. It is safe to commit because it contains placeholders,
commands, and expected validation behavior only.

## Validation Date

2026-06-06

## Validator

```text
scripts/validate-fabric-secrets.sh
```

## Safe Output Contract

The validator may print:

- file label
- file type
- sanitized byte size
- required env key names
- JSON parse status
- private-key permission status
- final pass/fail summary

The validator must not print:

- PEM blocks
- private key contents
- certificate contents
- generated env values
- tokens, passwords, or connection strings

## Positive Validation Fixture

The placeholder fixture must include:

```text
identity/cert.pem
identity/key.pem
tls/ca.crt
connection-profile.json
env.generated
```

Required `env.generated` keys:

```text
BLOCKCHAIN_ANCHOR_ADAPTER
FABRIC_ENABLED
FABRIC_MODE
FABRIC_GATEWAY_URL
FABRIC_GATEWAY_HOST_ALIAS
FABRIC_PEER_ENDPOINT
FABRIC_MSP_ID
FABRIC_CHANNEL
FABRIC_CHAINCODE
FABRIC_IDENTITY_CERT_PATH
FABRIC_PRIVATE_KEY_PATH
FABRIC_TLS_CERT_PATH
```

## Negative Validation Fixture

The missing-private-key fixture must fail with a non-zero exit code and a
sanitized message such as:

```text
Fabric secret validation failed: private key is missing
```

## Commands

```bash
bash -n scripts/validate-fabric-secrets.sh
```

Positive and negative placeholder validation commands were run locally. No real
secret material was used.

## Result

Passed.

Observed safe positive output included file labels, file types, byte sizes,
required env key names, JSON parse status, private-key permission status, and
the final validation result. No file contents or env values were printed.

Observed safe negative output for a missing private key:

```text
OK: identity certificate present; type=ASCII text; size=17 bytes.
Fabric secret validation failed: private key is missing
```

This confirms the validator fails clearly before continuing with an incomplete
secret layout.

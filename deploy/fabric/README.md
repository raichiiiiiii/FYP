# Fabric Secret Mount

This directory is mounted read-only into the API and worker containers at:

```text
/run/secrets/fabric
```

Use it only for non-committed Fabric Gateway runtime material on a deployed VM,
for example:

```text
client.crt
client.key
ca.crt
```

Do not commit certificate bodies, private keys, generated MSP folders, channel
artifacts, ledgers, or other Fabric runtime secrets. The `.gitignore` in this
directory intentionally ignores everything except this README and the ignore
file itself.

The current repository does not yet include the real Fabric Gateway adapter.
Gateway mode is documented and guarded, but real submissions remain a roadmap
item until chaincode, network access, identity material, and adapter code are
implemented.

For local development, use the scaffold under:

```text
infra/fabric/
```

After the local Fabric samples test network is running, the helper script below
can copy ignored Org1 Gateway material into this directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File infra\fabric\scripts\export-gateway-env.ps1
```

The script writes certificate and key files into this ignored mount directory
without printing secret contents.

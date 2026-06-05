param(
  [string]$FabricSamplesPath = $env:FABRIC_SAMPLES_PATH,
  [string]$ChannelName = 'mepn-audit',
  [string]$ChaincodeName = 'audit-anchor',
  [string]$MspId = 'Org1MSP',
  [string]$PeerEndpoint = 'localhost:7051',
  [string]$GatewayHostAlias = 'peer0.org1.example.com'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\fabric-paths.ps1"

$repoRoot = Get-MepnRepoRoot
$samplesPath = Get-MepnFabricSamplesPath -ConfiguredPath $FabricSamplesPath
$orgRoot = Join-Path $samplesPath 'test-network\organizations\peerOrganizations\org1.example.com'
$userMsp = Join-Path $orgRoot 'users\User1@org1.example.com\msp'
$peerTls = Join-Path $orgRoot 'peers\peer0.org1.example.com\tls'
$deployFabric = Join-Path $repoRoot 'deploy\fabric'
$localOutput = Join-Path $repoRoot 'infra\fabric\.local'

$identityCert = Join-Path $userMsp 'signcerts\cert.pem'
$privateKey = Get-ChildItem (Join-Path $userMsp 'keystore') -File -ErrorAction Stop | Select-Object -First 1
$tlsCert = Join-Path $peerTls 'ca.crt'

foreach ($path in @($identityCert, $privateKey.FullName, $tlsCert)) {
  if (-not (Test-Path $path)) {
    throw "Required Fabric Gateway material not found: $path"
  }
}

New-Item -ItemType Directory -Force -Path $deployFabric | Out-Null
New-Item -ItemType Directory -Force -Path $localOutput | Out-Null

$clientCertOut = Join-Path $deployFabric 'client.crt'
$clientKeyOut = Join-Path $deployFabric 'client.key'
$caCertOut = Join-Path $deployFabric 'ca.crt'
$envOut = Join-Path $localOutput 'fabric-gateway.env'

Copy-Item -LiteralPath $identityCert -Destination $clientCertOut -Force
Copy-Item -LiteralPath $privateKey.FullName -Destination $clientKeyOut -Force
Copy-Item -LiteralPath $tlsCert -Destination $caCertOut -Force

$envContent = @(
  'FABRIC_ENABLED=true',
  'FABRIC_MODE=gateway',
  "FABRIC_GATEWAY_URL=grpcs://$PeerEndpoint",
  "FABRIC_MSP_ID=$MspId",
  "FABRIC_CHANNEL=$ChannelName",
  "FABRIC_CHAINCODE=$ChaincodeName",
  "FABRIC_IDENTITY_CERT_PATH=$clientCertOut",
  "FABRIC_PRIVATE_KEY_PATH=$clientKeyOut",
  "FABRIC_TLS_CERT_PATH=$caCertOut",
  "FABRIC_PEER_ENDPOINT=$PeerEndpoint",
  "FABRIC_GATEWAY_HOST_ALIAS=$GatewayHostAlias",
  'FABRIC_SUBMIT_TIMEOUT_MS=30000',
  'FABRIC_COMMIT_TIMEOUT_MS=30000'
)

Set-Content -Path $envOut -Value $envContent -Encoding utf8

Write-Host "Copied local Fabric Gateway material to deploy\fabric." -ForegroundColor Green
Write-Host "Wrote ignored local env file: $envOut"
Write-Host "No certificate or private key contents were printed."

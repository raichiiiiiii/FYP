param(
  [string]$FabricSamplesPath = $env:FABRIC_SAMPLES_PATH,
  [string]$ChannelName = 'mepn-audit',
  [string]$ChaincodeName = 'audit-anchor',
  [switch]$SkipDown
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\fabric-paths.ps1"

& "$PSScriptRoot\check-prereqs.ps1" -FabricSamplesPath $FabricSamplesPath

$repoRoot = Get-MepnRepoRoot
$samplesPath = Get-MepnFabricSamplesPath -ConfiguredPath $FabricSamplesPath
$testNetworkPath = Join-Path $samplesPath 'test-network'
$chaincodePath = Join-Path $repoRoot 'chaincode\audit-anchor-go'

if (-not (Test-Path (Join-Path $testNetworkPath 'network.sh'))) {
  throw "Fabric test-network network.sh not found under $testNetworkPath"
}

if (-not (Test-Path $chaincodePath)) {
  throw "Chaincode path not found: $chaincodePath"
}

$bashTestNetworkPath = ConvertTo-BashPath $testNetworkPath
$bashChaincodePath = ConvertTo-BashPath $chaincodePath

if (-not $SkipDown) {
  Invoke-BashCommand "cd '$bashTestNetworkPath' && ./network.sh down"
}

Invoke-BashCommand "cd '$bashTestNetworkPath' && ./network.sh up createChannel -ca -c '$ChannelName'"
Invoke-BashCommand "cd '$bashTestNetworkPath' && ./network.sh deployCC -c '$ChannelName' -ccn '$ChaincodeName' -ccp '$bashChaincodePath' -ccl go"

Write-Host "Fabric local test network is running." -ForegroundColor Green
Write-Host "Channel: $ChannelName"
Write-Host "Chaincode: $ChaincodeName"
Write-Host "Next: run infra\fabric\scripts\export-gateway-env.ps1 to copy ignored Gateway material."

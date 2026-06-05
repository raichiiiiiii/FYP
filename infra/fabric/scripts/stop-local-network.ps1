param(
  [string]$FabricSamplesPath = $env:FABRIC_SAMPLES_PATH
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\fabric-paths.ps1"

$samplesPath = Get-MepnFabricSamplesPath -ConfiguredPath $FabricSamplesPath
$testNetworkPath = Join-Path $samplesPath 'test-network'

if (-not (Test-Path (Join-Path $testNetworkPath 'network.sh'))) {
  throw "Fabric test-network network.sh not found under $testNetworkPath"
}

$bashTestNetworkPath = ConvertTo-BashPath $testNetworkPath
Invoke-BashCommand "cd '$bashTestNetworkPath' && ./network.sh down"

Write-Host "Fabric local test network stopped." -ForegroundColor Green

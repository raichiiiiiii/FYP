param(
  [string]$FabricSamplesPath = $env:FABRIC_SAMPLES_PATH,
  [switch]$AllowMissingFabricSamples,
  [switch]$ReportOnly
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
}

function Resolve-FabricSamplesPath {
  param([string]$ConfiguredPath)

  if ($ConfiguredPath) {
    return $ConfiguredPath
  }

  return (Join-Path (Get-RepoRoot) 'infra\fabric\.local\fabric-samples')
}

function Test-Command {
  param(
    [string]$Name,
    [string]$Command
  )

  $found = Get-Command $Command -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Name = $Name
    Required = $true
    Available = [bool]$found
    Detail = if ($found) { $found.Source } else { "$Command not found on PATH" }
  }
}

function Test-FabricSamples {
  param([string]$Path)

  $networkScript = Join-Path $Path 'test-network\network.sh'
  [pscustomobject]@{
    Name = 'Fabric samples test-network'
    Required = -not $AllowMissingFabricSamples
    Available = Test-Path $networkScript
    Detail = $networkScript
  }
}

$fabricSamples = Resolve-FabricSamplesPath $FabricSamplesPath
$checks = @(
  (Test-Command -Name 'Docker' -Command 'docker'),
  (Test-Command -Name 'Git' -Command 'git'),
  (Test-Command -Name 'Bash' -Command 'bash'),
  (Test-Command -Name 'Go' -Command 'go'),
  (Test-FabricSamples -Path $fabricSamples)
)

$checks | Format-Table Name, Required, Available, Detail -AutoSize

$missingRequired = $checks | Where-Object { $_.Required -and -not $_.Available }

if ($missingRequired -and -not $ReportOnly) {
  $names = ($missingRequired | Select-Object -ExpandProperty Name) -join ', '
  throw "Missing required Fabric local-network prerequisites: $names"
}

if ($missingRequired) {
  Write-Host "Missing required prerequisites were found, but ReportOnly mode is enabled." -ForegroundColor Yellow
}

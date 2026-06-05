function Get-MepnRepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
}

function Get-MepnFabricSamplesPath {
  param([string]$ConfiguredPath)

  if ($ConfiguredPath) {
    return (Resolve-Path $ConfiguredPath).Path
  }

  return (Resolve-Path (Join-Path (Get-MepnRepoRoot) 'infra\fabric\.local\fabric-samples')).Path
}

function ConvertTo-BashPath {
  param([string]$Path)

  $resolved = (Resolve-Path $Path).Path
  $bash = Get-Command bash -ErrorAction SilentlyContinue
  if ($bash -and $bash.Source -like '*\System32\bash.exe') {
    if ($resolved -match '^([A-Za-z]):\\(.*)$') {
      $drive = $Matches[1].ToLowerInvariant()
      $tail = $Matches[2] -replace '\\', '/'
      return "/mnt/$drive/$tail"
    }
  }

  if ($resolved -match '^([A-Za-z]):\\(.*)$') {
    $drive = $Matches[1].ToLowerInvariant()
    $tail = $Matches[2] -replace '\\', '/'
    return "/$drive/$tail"
  }

  return ($resolved -replace '\\', '/')
}

function Invoke-BashCommand {
  param([string]$Command)

  $bash = Get-Command bash -ErrorAction SilentlyContinue
  if (-not $bash) {
    throw 'bash is required to run the Fabric samples test-network scripts.'
  }

  & bash -lc $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Bash command failed with exit code $LASTEXITCODE"
  }
}

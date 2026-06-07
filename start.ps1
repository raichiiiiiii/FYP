param(
  [switch]$ResetAll,
  [switch]$NoBuild,
  [switch]$SkipUat,
  [switch]$SeedOnly,
  [int]$HealthTimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ComposeFile = Join-Path $RepoRoot 'docker-compose.node.yml'
$EnvDir = Join-Path $RepoRoot '.env.nodes'
$NodeKeys = @(
  'amanah-retail',
  'barakah-supplies',
  'ihsan-foods',
  'nur-logistics',
  'salsabil-packaging',
  'taqwa-office',
  'hikmah-health',
  'mabrur-finance',
  'aman-capital',
  'safwa-growth'
)

function Write-Step {
  param([string]$Message)
  Write-Host "[mepn-multinode] $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[mepn-multinode] WARNING: $Message" -ForegroundColor Yellow
}

function Read-NodeEnv {
  param([string]$NodeKey)

  $path = Join-Path $EnvDir "$NodeKey.env"
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing node env file: $path"
  }

  $values = @{
    ENV_FILE = $path
  }

  foreach ($line in Get-Content -LiteralPath $path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $equalsIndex = $trimmed.IndexOf('=')
    if ($equalsIndex -le 0) {
      continue
    }

    $name = $trimmed.Substring(0, $equalsIndex).Trim()
    $value = $trimmed.Substring($equalsIndex + 1).Trim()
    $values[$name] = $value
  }

  return $values
}

function Stop-ProcessTree {
  param([int]$ProcessId)

  if ($ProcessId -le 0 -or $ProcessId -eq $PID) {
    return
  }

  $children = @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$ProcessId" -ErrorAction SilentlyContinue)
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId ([int]$child.ProcessId)
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-ProcessesOnPorts {
  param([int[]]$Ports)

  foreach ($port in $Ports) {
    $connections = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

    foreach ($processId in $pids) {
      if ($processId -and $processId -ne 0) {
        Write-Step "Stopping process $processId listening on port $port."
        Stop-ProcessTree -ProcessId ([int]$processId)
      }
    }
  }
}

function Stop-RepoNodeProcesses {
  $repoNeedle = $RepoRoot.Replace('\', '/').ToLowerInvariant()
  $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    if (-not $_.CommandLine) {
      return $false
    }

    $commandLine = $_.CommandLine.Replace('\', '/').ToLowerInvariant()
    return $commandLine.Contains($repoNeedle) -and (
      $commandLine.Contains('apps/api') -or
      $commandLine.Contains('apps/web') -or
      $commandLine.Contains('apps/worker')
    )
  })

  foreach ($process in $processes) {
    Write-Step "Stopping MEPN process $($process.ProcessId)."
    Stop-ProcessTree -ProcessId ([int]$process.ProcessId)
  }
}

function Invoke-NodeCompose {
  param(
    [hashtable]$Node,
    [string[]]$Arguments
  )

  Push-Location $RepoRoot
  try {
    & docker compose `
      -p $Node.COMPOSE_PROJECT_NAME `
      -f $ComposeFile `
      --env-file $Node.ENV_FILE `
      @Arguments
  } finally {
    Pop-Location
  }
}

function Wait-HttpOk {
  param(
    [string]$Url,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  return $false
}

function Invoke-NodeMigrationAndSeed {
  param([hashtable]$Node)

  Write-Step "Migrating $($Node.MEPN_NODE_KEY) database on localhost:$($Node.POSTGRES_HOST_PORT)."
  $oldDatabaseUrl = $env:DATABASE_URL
  $oldSingleNode = $env:MEPN_SINGLE_ORG_NODE
  $oldNodeKey = $env:MEPN_NODE_KEY
  $oldNodeOrgName = $env:MEPN_NODE_ORG_NAME
  $oldNodeOrgType = $env:MEPN_NODE_ORG_TYPE
  $oldNodeWebUrl = $env:MEPN_NODE_PUBLIC_WEB_URL
  $oldNodeApiUrl = $env:MEPN_NODE_PUBLIC_API_URL

  try {
    $env:DATABASE_URL = $Node.DATABASE_URL
    $env:MEPN_SINGLE_ORG_NODE = 'true'
    $env:MEPN_NODE_KEY = $Node.MEPN_NODE_KEY
    $env:MEPN_NODE_ORG_NAME = $Node.MEPN_NODE_ORG_NAME
    $env:MEPN_NODE_ORG_TYPE = $Node.MEPN_NODE_ORG_TYPE
    $env:MEPN_NODE_PUBLIC_WEB_URL = $Node.MEPN_NODE_PUBLIC_WEB_URL
    $env:MEPN_NODE_PUBLIC_API_URL = $Node.MEPN_NODE_PUBLIC_API_URL

    Push-Location $RepoRoot
    try {
      $migrationOutput = & corepack pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma 2>&1
      if ($LASTEXITCODE -ne 0) {
        $migrationOutput | ForEach-Object { Write-Host $_ }
        throw "Prisma migration failed for $($Node.MEPN_NODE_KEY)."
      }

      $seedOutput = & node tests/uat/seed-uat-demo.mjs --node $Node.MEPN_NODE_KEY 2>&1
      if ($LASTEXITCODE -ne 0) {
        $seedOutput | ForEach-Object { Write-Host $_ }
        throw "UAT seed failed for $($Node.MEPN_NODE_KEY)."
      }

      $summary = Convert-SeedSummaryOutput -OutputLines $seedOutput
      Write-Step "Seeded $($Node.MEPN_NODE_KEY) organization $($summary.organization.legalName)."
      return $summary
    } finally {
      Pop-Location
    }
  } finally {
    $env:DATABASE_URL = $oldDatabaseUrl
    $env:MEPN_SINGLE_ORG_NODE = $oldSingleNode
    $env:MEPN_NODE_KEY = $oldNodeKey
    $env:MEPN_NODE_ORG_NAME = $oldNodeOrgName
    $env:MEPN_NODE_ORG_TYPE = $oldNodeOrgType
    $env:MEPN_NODE_PUBLIC_WEB_URL = $oldNodeWebUrl
    $env:MEPN_NODE_PUBLIC_API_URL = $oldNodeApiUrl
  }
}

function Convert-SeedSummaryOutput {
  param([object[]]$OutputLines)

  $text = ($OutputLines | ForEach-Object { "$_" }) -join "`n"
  $start = $text.IndexOf('{')
  $end = $text.LastIndexOf('}')

  if ($start -lt 0 -or $end -lt $start) {
    throw 'Seed command did not return a JSON summary.'
  }

  return $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
}

function Invoke-SimulatedChannelBootstrap {
  Write-Step 'Establishing preconfigured local simulated federation channels.'

  Push-Location $RepoRoot
  try {
    & node tests/uat/bootstrap-local-node-federation.mjs
    if ($LASTEXITCODE -ne 0) {
      throw 'Local simulated federation channel bootstrap failed.'
    }
  } finally {
    Pop-Location
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI not found. Install Docker Desktop or Docker Engine before running start.ps1.'
}

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "Missing compose file: $ComposeFile"
}

Write-Step 'MEPN local multi-node startup.'
Write-Step 'Stopping local MEPN app processes and occupied node ports.'

$Nodes = @($NodeKeys | ForEach-Object { Read-NodeEnv -NodeKey $_ })
$ports = @()
foreach ($node in $Nodes) {
  $ports += [int]$node.WEB_HOST_PORT
  $ports += [int]$node.API_HOST_PORT
  $ports += [int]$node.POSTGRES_HOST_PORT
  $ports += [int]$node.REDIS_HOST_PORT
  $ports += [int]$node.MINIO_API_HOST_PORT
  $ports += [int]$node.MINIO_CONSOLE_HOST_PORT
}

Stop-RepoNodeProcesses
Stop-ProcessesOnPorts -Ports ($ports | Select-Object -Unique)

Write-Step 'Enabling Corepack and installing workspace dependencies.'
& corepack enable
& corepack pnpm install --frozen-lockfile

foreach ($node in $Nodes) {
  if ($ResetAll) {
    Write-Step "Resetting Docker volumes for $($node.MEPN_NODE_KEY)."
    Invoke-NodeCompose -Node $node -Arguments @('down', '-v', '--remove-orphans')
  } else {
    Write-Step "Stopping existing containers for $($node.MEPN_NODE_KEY)."
    Invoke-NodeCompose -Node $node -Arguments @('down', '--remove-orphans')
  }
}

if (-not $SeedOnly) {
  foreach ($node in $Nodes) {
    $upArgs = @('up', '-d')
    if (-not $NoBuild) {
      $upArgs += '--build'
    }

    Write-Step "Starting $($node.MEPN_NODE_KEY) on web $($node.WEB_HOST_PORT), API $($node.API_HOST_PORT)."
    Invoke-NodeCompose -Node $node -Arguments $upArgs
  }

  foreach ($node in $Nodes) {
    $healthUrl = "http://localhost:$($node.API_HOST_PORT)/api/v1/health"
    Write-Step "Waiting for $($node.MEPN_NODE_KEY) health at $healthUrl."

    if (-not (Wait-HttpOk -Url $healthUrl -TimeoutSeconds $HealthTimeoutSeconds)) {
      throw "Node $($node.MEPN_NODE_KEY) did not become healthy at $healthUrl."
    }
  }
}

foreach ($node in $Nodes) {
  $node['SEED_SUMMARY'] = Invoke-NodeMigrationAndSeed -Node $node
}

if ($SeedOnly) {
  Write-Warn 'SeedOnly was requested; skipping API-backed simulated channel bootstrap because node APIs may not be running.'
} else {
  Invoke-SimulatedChannelBootstrap
}

if (-not $SkipUat) {
  Write-Warn "Multi-node UAT spec is not implemented yet. Run existing use-case UAT with: corepack pnpm test:e2e -- tests/e2e/use-case-specification-uat.spec.ts"
}

Write-Host ''
Write-Host 'MEPN local multi-node startup completed.' -ForegroundColor Green
Write-Host 'Default local/UAT password for seeded users: password'
Write-Host ''
foreach ($node in $Nodes) {
  Write-Host ("{0,-20} Web: http://localhost:{1}  API: http://localhost:{2}/api/v1/health  Admin: admin@{0}.local" -f $node.MEPN_NODE_KEY, $node.WEB_HOST_PORT, $node.API_HOST_PORT)
}
Write-Host ''
Write-Host 'Boundary: local federation channels are simulated metadata only. Real Fabric topology mutation and real Fabric proof remain outside this local bootstrap.'

# Restart backend on port 5000 with latest code (Windows)
$ErrorActionPreference = "Stop"
$port = 5000
$backendRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Stopping processes on port $port..."
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

Write-Host "Starting backend from $backendRoot"
Set-Location $backendRoot

# Force PORT from backend/.env so a stale shell PORT=5003 does not hijack the server
$envFile = Join-Path $backendRoot ".env"
if (Test-Path $envFile) {
  $portLine = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1
  if ($portLine -match 'PORT\s*=\s*(\d+)') {
    $env:PORT = $Matches[1]
    Write-Host "Using PORT=$env:PORT from .env"
  }
}

npm run dev

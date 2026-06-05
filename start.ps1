# Life OS — one-command Docker launcher (Windows PowerShell).
#
# Usage:
#   .\start.ps1              build & start, then follow logs
#   .\start.ps1 stop         stop containers (keep data)
#   .\start.ps1 reset        stop containers AND delete the data volume
#   .\start.ps1 logs         tail logs only
#
# Requires Docker Desktop for Windows.

param(
    [Parameter(Position = 0)]
    [ValidateSet('up', 'start', 'stop', 'down', 'reset', 'logs')]
    [string]$Command = 'up'
)

$ErrorActionPreference = 'Stop'

function Test-Compose {
    docker compose version *>$null
    if ($LASTEXITCODE -eq 0) { return @('docker', 'compose') }
    Get-Command docker-compose -ErrorAction SilentlyContinue | Out-Null
    if ($LASTEXITCODE -eq 0 -and $?) { return @('docker-compose') }
    return $null
}

$compose = Test-Compose
if (-not $compose) {
    Write-Host "✗ Docker Compose not found. Install Docker Desktop and retry." -ForegroundColor Red
    exit 1
}

docker info *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker daemon is not running. Start Docker Desktop and retry." -ForegroundColor Red
    exit 1
}

function Invoke-Compose([string[]]$Extra) {
    $all = $compose + $Extra
    & $all[0] $all[1..($all.Length - 1)]
}

switch ($Command) {
    { $_ -in 'up', 'start' } {
        Write-Host "▸ Building and starting Life OS..." -ForegroundColor Cyan
        Invoke-Compose @('up', '-d', '--build')
        Write-Host ""
        Write-Host "→ Open http://localhost:3000" -ForegroundColor Green
        Write-Host "  Stop:  .\start.ps1 stop"
        Write-Host "  Reset: .\start.ps1 reset   (deletes the data volume)"
        Write-Host ""
        Write-Host "▸ Tailing logs (Ctrl+C to detach — the stack keeps running)" -ForegroundColor Cyan
        Invoke-Compose @('logs', '-f', '--tail=50')
        break
    }
    { $_ -in 'stop', 'down' } {
        Invoke-Compose @('down')
        break
    }
    'reset' {
        Invoke-Compose @('down', '--volumes')
        Write-Host "✓ Stack stopped and data volume removed." -ForegroundColor Green
        break
    }
    'logs' {
        Invoke-Compose @('logs', '-f', '--tail=100')
        break
    }
}

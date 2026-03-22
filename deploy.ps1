# POOZIX ML Visualizations — Deploy to nareshka.ru/poozix
# Usage: .\deploy.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$SERVER = "root@176.57.218.240"
$REMOTE_DIR = "/var/www/nareshka/poozix"

function Log($msg) { Write-Host "[+] $msg" -ForegroundColor Green }
function Err($msg) { Write-Host "[x] $msg" -ForegroundColor Red; exit 1 }

Write-Host "=== POOZIX Deploy ===" -ForegroundColor Cyan
Write-Host ""

Log "Building frontend (base=/poozix/)..."
Push-Location HTML
npx vite build --base=/poozix/
if ($LASTEXITCODE -ne 0) { Pop-Location; Err "Build failed" }
Pop-Location

Log "Uploading to $REMOTE_DIR..."
ssh $SERVER "mkdir -p ${REMOTE_DIR}"
tar -cf - -C HTML/dist . | ssh $SERVER "rm -rf ${REMOTE_DIR}/* && tar -xf - -C ${REMOTE_DIR}"

Log "Reloading nginx..."
ssh $SERVER "nginx -t && systemctl reload nginx"

Write-Host ""
Log "Deploy complete! https://nareshka.ru/poozix/"

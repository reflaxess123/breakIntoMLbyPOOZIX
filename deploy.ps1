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

# 1. Build frontend
Log "Building frontend (base=/poozix/)..."
Push-Location HTML
npx vite build --base=/poozix/
if ($LASTEXITCODE -ne 0) { Pop-Location; Err "Build failed" }
Pop-Location

# 2. Generate roadmaps manifest
Log "Generating roadmaps manifest..."
$mdFiles = Get-ChildItem -Path "Roadmaps" -Filter "*.md" | Select-Object -ExpandProperty Name | Sort-Object
$manifest = $mdFiles | ConvertTo-Json -Compress
Set-Content -Path "HTML/dist/roadmaps/manifest.json" -Value $manifest -Force -NoNewline
# Copy .md files to dist
New-Item -ItemType Directory -Path "HTML/dist/roadmaps" -Force | Out-Null
Set-Content -Path "HTML/dist/roadmaps/manifest.json" -Value $manifest -Force -NoNewline
foreach ($f in $mdFiles) {
    Copy-Item "Roadmaps/$f" "HTML/dist/roadmaps/$f"
}
Log "  $($mdFiles.Count) roadmaps packaged"

# 3. Upload everything
Log "Uploading to $REMOTE_DIR..."
ssh $SERVER "mkdir -p ${REMOTE_DIR}"
tar -cf - -C HTML/dist . | ssh $SERVER "rm -rf ${REMOTE_DIR}/* && tar -xf - -C ${REMOTE_DIR}"

# 4. Reload nginx
Log "Reloading nginx..."
ssh $SERVER "nginx -t && systemctl reload nginx"

Write-Host ""
Log "Deploy complete! https://nareshka.ru/poozix/"

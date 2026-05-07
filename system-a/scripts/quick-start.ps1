# =============================================
# System A - Quick Start (One Click)
# =============================================

Write-Host "🚀 System A - Quick Start" -ForegroundColor Cyan
Write-Host "============================================`n"

# Kill old processes
Write-Host "Stopping any running instances..." -ForegroundColor Yellow
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start all 3 instances
Write-Host "Starting 3 instances..." -ForegroundColor Green
.\scripts\start-all.ps1

Start-Sleep -Seconds 6

# Run Health Check
Write-Host "`nRunning Health Check..." -ForegroundColor Cyan
.\scripts\health-check.ps1

# Run Smoke Test
Write-Host "`nRunning Smoke Test..." -ForegroundColor Cyan
.\scripts\smoke-test.ps1

Write-Host "`n🎉 Quick Start Completed Successfully!" -ForegroundColor Green
Write-Host "You can now start the full system with just one command:" -ForegroundColor Yellow
Write-Host ".\scripts\quick-start.ps1" -ForegroundColor White
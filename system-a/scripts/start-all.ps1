# =============================================
# System A - Start All 3 Instances (Fixed Version)
# =============================================

Write-Host "🚀 Starting System A - All 3 Instances..." -ForegroundColor Cyan
Write-Host "============================================`n"

$basePath = $PWD

# Function to start an instance
function Start-Instance {
    param($InstanceId, $Port)
    
    Write-Host "Starting Instance $InstanceId (Port $Port)..." -ForegroundColor Green
    
    $env:PORT = $Port
    $env:INSTANCE_ID = $InstanceId
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "
        cd '$basePath';
        `$env:PORT = '$Port';
        `$env:INSTANCE_ID = '$InstanceId';
        npm start
    " -WindowStyle Normal
}

# Start all 3 instances
Start-Instance -InstanceId 1 -Port 3000
Start-Sleep -Seconds 3

Start-Instance -InstanceId 2 -Port 3001
Start-Sleep -Seconds 3

Start-Instance -InstanceId 3 -Port 3002

Write-Host "`n🎉 All 3 instances launched!" -ForegroundColor Cyan
Write-Host "Please wait 5-10 seconds for them to fully start."
# =============================================
# System A - Edge Case + Stress Testing Suite
# =============================================

Write-Host "============================================`n"
Write-Host "🧪 Running Edge Case + Stress Tests" -ForegroundColor Cyan
Write-Host "============================================`n"

$baseUrl = "http://localhost:3000"

# ---------------------------------------------
# Core Test Function
# ---------------------------------------------
function Test-Endpoint {
    param(
        $Name,
        $Method,
        $Url,
        $Body,
        $ExpectedStatus = 200
    )

    Write-Host "`n➡️  $Name" -ForegroundColor Yellow

    try {
        $params = @{
            Uri         = $Url
            Method      = $Method
            TimeoutSec  = 10
            UseBasicParsing = $true
        }

        if ($Method -eq "POST" -and $Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }

        $response = Invoke-WebRequest @params

        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ Passed ($($response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Unexpected Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        $status = if ($_.Exception.Response) {
            $_.Exception.Response.StatusCode.value__
        } else {
            "No Response"
        }

        if ($status -eq $ExpectedStatus) {
            Write-Host "   ✅ Passed (Expected $ExpectedStatus)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Failed ($status)" -ForegroundColor Red
        }
    }
}

# =============================================
# 1. NORMAL TESTS
# =============================================
Write-Host "`n================ NORMAL TESTS ================" -ForegroundColor Cyan

Test-Endpoint "Light Endpoint" "GET" "$baseUrl/api/light"
Test-Endpoint "Moderate Endpoint" "POST" "$baseUrl/api/moderate" "{}"
Test-Endpoint "Heavy Endpoint" "POST" "$baseUrl/api/heavy" '{"n": 35}'

# =============================================
# 2. EDGE CASE TEST MATRIX
# =============================================
Write-Host "`n================ EDGE CASES ================" -ForegroundColor Cyan

$edgeCases = @(
    @{ Name="Large Payload (500KB)"; Method="POST"; Url="$baseUrl/api/moderate"; Body=(@{data = "x" * 500000} | ConvertTo-Json) },
    @{ Name="Empty Body"; Method="POST"; Url="$baseUrl/api/moderate"; Body="{}" },
    @{ Name="Invalid JSON"; Method="POST"; Url="$baseUrl/api/moderate"; Body="invalid json"; Expected=400 },
    @{ Name="404 Not Found"; Method="GET"; Url="$baseUrl/api/not-exist"; Expected=404 },
    @{ Name="Heavy Fibonacci (n=40)"; Method="POST"; Url="$baseUrl/api/heavy"; Body='{"n":40}' }
)

foreach ($test in $edgeCases) {
    Test-Endpoint `
        $test.Name `
        $test.Method `
        $test.Url `
        $test.Body `
        ($test.Expected ?? 200)
}

# =============================================
# 3. RANDOMIZED STRESS TEST
# =============================================
Write-Host "`n================ RANDOM STRESS ================" -ForegroundColor Cyan

1..20 | ForEach-Object {
    $n = Get-Random -Minimum 25 -Maximum 45
    $payload = @{ n = $n } | ConvertTo-Json

    try {
        Invoke-WebRequest `
            -Uri "$baseUrl/api/heavy" `
            -Method POST `
            -Body $payload `
            -ContentType "application/json" `
            -UseBasicParsing | Out-Null
    } catch {}
}

Write-Host "   ✅ Random stress completed" -ForegroundColor Green

# =============================================
# 4. CONCURRENT LOAD TEST
# =============================================
Write-Host "`n================ CONCURRENT LOAD ================" -ForegroundColor Cyan
Write-Host "🔥 Sending 50 parallel requests..." -ForegroundColor Yellow

1..50 | ForEach-Object -Parallel {
    try {
        Invoke-WebRequest `
            -Uri "http://localhost:3000/api/light" `
            -Method Get `
            -UseBasicParsing | Out-Null
    } catch {}
}

Write-Host "   ✅ Concurrent load completed" -ForegroundColor Green

# =============================================
# 5. FINAL RESULT
# =============================================
Write-Host "`n🎉 ALL EDGE CASE TESTS COMPLETED" -ForegroundColor Cyan
# Fix Wallet Balance Script for Windows
# User ID: LmVt8JBYZadUzFnpRqcrzPongvD2

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "FIXING WALLET BALANCE" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$userId = "LmVt8JBYZadUzFnpRqcrzPongvD2"
$apiUrl = "http://localhost:3000/api/wallet/fix-balance"

Write-Host "User ID: $userId" -ForegroundColor Yellow
Write-Host "API URL: $apiUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Calling balance fix API..." -ForegroundColor White

try {
    $body = @{
        userId = $userId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json"

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "SUCCESS! BALANCE FIXED" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Old Balance: Rs.$($response.oldBalance)" -ForegroundColor Red
    Write-Host "New Balance: Rs.$($response.newBalance)" -ForegroundColor Green
    Write-Host "Difference: Rs.$($response.difference)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Total Credits: Rs.$($response.creditTotal)" -ForegroundColor Cyan
    Write-Host "Total Debits: Rs.$($response.debitTotal)" -ForegroundColor Cyan
    Write-Host "Transactions Analyzed: $($response.transactionCount)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host "Your wallet balance has been corrected!" -ForegroundColor Green
    Write-Host "Please refresh your browser to see the update." -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host "ERROR" -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. Your Next.js app is running (npm run dev)" -ForegroundColor Yellow
    Write-Host "2. It's running on http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


$cred = '{"email":"test@test.com","password":"123456"}'
$login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $cred -ContentType "application/json" -UseBasicParsing
$token = ($login.Content | ConvertFrom-Json).access_token

$r1 = Invoke-WebRequest -Uri "http://localhost:3001/api/properties?date=2026-07-25" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "=== Available on 2026-07-25 (no reservation) ==="
$r1.Content

$r2 = Invoke-WebRequest -Uri "http://localhost:3001/api/properties?date=2026-07-15" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "=== Available on 2026-07-15 (during reservation) ==="
$r2.Content

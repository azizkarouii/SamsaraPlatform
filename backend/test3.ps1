$cred = '{"email":"test@test.com","password":"123456"}'
$login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $cred -ContentType "application/json" -UseBasicParsing
$token = ($login.Content | ConvertFrom-Json).access_token

# First test: no params
$r0 = Invoke-WebRequest -Uri "http://localhost:3001/api/properties" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "=== All properties ==="
$r0.Content

# Second test: with date
$r1 = Invoke-WebRequest -Uri "http://localhost:3001/api/properties?date=2026-07-25" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing
Write-Host "=== Available on 2026-07-25 ==="
$r1.Content

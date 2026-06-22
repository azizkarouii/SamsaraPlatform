$cred = '{"email":"test@test.com","password":"123456"}'
$login = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $cred -ContentType "application/json" -UseBasicParsing
$token = ($login.Content | ConvertFrom-Json).access_token

Write-Host "=== Profile ==="
try { $r = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/profile" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing; Write-Host $r.Content } catch { Write-Host "Profile failed: $_" }

Write-Host "=== Properties ==="
try { $r = Invoke-WebRequest -Uri "http://localhost:3001/api/properties" -Method Get -Headers @{Authorization="Bearer $token"} -UseBasicParsing; Write-Host $r.Content } catch { Write-Host "Properties failed: $_" }

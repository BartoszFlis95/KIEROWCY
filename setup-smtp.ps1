# Skrypt do ustawienia zmiennych środowiskowych SMTP
# Uruchom ten skrypt w PowerShell przed startem serwera
# UWAGA: Domyślne wartości są już ustawione w kodzie, ten skrypt jest opcjonalny

$env:SMTP_HOST="serwer2524780.home.pl"
$env:SMTP_PORT="587"
$env:SMTP_SECURE="false"
$env:SMTP_USER="test@deneeu.pl"
$env:SMTP_PASS="Bumszakalaka32#"

Write-Host "✅ Zmienne środowiskowe SMTP zostały ustawione:" -ForegroundColor Green
Write-Host "   Host: $env:SMTP_HOST"
Write-Host "   Port: $env:SMTP_PORT"
Write-Host "   Email: $env:SMTP_USER"
Write-Host ""
Write-Host "Możesz teraz uruchomić serwer: npm start" -ForegroundColor Green


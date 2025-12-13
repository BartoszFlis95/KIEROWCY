# Instrukcja wdrożenia na Render

## Konfiguracja zmiennych środowiskowych

W panelu Render (Settings → Environment Variables) ustaw następujące zmienne:

### Wymagane zmienne:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<wygeneruj bezpieczny klucz>
SMTP_HOST=serwer2524780.home.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=test@deneeu.pl
SMTP_PASS=Bumszakalaka32#
```

### Opcjonalne zmienne:

```
API_URL=https://www.deneeu.pl
```

## Uwagi:

1. **JWT_SECRET**: Wygeneruj bezpieczny klucz (np. użyj generatora online lub `openssl rand -base64 32`)

2. **SMTP_PASS**: Ustaw ręcznie w panelu Render jako zmienna prywatna (nie commituj do repozytorium!)

3. **Port**: Render automatycznie ustawia zmienną PORT, kod już to obsługuje

4. **Dane użytkowników**: Plik `data/users.json` będzie tworzony automatycznie przy pierwszym uruchomieniu

5. **Uploads**: Katalog `uploads/` będzie tworzony automatycznie przez multer

## Build Command:
```
npm install
```

## Start Command:
```
npm start
```

## Health Check:
Render automatycznie sprawdza czy aplikacja odpowiada na porcie.

## Logi:
Wszystkie logi są dostępne w panelu Render → Logs



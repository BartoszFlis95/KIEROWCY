# Rejestr Użytkowników

Nowoczesna aplikacja webowa do rejestracji, logowania i zarządzania użytkownikami z panelami: czas pracy, urlopy i plan.

## Funkcjonalności

- ✅ Rejestracja nowych użytkowników
- ✅ Logowanie użytkowników (JWT)
- ✅ Panel użytkownika z zakładkami:
  - ⏰ **Czas pracy** - rejestracja godzin pracy
  - 🏖️ **Urlopy** - składanie wniosków urlopowych
  - 📅 **Plan** - zarządzanie planem pracy
- ✅ Walidacja danych wejściowych
- ✅ Bezpieczne przechowywanie haseł (bcrypt)
- ✅ Autoryzacja JWT
- ✅ Przeglądanie listy zarejestrowanych użytkowników
- ✅ Nowoczesny i responsywny interfejs użytkownika

## Wymagania

- Node.js (wersja 14 lub nowsza)
- npm (Node Package Manager)

## Instalacja

1. Zainstaluj zależności:
```bash
npm install
```

## Uruchomienie

1. Uruchom serwer:
```bash
npm start
```

2. Otwórz przeglądarkę i przejdź do:
```
http://localhost:3000
```

## Struktura projektu

```
.
├── server.js          # Serwer Express.js
├── package.json       # Zależności projektu
├── public/            # Pliki frontendowe
│   ├── index.html     # Strona rejestracji
│   ├── login.html     # Strona logowania
│   ├── dashboard.html # Panel użytkownika
│   ├── style.css      # Style CSS
│   ├── script.js       # Logika rejestracji
│   ├── login.js        # Logika logowania
│   └── dashboard.js    # Logika panelu użytkownika
└── data/              # Przechowywanie danych (tworzone automatycznie)
    └── users.json     # Plik z danymi użytkowników
```

## API Endpoints

### POST /api/register
Rejestracja nowego użytkownika

**Body:**
```json
{
  "imie": "Jan",
  "nazwisko": "Kowalski",
  "email": "jan@example.com",
  "haslo": "haslo123",
  "telefon": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Użytkownik został zarejestrowany pomyślnie",
  "user": { ... }
}
```

### POST /api/login
Logowanie użytkownika

**Body:**
```json
{
  "email": "jan@example.com",
  "haslo": "haslo123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logowanie pomyślne",
  "token": "jwt-token",
  "user": { ... }
}
```

### GET /api/me
Pobranie danych zalogowanego użytkownika (wymaga autoryzacji)

**Headers:**
```
Authorization: Bearer <token>
```

### GET /api/users
Pobranie listy wszystkich użytkowników

**Response:**
```json
{
  "success": true,
  "users": [ ... ]
}
```

### POST /api/czas-pracy
Dodanie wpisu czasu pracy (wymaga autoryzacji)

**Body:**
```json
{
  "data": "2024-01-15",
  "start": "09:00",
  "koniec": "17:00",
  "opis": "Praca w biurze"
}
```

### GET /api/czas-pracy
Pobranie czasu pracy użytkownika (wymaga autoryzacji)

### POST /api/urlopy
Dodanie wniosku urlopowego (wymaga autoryzacji)

**Body:**
```json
{
  "dataOd": "2024-02-01",
  "dataDo": "2024-02-05",
  "typ": "wypoczynkowy",
  "opis": "Urlop wypoczynkowy"
}
```

### GET /api/urlopy
Pobranie urlopów użytkownika (wymaga autoryzacji)

### POST /api/plan
Dodanie wpisu do planu (wymaga autoryzacji)

**Body:**
```json
{
  "data": "2024-01-20",
  "tytul": "Spotkanie z klientem",
  "opis": "Omówienie projektu",
  "priorytet": "wysoki"
}
```

### GET /api/plan
Pobranie planu użytkownika (wymaga autoryzacji)

## Bezpieczeństwo

- Hasła są hashowane przy użyciu bcrypt
- Autoryzacja JWT (JSON Web Tokens)
- Middleware do weryfikacji tokenów
- Walidacja danych wejściowych
- Ochrona przed XSS (escapowanie HTML)
- Tokeny przechowywane w localStorage

## Użytkowanie

1. **Rejestracja**: Przejdź do strony głównej i zarejestruj nowe konto
2. **Logowanie**: Zaloguj się używając adresu email i hasła
3. **Panel użytkownika**: Po zalogowaniu masz dostęp do:
   - Rejestracji czasu pracy
   - Składania wniosków urlopowych
   - Zarządzania planem pracy

## Technologie

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Bezpieczeństwo:** bcryptjs, jsonwebtoken
- **Autoryzacja:** JWT (JSON Web Tokens)
- **Przechowywanie danych:** JSON file


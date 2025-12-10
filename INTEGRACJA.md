# Integracja Aplikacji - Przepływ Funkcjonalności

## Przepływ użytkownika

### 1. Rejestracja → Logowanie → Dashboard
```
Strona główna (/) 
  ↓ (przekierowanie)
login.html
  ↓ (link "Zarejestruj się")
index.html (rejestracja)
  ↓ (po rejestracji)
login.html (automatyczne przekierowanie)
  ↓ (po zalogowaniu)
dashboard.html (panel użytkownika)
```

### 2. Autoryzacja
- **Token JWT** przechowywany w `localStorage`
- **Automatyczne sprawdzanie** tokenu przy wejściu na dashboard
- **Automatyczne przekierowanie** do logowania przy braku/wygasłym tokenie
- **Weryfikacja tokenu** z serwerem przy ładowaniu dashboardu

### 3. Funkcjonalności Dashboardu

#### ⏰ Czas Pracy
- Dodawanie wpisów czasu pracy (data, start, koniec, opis)
- Wyświetlanie listy wpisów
- Automatyczne odświeżanie po dodaniu

#### 🏖️ Urlopy
- Składanie wniosków urlopowych (data od/do, typ, opis)
- Wyświetlanie listy wniosków ze statusem
- Automatyczne odświeżanie po dodaniu

#### 📅 Plan
- Dodawanie wpisów do planu (data, tytuł, opis, priorytet)
- Wyświetlanie listy wpisów z priorytetami
- Automatyczne odświeżanie po dodaniu

## Połączenia API

### Publiczne endpointy:
- `POST /api/register` - Rejestracja
- `POST /api/login` - Logowanie
- `GET /api/users` - Lista użytkowników (publiczna)

### Chronione endpointy (wymagają tokenu):
- `GET /api/me` - Dane użytkownika
- `POST /api/czas-pracy` - Dodanie czasu pracy
- `GET /api/czas-pracy` - Pobranie czasu pracy
- `POST /api/urlopy` - Dodanie urlopu
- `GET /api/urlopy` - Pobranie urlopów
- `POST /api/plan` - Dodanie wpisu do planu
- `GET /api/plan` - Pobranie planu

## Mechanizmy bezpieczeństwa

1. **Hashowanie haseł** - bcrypt
2. **JWT tokens** - autoryzacja
3. **Middleware autoryzacji** - weryfikacja tokenu
4. **Escapowanie HTML** - ochrona przed XSS
5. **Walidacja danych** - po stronie serwera i klienta

## Komunikacja Frontend-Backend

### Rejestracja:
1. Formularz → `POST /api/register`
2. Sukces → przekierowanie do `login.html`
3. Błąd → wyświetlenie komunikatu

### Logowanie:
1. Formularz → `POST /api/login`
2. Sukces → zapis tokenu w localStorage → przekierowanie do `dashboard.html`
3. Błąd → wyświetlenie komunikatu

### Dashboard:
1. Sprawdzenie tokenu przy ładowaniu
2. Weryfikacja z serwerem (`GET /api/me`)
3. Ładowanie danych dla aktywnej zakładki
4. Wszystkie operacje wymagają tokenu w headerze `Authorization: Bearer <token>`

## Obsługa błędów

- **Brak tokenu** → przekierowanie do logowania
- **Nieważny token** → usunięcie z localStorage → przekierowanie do logowania
- **Błąd serwera** → wyświetlenie komunikatu użytkownikowi
- **Błąd połączenia** → komunikat o problemie z serwerem

## Komunikaty użytkownika

- **Sukces** - zielone komunikaty (rejestracja, logowanie, zapis danych)
- **Błąd** - czerwone komunikaty (walidacja, błędy serwera)
- **Toast notifications** - komunikaty w prawym górnym rogu (dashboard)

## Wszystkie komponenty są zintegrowane i funkcjonalne! ✅


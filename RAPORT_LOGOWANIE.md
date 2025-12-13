# RAPORT ANALIZY KODU - LOGOWANIE, HASŁA, LOGINY I UŻYTKOWNICY

## 📋 PRZEGLĄD PLIKÓW

### 1. **server.js** - Backend API

#### ✅ **Funkcje pomocnicze (linie 21-54)**
- `readUsers()` - odczyt użytkowników z pliku JSON ✅
- `writeUsers()` - zapis użytkowników do pliku JSON ✅
- `updateUser()` - aktualizacja użytkownika ✅

#### ⚠️ **Rejestracja użytkowników (linie 63-99)**
**PROBLEM 1:** Rejestracja NIE tworzy pola `login`
- Tworzy tylko: `id`, `imie`, `nazwisko`, `email`, `haslo`, `telefon`, `dataRejestracji`, `czasPracy`, `urlopy`, `plan`, `role`
- Brak pola `login` w nowych użytkownikach
- **Konsekwencja:** Użytkownicy zarejestrowani przez formularz nie będą mogli logować się przez login, tylko przez email

**PROBLEM 2:** Sprawdza tylko duplikaty email, nie loginu
- Linia 74: `if (users.some(u => u.email === email))`
- Nie sprawdza czy login już istnieje

**✅ Poprawne:**
- Walidacja email (regex)
- Walidacja długości hasła (min 6 znaków)
- Hashowanie hasła przez bcrypt (10 rounds)
- Domyślna rola: `'driver'`

#### ✅ **Logowanie (linie 102-154)**
**DZIAŁA POPRAWNIE:**
- Akceptuje zarówno `login` jak i `email` w req.body
- Sprawdza użytkownika po loginie LUB emailu (linia 120-125)
- Porównuje hasło przez `bcrypt.compare()`
- Generuje token JWT
- Zwraca użytkownika bez hasła

**⚠️ UWAGA:**
- Jeśli użytkownik nie ma pola `login`, `u.login` będzie `undefined`
- Porównanie `u.login === loginOrEmail` zwróci `false` dla undefined
- To jest OK - użytkownik będzie mógł się zalogować przez email

#### ✅ **Middleware autoryzacji (linie 157-166)**
- Sprawdza token JWT w headerze `Authorization`
- Weryfikuje token przez `jwt.verify()`
- Ustawia `req.user` z payload tokenu
- **DZIAŁA POPRAWNIE**

---

### 2. **public/login.js** - Frontend logowania

#### ✅ **Logika logowania (linie 10-58)**
**DZIAŁA POPRAWNIE:**
- Jeśli input email === 'admin', wysyła `{ login: 'admin', haslo }`
- W przeciwnym razie wysyła `{ email, haslo }`
- Zapisuje token i user do localStorage
- Przekierowuje do `admin.html` jeśli `role === 'admin'`
- Przekierowuje do `dashboard.html` dla innych użytkowników

**⚠️ UWAGA:**
- Pole w formularzu nazywa się `email`, ale może być użyte jako login
- To jest OK - backend akceptuje oba formaty

---

### 3. **public/script.js** - Rejestracja

#### ✅ **Rejestracja (linie 4-48)**
- Wysyła dane do `/api/register`
- Wysyła: `imie`, `nazwisko`, `email`, `telefon`, `haslo`
- **NIE wysyła pola `login`** - to jest zgodne z backendem

---

### 4. **public/dashboard.js** - Panel kierowcy

#### ✅ **Autoryzacja (linie 10-31)**
- Sprawdza token w localStorage
- Sprawdza czy `user.role === 'driver'`
- Przekierowuje do login.html jeśli brak autoryzacji
- **DZIAŁA POPRAWNIE**

---

### 5. **public/admin.js** - Panel administratora

#### ✅ **Autoryzacja (linie 10-36)**
- Sprawdza token w localStorage
- Sprawdza czy `user.role === 'admin'`
- Przekierowuje do login.html jeśli brak autoryzacji
- **DZIAŁA POPRAWNIE**

---

### 6. **data/users.json** - Baza użytkowników

#### ✅ **Struktura użytkowników:**
```json
{
  "id": "admin-1",
  "login": "admin",           // ✅ Ma login
  "email": "admin@deneeu.pl", // ✅ Ma email
  "haslo": "$2a$10$...",      // ✅ Zahashowane hasło
  "role": "admin"             // ✅ Rola ustawiona
}
```

```json
{
  "id": "bus-1765639818579",
  "login": "kierowca1",              // ✅ Ma login
  "email": "bartoszflis95@gmail.com", // ✅ Ma email
  "haslo": "$2a$10$...",             // ✅ Zahashowane hasło
  "pseudonim": "bus",                 // ✅ Pseudonim
  "role": "driver"                    // ✅ Rola ustawiona
}
```

---

## 🔍 ZNALEZIONE PROBLEMY

### ❌ **PROBLEM 1: Rejestracja nie tworzy pola `login`**
**Lokalizacja:** `server.js` linia 79-85

**Opis:**
- Nowi użytkownicy zarejestrowani przez formularz nie mają pola `login`
- Mogą logować się tylko przez email, nie przez login

**Rozwiązanie:**
- Dodać generowanie loginu podczas rejestracji (np. z email lub imię+nazwisko)
- LUB pozostawić jak jest (logowanie tylko przez email)

### ⚠️ **PROBLEM 2: Brak sprawdzania duplikatów loginu**
**Lokalizacja:** `server.js` linia 74

**Opis:**
- Sprawdza tylko duplikaty email
- Nie sprawdza duplikatów loginu

**Rozwiązanie:**
- Dodać sprawdzanie duplikatów loginu jeśli login jest wymagany

### ⚠️ **PROBLEM 3: Endpoint `/api/send-email` nie sprawdza pola `pseudonim`**
**Lokalizacja:** `server.js` linie 289-320

**Opis:**
- Endpoint `/api/send-email` otrzymuje `pseudonim` w danych (linia 287)
- Ale nie używa go do wyszukiwania użytkownika
- Sprawdza tylko: telefon, imię+nazwisko, samo imię
- Użytkownik "bus" ma pole `pseudonim: "bus"`, ale nie będzie znaleziony po pseudonimie

**Rozwiązanie:**
- Dodać sprawdzanie po polu `pseudonim` jako pierwsza próba wyszukiwania:
```javascript
// Próba 0: Szukaj po pseudonimie
if (pseudonim) {
  user = users.find(u => u.pseudonim && u.pseudonim.toLowerCase().trim() === pseudonim.toLowerCase().trim());
}
```

---

## ✅ CO DZIAŁA POPRAWNIE

1. ✅ Hashowanie haseł przez bcrypt (10 rounds)
2. ✅ Logowanie przez login LUB email
3. ✅ Generowanie tokenów JWT
4. ✅ Middleware autoryzacji
5. ✅ Sprawdzanie ról użytkowników (admin/driver)
6. ✅ Przekierowania po zalogowaniu (admin → admin.html, driver → dashboard.html)
7. ✅ Walidacja email (regex)
8. ✅ Walidacja długości hasła (min 6 znaków)
9. ✅ Bezpieczne przechowywanie haseł (nie zwracane w odpowiedziach API)

---

## 📝 REKOMENDACJE

### 1. **Opcjonalne: Dodać generowanie loginu podczas rejestracji**
```javascript
// W server.js, linia 79-85
const login = email.split('@')[0]; // lub inna logika
// Sprawdź duplikaty loginu
if (users.some(u => u.login === login)) {
  return res.status(400).json({ success: false, message: 'Login już istnieje' });
}
const newUser = {
  // ...
  login: login,
  // ...
};
```

### 2. **Opcjonalne: Dodać sprawdzanie duplikatów loginu**
```javascript
// W server.js, linia 74
if (users.some(u => u.email === email || u.login === login)) {
  return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });
}
```

### 3. **Aktualnie system działa poprawnie:**
- Admin może logować się przez login "admin" lub email "admin@deneeu.pl"
- Kierowcy mogą logować się przez login (jeśli mają) lub email
- Hasła są bezpiecznie hashowane
- Autoryzacja działa poprawnie

---

## 🎯 PODSUMOWANIE

**Status:** System logowania działa **POPRAWNIE** dla istniejących użytkowników.

**Uwagi:**
- Nowi użytkownicy zarejestrowani przez formularz nie będą mieli pola `login`
- Mogą logować się tylko przez email (co jest akceptowalne)
- Jeśli potrzebujesz, aby wszyscy użytkownicy mieli login, należy dodać generowanie loginu podczas rejestracji

**Bezpieczeństwo:**
- ✅ Hasła hashowane przez bcrypt
- ✅ Tokeny JWT z wygaśnięciem (24h)
- ✅ Hasła nie są zwracane w odpowiedziach API
- ✅ Autoryzacja wymagana dla chronionych endpointów


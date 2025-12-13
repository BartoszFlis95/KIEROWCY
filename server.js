// server.js
const API_URL = "https://www.deneeu.pl";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'zmien-to-w-produkcji';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// helper: read/write users
async function readUsers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const trimmedData = data.trim();
    
    // Jeśli plik jest pusty lub zawiera tylko białe znaki, zwróć pustą tablicę
    if (!trimmedData || trimmedData === '') {
      console.log(`Plik ${DATA_FILE} jest pusty, zwracam pustą tablicę`);
      return [];
    }
    
    const users = JSON.parse(trimmedData);
    
    // Upewnij się, że to tablica
    if (!Array.isArray(users)) {
      console.error(`Plik ${DATA_FILE} nie zawiera tablicy, zwracam pustą tablicę`);
      return [];
    }
    
    console.log(`Odczytano ${users.length} użytkowników z ${DATA_FILE}`);
    return users;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Plik ${DATA_FILE} nie istnieje, tworzenie nowego...`);
      return [];
    }
    console.error('Błąd odczytu użytkowników:', err);
    console.error('Szczegóły błędu:', err.message);
    return [];
  }
}
async function writeUsers(users) {
  try {
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    const jsonData = JSON.stringify(users, null, 2);
    await fs.writeFile(DATA_FILE, jsonData, 'utf8');
    console.log(`Zapisano ${users.length} użytkowników do ${DATA_FILE}`);
    return true;
  } catch (err) {
    console.error('writeUsers error', err);
    console.error('Ścieżka pliku:', DATA_FILE);
    return false;
  }
}

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { imie, nazwisko, email, haslo, telefon } = req.body;
    if (!imie || !nazwisko || !email || !haslo) {
      return res.status(400).json({ success: false, message: 'Wszystkie pola wymagane' });
    }
    
    // Normalizuj email (lowercase)
    const normalizedEmail = email.toLowerCase().trim();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) return res.status(400).json({ success: false, message: 'Nieprawidłowy email' });
    if (haslo.length < 6) return res.status(400).json({ success: false, message: 'Hasło min 6 znaków' });

    const users = await readUsers();
    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });
    }

    const hashed = await bcrypt.hash(haslo, 10);
    console.log(`Tworzenie użytkownika: ${normalizedEmail}`);
    
    const newUser = {
      id: Date.now().toString(),
      imie, nazwisko, email: normalizedEmail, haslo: hashed, telefon: telefon || '',
      dataRejestracji: new Date().toISOString(),
      czasPracy: [], urlopy: [], plan: [],
      role: 'driver' // Dodajemy rolę kierowcy
    };
    
    console.log(`Dodawanie użytkownika do listy (obecnie ${users.length} użytkowników)`);
    users.push(newUser);
    
    const writeResult = await writeUsers(users);
    if (!writeResult) {
      console.error('Błąd zapisu użytkownika do pliku');
      return res.status(500).json({ success: false, message: 'Błąd zapisu danych' });
    }
    
    // Sprawdź czy użytkownik został zapisany
    const verifyUsers = await readUsers();
    console.log(`Po zapisie: ${verifyUsers.length} użytkowników w bazie`);
    const savedUser = verifyUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!savedUser) {
      console.error('BŁĄD: Użytkownik nie został zapisany!');
      return res.status(500).json({ success: false, message: 'Błąd zapisu użytkownika' });
    }
    
    const { haslo: pw, ...userWithoutPassword } = newUser;
    console.log(`✓ Zarejestrowano użytkownika: ${normalizedEmail}`);
    res.status(201).json({ success: true, message: 'Zarejestrowano', user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, haslo } = req.body;
    
    // Normalizuj email (lowercase)
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    
    console.log(`Próba logowania: email=${normalizedEmail}`);
    
    if (!normalizedEmail || !haslo) {
      console.log('Brak email lub hasła');
      return res.status(400).json({ success: false, message: 'Email i hasło wymagane' });
    }

    const users = await readUsers();
    console.log(`Znaleziono ${users.length} użytkowników w bazie`);
    console.log('Lista emaili:', users.map(u => u.email));
    
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      console.log(`Użytkownik z emailem ${normalizedEmail} nie został znaleziony`);
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }

    console.log(`Znaleziono użytkownika: ${user.email}, sprawdzanie hasła...`);
    const ok = await bcrypt.compare(haslo, user.haslo);
    if (!ok) {
      console.log('Hasło nieprawidłowe');
      return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });
    }

    console.log('Logowanie pomyślne');
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const { haslo: pw, ...userWithoutPassword } = user;
    res.json({ success: true, message: 'Zalogowano', token, user: userWithoutPassword });
  } catch (err) {
    console.error('Błąd logowania:', err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// auth middleware
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Brak tokenu' });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ success: false, message: 'Nieprawidłowy token' });
    req.user = payload;
    next();
  });
}

// protected endpoints
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    const { haslo, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await readUsers();
    const u = users.map(({ haslo, ...rest }) => rest);
    res.json({ success: true, users: u });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Czas pracy
app.post('/api/czas-pracy', authenticateToken, async (req, res) => {
  try {
    const { data, start, koniec, opis } = req.body;
    if (!data || !start || !koniec) return res.status(400).json({ success: false, message: 'Brak wymaganych pól' });
    const users = await readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    const wpis = { id: Date.now().toString(), data, start, koniec, opis: opis || '', dataUtworzenia: new Date().toISOString() };
    users[idx].czasPracy = users[idx].czasPracy || [];
    users[idx].czasPracy.push(wpis);
    await writeUsers(users);
    res.json({ success: true, wpis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});
app.get('/api/czas-pracy', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    res.json({ success: true, czasPracy: user.czasPracy || [] });
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Urlopy
app.post('/api/urlopy', authenticateToken, async (req, res) => {
  try {
    const { dataOd, dataDo, typ, opis } = req.body;
    if (!dataOd || !dataDo || !typ) return res.status(400).json({ success: false, message: 'Brak wymaganych pól' });
    const users = await readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    const urlop = { id: Date.now().toString(), dataOd, dataDo, typ, opis: opis || '', status: 'oczekujący', dataUtworzenia: new Date().toISOString() };
    users[idx].urlopy = users[idx].urlopy || [];
    users[idx].urlopy.push(urlop);
    await writeUsers(users);
    res.json({ success: true, urlop });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' }); }
});
app.get('/api/urlopy', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    res.json({ success: true, urlopy: user.urlopy || [] });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' }); }
});

// Plan
app.post('/api/plan', authenticateToken, async (req, res) => {
  try {
    const { data, tytul, opis, priorytet } = req.body;
    if (!data || !tytul) return res.status(400).json({ success: false, message: 'Brak wymaganych pól' });
    const users = await readUsers();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    const wpis = { id: Date.now().toString(), data, tytul, opis: opis || '', priorytet: priorytet || 'normalny', status: 'zaplanowane', dataUtworzenia: new Date().toISOString() };
    users[idx].plan = users[idx].plan || [];
    users[idx].plan.push(wpis);
    await writeUsers(users);
    res.json({ success: true, wpis });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' }); }
});
app.get('/api/plan', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    res.json({ success: true, plan: user.plan || [] });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' }); }
});

// Inicjalizacja - sprawdź czy plik users.json istnieje
async function initializeDataFile() {
  try {
    await fs.access(DATA_FILE);
    console.log(`Plik ${DATA_FILE} istnieje`);
    
    // Sprawdź czy plik nie jest pusty
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const trimmedData = data.trim();
    if (!trimmedData || trimmedData === '') {
      console.log(`Plik ${DATA_FILE} jest pusty, inicjalizuję pustą tablicę...`);
      await fs.writeFile(DATA_FILE, '[]', 'utf8');
      console.log(`Zainicjalizowano plik ${DATA_FILE}`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Tworzenie pliku ${DATA_FILE}...`);
      const dir = path.dirname(DATA_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(DATA_FILE, '[]', 'utf8');
      console.log(`Utworzono plik ${DATA_FILE}`);
    } else {
      console.error('Błąd inicjalizacji pliku:', err);
    }
  }
}

// Inicjalizuj przed startem serwera
initializeDataFile().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`Plik danych: ${DATA_FILE}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Lokalny dostęp: http://localhost:${PORT}`);
    }
  });
}).catch(err => {
  console.error('Błąd inicjalizacji:', err);
  process.exit(1);
});

// server.js
require('dotenv').config();
const API_URL = 'https://www.deneeu.pl';
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'zmien-to-w-produkcji';

// Konfiguracja CORS - pozwól na żądania z różnych źródeł
app.use(cors({ origin: '*' })); // lub podaj dokładną domenę frontendu
app.use(bodyParser.json());
app.use(express.static('public'));

// Middleware do logowania żądań (tylko w produkcji dla debugowania)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  }
  next();
});

// Konfiguracja Multer do wgrywania plików
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Utwórz katalog uploads jeśli nie istnieje
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => {
      cb(err, uploadDir);
    });
  },
  filename: function (req, file, cb) {
    // Nazwa pliku: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Akceptuj tylko pliki Excel
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Tylko pliki Excel (.xlsx, .xls) są dozwolone!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Konfiguracja Nodemailer
// Domyślnie: serwer2524780.home.pl (test@deneeu.pl)
// Port: 465 (z SSL) - domyślnie, 587 (bez SSL) jako alternatywa
// Można zmienić przez zmienne środowiskowe
const emailConfig = {
  host: process.env.SMTP_HOST || 'serwer2524780.home.pl',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // true dla 465 (domyślnie), false dla 587
  auth: {
    user: process.env.SMTP_USER || 'test@deneeu.pl',
    pass: process.env.SMTP_PASS || 'Bumszakalaka32#'
  }
};

// Tworzenie transporter email (tylko jeśli są ustawione dane logowania)
let transporter = null;
const smtpUser = process.env.SMTP_USER || emailConfig.auth.user;
const smtpPass = process.env.SMTP_PASS || emailConfig.auth.pass;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || emailConfig.host,
    port: Number(process.env.SMTP_PORT || emailConfig.port),
    secure: process.env.SMTP_SECURE !== 'false', // true dla 465, false dla 587
    auth: {
      user: process.env.SMTP_USER || emailConfig.auth.user,
      pass: process.env.SMTP_PASS || emailConfig.auth.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
  
  // Loguj konfigurację SMTP przy starcie
  console.log('📧 SMTP CONFIG:', {
    host: process.env.SMTP_HOST || emailConfig.host,
    port: process.env.SMTP_PORT || emailConfig.port,
    user: process.env.SMTP_USER || emailConfig.auth.user,
    secure: emailConfig.secure
  });
  
  // Test połączenia przy starcie (asynchronicznie, nie blokuje startu serwera)
  transporter.verify().then(() => {
    console.log('✅ SMTP VERIFIED - Konfiguracja SMTP gotowa do wysyłania emaili');
  }).catch((err) => {
    console.warn('⚠️  Błąd weryfikacji SMTP:', err.message);
    console.log('⚠️  Serwer działa, ale wysyłanie emaili może nie działać. Sprawdź konfigurację SMTP.');
  });
} else {
  console.log('⚠️  Konfiguracja SMTP nie jest ustawiona. Ustaw SMTP_USER i SMTP_PASS aby wysyłać emaile.');
}

// Funkcja generująca HTML email z planem pracy
function generateEmailHTML(pseudonim, dane) {
  let html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Plan pracy - ${pseudonim}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #667eea;
          border-bottom: 3px solid #667eea;
          padding-bottom: 10px;
        }
        .entry {
          background-color: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 15px;
          margin: 15px 0;
          border-radius: 5px;
        }
        .entry-header {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        .entry-details {
          color: #666;
          font-size: 14px;
        }
        .entry-details p {
          margin: 5px 0;
        }
        .label {
          font-weight: bold;
          color: #667eea;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #999;
          font-size: 12px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📋 Plan pracy - ${pseudonim}</h1>
        <p>Witaj! Oto Twój plan pracy:</p>
  `;
  
  dane.forEach((entry, index) => {
    html += `
      <div class="entry">
        <div class="entry-header">${entry.nazwaFirmy || 'Brak nazwy firmy'}</div>
        <div class="entry-details">
          ${entry.data ? `<p><span class="label">Data:</span> ${entry.data}</p>` : ''}
          ${entry.godzina ? `<p><span class="label">Godzina:</span> ${entry.godzina}</p>` : ''}
          ${entry.adresFirmy ? `<p><span class="label">Adres:</span> ${entry.adresFirmy}</p>` : ''}
          ${entry.godzinaPrzyjazdu ? `<p><span class="label">Godzina przyjazdu:</span> ${entry.godzinaPrzyjazdu}</p>` : ''}
          ${entry.dzialFirmy ? `<p><span class="label">Dział firmy:</span> ${entry.dzialFirmy}</p>` : ''}
          ${entry.telefon ? `<p><span class="label">Telefon:</span> ${entry.telefon}</p>` : ''}
        </div>
      </div>
    `;
  });
  
  html += `
        <div class="footer">
          <p>Ten email został wygenerowany automatycznie przez system zarządzania kierowcami.</p>
          <p>© ${new Date().getFullYear()} Deneeu</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return html;
}

// Helper: read/write users
async function readUsers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const users = JSON.parse(data || '[]');
    return users;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('Błąd odczytu użytkowników:', err);
    return [];
  }
}

async function writeUsers(users) {
  try {
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log(`✓ Zapisano ${users.length} użytkowników`);
    return true;
  } catch (err) {
    console.error('✗ Błąd zapisu użytkowników:', err);
    return false;
  }
}

// Helper: aktualizuj użytkownika
async function updateUser(userId, updateFn) {
  const users = await readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  updateFn(users[idx]);
  await writeUsers(users);
  return users[idx];
}

// Health check endpoint dla Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT,
    smtp: transporter ? 'configured' : 'not configured'
  });
});

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { imie, nazwisko, email, haslo, telefon } = req.body;
    if (!imie || !nazwisko || !email || !haslo) {
      return res.status(400).json({ success: false, message: 'Wszystkie pola wymagane' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Nieprawidłowy email' });
    if (haslo.length < 6) return res.status(400).json({ success: false, message: 'Hasło min 6 znaków' });

    const users = await readUsers();
    if (users.some(u => u.email === email)) {
      return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });
    }

    const hashed = await bcrypt.hash(haslo, 10);
    const newUser = {
      id: Date.now().toString(),
      imie, nazwisko, email, haslo: hashed, telefon: telefon || '',
      dataRejestracji: new Date().toISOString(),
      czasPracy: [], urlopy: [], plan: [],
      role: 'driver'
    };
    users.push(newUser);
    
    if (!(await writeUsers(users))) {
      return res.status(500).json({ success: false, message: 'Błąd zapisu danych' });
    }
    
    const { haslo: pw, ...userWithoutPassword } = newUser;
    console.log(`✓ Zarejestrowano: ${email}`);
    res.status(201).json({ success: true, message: 'Zarejestrowano pomyślnie', user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, haslo, login } = req.body;
    // Użyj login jeśli jest podany, w przeciwnym razie email
    const loginOrEmail = ((login || email || '').trim()).toLowerCase();
    
    if (!loginOrEmail || !haslo) {
      return res.status(400).json({ success: false, message: 'Login/Email i hasło wymagane' });
    }

    const users = await readUsers();
    
    // Znajdź użytkownika (sprawdź zarówno login jak i email) - ignoruj wielkość liter i spacje
    const user = users.find(u => {
      const userLogin = (u.login || '').trim().toLowerCase();
      const userEmail = (u.email || '').trim().toLowerCase();
      return userLogin === loginOrEmail || userEmail === loginOrEmail;
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Niepoprawny login lub email' });
    }

    // Sprawdź hasło
    const ok = await bcrypt.compare(haslo, user.haslo);
    
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Niepoprawny login lub email' });
    }

    // Sprawdzenie roli
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const { haslo: pw, ...userWithoutPassword } = user;
    
    // Zwróć odpowiedź z rolą w response
    const response = {
      success: true,
      message: 'Zalogowano pomyślnie',
      token,
      user: userWithoutPassword,
      role: user.role || 'driver'
    };
    
    if (user.role === 'admin') {
      // Logowanie jako admin
      console.log(`✓ Zalogowano admina: ${loginOrEmail}`);
      response.redirect = '/admin';
    } else {
      // Logowanie jako kierowca
      console.log(`✓ Zalogowano kierowcę: ${loginOrEmail}`);
      response.redirect = '/dashboard';
    }
    
    res.json(response);
  } catch (err) {
    console.error(err);
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
    const wpis = { id: Date.now().toString(), data, start, koniec, opis: opis || '', dataUtworzenia: new Date().toISOString() };
    const user = await updateUser(req.user.id, (u) => {
      u.czasPracy = u.czasPracy || [];
      u.czasPracy.push(wpis);
    });
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
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
    const urlop = { id: Date.now().toString(), dataOd, dataDo, typ, opis: opis || '', status: 'oczekujący', dataUtworzenia: new Date().toISOString() };
    const user = await updateUser(req.user.id, (u) => {
      u.urlopy = u.urlopy || [];
      u.urlopy.push(urlop);
    });
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    res.json({ success: true, urlop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
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
    const wpis = { id: Date.now().toString(), data, tytul, opis: opis || '', priorytet: priorytet || 'normalny', status: 'zaplanowane', dataUtworzenia: new Date().toISOString() };
    const user = await updateUser(req.user.id, (u) => {
      u.plan = u.plan || [];
      u.plan.push(wpis);
    });
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    res.json({ success: true, wpis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});
app.get('/api/plan', authenticateToken, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Użytkownik nie znaleziony' });
    
    // Jeśli użytkownik to admin, zwróć plany wszystkich użytkowników
    if (user.role === 'admin') {
      const allPlans = [];
      users.forEach(u => {
        if (u.plan && Array.isArray(u.plan)) {
          u.plan.forEach(wpis => {
            allPlans.push({
              ...wpis,
              userId: u.id,
              userEmail: u.email,
              userName: `${u.imie || ''} ${u.nazwisko || ''}`.trim() || u.email
            });
          });
        }
      });
      // Sortuj po dacie (najnowsze na górze)
      allPlans.sort((a, b) => {
        const dateA = new Date(a.data || a.dataUtworzenia || 0);
        const dateB = new Date(b.data || b.dataUtworzenia || 0);
        return dateB - dateA;
      });
      return res.json({ success: true, plan: allPlans });
    }
    
    // Dla zwykłych użytkowników zwróć tylko ich plan
    res.json({ success: true, plan: user.plan || [] });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Błąd serwera' }); }
});

// Wysyłanie emaili do kierowców
// Obsługuje zarówno JSON z danymi jak i wgrywanie pliku Excel
app.post('/api/send-email', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📧 Endpoint /api/send-email wywołany');
    console.log('📁 Plik:', req.file ? req.file.originalname : 'brak');
    console.log('📋 Body:', JSON.stringify(req.body, null, 2));
    console.log('═══════════════════════════════════════════════════════════');
    
    let drivers = null;
    
    // Jeśli wgrany został plik Excel, przetwórz go
    if (req.file) {
      console.log('📂 Przetwarzanie wgranego pliku Excel...');
      const filePath = req.file.path;
      
      try {
        const workbook = XLSX.readFile(filePath);
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          await fs.unlink(filePath).catch(() => {});
          return res.status(400).json({ success: false, message: 'Plik Excel nie zawiera żadnych kart' });
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          await fs.unlink(filePath).catch(() => {});
          return res.status(400).json({ success: false, message: 'Nie można odczytać danych z karty Excel' });
        }
        
        const colToIndex = (col) => {
          let result = 0;
          for (let i = 0; i < col.length; i++) {
            result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
          }
          return result - 1;
        };
        
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        if (!range || range.e.r < 1) {
          await fs.unlink(filePath).catch(() => {});
          return res.status(400).json({ success: false, message: 'Plik Excel jest pusty lub nie zawiera danych' });
        }
        
        const groupedData = {};
        const startRow = 1;
        const maxRows = Math.min(range.e.r, startRow + 99);
        
        for (let rowIndex = startRow; rowIndex <= maxRows; rowIndex++) {
          const getCellValue = (colLetter) => {
            try {
              const colIndex = colToIndex(colLetter);
              const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
              const cell = worksheet[cellAddress];
              if (!cell) return null;
              const value = cell.v;
              return value !== undefined && value !== null && value !== '' ? value : null;
            } catch (e) {
              return null;
            }
          };
          
          const telefon = getCellValue('L');
          const nazwisko = getCellValue('N');
          const imie = getCellValue('O');
          const godzina = getCellValue('R');
          const pseudonim = getCellValue('S');
          const nazwaFirmy = getCellValue('T');
          const adresFirmy = getCellValue('U');
          const godzinaPrzyjazdu = getCellValue('V');
          const dzialFirmy = getCellValue('W');
          
          if (pseudonim && pseudonim !== '') {
            const pseudonimKey = String(pseudonim).trim();
            
            if (!groupedData[pseudonimKey]) {
              groupedData[pseudonimKey] = [];
            }
            
            groupedData[pseudonimKey].push({
              nazwaFirmy: nazwaFirmy || '',
              adresFirmy: adresFirmy || '',
              godzina: godzina || '',
              godzinaPrzyjazdu: godzinaPrzyjazdu || '',
              dzialFirmy: dzialFirmy || '',
              telefon: telefon || '',
              imie: imie || '',
              nazwisko: nazwisko || '',
              data: new Date().toISOString().split('T')[0]
            });
          }
        }
        
        // Usuń plik po przetworzeniu
        await fs.unlink(filePath).catch(() => {});
        
        // Konwertuj zgrupowane dane na format drivers
        drivers = Object.keys(groupedData).map(pseudonim => ({
          pseudonim: pseudonim,
          email: '',
          dane: groupedData[pseudonim]
        }));
        
        console.log(`✅ Przetworzono plik Excel: ${drivers.length} kierowców`);
        console.log(`📋 Znalezione pseudonimy:`, drivers.map(d => `"${d.pseudonim}"`).join(', '));
      } catch (fileError) {
        console.error('❌ Błąd przetwarzania pliku:', fileError);
        if (req.file && req.file.path) {
          await fs.unlink(req.file.path).catch(() => {});
        }
        return res.status(500).json({ 
          success: false, 
          message: `Błąd przetwarzania pliku: ${fileError.message}` 
        });
      }
    } else {
      // Jeśli nie ma pliku, użyj danych z body (JSON)
      drivers = req.body.drivers;
    }
    
    if (!drivers || !Array.isArray(drivers) || drivers.length === 0) {
      return res.status(400).json({ success: false, message: 'Brak danych kierowców do wysłania' });
    }
    
    const users = await readUsers();
    
    // Najpierw znajdź użytkowników dla wszystkich kierowców
    const driversWithEmails = [];
    
    for (const driverInfo of drivers) {
      const { pseudonim, dane } = driverInfo;
      
      // Znajdź użytkownika po pseudonimie
      // Mapowanie: szukamy użytkownika który ma pasujący pseudonim w danych
      // Można też użyć telefonu (kolumna L) lub imię+nazwisko (kolumny O+N) do identyfikacji
      let user = null;
      
      // Próba 0: Szukaj po pseudonimie (najbardziej niezawodne)
      // Obsługuje zarówno dokładne dopasowanie jak i częściowe (np. "bus" pasuje do "Adam B bus")
      if (pseudonim) {
        // Usuń kropkę na początku jeśli istnieje (np. ".Adam B bus" -> "Adam B bus")
        let searchPseudonim = String(pseudonim).trim();
        if (searchPseudonim.startsWith('.')) {
          searchPseudonim = searchPseudonim.substring(1).trim();
        }
        searchPseudonim = searchPseudonim.toLowerCase();
        
        console.log(`🔍 Szukanie użytkownika dla pseudonimu: "${pseudonim}" (normalizowany: "${searchPseudonim}")`);
        
        user = users.find(u => {
          if (!u.pseudonim) return false;
          const userPseudonim = String(u.pseudonim).trim().toLowerCase();
          
          // Dokładne dopasowanie
          if (userPseudonim === searchPseudonim) {
            console.log(`   ✓ Dokładne dopasowanie: "${userPseudonim}" === "${searchPseudonim}"`);
            return true;
          }
          
          // Częściowe dopasowanie - sprawdź czy pseudonim z Excel jest zawarty w pseudonimie użytkownika
          if (userPseudonim.includes(searchPseudonim)) {
            console.log(`   ✓ Częściowe dopasowanie (zawiera): "${userPseudonim}".includes("${searchPseudonim}")`);
            return true;
          }
          
          // Odwrotne dopasowanie - sprawdź czy pseudonim użytkownika jest zawarty w pseudonimie z Excel
          if (searchPseudonim.includes(userPseudonim)) {
            console.log(`   ✓ Częściowe dopasowanie (odwrotne): "${searchPseudonim}".includes("${userPseudonim}")`);
            return true;
          }
          
          return false;
        });
        
        if (user) {
          console.log(`✅ Znaleziono użytkownika: ${user.email} dla pseudonimu "${pseudonim}" (dopasowano do "${user.pseudonim}")`);
        } else {
          console.log(`❌ Nie znaleziono użytkownika dla pseudonimu: "${pseudonim}"`);
          const availablePseudonyms = users.filter(u => u.pseudonim).map(u => `"${u.pseudonim}"`);
          console.log(`   Dostępne pseudonimy w bazie (${availablePseudonyms.length}):`, availablePseudonyms.join(', '));
        }
      }
      
      if (!user && dane && dane.length > 0) {
        const firstRow = dane[0];
        
        // Próba 1: Szukaj po telefonie (kolumna L)
        if (firstRow.telefon) {
          user = users.find(u => u.telefon && u.telefon === String(firstRow.telefon).trim());
        }
        
        // Próba 2: Szukaj po imieniu i nazwisku (kolumny O i N)
        if (!user && firstRow.imie && firstRow.nazwisko) {
          user = users.find(u => {
            const uImie = (u.imie || '').toLowerCase().trim();
            const uNazwisko = (u.nazwisko || '').toLowerCase().trim();
            const rowImie = String(firstRow.imie).toLowerCase().trim();
            const rowNazwisko = String(firstRow.nazwisko).toLowerCase().trim();
            return uImie === rowImie && uNazwisko === rowNazwisko;
          });
        }
        
        // Próba 3: Szukaj po samym imieniu lub nazwisku
        if (!user && firstRow.imie) {
          user = users.find(u => {
            const uImie = (u.imie || '').toLowerCase().trim();
            return uImie === String(firstRow.imie).toLowerCase().trim();
          });
        }
      }
      
      if (user && user.email) {
        const emailHTML = generateEmailHTML(pseudonim, dane);
        driversWithEmails.push({
          email: user.email,
          pseudonim: pseudonim,
          subject: `Plan pracy - ${pseudonim}`,
          html: emailHTML
        });
      }
    }
    
    // Teraz wyślij emaile w prostej pętli
    let sent = 0;
    const results = [];
    
    if (!transporter) {
      return res.status(500).json({ 
        success: false, 
        message: 'SMTP nie jest skonfigurowany' 
      });
    }
    
    for (const driver of driversWithEmails) {
      console.log('SPRAWDZAM KIEROWCĘ:', driver);
      
      if (!driver.email) {
        console.log('❌ BRAK EMAILA – POMIJAM');
        results.push({ pseudonim: driver.pseudonim, email: null, status: 'no_email' });
        continue;
      }
      
      try {
        console.log('📨 WYSYŁAM DO:', driver.email);
        
        await transporter.sendMail({
          from: process.env.SMTP_USER || emailConfig.auth.user,   // MUSI być identyczny z kontem SMTP
          to: driver.email,
          subject: driver.subject,
          html: driver.html
        });
        
        sent++;
        console.log('✅ WYSŁANO');
        results.push({ pseudonim: driver.pseudonim, email: driver.email, status: 'sent' });
      } catch (err) {
        console.error('❌ BŁĄD SENDMAIL:', err.message);
        results.push({ pseudonim: driver.pseudonim, email: driver.email, status: 'error', error: err.message });
      }
    }
    
    console.log(`✓ Wysłano emaile do ${sent} z ${drivers.length} kierowców`);
    
    res.json({ 
      success: true, 
      sent: sent,
      total: drivers.length,
      results: results,
      message: `Wysłano ${sent} z ${drivers.length} emaili`
    });
  } catch (err) {
    console.error('Błąd wysyłania emaili:', err);
    res.status(500).json({ success: false, message: 'Błąd serwera podczas wysyłania emaili' });
  }
});

// Endpoint do wgrywania pliku Excel na serwer (używając multer)
app.post('/api/upload-excel', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Otrzymano plik:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Brak pliku do wgrania' });
    }
    
    const filePath = req.file.path;
    console.log('📂 Ścieżka pliku:', filePath);
    
    // Przeczytaj plik Excel
    const workbook = XLSX.readFile(filePath);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      // Usuń plik jeśli jest błędny
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ success: false, message: 'Plik Excel nie zawiera żadnych kart' });
    }
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (!worksheet) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ success: false, message: 'Nie można odczytać danych z karty Excel' });
    }
    
    // Funkcja do konwersji litery kolumny na indeks
    const colToIndex = (col) => {
      let result = 0;
      for (let i = 0; i < col.length; i++) {
        result = result * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
      }
      return result - 1;
    };
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    if (!range || range.e.r < 1) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ success: false, message: 'Plik Excel jest pusty lub nie zawiera danych' });
    }
    
    const parsedData = [];
    const startRow = 1;
    const maxRows = Math.min(range.e.r, startRow + 99);
    
    for (let rowIndex = startRow; rowIndex <= maxRows; rowIndex++) {
      const getCellValue = (colLetter) => {
        try {
          const colIndex = colToIndex(colLetter);
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cell = worksheet[cellAddress];
          if (!cell) return null;
          const value = cell.v;
          return value !== undefined && value !== null && value !== '' ? value : null;
        } catch (e) {
          return null;
        }
      };
      
      const telefon = getCellValue('L');
      const nazwisko = getCellValue('N');
      const imie = getCellValue('O');
      const godzina = getCellValue('R');
      const pseudonim = getCellValue('S');
      const nazwaFirmy = getCellValue('T');
      const adresFirmy = getCellValue('U');
      const godzinaPrzyjazdu = getCellValue('V');
      const dzialFirmy = getCellValue('W');
      
      let tytulValue = null;
      if (nazwaFirmy && nazwaFirmy !== '') {
        tytulValue = String(nazwaFirmy).trim();
      } else if (pseudonim && pseudonim !== '') {
        tytulValue = String(pseudonim).trim();
      } else if (imie || nazwisko) {
        tytulValue = `${String(imie || '').trim()} ${String(nazwisko || '').trim()}`.trim();
      }
      
      const opisParts = [];
      if (imie && imie !== '') opisParts.push(`Imię: ${String(imie).trim()}`);
      if (nazwisko && nazwisko !== '') opisParts.push(`Nazwisko: ${String(nazwisko).trim()}`);
      if (pseudonim && pseudonim !== '') opisParts.push(`Pseudonim: ${String(pseudonim).trim()}`);
      if (telefon && telefon !== '') opisParts.push(`Tel: ${String(telefon).trim()}`);
      if (godzina && godzina !== '') opisParts.push(`Godzina: ${String(godzina).trim()}`);
      if (adresFirmy && adresFirmy !== '') opisParts.push(`Adres: ${String(adresFirmy).trim()}`);
      if (godzinaPrzyjazdu && godzinaPrzyjazdu !== '') opisParts.push(`Przyjazd: ${String(godzinaPrzyjazdu).trim()}`);
      if (dzialFirmy && dzialFirmy !== '') opisParts.push(`Dział: ${String(dzialFirmy).trim()}`);
      
      const opisValue = opisParts.join(' | ');
      const priorytetValue = 'normalny';
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      if (tytulValue && tytulValue !== '') {
        parsedData.push({
          rowNumber: rowIndex + 1,
          data: formattedDate,
          tytul: tytulValue,
          opis: opisValue,
          priorytet: priorytetValue,
          telefon: telefon || '',
          nazwisko: nazwisko || '',
          imie: imie || '',
          godzina: godzina || '',
          pseudonim: pseudonim || '',
          nazwaFirmy: nazwaFirmy || '',
          adresFirmy: adresFirmy || '',
          godzinaPrzyjazdu: godzinaPrzyjazdu || '',
          dzialFirmy: dzialFirmy || ''
        });
      }
    }
    
    // Usuń plik po przetworzeniu
    await fs.unlink(filePath).catch(() => {});
    
    console.log(`✅ Przetworzono plik Excel: ${parsedData.length} wierszy`);
    
    res.json({ 
      success: true, 
      message: `Przetworzono ${parsedData.length} wierszy`,
      data: parsedData,
      fileName: req.file.originalname
    });
    
  } catch (error) {
    console.error('❌ Błąd przetwarzania pliku Excel:', error);
    
    // Usuń plik w przypadku błędu
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({ 
      success: false, 
      message: `Błąd przetwarzania pliku: ${error.message}` 
    });
  }
});

// Endpoint do testowania SMTP
app.post('/api/test-smtp', authenticateToken, async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({ 
        success: false, 
        error: 'SMTP nie jest skonfigurowany. Ustaw SMTP_USER i SMTP_PASS.' 
      });
    }

    console.log('🧪 Testowanie połączenia SMTP...');
    
    // Loguj konfigurację SMTP
    console.log('📧 SMTP CONFIG:', {
      host: process.env.SMTP_HOST || emailConfig.host,
      port: process.env.SMTP_PORT || emailConfig.port,
      user: process.env.SMTP_USER || emailConfig.auth.user,
      secure: emailConfig.secure
    });
    
    // Weryfikuj połączenie SMTP
    await transporter.verify();
    console.log('✅ SMTP VERIFIED');

    // Wyślij testowy email
    const testEmail = req.body.testEmail || process.env.SMTP_USER || emailConfig.auth.user;
    
    const mailOptions = {
      from: process.env.SMTP_USER || emailConfig.auth.user,
      to: testEmail,
      subject: 'TEST SMTP HOME.PL',
      text: 'JEŚLI TO DOTARŁO – SMTP DZIAŁA'
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('📨 SEND RESULT:', {
      messageId: info.messageId,
      response: info.response || 'OK',
      accepted: info.accepted,
      rejected: info.rejected,
      to: testEmail
    });
    console.log(`✅ Testowy email wysłany do: ${testEmail}`);
    
    res.json({ 
      success: true, 
      sent: 1,
      message: `Testowy email wysłany do ${testEmail}`,
      smtp: {
        host: emailConfig.host,
        port: emailConfig.port,
        user: emailConfig.auth.user
      }
    });

  } catch (err) {
    console.error('❌ SMTP ERROR:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      code: err.code || 'UNKNOWN',
      details: err.response || null
    });
  }
});

// Inicjalizacja - sprawdź czy plik users.json istnieje
async function initializeDataFile() {
  try {
    await fs.access(DATA_FILE);
    console.log(`Plik ${DATA_FILE} istnieje`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Tworzenie pliku ${DATA_FILE}...`);
      const dir = path.dirname(DATA_FILE);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(DATA_FILE, '[]', 'utf8');
      console.log(`Utworzono plik ${DATA_FILE}`);
    }
  }
}

// Inicjalizuj przed startem serwera
initializeDataFile().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serwer działa na porcie ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Błąd inicjalizacji:', err);
  process.exit(1);
});

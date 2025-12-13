// server.js
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

// CORS – frontend: www.deneeu.pl
app.use(cors({
  origin: 'https://www.deneeu.pl',
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// Helper: read/write users
async function readUsers() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data || '[]');
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
        return true;
    } catch (err) {
        console.error('Błąd zapisu użytkowników:', err);
        return false;
    }
}

// Auth middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Brak tokenu' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Nieprawidłowy token' });
        req.user = user;
        next();
    });
}

// Pages (statyczne pliki)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { imie, nazwisko, email, haslo } = req.body;
        if (!imie || !nazwisko || !email || !haslo)
            return res.status(400).json({ success: false, message: 'Wszystkie pola wymagane' });

        const users = await readUsers();
        if (users.some(u => u.email === email))
            return res.status(400).json({ success: false, message: 'Użytkownik już istnieje' });

        const hashed = await bcrypt.hash(haslo, 10);
        const newUser = {
            id: Date.now().toString(),
            imie,
            nazwisko,
            email,
            haslo: hashed,
            role: 'driver',
            dataRejestracji: new Date().toISOString()
        };

        users.push(newUser);
        await writeUsers(users);

        const { haslo: pw, ...userWithoutPassword } = newUser;
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
        if (!email || !haslo) return res.status(400).json({ success: false, message: 'Email i hasło wymagane' });

        const users = await readUsers();
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });

        const ok = await bcrypt.compare(haslo, user.haslo);
        if (!ok) return res.status(401).json({ success: false, message: 'Nieprawidłowy email lub hasło' });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        const { haslo: pw, ...userWithoutPassword } = user;

        res.json({ success: true, message: 'Zalogowano', token, user: userWithoutPassword });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// Get current user
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

// Initialize data file
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

// Start server
initializeDataFile().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Serwer działa na porcie ${PORT}`);
    });
}).catch(err => {
    console.error('Błąd inicjalizacji:', err);
    process.exit(1);
});

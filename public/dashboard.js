// dashboard.js
const API_BASE = 'https://www.deneeu.pl/api';

function getToken() {
    return localStorage.getItem('token');
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    
    // Sprawdź czy użytkownik to admin - przekieruj do panelu admina
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === 'admin') {
                if (!window.location.pathname.includes('/admin')) {
                    window.location.href = '/admin';
                    return false;
                }
            } else {
                // Jeśli zwykły użytkownik próbuje wejść do /admin, przekieruj do dashboard
                if (window.location.pathname.includes('/admin')) {
                    window.location.href = '/dashboard';
                    return false;
                }
            }
        } catch (e) {
            console.error('Błąd parsowania danych użytkownika:', e);
        }
    }
    
    return true;
}

let currentUser = null;

// Funkcja do wykonywania żądań z autoryzacją
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return null;
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        ...options
    };
    
    try {
        console.log(`[API] ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, defaultOptions);
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return null;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API] Błąd ${response.status}:`, errorText);
            throw new Error(`Błąd serwera: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[API] Odpowiedź:`, data);
        return data;
    } catch (error) {
        console.error('[API] Błąd połączenia:', error);
        // Jeśli to błąd połączenia (nie odpowiedź serwera), pokaż komunikat
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
            showMessage('Błąd połączenia z serwerem. Sprawdź, czy serwer działa.', 'error');
        }
        throw error;
    }
}

// Funkcja do ładowania użytkowników
async function loadUsers() {
    try {
        const data = await fetchWithAuth(`${API_BASE}/users`);
        if (data && data.success) {
            return data.users || [];
        }
        return [];
    } catch (error) {
        console.error('Błąd ładowania użytkowników:', error);
        return [];
    }
}

// Funkcja do escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Funkcja do formatowania daty
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
    } catch (e) {
        return dateString;
    }
}

// Funkcja do formatowania daty i czasu
function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// Funkcja do wyświetlania komunikatów
function showMessage(message, type = 'success') {
    // Usuń poprzednie komunikaty
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Inicjalizacja dashboard
async function initDashboard() {
    if (!checkAuth()) {
        return;
    }
    
    console.log('[INIT] API_BASE:', API_BASE);
    console.log('[INIT] Hostname:', window.location.hostname);
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) {
                userNameEl.textContent = `Witaj, ${currentUser.imie || currentUser.email}!`;
            }
        } catch (e) {
            console.error('Błąd parsowania danych użytkownika:', e);
        }
    }
    
    // Załaduj dane użytkownika z serwera
    try {
        const userData = await fetchWithAuth(`${API_BASE}/me`);
        if (userData && userData.success) {
            currentUser = userData.user;
            localStorage.setItem('user', JSON.stringify(userData.user));
            const userNameEl = document.getElementById('user-name');
            if (userNameEl) {
                userNameEl.textContent = `Witaj, ${currentUser.imie || currentUser.email}!`;
            }
        } else {
            console.error('[INIT] Błąd ładowania danych użytkownika:', userData);
        }
    } catch (error) {
        console.error('[INIT] Błąd ładowania danych użytkownika:', error);
        showMessage('Błąd połączenia z serwerem. Sprawdź, czy serwer działa.', 'error');
    }
    
    // Załaduj statystyki
    try {
        await loadTileCounts();
    } catch (error) {
        console.error('[INIT] Błąd ładowania statystyk:', error);
    }
    
    // Ustaw event listenery
    setupEventListeners();
    setupForms();
}

// Funkcja do ustawiania event listenerów
function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        });
    }
    
    // Kafelki sekcji
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const section = tile.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });
}

// Funkcja do ukrywania wszystkich sekcji
function hideAllSections() {
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    const tiles = document.querySelector('.dashboard-tiles');
    if (tiles) {
        tiles.style.display = 'grid';
    }
}

// Funkcja do pokazywania sekcji
function showSection(section) {
    hideAllSections();
    document.querySelector('.dashboard-tiles').style.display = 'none';
    
    // Pokaż wybraną sekcję
    const selectedSection = document.getElementById(`${section}-tab`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        // Załaduj dane dla wybranej sekcji
        loadTabData(section);
    }
}

// Funkcja do ładowania danych zakładki
function loadTabData(tab) {
    switch(tab) {
        case 'czas-pracy':
            loadCzasPracy();
            break;
        case 'urlopy':
            loadUrlopy();
            break;
    }
}

// Funkcja do ładowania statystyk dla kafelków
async function loadTileCounts() {
    try {
        // Załaduj statystyki dla urlopów
        const urlopyData = await fetchWithAuth(`${API_BASE}/urlopy`);
        if (urlopyData && urlopyData.success) {
            const urlopyCountEl = document.getElementById('urlopy-count');
            if (urlopyCountEl) {
                urlopyCountEl.textContent = urlopyData.urlopy?.length || 0;
            }
        }
        
        // Załaduj statystyki dla czasu pracy
        const czasPracyData = await fetchWithAuth(`${API_BASE}/czas-pracy`);
        if (czasPracyData && czasPracyData.success) {
            const czasPracyCountEl = document.getElementById('czas-pracy-count');
            if (czasPracyCountEl) {
                czasPracyCountEl.textContent = czasPracyData.czasPracy?.length || 0;
            }
        }
    } catch (error) {
        console.error('Błąd ładowania statystyk:', error);
    }
}

// Funkcja do ustawiania formularzy
function setupForms() {
    // Czas pracy
    const addCzasPracyBtn = document.getElementById('add-czas-pracy-btn');
    const cancelCzasPracyBtn = document.getElementById('cancel-czas-pracy');
    const czasPracyForm = document.getElementById('czas-pracy-form');
    
    if (addCzasPracyBtn) {
        addCzasPracyBtn.addEventListener('click', () => {
            const formContainer = document.getElementById('czas-pracy-form-container');
            const form = document.getElementById('czas-pracy-form');
            const dataInput = document.getElementById('czas-data');
            if (formContainer) formContainer.style.display = 'block';
            if (form) form.reset();
            if (dataInput) dataInput.valueAsDate = new Date();
        });
    }
    
    if (cancelCzasPracyBtn) {
        cancelCzasPracyBtn.addEventListener('click', () => {
            const formContainer = document.getElementById('czas-pracy-form-container');
            if (formContainer) formContainer.style.display = 'none';
        });
    }
    
    if (czasPracyForm) {
        czasPracyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                data: document.getElementById('czas-data')?.value || '',
                start: document.getElementById('czas-start')?.value || '',
                koniec: document.getElementById('czas-koniec')?.value || '',
                opis: document.getElementById('czas-opis')?.value || ''
            };
            
            await saveCzasPracy(formData);
        });
    }
    
    // Urlopy
    const addUrlopBtn = document.getElementById('add-urlop-btn');
    const cancelUrlopBtn = document.getElementById('cancel-urlop');
    const urlopForm = document.getElementById('urlop-form');
    
    if (addUrlopBtn) {
        addUrlopBtn.addEventListener('click', () => {
            const formContainer = document.getElementById('urlop-form-container');
            const form = document.getElementById('urlop-form');
            const dataOdInput = document.getElementById('urlop-data-od');
            if (formContainer) formContainer.style.display = 'block';
            if (form) form.reset();
            if (dataOdInput) dataOdInput.valueAsDate = new Date();
        });
    }
    
    if (cancelUrlopBtn) {
        cancelUrlopBtn.addEventListener('click', () => {
            const formContainer = document.getElementById('urlop-form-container');
            if (formContainer) formContainer.style.display = 'none';
        });
    }
    
    if (urlopForm) {
        urlopForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = {
                dataOd: document.getElementById('urlop-data-od')?.value || '',
                dataDo: document.getElementById('urlop-data-do')?.value || '',
                typ: document.getElementById('urlop-typ')?.value || '',
                opis: document.getElementById('urlop-opis')?.value || ''
            };
            
            await saveUrlop(formData);
        });
    }
    
    // Przyciski powrotu
    const backCzasPracyBtn = document.getElementById('back-czas-pracy');
    if (backCzasPracyBtn) {
        backCzasPracyBtn.addEventListener('click', () => {
            hideAllSections();
            document.querySelector('.dashboard-tiles').style.display = 'grid';
        });
    }
    
    const backUrlopyBtn = document.getElementById('back-urlopy');
    if (backUrlopyBtn) {
        backUrlopyBtn.addEventListener('click', () => {
            hideAllSections();
            document.querySelector('.dashboard-tiles').style.display = 'grid';
        });
    }
}

// Funkcje do zapisu danych
async function saveCzasPracy(data) {
    try {
        const result = await fetchWithAuth(`${API_BASE}/czas-pracy`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result && result.success) {
            const formContainer = document.getElementById('czas-pracy-form-container');
            if (formContainer) formContainer.style.display = 'none';
            showMessage('Czas pracy został zapisany pomyślnie!', 'success');
            loadCzasPracy();
            loadTileCounts();
        } else {
            showMessage(result?.message || 'Błąd zapisu', 'error');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showMessage('Wystąpił błąd podczas zapisywania czasu pracy', 'error');
    }
}

async function saveUrlop(data) {
    try {
        const result = await fetchWithAuth(`${API_BASE}/urlopy`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result && result.success) {
            const formContainer = document.getElementById('urlop-form-container');
            if (formContainer) formContainer.style.display = 'none';
            showMessage('Wniosek urlopowy został złożony pomyślnie!', 'success');
            loadUrlopy();
            loadTileCounts();
        } else {
            showMessage(result?.message || 'Błąd zapisu', 'error');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showMessage('Wystąpił błąd podczas zapisywania urlopu', 'error');
    }
}

// Funkcje do ładowania danych
async function loadCzasPracy() {
    const listDiv = document.getElementById('czas-pracy-list');
    listDiv.innerHTML = '<div class="loading">Ładowanie...</div>';
    
    try {
        const data = await fetchWithAuth(`${API_BASE}/czas-pracy`);
        if (data && data.success) {
            if (data.czasPracy.length === 0) {
                listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏰</div><p>Brak wpisów czasu pracy</p></div>';
            } else {
                listDiv.innerHTML = data.czasPracy.map(wpis => `
                    <div class="data-card">
                        <div class="data-card-header">
                            <h3>${formatDate(wpis.data)}</h3>
                            <span class="badge">${wpis.start} - ${wpis.koniec}</span>
                        </div>
                        ${wpis.opis ? `<p>${escapeHtml(wpis.opis)}</p>` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Błąd:', error);
        listDiv.innerHTML = '<div class="empty-state"><p>Błąd podczas ładowania danych</p></div>';
    }
}

async function loadUrlopy() {
    const listDiv = document.getElementById('urlopy-list');
    listDiv.innerHTML = '<div class="loading">Ładowanie...</div>';
    
    try {
        const data = await fetchWithAuth(`${API_BASE}/urlopy`);
        if (data && data.success) {
            if (data.urlopy.length === 0) {
                listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏖️</div><p>Brak wniosków urlopowych</p></div>';
            } else {
                listDiv.innerHTML = data.urlopy.map(urlop => `
                    <div class="data-card">
                        <div class="data-card-header">
                            <h3>${formatDate(urlop.dataOd)} - ${formatDate(urlop.dataDo)}</h3>
                            <span class="badge badge-${urlop.status}">${urlop.status}</span>
                        </div>
                        <p><strong>Typ:</strong> ${escapeHtml(urlop.typ)}</p>
                        ${urlop.opis ? `<p>${escapeHtml(urlop.opis)}</p>` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Błąd:', error);
        listDiv.innerHTML = '<div class="empty-state"><p>Błąd podczas ładowania danych</p></div>';
    }
}

// Uruchom dashboard po załadowaniu strony
document.addEventListener('DOMContentLoaded', initDashboard);


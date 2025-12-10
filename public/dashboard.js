// Stała z bazowym URL API
const API_BASE = "https://www.deneeu.pl/api";

// Funkcja do pobrania tokenu z localStorage (przykład)
function getToken() {
    return localStorage.getItem('token');
}

// Funkcja do sprawdzania autoryzacji
function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.warn('Brak tokena, przekierowanie do logowania');
        window.location.href = 'login.html';
        return false;
    }

    // Sprawdź użytkownika - jeśli nie ma, spróbuj pobrać z serwera
    let user = null;
    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            user = JSON.parse(userData);
        }
    } catch (e) {
        console.error('Błąd parsowania danych użytkownika:', e);
    }

    // Jeśli użytkownik nie ma roli, ustaw domyślną rolę 'driver' dla kompatybilności
    if (user && !user.role) {
        user.role = 'driver';
        localStorage.setItem('user', JSON.stringify(user));
    }

    // Jeśli nie ma użytkownika w localStorage, pozwól przejść dalej - dane zostaną pobrane z serwera
    // Sprawdzanie roli zostanie wykonane po pobraniu danych z serwera
    return true;
}

// Zmienna do przechowywania aktualnego użytkownika
let currentUser = null;

// Funkcja do wykonania zapytania z autoryzacją
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        throw new Error('Brak tokenu autoryzacji');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            // Token nieważny - przekieruj do logowania
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Sesja wygasła');
        }
        throw new Error(`Błąd HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Przykład użycia: pobranie listy użytkowników
async function loadUsers() {
    try {
        const data = await fetchWithAuth(`${API_BASE}/users`);
        if (data.success) {
            console.log('Użytkownicy:', data.users);
        } else {
            console.error('Błąd:', data.message);
        }
    } catch (err) {
        console.error('Błąd połączenia:', err);
    }
}
// Funkcja do escapowania HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Funkcja do formatowania daty
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Funkcja do formatowania daty i czasu
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Funkcja do wyświetlania komunikatów
function showMessage(message, type = 'success') {
    // Usuń istniejące komunikaty
    const existingMessage = document.querySelector('.dashboard-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Utwórz nowy komunikat
    const messageDiv = document.createElement('div');
    messageDiv.className = `dashboard-message message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;';
    
    document.body.appendChild(messageDiv);
    
    // Usuń komunikat po 3 sekundach
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

// Inicjalizacja dashboardu
async function initDashboard() {
    if (!checkAuth()) return;
    
    // Pobierz dane użytkownika z localStorage lub z serwera
    const userData = localStorage.getItem('user');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
            document.getElementById('user-name').textContent = `Witaj, ${currentUser.imie} ${currentUser.nazwisko}!`;
        } catch (e) {
            console.error('Błąd parsowania danych użytkownika:', e);
        }
    }
    
    // Weryfikuj token z serwerem
    try {
        const data = await fetchWithAuth(`${API_BASE}/me`);
        if (data && data.success && data.user) {
            currentUser = data.user;
            // Upewnij się, że użytkownik ma rolę
            if (!currentUser.role) {
                currentUser.role = 'driver';
            }
            localStorage.setItem('user', JSON.stringify(currentUser));
            document.getElementById('user-name').textContent = `Witaj, ${currentUser.imie} ${currentUser.nazwisko}!`;
        } else {
            // Jeśli weryfikacja nie powiodła się, przekieruj do logowania
            console.error('Błąd weryfikacji użytkownika');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Błąd weryfikacji użytkownika:', error);
        // W przypadku błędu połączenia, pozwól używać danych z localStorage
        if (!currentUser) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Obsługa wylogowania
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
    
    // Obsługa kafelków
    document.querySelectorAll('.tile').forEach(tile => {
        tile.addEventListener('click', () => {
            const section = tile.dataset.section;
            showSection(section);
        });
    });
    
    // Obsługa przycisków powrotu
    document.getElementById('back-czas-pracy')?.addEventListener('click', () => hideAllSections());
    document.getElementById('back-urlopy')?.addEventListener('click', () => hideAllSections());
    document.getElementById('back-plan')?.addEventListener('click', () => hideAllSections());
    
    // Obsługa formularzy
    setupForms();
    
    // Załaduj statystyki dla kafelków
    loadTileCounts();
}

// Funkcja do ukrycia wszystkich sekcji i pokazania kafelków
function hideAllSections() {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    // Odśwież statystyki
    loadTileCounts();
}

// Funkcja do pokazania sekcji
function showSection(section) {
    // Ukryj wszystkie sekcje
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
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
        case 'plan':
            loadPlan();
            break;
    }
}

// Funkcja do ładowania statystyk dla kafelków
async function loadTileCounts() {
    try {
        // Załaduj statystyki dla planu
        const planData = await fetchWithAuth(`${API_BASE}/plan`);
        if (planData && planData.success) {
            document.getElementById('plan-count').textContent = planData.plan?.length || 0;
        }
        
        // Załaduj statystyki dla urlopów
        const urlopyData = await fetchWithAuth(`${API_BASE}/urlopy`);
        if (urlopyData && urlopyData.success) {
            document.getElementById('urlopy-count').textContent = urlopyData.urlopy?.length || 0;
        }
        
        // Załaduj statystyki dla czasu pracy
        const czasPracyData = await fetchWithAuth(`${API_BASE}/czas-pracy`);
        if (czasPracyData && czasPracyData.success) {
            document.getElementById('czas-pracy-count').textContent = czasPracyData.czasPracy?.length || 0;
        }
    } catch (error) {
        console.error('Błąd ładowania statystyk:', error);
    }
}

// Obsługa formularzy
function setupForms() {
    // Czas pracy
    document.getElementById('add-czas-pracy-btn').addEventListener('click', () => {
        document.getElementById('czas-pracy-form-container').style.display = 'block';
        document.getElementById('czas-pracy-form').reset();
        document.getElementById('czas-data').valueAsDate = new Date();
    });
    
    document.getElementById('cancel-czas-pracy').addEventListener('click', () => {
        document.getElementById('czas-pracy-form-container').style.display = 'none';
    });
    
    document.getElementById('czas-pracy-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            data: document.getElementById('czas-data').value,
            start: document.getElementById('czas-start').value,
            koniec: document.getElementById('czas-koniec').value,
            opis: document.getElementById('czas-opis').value
        };
        
        await saveCzasPracy(formData);
    });
    
    // Urlopy
    document.getElementById('add-urlop-btn').addEventListener('click', () => {
        document.getElementById('urlop-form-container').style.display = 'block';
        document.getElementById('urlop-form').reset();
        document.getElementById('urlop-data-od').valueAsDate = new Date();
    });
    
    document.getElementById('cancel-urlop').addEventListener('click', () => {
        document.getElementById('urlop-form-container').style.display = 'none';
    });
    
    document.getElementById('urlop-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            dataOd: document.getElementById('urlop-data-od').value,
            dataDo: document.getElementById('urlop-data-do').value,
            typ: document.getElementById('urlop-typ').value,
            opis: document.getElementById('urlop-opis').value
        };
        
        await saveUrlop(formData);
    });
    
    // Plan
    document.getElementById('add-plan-btn').addEventListener('click', () => {
        document.getElementById('plan-form-container').style.display = 'block';
        document.getElementById('plan-form').reset();
        document.getElementById('plan-data').valueAsDate = new Date();
    });
    
    document.getElementById('cancel-plan').addEventListener('click', () => {
        document.getElementById('plan-form-container').style.display = 'none';
    });
    
    document.getElementById('plan-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = {
            data: document.getElementById('plan-data').value,
            tytul: document.getElementById('plan-tytul').value,
            opis: document.getElementById('plan-opis').value,
            priorytet: document.getElementById('plan-priorytet').value
        };
        
        await savePlan(formData);
    });
}

// Funkcje do zapisu danych
async function saveCzasPracy(data) {
    try {
        const result = await fetchWithAuth(`${API_BASE}/czas-pracy`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result && result.success) {
            document.getElementById('czas-pracy-form-container').style.display = 'none';
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
            document.getElementById('urlop-form-container').style.display = 'none';
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

async function savePlan(data) {
    try {
        const result = await fetchWithAuth(`${API_BASE}/plan`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (result && result.success) {
            document.getElementById('plan-form-container').style.display = 'none';
            showMessage('Wpis został dodany do planu pomyślnie!', 'success');
            loadPlan();
            loadTileCounts();
        } else {
            showMessage(result?.message || 'Błąd zapisu', 'error');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showMessage('Wystąpił błąd podczas zapisywania planu', 'error');
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

async function loadPlan() {
    const listDiv = document.getElementById('plan-list');
    listDiv.innerHTML = '<div class="loading">Ładowanie...</div>';
    
    try {
        const data = await fetchWithAuth(`${API_BASE}/plan`);
        if (data && data.success) {
            if (data.plan.length === 0) {
                listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><p>Brak wpisów w planie</p></div>';
            } else {
                listDiv.innerHTML = data.plan.map(wpis => `
                    <div class="data-card">
                        <div class="data-card-header">
                            <h3>${escapeHtml(wpis.tytul)}</h3>
                            <span class="badge badge-${wpis.priorytet}">${wpis.priorytet}</span>
                        </div>
                        <p><strong>Data:</strong> ${formatDate(wpis.data)}</p>
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

// Uruchom dashboard po załadowaniu strony
document.addEventListener('DOMContentLoaded', initDashboard);


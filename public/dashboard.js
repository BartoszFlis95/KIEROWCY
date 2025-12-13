// Stała z bazowym URL API
const API_BASE = "https://www.deneeu.pl/api";

// Funkcja do pobrania tokenu z localStorage (przykład)
function getToken() {
    return localStorage.getItem('token');
}

// Funkcja do sprawdzania autoryzacji
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token) {
        console.warn('Brak tokena, przekierowanie do logowania');
        window.location.href = 'login.html';
        return false;
    }

    if (!user || user.role !== 'driver') {
        console.warn('Użytkownik nie jest kierowcą, przekierowanie do logowania');
        window.location.href = 'login.html';
        return false;
    }

    return true; // Wszystko OK
}

// Zmienna do przechowywania aktualnego użytkownika
let currentUser = null;

// Funkcja do wykonania zapytania z autoryzacją
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

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
            localStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('user-name').textContent = `Witaj, ${currentUser.imie} ${currentUser.nazwisko}!`;
        }
    } catch (error) {
        console.error('Błąd weryfikacji użytkownika:', error);
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
    
    // Obsługa wgrywania Excel
    setupExcelUpload();
    
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

// Obsługa wgrywania plików Excel
let excelData = null;

function setupExcelUpload() {
    const fileInput = document.getElementById('excel-upload');
    const previewContainer = document.getElementById('excel-preview-container');
    const closeBtn = document.getElementById('close-excel-preview');
    const cancelBtn = document.getElementById('cancel-excel-import');
    const importBtn = document.getElementById('import-excel-data');
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            showMessage('Proszę wybrać plik Excel (.xlsx lub .xls)', 'error');
            return;
        }
        
        try {
            showMessage('Przetwarzanie pliku Excel...', 'success');
            const data = await readExcelFile(file);
            excelData = data;
            displayExcelPreview(data);
            previewContainer.style.display = 'block';
        } catch (error) {
            console.error('Błąd odczytu pliku Excel:', error);
            showMessage('Błąd podczas odczytu pliku Excel. Sprawdź format pliku.', 'error');
        }
    });
    
    closeBtn?.addEventListener('click', () => {
        previewContainer.style.display = 'none';
        fileInput.value = '';
        excelData = null;
    });
    
    cancelBtn?.addEventListener('click', () => {
        previewContainer.style.display = 'none';
        fileInput.value = '';
        excelData = null;
    });
    
    importBtn?.addEventListener('click', async () => {
        if (!excelData || excelData.length === 0) {
            showMessage('Brak danych do importu', 'error');
            return;
        }
        
        await importExcelData(excelData);
    });
}

// Funkcja do odczytu pliku Excel
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Pobierz pierwszą kartę
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Konwertuj na strukturę danych
                const headers = jsonData[0] || [];
                const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
                
                const parsedData = rows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        if (header) {
                            obj[header] = row[index] || '';
                        }
                    });
                    return obj;
                });
                
                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// Funkcja do wyświetlania podglądu danych Excel
function displayExcelPreview(data) {
    const previewContent = document.getElementById('excel-preview-content');
    
    if (!data || data.length === 0) {
        previewContent.innerHTML = '<p class="empty-state">Brak danych w pliku</p>';
        return;
    }
    
    // Pobierz nagłówki z pierwszego wiersza
    const headers = Object.keys(data[0]);
    
    let html = `
        <div class="excel-info">
            <p><strong>Znaleziono ${data.length} wierszy danych</strong></p>
        </div>
        <div class="excel-table-wrapper">
            <table class="excel-table">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.slice(0, 10).map(row => `
                        <tr>
                            ${headers.map(h => `<td>${escapeHtml(row[h] || '')}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${data.length > 10 ? `<p class="excel-more">... i ${data.length - 10} więcej wierszy</p>` : ''}
        </div>
    `;
    
    previewContent.innerHTML = html;
}

// Funkcja do importu danych z Excel
async function importExcelData(data) {
    const previewContainer = document.getElementById('excel-preview-container');
    let successCount = 0;
    let errorCount = 0;
    
    showMessage('Importowanie danych...', 'success');
    
    for (const row of data) {
        try {
            // Mapowanie kolumn Excel na format API
            // Zakładamy format: Data, Start, Koniec, Opis
            const formData = {
                data: formatExcelDate(row['Data'] || row['data'] || row['DATA']),
                start: formatExcelTime(row['Start'] || row['start'] || row['Rozpoczęcie'] || row['rozpoczęcie']),
                koniec: formatExcelTime(row['Koniec'] || row['koniec'] || row['Zakończenie'] || row['zakończenie']),
                opis: row['Opis'] || row['opis'] || row['Uwagi'] || row['uwagi'] || ''
            };
            
            // Walidacja
            if (!formData.data || !formData.start || !formData.koniec) {
                errorCount++;
                continue;
            }
            
            const result = await fetchWithAuth(`${API_BASE}/czas-pracy`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            if (result && result.success) {
                successCount++;
            } else {
                errorCount++;
            }
        } catch (error) {
            console.error('Błąd importu wiersza:', error);
            errorCount++;
        }
    }
    
    previewContainer.style.display = 'none';
    document.getElementById('excel-upload').value = '';
    excelData = null;
    
    showMessage(`Zaimportowano ${successCount} wpisów${errorCount > 0 ? `, ${errorCount} błędów` : ''}`, successCount > 0 ? 'success' : 'error');
    loadCzasPracy();
    loadTileCounts();
}

// Funkcja do formatowania daty z Excel
function formatExcelDate(value) {
    if (!value) return '';
    
    // Jeśli to już string w formacie YYYY-MM-DD
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    
    // Jeśli to liczba (Excel date serial)
    if (typeof value === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    // Jeśli to obiekt Date
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }
    
    // Spróbuj sparsować jako datę
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return '';
}

// Funkcja do formatowania czasu z Excel
function formatExcelTime(value) {
    if (!value) return '';
    
    // Jeśli to już string w formacie HH:MM
    if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
        return value;
    }
    
    // Jeśli to liczba (Excel time serial)
    if (typeof value === 'number') {
        const totalSeconds = Math.floor(value * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    
    // Spróbuj sparsować jako czas
    if (typeof value === 'string') {
        const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            return `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
        }
    }
    
    return value.toString();
}

// Uruchom dashboard po załadowaniu strony
document.addEventListener('DOMContentLoaded', initDashboard);


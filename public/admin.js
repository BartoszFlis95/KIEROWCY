// Stała z bazowym URL API
// Automatyczne wykrywanie środowiska - localhost dla testów lokalnych, deneeu.pl dla produkcji
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? `http://${window.location.hostname}:3000` 
    : "https://www.deneeu.pl") + "/api";

// Funkcja do pobrania tokenu z localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Funkcja do sprawdzania autoryzacji admina
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role !== 'admin') {
                window.location.href = 'login.html';
                return false;
            }
        } else {
            window.location.href = 'login.html';
            return false;
        }
    } catch (e) {
        console.error('Błąd parsowania użytkownika:', e);
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Funkcja do wykonania zapytania z autoryzacją
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        console.error('fetchWithAuth: Brak tokenu autoryzacji!');
        return { success: false, message: 'Brak autoryzacji' };
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            let errorData = { success: false, message: `Błąd HTTP ${response.status}` };
            try {
                const errorText = await response.text();
                const parsed = JSON.parse(errorText);
                errorData = parsed;
            } catch (e) {
                // Ignoruj błąd parsowania
            }
            return errorData;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('fetchWithAuth: Błąd sieci:', error);
        // Jeśli to błąd połączenia, pokaż komunikat
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError') {
            showMessage('Błąd połączenia z serwerem. Sprawdź, czy serwer działa.', 'error');
        }
        return { success: false, message: `Błąd połączenia: ${error.message}` };
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
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL');
    } catch (e) {
        return dateString;
    }
}

// Funkcja do wyświetlania komunikatów
function showMessage(message, type = 'success') {
    // Usuń poprzednie komunikaty
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
    }
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Zmienna do przechowywania sparsowanych danych z Excel
let parsedExcelData = [];

// Funkcja do parsowania pliku Excel (bez zapisywania)
async function parseExcelFile(file) {
    try {
        if (typeof XLSX === 'undefined') {
            showMessage('Błąd: Biblioteka Excel nie została załadowana. Odśwież stronę.', 'error');
            return null;
        }
        
        showMessage('Parsowanie pliku Excel...', 'success');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onerror = () => {
                showMessage('Błąd odczytu pliku Excel', 'error');
                reject(new Error('Błąd odczytu pliku'));
            };
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showMessage('Plik Excel nie zawiera żadnych kart', 'error');
                        reject(new Error('Brak kart w pliku'));
                        return;
                    }
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    if (!worksheet) {
                        showMessage('Nie można odczytać danych z karty Excel', 'error');
                        reject(new Error('Nie można odczytać danych'));
                        return;
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
                        showMessage('Plik Excel jest pusty lub nie zawiera danych', 'error');
                        reject(new Error('Brak danych'));
                        return;
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
                    
                    resolve(parsedData);
                } catch (err) {
                    console.error('Błąd parsowania Excel:', err);
                    showMessage(`Błąd parsowania pliku Excel: ${err.message}`, 'error');
                    reject(err);
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        console.error('Błąd wczytywania pliku:', error);
        showMessage(`Błąd wczytywania pliku Excel: ${error.message}`, 'error');
        return null;
    }
}

// Funkcja do wyświetlenia podglądu danych
function showExcelPreview(data) {
    const previewContainer = document.getElementById('excel-preview-container');
    const previewTable = document.getElementById('excel-preview-table');
    
    if (!previewContainer || !previewTable) {
        console.error('Nie znaleziono elementów podglądu');
        return;
    }
    
    if (!data || data.length === 0) {
        previewTable.innerHTML = '<p>Brak danych do wyświetlenia</p>';
        previewContainer.style.display = 'block';
        return;
    }
    
    const uniquePseudonyms = [...new Set(data.map(row => row.pseudonim).filter(p => p && p !== '' && p !== '-'))];
    
    let tableHTML = `
        <div style="overflow-x: auto; max-height: 500px; overflow-y: auto;">
            <table class="excel-preview-table" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="background: #667eea; color: white; position: sticky; top: 0; z-index: 10;">
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">Wiersz</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">Data</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">L - Telefon</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">N - Nazwisko</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">O - Imię</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">R - Godzina</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">S - Pseudonim</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">T - Nazwa firmy</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">U - Adres firmy</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">V - Godz. przyjazdu</th>
                        <th style="padding: 10px; border: 1px solid #ddd; text-align: left; white-space: nowrap;">W - Dział firmy</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach((row, index) => {
        tableHTML += `
            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f9f9f9'};">
                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: 600;">${row.rowNumber}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${row.data || '-'}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.telefon || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.nazwisko || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.imie || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.godzina || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.pseudonim || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: 600;">${escapeHtml(row.nazwaFirmy || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.adresFirmy || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.godzinaPrzyjazdu || '-')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(row.dzialFirmy || '-')}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
        <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 2px solid #667eea;">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #333;">Wybierz kierowców do zaimportowania</h3>
            <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                <button id="select-all-drivers-btn" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">
                    ✓ Wybierz wszystkich
                </button>
                <button id="deselect-all-drivers-btn" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">
                    ✗ Odznacz wszystkich
                </button>
                <span id="selected-count" style="margin-left: auto; color: #667eea; font-weight: 600;">
                    Wybrano: 0 z ${uniquePseudonyms.length}
                </span>
            </div>
            <div id="drivers-checkbox-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; max-height: 200px; overflow-y: auto; padding: 10px; background: white; border-radius: 4px;">
    `;
    
    uniquePseudonyms.forEach((pseudonim, index) => {
        const rowCount = data.filter(row => row.pseudonim === pseudonim).length;
        tableHTML += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 4px; transition: background 0.2s;" 
                   onmouseover="this.style.background='#f0f0f0'" 
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" 
                       class="driver-checkbox" 
                       value="${escapeHtml(pseudonim)}" 
                       data-pseudonim="${escapeHtml(pseudonim)}"
                       style="width: 18px; height: 18px; cursor: pointer;">
                <span style="flex: 1;">
                    <strong>${escapeHtml(pseudonim)}</strong>
                    <span style="color: #666; font-size: 0.85em;"> (${rowCount} wiersz${rowCount !== 1 ? 'y' : ''})</span>
                </span>
            </label>
        `;
    });
    
    tableHTML += `
            </div>
            <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-import-btn" class="btn-secondary">Anuluj</button>
                <button id="confirm-import-btn" class="btn-primary" disabled>
                    📧 Wyślij maila
                </button>
            </div>
        </div>
        <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
            Znaleziono <strong>${data.length}</strong> wierszy z <strong>${uniquePseudonyms.length}</strong> unikalnymi pseudonimami kierowców.
        </p>
    `;
    
    previewTable.innerHTML = tableHTML;
    previewContainer.style.display = 'block';
    
    setupDriverSelection();
    previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Funkcja do obsługi wyboru kierowców
function setupDriverSelection() {
    const checkboxes = document.querySelectorAll('.driver-checkbox');
    const selectAllBtn = document.getElementById('select-all-drivers-btn');
    const deselectAllBtn = document.getElementById('deselect-all-drivers-btn');
    const confirmBtn = document.getElementById('confirm-import-btn');
    const cancelBtn = document.getElementById('cancel-import-btn');
    const selectedCountSpan = document.getElementById('selected-count');
    
    if (!selectedCountSpan || !confirmBtn) {
        console.error('Nie znaleziono elementów do obsługi wyboru kierowców');
        return;
    }
    
    function updateSelectionState() {
        const checked = document.querySelectorAll('.driver-checkbox:checked');
        const total = checkboxes.length;
        const count = checked.length;
        
        if (selectedCountSpan) {
            selectedCountSpan.textContent = `Wybrano: ${count} z ${total}`;
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = count === 0;
            
            if (count === 0) {
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
            } else {
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            }
        }
    }
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectionState);
    });
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = true);
            updateSelectionState();
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
            updateSelectionState();
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (parsedExcelData && parsedExcelData.length > 0) {
                await sendEmailToDrivers(parsedExcelData);
            } else {
                showMessage('Brak danych do wysłania', 'error');
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const previewContainer = document.getElementById('excel-preview-container');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            parsedExcelData = [];
        });
    }
    
    updateSelectionState();
}

// Funkcja do wysyłania emaili
async function sendEmailToDrivers(data) {
    if (!data || data.length === 0) {
        showMessage('Brak danych do wysłania', 'error');
        return;
    }
    
    const checkedBoxes = document.querySelectorAll('.driver-checkbox:checked');
    const selectedPseudonyms = Array.from(checkedBoxes).map(cb => cb.value);
    
    if (selectedPseudonyms.length === 0) {
        showMessage('Wybierz przynajmniej jednego kierowcę', 'error');
        return;
    }
    
    const filteredData = data.filter(row => {
        const pseudonim = row.pseudonim || '';
        return selectedPseudonyms.includes(pseudonim);
    });
    
    if (filteredData.length === 0) {
        showMessage('Brak danych do wysłania dla wybranych kierowców', 'error');
        return;
    }
    
    const driversData = {};
    filteredData.forEach(row => {
        const pseudonim = row.pseudonim || 'Brak pseudonimu';
        if (!driversData[pseudonim]) {
            driversData[pseudonim] = [];
        }
        driversData[pseudonim].push({
            nazwaFirmy: row.nazwaFirmy || '',
            adresFirmy: row.adresFirmy || '',
            godzina: row.godzina || '',
            godzinaPrzyjazdu: row.godzinaPrzyjazdu || '',
            dzialFirmy: row.dzialFirmy || '',
            telefon: row.telefon || '',
            imie: row.imie || '',
            nazwisko: row.nazwisko || '',
            data: row.data || ''
        });
    });
    
    showMessage(`Wysyłanie emaili do ${selectedPseudonyms.length} kierowców...`, 'success');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[SEND EMAIL] Rozpoczynam wysyłanie emaili...');
    console.log('[SEND EMAIL] Wybrane pseudonimy:', selectedPseudonyms);
    console.log('[SEND EMAIL] Liczba kierowców:', selectedPseudonyms.length);
    console.log('[SEND EMAIL] Dane kierowców:', driversData);
    
    try {
        // Opcja 1: Wysyłanie przez JSON (obecna metoda)
        const emailData = {
            drivers: Object.keys(driversData).map(pseudonim => ({
                pseudonim: pseudonim,
                email: '',
                dane: driversData[pseudonim]
            }))
        };
        
        console.log('[SEND EMAIL] Wysyłanie danych do serwera:', JSON.stringify(emailData, null, 2));
        
        const token = getToken();
        if (!token) {
            showMessage('Brak autoryzacji. Zaloguj się ponownie.', 'error');
            window.location.href = 'login.html';
            return;
        }
        
        const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.hostname}:3000/api/send-email`
            : 'https://www.deneeu.pl/api/send-email';
        
        console.log('[SEND EMAIL] Endpoint:', apiUrl);
        
        const result = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(emailData)
        }).then(res => res.json());
        
        console.log('[SEND EMAIL] Odpowiedź serwera:', result);
        console.log('═══════════════════════════════════════════════════════════');
        
        if (result && result.success) {
            const sentCount = result.sent || 0;
            const totalCount = result.total || selectedPseudonyms.length;
            const message = `✓ Wysłano emaile do ${sentCount} z ${totalCount} kierowców`;
            showMessage(message, 'success');
            
            // Pokaż szczegóły wyników jeśli są dostępne
            if (result.results && result.results.length > 0) {
                console.log('[SEND EMAIL] Szczegóły wysyłania:', result.results);
                result.results.forEach((r, index) => {
                    if (r.status === 'sent') {
                        console.log(`  ✓ ${index + 1}. Email wysłany do ${r.email} (${r.pseudonim})`);
                    } else if (r.status === 'error') {
                        console.error(`  ✗ ${index + 1}. Błąd dla ${r.email} (${r.pseudonim}): ${r.error}`);
                    } else if (r.status === 'user_not_found') {
                        console.warn(`  ⚠ ${index + 1}. Nie znaleziono użytkownika dla pseudonimu: ${r.pseudonim}`);
                    }
                });
            }
            
            const previewContainer = document.getElementById('excel-preview-container');
            if (previewContainer) {
                previewContainer.style.display = 'none';
            }
            
            parsedExcelData = [];
            await loadPlan();
        } else {
            const errorMsg = result?.message || 'Błąd wysyłania emaili';
            console.error('[SEND EMAIL] Błąd:', errorMsg);
            showMessage(errorMsg, 'error');
        }
    } catch (err) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('[SEND EMAIL] Błąd podczas wysyłania emaili:', err);
        console.error('[SEND EMAIL] Szczegóły błędu:', err.message);
        console.error('═══════════════════════════════════════════════════════════');
        showMessage(`Błąd wysyłania emaili: ${err.message}`, 'error');
    }
}

// Funkcja do ładowania planu
async function loadPlan() {
    const listDiv = document.getElementById('plan-list');
    if (!listDiv) {
        console.error('Nie znaleziono elementu plan-list');
        return;
    }
    
    listDiv.innerHTML = '<div class="loading">Ładowanie...</div>';
    
    try {
        const data = await fetchWithAuth(`${API_BASE}/plan`);
        
        if (data && data.success) {
            if (!data.plan || data.plan.length === 0) {
                listDiv.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><p>Brak wpisów w planie</p></div>';
            } else {
                listDiv.innerHTML = data.plan.map(wpis => `
                    <div class="data-card">
                        <div class="data-card-header">
                            <h3>${escapeHtml(wpis.tytul || 'Brak tytułu')}</h3>
                            <span class="badge badge-${wpis.priorytet || 'normalny'}">${wpis.priorytet || 'normalny'}</span>
                        </div>
                        ${wpis.userName ? `<p><strong>Kierowca:</strong> ${escapeHtml(wpis.userName)}</p>` : ''}
                        <p><strong>Data:</strong> ${formatDate(wpis.data)}</p>
                        ${wpis.opis ? `<p>${escapeHtml(wpis.opis)}</p>` : ''}
                    </div>
                `).join('');
            }
        } else {
            listDiv.innerHTML = '<div class="empty-state"><p>Błąd podczas ładowania danych</p></div>';
        }
    } catch (error) {
        console.error('Błąd ładowania planu:', error);
        listDiv.innerHTML = '<div class="empty-state"><p>Błąd podczas ładowania danych</p></div>';
    }
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) {
        return;
    }
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        const adminName = document.getElementById('admin-name');
        if (adminName) {
            adminName.textContent = user.email || 'Administrator';
        }
    }
    
    // Pokaż panel planowania
    const planTab = document.getElementById('plan-tab');
    if (planTab) {
        planTab.style.display = 'block';
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
    
    const uploadExcelBtn = document.getElementById('upload-excel-btn');
    const excelFileInput = document.getElementById('excel-file-input');
    
    if (uploadExcelBtn && excelFileInput) {
        uploadExcelBtn.addEventListener('click', () => {
            excelFileInput.click();
        });
        
        excelFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            
            if (!file) {
                return;
            }
            
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
                showMessage('Błąd: Wybierz plik Excel (.xlsx lub .xls)', 'error');
                e.target.value = '';
                return;
            }
            
            if (typeof XLSX === 'undefined') {
                showMessage('Błąd: Biblioteka Excel nie została załadowana. Odśwież stronę (F5).', 'error');
                e.target.value = '';
                return;
            }
            
            try {
                const parsedData = await parseExcelFile(file);
                if (parsedData && parsedData.length > 0) {
                    parsedExcelData = parsedData;
                    showExcelPreview(parsedData);
                } else {
                    showMessage('Nie znaleziono danych do zaimportowania', 'error');
                }
            } catch (error) {
                console.error('Błąd parsowania:', error);
                showMessage('Błąd parsowania pliku Excel', 'error');
            }
            
            e.target.value = '';
        });
    }
    
    await loadPlan();
});

// Obsługa formularza rejestracji
const API_URL = 'https://www.deneeu.pl';

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        imie: document.getElementById('imie').value.trim(),
        nazwisko: document.getElementById('nazwisko').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefon: document.getElementById('telefon').value.trim(),
        haslo: document.getElementById('haslo').value
    };

    const messageDiv = document.getElementById('message');
    messageDiv.className = 'message';
    messageDiv.textContent = '';
    messageDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            messageDiv.className = 'message success';
            messageDiv.textContent = data.message + ' Przekierowywanie do logowania...';
            messageDiv.style.display = 'block';
            document.getElementById('register-form').reset();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.message;
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Wystąpił błąd połączenia z serwerem.';
        messageDiv.style.display = 'block';
        console.error('Błąd:', error);
    }
});


// Funkcja do ładowania listy użytkowników
async function loadUsers() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '<div class="loading">Ładowanie...</div>';

    try {
        const response = await fetch(`${API_URL}/api/users`);
        const data = await response.json();

        if (data.success) {
           

            if (data.users.length === 0) {
                usersList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <h3>Brak zarejestrowanych użytkowników</h3>
                        <p>Zarejestruj pierwszego użytkownika, aby zobaczyć go tutaj.</p>
                    </div>
                `;
            } else {
                usersList.innerHTML = data.users.map(user => `
                    <div class="user-card">
                        <h3>${escapeHtml(user.imie)} ${escapeHtml(user.nazwisko)}</h3>
                        <div class="user-info">
                            <div class="user-info-item">
                                <label>Email</label>
                                <span>${escapeHtml(user.email)}</span>
                            </div>
                            ${user.telefon ? `
                            <div class="user-info-item">
                                <label>Telefon</label>
                                <span>${escapeHtml(user.telefon)}</span>
                            </div>
                            ` : ''}
                            <div class="user-info-item">
                                <label>Data rejestracji</label>
                                <span>${formatDate(user.dataRejestracji)}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } else {
            usersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Błąd podczas ładowania użytkowników</h3>
                    <p>${data.message || 'Nieznany błąd'}</p>
                </div>
            `;
        }
    } catch (error) {
        usersList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Błąd połączenia</h3>
                <p>Nie można połączyć się z serwerem. Upewnij się, że serwer działa.</p>
            </div>
        `;
        console.error('Błąd:', error);
    }
}

// Funkcja do formatowania daty
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Funkcja do escapowania HTML (zapobieganie XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Obsługa przycisku odświeżania
document.getElementById('refresh-btn')?.addEventListener('click', () => {
    loadUsers();
});

// Obsługa zakładek
document.addEventListener('DOMContentLoaded', () => {
    // Załaduj użytkowników przy starcie
    loadUsers();
    
    // Obsługa przełączania zakładek
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Usuń aktywną klasę ze wszystkich przycisków i zawartości
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Dodaj aktywną klasę do klikniętego przycisku i odpowiedniej zawartości
            btn.classList.add('active');
            document.getElementById(`${tab}-tab`)?.classList.add('active');
            
            // Jeśli kliknięto zakładkę użytkowników, odśwież listę
            if (tab === 'users') {
                loadUsers();
            }
        });
    });
});


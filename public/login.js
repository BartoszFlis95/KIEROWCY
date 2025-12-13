// Obsługa formularza logowania
// Automatyczne wykrywanie środowiska - localhost dla testów lokalnych, deneeu.pl dla produkcji
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? `http://${window.location.hostname}:3000` 
    : "https://www.deneeu.pl";

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const messageDiv = document.getElementById('message');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email')?.value.trim();
        const haslo = document.getElementById('haslo')?.value;

        if (!email || !haslo) {
            displayMessage('Proszę wypełnić wszystkie pola', 'error');
            return;
        }

        try {
            // Jeśli login to "admin", użyj pola "login" zamiast "email"
            const loginData = email === 'admin' 
                ? { login: 'admin', haslo }
                : { email, haslo };
            
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    // Sprawdź rolę użytkownika i przekieruj odpowiednio
                    if (data.user.role === 'admin') {
                        displayMessage(data.message, 'success');
                        setTimeout(() => {
                            window.location.href = 'admin.html';
                        }, 1500);
                        return;
                    }
                }
                displayMessage(data.message, 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                displayMessage(data.message, 'error');
            }
        } catch (err) {
            displayMessage('Błąd połączenia z serwerem.', 'error');
            console.error(err);
        }
    });

    function displayMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
});

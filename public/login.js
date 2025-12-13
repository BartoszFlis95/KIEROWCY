// Obsługa formularza logowania
const API_URL = "https://www.deneeu.pl";

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
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, haslo })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
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

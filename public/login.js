document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const messageDiv = document.getElementById('message');

    const API_URL = "https://www.deneeu.pl/api"; // Twój backend

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.querySelector('#email')?.value.trim();
            const haslo = document.querySelector('#haslo')?.value;

            if (!email || !haslo) {
                displayMessage('Proszę wypełnić wszystkie pola', 'error');
                return;
            }

            try {
const response = await fetch(`${API_URL}/login`, { // bez dodatkowego /api
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, haslo })
});

                const data = await response.json();

                if (data.success) {
                    // Zapis tokenu i użytkownika w localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

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
    }

    function displayMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
});

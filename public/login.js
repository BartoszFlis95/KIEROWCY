// Obsługa formularza logowania
const API_URL = "https://kierowcy1.onrender.com";
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const messageDiv = document.getElementById('message');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Zapobieganie domyślnemu zachowaniu formularza
            const email = document.querySelector('#email')?.value.trim();
        const haslo = document.querySelector('#haslo')?.value;
            

          

            // Walidacja pól
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
                // Zapis tokenu w localStorage
                localStorage.setItem('token', data.token);
                displayMessage(data.message, 'success');

                // Przekierowanie po 1-2 sekundach
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

    // Funkcja do wyświetlania komunikatów błędów
     function displayMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
}   })

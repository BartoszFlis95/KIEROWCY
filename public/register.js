const API_BASE = "https://www.deneeu.pl/api"; // Twój backend

const registerForm = document.getElementById('register-form');
const messageDiv = document.getElementById('register-message');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        imie: document.getElementById('imie').value.trim(),
        nazwisko: document.getElementById('nazwisko').value.trim(),
        email: document.getElementById('email').value.trim(),
        haslo: document.getElementById('haslo').value
    };

    // Prosta walidacja
    if (!formData.imie || !formData.nazwisko || !formData.email || !formData.haslo) {
        showMessage('Wszystkie pola są wymagane', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showMessage('Błąd połączenia z serwerem', 'error');
    }
});

// Funkcja do wyświetlania komunikatów
function showMessage(msg, type = 'success') {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

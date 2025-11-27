document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageContainer = document.getElementById('message-container');
    const loginBtn = loginForm.querySelector('.login-btn span'); // Dapatkan span di dalam butang

    // --- FUNGSI UNTUK MEMAPARKAN PESAN ---
    function showMessage(text, type) {
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        // Sembunyikan mesej selepas 5 saat
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }

    // --- FUNGSI UNTUK MENUNJUKKAN/SEMBUNYIKAN LOADING PADA BUTANG ---
    function setLoading(isLoading) {
        if (isLoading) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sedang Log Masuk...';
            loginBtn.parentElement.disabled = true; // Lumpuhkan butang
        } else {
            loginBtn.innerHTML = 'Masuk';
            loginBtn.parentElement.disabled = false; // Aktifkan semula butang
        }
    }

    // --- EVENT LISTENER UNTUK SUBMIT BORANG ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Cegah reload halaman

        const email = emailInput.value;
        const password = passwordInput.value;

        // Paparkan loading sebaik sahaja
        setLoading(true);

        try {
            // Panggil fungsi signIn dari firebase.js
            await signIn(email, password);
            
            // Paparkan mesej berjaya
            showMessage('Log masuk berjaya! Mengalihkan ke dashboard...', 'success');
            
            // Alih ke dashboard selepas 1.5 saat
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);

        } catch (error) {
            console.error('Sign in error:', error);
            
            // Paparkan mesej ralat yang lebih mesra pengguna
            let errorMessage = 'Log masuk gagal. Periksa email dan kata laluan Anda.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Pengguna dengan email tersebut tidak ditemukan.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Kata laluan yang anda masukkan salah.';
            }
            showMessage(errorMessage, 'error');
        } finally {
            // Pastikan butang kembali ke keadaan asal, tidak kira berjaya atau gagal
            setLoading(false);
        }
    });
});
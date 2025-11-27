document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageContainer = document.getElementById('message-container');

    // Fungsi untuk menampilkan pesan
    function showMessage(text, type) {
        messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
        // Sembunyikan pesan setelah 5 detik
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }

    // Event listener untuk submit form
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Mencegah reload halaman

        const email = emailInput.value;
        const password = passwordInput.value;

        // Tampilkan pesan loading
        showMessage('Sedang masuk...', 'info'); // Anda bisa buat class .info di css jika mau

        try {
            // Panggil fungsi signIn dari firebase.js
            await signIn(email, password);
            
            // Jika berhasil
            showMessage('Login berhasil! Mengalihkan...', 'success');
            
            // Arahkan ke halaman dashboard setelah 1.5 detik
            setTimeout(() => {
                window.location.href = 'dashboard.html'; // Ganti dengan URL dashboard Anda
            }, 1500);

        } catch (error) {
            // Jika terjadi error
            console.error(error);
            // Tampilkan pesan error yang user-friendly
            let errorMessage = 'Login gagal. Periksa email dan password Anda.';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'Pengguna dengan email tersebut tidak ditemukan.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Password yang Anda masukkan salah.';
            }
            showMessage(errorMessage, 'error');
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {
  // --- PENGESAHAN LOG MASUK ---
  auth.onAuthStateChanged(user => {
      if (user) {
          // Jika pengguna sudah log masuk, redirect ke dashboard
          window.location.href = 'dashboard.html';
      }
  });

  // --- ELEMEN DOM ---
  const registerForm = document.getElementById('register-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const messageContainer = document.getElementById('message-container');

  // --- FUNGSI UNTUK MEMAPARKAN PESAN ---
  function showMessage(text, type) {
      messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
      setTimeout(() => {
          messageContainer.innerHTML = '';
      }, 5000);
  }

  // --- EVENT LISTENER UNTUK BORANG PENDAFTARAN ---
  registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = nameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // --- VALIDASI PELANGGAN (CLIENT-SIDE) ---
      if (password !== confirmPassword) {
          showMessage('Kata laluan tidak sepadan.', 'error');
          return;
      }

      if (password.length < 6) {
          showMessage('Kata laluan mesti sekurang-kurangnya 6 aksara.', 'error');
          return;
      }

      try {
          // Panggil fungsi signUp dari firebase.js
          await signUp(name, email, password);
          showMessage('Pendaftaran berjaya! Mengalihkan ke dashboard...', 'success');
          
          // Tunggu sebentar sebelum mengalihkan
          setTimeout(() => {
              window.location.href = 'dashboard.html';
          }, 1500);

      } catch (error) {
          console.error('Registration error:', error);
          let errorMessage = 'Pendaftaran gagal. Sila cuba lagi.';
          // Paparkan ralat yang lebih spesifik dari Firebase
          if (error.code === 'auth/email-already-in-use') {
              errorMessage = 'Email ini sudah digunakan. Sila gunakan email lain.';
          } else if (error.code === 'auth/weak-password') {
              errorMessage = 'Kata laluan terlalu lemah. Sila pilih kata laluan yang lebih kuat.';
          }
          showMessage(errorMessage, 'error');
      }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const installBanner = document.getElementById('pwa-install-banner');
  const installButton = document.getElementById('pwa-install-button');
  const dismissButton = document.getElementById('pwa-dismiss-button');

  let deferredPrompt;

  // --- TUNGGU ACARA SEBELUM PASANG ---
  window.addEventListener('beforeinstallprompt', (e) => {
      // Halang pelayar daripada menunjukkan prompt lalai
      e.preventDefault();
      // Simpan acara untuk diguna kemudian
      deferredPrompt = e;

      // Paparkan banner pemasangan
      if (installBanner) {
          installBanner.classList.add('show');
      }
  });

  // --- BUTANG PASANG DIKLIK ---
  if (installButton) {
      installButton.addEventListener('click', async () => {
          if (!deferredPrompt) {
              return;
          }
          // Tunjukkan prompt pemasangan
          deferredPrompt.prompt();
          // Tunggu jawapan pengguna
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to the install prompt: ${outcome}`);
          // Sembunyikan banner
          installBanner.classList.remove('show');
          // Kosongkan prompt
          deferredPrompt = null;
      });
  }

  // --- BUTANG TUTUP (X) DIKLIK ---
  if (dismissButton) {
      dismissButton.addEventListener('click', () => {
          installBanner.classList.remove('show');
          // Simpan dalam localStorage supaya tidak muncul lagi dalam masa terdekat
          localStorage.setItem('pwa-install-dismissed', 'true');
      });
  }
});
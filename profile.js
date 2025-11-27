document.addEventListener('DOMContentLoaded', () => {
  // --- PENGESAHAN LOG MASUK ---
  auth.onAuthStateChanged(user => {
      if (!user) {
          window.location.href = 'index.html';
      } else {
          // Jika pengguna log masuk, muatkan profil mereka
          loadUserProfile(user.uid);
      }
  });

  // --- ELEMEN DOM ---
  const profileForm = document.getElementById('profile-form');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  // --- FUNGSI UNTUK MEMUATKAN DATA PROFIL ---
  async function loadUserProfile(uid) {
      try {
          const docRef = db.collection('userProfiles').doc(uid);
          const doc = await docRef.get();

          if (doc.exists) {
              const profile = doc.data();
              // Isi borang dengan data yang ada
              document.getElementById('company-name').value = profile.companyName || '';
              document.getElementById('company-address').value = profile.companyAddress || '';
              document.getElementById('company-email').value = profile.companyEmail || '';
              document.getElementById('company-phone').value = profile.companyPhone || '';
              document.getElementById('company-logo-url').value = profile.companyLogoUrl || '';
              
              // TAMBAHKAN BARIS INI UNTUK MEMUATKAN DATA BANK
              document.getElementById('profile-bank-name').value = profile.companyBankName || '';
              document.getElementById('profile-account-name').value = profile.companyAccountName || '';
              document.getElementById('profile-account-number').value = profile.companyAccountNumber || '';
          }
      } catch (error) {
          console.error("Error loading user profile:", error);
      }
  }

  // --- FUNGSI UNTUK MENYIMPAN PERUBAHAN PROFIL ---
  async function saveProfile() {
      const user = auth.currentUser;
      if (!user) return;

      // Tukar butang ke keadaan "loading"
      saveProfileBtn.disabled = true;
      saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

      const profileData = {
          uid: user.uid,
          companyName: document.getElementById('company-name').value,
          companyAddress: document.getElementById('company-address').value,
          companyEmail: document.getElementById('company-email').value,
          companyPhone: document.getElementById('company-phone').value,
          companyLogoUrl: document.getElementById('company-logo-url').value,
          
          // TAMBAHKAN BARIS INI UNTUK MENYIMPAN DATA BANK
          companyBankName: document.getElementById('profile-bank-name').value,
          companyAccountName: document.getElementById('profile-account-name').value,
          companyAccountNumber: document.getElementById('profile-account-number').value,

          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
          // Gunakan 'set' dengan 'merge: true' untuk mencipta atau mengemas kini dokumen
          await db.collection('userProfiles').doc(user.uid).set(profileData, { merge: true });
          alert('Profil syarikat berjaya disimpan!');
      } catch (error) {
          console.error('Error saving profile:', error);
          alert('Gagal menyimpan profil. Sila cuba lagi.');
      } finally {
          // Kembalikan butang ke keadaan asal
          saveProfileBtn.disabled = false;
          saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
      }
  }

  // --- EVENT LISTENER ---
  saveProfileBtn.addEventListener('click', () => {
      saveProfile();
  });
});
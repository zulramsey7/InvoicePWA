document.addEventListener('DOMContentLoaded', () => {
  // --- PENGESAHAN LOG MASUK ---
  auth.onAuthStateChanged(user => {
      if (!user) {
          window.location.href = 'index.html';
      } else {
          // Jika pengguna log masuk, muatkan data invois
          loadInvoiceData();
      }
  });

  // --- FUNGSI UTAMA UNTUK MEMUATKAN DATA INVOIS ---
  async function loadInvoiceData() {
      // Dapatkan ID invois dari URL (contoh: ?id=abcdef12345)
      const urlParams = new URLSearchParams(window.location.search);
      const invoiceId = urlParams.get('id');

      if (!invoiceId) {
          document.getElementById('invoice-container').innerHTML = '<p style="text-align:center; color:red;">Ralat: ID Invois tidak ditemui dalam URL.</p>';
          return;
      }

      try {
          const doc = await db.collection('invoices').doc(invoiceId).get();

          if (!doc.exists) {
              document.getElementById('invoice-container').innerHTML = '<p style="text-align:center; color:red;">Ralat: Invois tidak wujud.</p>';
              return;
          }

          const invoice = doc.data();
          renderInvoice(invoice);

      } catch (error) {
          console.error("Error fetching invoice:", error);
          document.getElementById('invoice-container').innerHTML = '<p style="text-align:center; color:red;">Gagal memuatkan data invois.</p>';
      }
  }

  // --- FUNGSI UNTUK MEMAPARKAN DATA INVOIS KE HTML ---
  function renderInvoice(invoice) {
      const container = document.getElementById('invoice-container');
      
      // Format tarikh
      const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID');

      // Buat baris jadual untuk item
      const itemsRows = invoice.items.map(item => `
          <tr>
              <td>${item.sku || '-'}</td>
              <td>${item.description}</td>
              <td>${item.size || '-'}</td>
              <td>${item.quantity}</td>
              <td>RM ${parseFloat(item.price).toFixed(2)}</td>
              <td>RM ${(item.quantity * item.price).toFixed(2)}</td>
          </tr>
      `).join('');

      container.innerHTML = `
          <div class="invoice-header">
              <div class="invoice-logo">
                  <img src="https://i.ibb.co/W4N67t8m/bekna.png" alt="Logo Syarikat">
              </div>
              <div class="invoice-details">
                  <h1>INVOIS</h1>
                  <p><strong>No:</strong> ${invoice.invoiceNumber}</p>
                  <p><strong>Tarikh:</strong> ${formatDate(invoice.date)}</p>
                  <p><strong>Jatuh Tempo:</strong> ${formatDate(invoice.dueDate)}</p>
                  <p><strong>Status:</strong> <span class="status-badge">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></p>
              </div>
          </div>

          <div class="invoice-billings">
              <div class="bill-to">
                  <h3>Dari:</h3>
                  <p>${invoice.company.name}<br>
                     ${invoice.company.address.replace(/\n/g, '<br>')}<br>
                     ${invoice.company.email}<br>
                     ${invoice.company.phone}</p>
              </div>
              <div class="bill-to">
                  <h3>Kepada:</h3>
                  <p>${invoice.client.name}<br>
                     ${invoice.client.address.replace(/\n/g, '<br>')}<br>
                     ${invoice.client.email}</p>
              </div>
          </div>

          <table class="invoice-table">
              <thead>
                  <tr>
                      <th>Kod Produk</th>
                      <th>Penerangan</th>
                      <th>Saiz</th>
                      <th>Kuantiti</th>
                      <th>Harga</th>
                      <th>Jumlah</th>
                  </tr>
              </thead>
              <tbody>
                  ${itemsRows}
              </tbody>
          </table>

          <div class="invoice-summary">
              <table>
                  <tr>
                      <td class="label">Jumlah:</td>
                      <td>RM ${parseFloat(invoice.subtotal).toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td class="label">Diskaun:</td>
                      <td>- RM ${parseFloat(invoice.discount).toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td class="label">Cukai (${invoice.tax}%):</td>
                      <td>RM ${((parseFloat(invoice.subtotal) - parseFloat(invoice.discount)) * (parseFloat(invoice.tax) / 100)).toFixed(2)}</td>
                  </tr>
                  <tr>
                      <td class="label total">Jumlah Keseluruhan:</td>
                      <td class="total">RM ${parseFloat(invoice.grandTotal).toFixed(2)}</td>
                  </tr>
              </table>
          </div>

          <div class="invoice-footer">
              <div class="invoice-footer-notes">
                  <h3>Catatan</h3>
                  <p>${invoice.notes || '-'}</p>
              </div>
              <div class="invoice-footer-payment">
                  <h3>Butiran Pembayaran</h3>
                  <p><strong>Bank:</strong> ${invoice.bankDetails.bankName}<br>
                     <strong>Nama Akaun:</strong> ${invoice.bankDetails.accountName}<br>
                     <strong>No. Akaun:</strong> ${invoice.bankDetails.accountNumber}</p>
              </div>
          </div>
      `;
  }
});
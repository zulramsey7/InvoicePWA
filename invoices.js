document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMEN DOM ---
  const searchInput = document.getElementById('search-input');
  const invoicesContainer = document.getElementById('invoices-container');
  const noInvoicesMessage = document.getElementById('no-invoices-message');
  const loadingOverlay = document.getElementById('loading-overlay');
  const successNotification = document.getElementById('success-notification');
  const errorNotification = document.getElementById('error-notification');

  // Elemen untuk penapisan dan paparan
  const filterButtons = document.querySelectorAll('.filter-btn');
  const viewButtons = document.querySelectorAll('.view-btn');

  // --- VARIABEL ---
  let currentUser = null;
  let invoices = [];
  let currentFilter = 'all'; // all, draft, sent, paid, overdue
  let currentView = 'list'; // list, grid

  // --- INISIALISASI ---
  initApp();

  function initApp() {
      // Check authentication state
      auth.onAuthStateChanged(user => {
          if (user) {
              currentUser = user;
              loadAndDisplayInvoices();
          } else {
              window.location.href = 'index.html';
          }
      });

      // Setup event listeners
      setupEventListeners();
  }

  // --- SETUP EVENT LISTENERS ---
  function setupEventListeners() {
      // Search functionality
      if (searchInput) {
          searchInput.addEventListener('input', handleSearch);
      }

      // Filter buttons
      filterButtons.forEach(btn => {
          btn.addEventListener('click', () => {
              const filter = btn.getAttribute('data-filter');
              setActiveFilterButton(btn);
              currentFilter = filter;
              applyFiltersAndRender();
          });
      });

      // View toggle buttons
      viewButtons.forEach(btn => {
          btn.addEventListener('click', () => {
              const view = btn.getAttribute('data-view');
              setActiveViewButton(btn);
              currentView = view;
              applyViewMode();
          });
      });
  }

  // --- FUNGSI UTAMA: MUAT DAN PAPAR INVOIS ---
  async function loadAndDisplayInvoices() {
      try {
          showLoading();
          
          const invoicesSnapshot = await db
              .collection('invoices')
              .where('uid', '==', currentUser.uid)
              .orderBy('createdAt', 'desc')
              .get();

          invoices = [];
          invoicesSnapshot.forEach(doc => {
              const data = doc.data();
              // Check if overdue
              if (data.status === 'sent' && data.dueDate && new Date(data.dueDate) < new Date()) {
                  data.status = 'overdue';
              }
              invoices.push({ id: doc.id, ...data });
          });
          
          applyFiltersAndRender();
          hideLoading();

      } catch (error) {
          console.error('Error loading invoices:', error);
          showNotification('Gagal memuatkan senarai invois.', 'error');
          hideLoading();
      }
  }

  // --- FUNGSI PENAPISAN & PAPARAN ---
  function applyFiltersAndRender() {
      let filteredInvoices = invoices;

      if (currentFilter !== 'all') {
          filteredInvoices = invoices.filter(invoice => invoice.status === currentFilter);
      }
      
      renderInvoiceCards(filteredInvoices);
  }

  function handleSearch(e) {
      const searchTerm = e.target.value.toLowerCase();
      
      let filteredInvoices = invoices;

      if (currentFilter !== 'all') {
          filteredInvoices = invoices.filter(invoice => invoice.status === currentFilter);
      }

      if (searchTerm) {
          filteredInvoices = filteredInvoices.filter(invoice => {
              const invoiceNumber = (invoice.invoiceNumber || '').toLowerCase();
              const clientName = (invoice.client ? invoice.client.name : '').toLowerCase();
              return invoiceNumber.includes(searchTerm) || clientName.includes(searchTerm);
          });
      }

      renderInvoiceCards(filteredInvoices);
  }

  // --- FUNGSI PAPARAN KAD INVOIS ---
  function renderInvoiceCards(invoicesToRender) {
      if (!invoicesContainer) return;

      invoicesContainer.innerHTML = '';

      if (invoicesToRender.length === 0) {
          if (noInvoicesMessage) noInvoicesMessage.style.display = 'flex';
          return;
      }

      if (noInvoicesMessage) noInvoicesMessage.style.display = 'none';

      invoicesToRender.forEach(invoice => {
          const invoiceCard = createInvoiceCard(invoice);
          invoicesContainer.appendChild(invoiceCard);
      });
  }

  function createInvoiceCard(invoice) {
      const card = document.createElement('div');
      card.className = `invoice-card ${invoice.status}`;
      
      const statusClass = invoice.status;
      const statusText = getStatusText(invoice.status);
      const dueDate = formatDate(invoice.dueDate || invoice.createdAt);

      card.innerHTML = `
          <div class="invoice-header">
              <div class="invoice-number">${invoice.invoiceNumber || 'N/A'}</div>
              <div class="invoice-status">
                  <span class="status-badge ${statusClass}">${statusText}</span>
              </div>
          </div>
          <div class="invoice-details">
              <div class="invoice-client">
                  <i class="fas fa-user"></i>
                  <span>${invoice.client ? invoice.client.name : 'Pelanggan Tidak Diketahui'}</span>
              </div>
              <div class="invoice-date">
                  <i class="fas fa-calendar"></i>
                  <span>${dueDate}</span>
              </div>
              <div class="invoice-amount">
                  <i class="fas fa-dollar-sign"></i>
                  <span>RM ${parseFloat(invoice.grandTotal || 0).toLocaleString('en-MY')}</span>
              </div>
          </div>
          <div class="invoice-actions">
              <a href="view-invoice.html?id=${invoice.id}" class="btn-action" title="Lihat">
                  <i class="fas fa-eye"></i>
              </a>
              <a href="create-invoice.html?id=${invoice.id}" class="btn-action" title="Edit">
                  <i class="fas fa-edit"></i>
              </a>
              <button class="btn-action delete" title="Hapus" data-id="${invoice.id}">
                  <i class="fas fa-trash"></i>
              </button>
          </div>
      `;

      // Add event listener for delete button
      const deleteBtn = card.querySelector('.delete');
      if (deleteBtn) {
          deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const invoiceId = deleteBtn.getAttribute('data-id');
              deleteInvoice(invoiceId);
          });
      }

      return card;
  }

  // --- FUNGSI TINDAKAN ---
  async function deleteInvoice(invoiceId) {
      const isConfirmed = confirm('Adakah anda pasti ingin memadam invois ini? Tindakan ini tidak boleh dibatalkan.');

      if (!isConfirmed) return;

      try {
          showLoading();
          await db.collection('invoices').doc(invoiceId).delete();
          showNotification('Invois berjaya dipadam.', 'success');
          
          // Remove from local array and re-render
          invoices = invoices.filter(inv => inv.id !== invoiceId);
          applyFiltersAndRender();
          
          hideLoading();
      } catch (error) {
          console.error('Error deleting invoice:', error);
          showNotification('Gagal memadam invois. Sila cuba lagi.', 'error');
          hideLoading();
      }
  }

  // --- FUNGSI UI ---
  function setActiveFilterButton(activeBtn) {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
  }

  function setActiveViewButton(activeBtn) {
      viewButtons.forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
  }

  function applyViewMode() {
      if (invoicesContainer) {
          invoicesContainer.className = `invoices-container ${currentView}-view`;
      }
  }

  // --- FUNGSI UTILITI ---
  function formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
      return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function getStatusText(status) {
      switch (status) {
          case 'draft': return 'Draf';
          case 'sent': return 'Dihantar';
          case 'paid': return 'Dibayar';
          case 'overdue': return 'Lewat';
          default: return 'Tidak Diketahui';
      }
  }

  function showLoading() {
      if (loadingOverlay) loadingOverlay.classList.add('show');
  }

  function hideLoading() {
      if (loadingOverlay) loadingOverlay.classList.remove('show');
  }

  function showNotification(message, type = 'success') {
      const notification = type === 'success' ? successNotification : errorNotification;
      if (!notification) return;

      const span = notification.querySelector('span');
      if (span) span.textContent = message;

      notification.classList.add('show');

      setTimeout(() => {
          notification.classList.remove('show');
      }, 3000);
  }
});
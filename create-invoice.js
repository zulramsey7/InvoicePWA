document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const invoiceForm = document.getElementById('invoice-form');
    const itemsTableBody = document.getElementById('items-table-body');
    const addItemBtn = document.getElementById('add-item-btn');
    const saveInvoiceBtn = document.getElementById('save-invoice-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const taxInput = document.getElementById('tax');
    const discountInput = document.getElementById('discount');
    const subtotalSpan = document.getElementById('subtotal');
    const grandTotalSpan = document.getElementById('grand-total');
    const loadingOverlay = document.getElementById('loading-overlay');
    const successNotification = document.getElementById('success-notification');
    const errorNotification = document.getElementById('error-notification');

    // Elemen untuk mode edit
    const pageTitle = document.querySelector('title');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const invoiceNumberInput = document.getElementById('invoice-number');

    // Elemen untuk butiran syarikat
    const companyLogo = document.getElementById('company-logo');
    const companyName = document.getElementById('company-name');
    const companyAddress = document.getElementById('company-address');
    const companyEmail = document.getElementById('company-email');
    const companyPhone = document.getElementById('company-phone');

    // Elemen untuk butiran pelanggan
    const selectClientBtn = document.getElementById('select-client-btn');
    const addNewClientBtn = document.getElementById('add-new-client-btn');
    const clientSelectContainer = document.getElementById('client-select-container');
    const clientSelect = document.getElementById('client-select');
    const clientDetailsContainer = document.getElementById('client-details-container');
    const clientName = document.getElementById('client-name');
    const clientEmail = document.getElementById('client-email');
    const clientAddress = document.getElementById('client-address');

    // Elemen untuk modal pelanggan
    const clientModal = document.getElementById('client-modal');
    const closeClientModal = document.getElementById('close-client-modal');
    const cancelSelectClientBtn = document.getElementById('cancel-select-client-btn');
    const clientSearch = document.getElementById('client-search');
    const clientList = document.getElementById('client-list');

    // Elemen untuk modal pelanggan baharu
    const newClientModal = document.getElementById('new-client-modal');
    const closeNewClientModal = document.getElementById('close-new-client-modal');
    const cancelNewClientBtn = document.getElementById('cancel-new-client-btn');
    const saveNewClientBtn = document.getElementById('save-new-client-btn');

    // Elemen untuk butiran pembayaran
    const bankName = document.getElementById('bank-name');
    const accountName = document.getElementById('account-name');
    const accountNumber = document.getElementById('account-number');

    // --- VARIABEL ---
    let currentUser = null;
    let clients = [];
    let currentInvoiceId = null;
    let unsubscribeProfileListener = null;

    // --- INISIALISASI ---
    initApp();

    function initApp() {
        // Check authentication state
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                
                // Get invoice ID from URL if editing
                const urlParams = new URLSearchParams(window.location.search);
                currentInvoiceId = urlParams.get('id');
                
                // Start listening for profile updates
                unsubscribeProfileListener = listenForProfileUpdates(user.uid);
                
                // Check if we're in create or edit mode
                checkMode();
                
                // Load clients for the selection modal
                loadClients();
                
                // If editing, load invoice data
                if (currentInvoiceId) {
                    loadInvoiceData(currentInvoiceId);
                } else {
                    // If creating, add one empty item row
                    addItemRow();
                }
            } else {
                window.location.href = 'index.html';
            }
        });

        // Setup event listeners
        setupEventListeners();
    }

    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // Save buttons
        if (saveInvoiceBtn) {
            saveInvoiceBtn.addEventListener('click', () => saveOrUpdateInvoice('sent'));
        }
        
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => saveOrUpdateInvoice('draft'));
        }
        
        // Add item button
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => addItemRow());
        }
        
        // Tax and discount inputs
        if (taxInput) {
            taxInput.addEventListener('input', calculateTotals);
        }
        
        if (discountInput) {
            discountInput.addEventListener('input', calculateTotals);
        }
        
        // Client selection buttons
        if (selectClientBtn) {
            selectClientBtn.addEventListener('click', showClientModal);
        }
        
        if (addNewClientBtn) {
            addNewClientBtn.addEventListener('click', showNewClientForm);
        }
        
        // Client modal buttons
        if (closeClientModal) {
            closeClientModal.addEventListener('click', hideClientModal);
        }
        
        if (cancelSelectClientBtn) {
            cancelSelectClientBtn.addEventListener('click', hideClientModal);
        }
        
        if (clientSearch) {
            clientSearch.addEventListener('input', filterClients);
        }
        
        // New client modal buttons
        if (closeNewClientModal) {
            closeNewClientModal.addEventListener('click', hideNewClientModal);
        }
        
        if (cancelNewClientBtn) {
            cancelNewClientBtn.addEventListener('click', hideNewClientModal);
        }
        
        if (saveNewClientBtn) {
            saveNewClientBtn.addEventListener('click', saveNewClient);
        }
        
        // Client select dropdown
        if (clientSelect) {
            clientSelect.addEventListener('change', handleClientSelection);
        }
    }

    // --- FUNGSI UNTUK MENDENGAR PERUBAHAN PROFIL ---
    function listenForProfileUpdates(uid) {
        // Listen for changes to the user's profile document
        const unsubscribe = db.collection('userProfiles').doc(uid).onSnapshot(doc => {
            if (doc.exists) {
                const profile = doc.data();
                console.log("Profile data updated in real-time:", profile);
                
                // Update company details with data from profile
                if (companyName) companyName.value = profile.companyName || '';
                if (companyAddress) companyAddress.value = profile.companyAddress || '';
                if (companyEmail) companyEmail.value = profile.companyEmail || '';
                if (companyPhone) companyPhone.value = profile.companyPhone || '';
                
                // Update bank details with data from profile
                if (bankName) bankName.value = profile.companyBankName || '';
                if (accountName) accountName.value = profile.companyAccountName || '';
                if (accountNumber) accountNumber.value = profile.companyAccountNumber || '';
                
                // If there's a logo URL, update the logo
                if (profile.companyLogoUrl && companyLogo) {
                    companyLogo.src = profile.companyLogoUrl;
                }
            }
        }, error => {
            console.error("Error listening for profile updates:", error);
        });

        // Return the unsubscribe function for cleanup
        return unsubscribe;
    }

    // --- FUNGSI UNTUK MENYEMAK MODE ---
    function checkMode() {
        if (currentInvoiceId) {
            // Edit mode
            if (pageTitle) pageTitle.textContent = `Edit Invois - InvoicePWA`;
            if (formTitle) formTitle.textContent = `Edit Invois`;
            if (saveBtnText) saveBtnText.textContent = `Kemas Kini & Hantar`;
            if (invoiceNumberInput) invoiceNumberInput.removeAttribute('readonly');
        } else {
            // Create mode
            if (invoiceNumberInput) invoiceNumberInput.value = generateInvoiceNumber();
        }
    }

    // --- FUNGSI UNTUK MENJANA NOMBOR INVOIS ---
    function generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${year}${month}-${random}`;
    }

    // --- FUNGSI UNTUK MEMUATKAN PELANGGAN ---
    async function loadClients() {
        try {
            const clientsSnapshot = await db
                .collection('clients')
                .where('uid', '==', currentUser.uid)
                .orderBy('name', 'asc')
                .get();
            
            clients = [];
            clientsSnapshot.forEach(doc => {
                clients.push({ id: doc.id, ...doc.data() });
            });
            
            // Populate client select dropdown
            populateClientSelect();
            
        } catch (error) {
            console.error('Error loading clients:', error);
            showNotification('Gagal memuatkan senarai pelanggan.', 'error');
        }
    }

    // --- FUNGSI UNTUK MENGISI PILIHAN PELANGGAN ---
    function populateClientSelect() {
        if (!clientSelect) return;
        
        clientSelect.innerHTML = '<option value="">-- Pilih Pelanggan --</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            clientSelect.appendChild(option);
        });
    }

    // --- FUNGSI UNTUK MENAPARKAN/MENYEMBUNYIKAN MODAL PELANGGAN ---
    function showClientModal() {
        if (clientModal) {
            clientModal.classList.add('show');
            renderClientList(clients);
        }
    }

    function hideClientModal() {
        if (clientModal) {
            clientModal.classList.remove('show');
            if (clientSearch) clientSearch.value = '';
        }
    }

    function showNewClientForm() {
        hideClientModal();
        if (clientSelectContainer) clientSelectContainer.style.display = 'none';
        if (clientDetailsContainer) clientDetailsContainer.style.display = 'block';
    }

    // --- FUNGSI UNTUK MEMAPARKAN SENARAI PELANGGAN DALAM MODAL ---
    function renderClientList(clientsToRender) {
        if (!clientList) return;
        
        if (clientsToRender.length === 0) {
            clientList.innerHTML = '<p>Tiada pelanggan dijumpai.</p>';
            return;
        }
        
        clientList.innerHTML = '';
        
        clientsToRender.forEach(client => {
            const item = document.createElement('div');
            item.className = 'client-item';
            item.innerHTML = `
                <div class="client-name">${client.name}</div>
                <div class="client-email">${client.email || 'No email'}</div>
            `;
            
            item.addEventListener('click', () => selectClient(client));
            clientList.appendChild(item);
        });
    }

    // --- FUNGSI UNTUK MENAPIS PELANGGAN ---
    function filterClients() {
        if (!clientSearch) return;
        
        const searchTerm = clientSearch.value.toLowerCase();
        const filteredClients = clients.filter(client => 
            client.name.toLowerCase().includes(searchTerm) || 
            (client.email && client.email.toLowerCase().includes(searchTerm))
        );
        
        renderClientList(filteredClients);
    }

    // --- FUNGSI UNTUK MEMILIH PELANGGAN ---
    function selectClient(client) {
        if (clientSelectContainer) {
            clientSelectContainer.style.display = 'block';
            if (clientSelect) clientSelect.value = client.id;
        }
        
        if (clientDetailsContainer) {
            clientDetailsContainer.style.display = 'none';
        }
        
        if (clientName) clientName.value = client.name;
        if (clientEmail) clientEmail.value = client.email || '';
        if (clientAddress) clientAddress.value = client.address || '';
        
        hideClientModal();
    }

    // --- FUNGSI UNTUK MENANGANI PILIHAN PELANGGAN DARI DROPDOWN ---
    function handleClientSelection(e) {
        const clientId = e.target.value;
        
        if (clientId) {
            const client = clients.find(c => c.id === clientId);
            if (client) {
                if (clientName) clientName.value = client.name;
                if (clientEmail) clientEmail.value = client.email || '';
                if (clientAddress) clientAddress.value = client.address || '';
            }
        } else {
            // Clear client details if no client is selected
            if (clientName) clientName.value = '';
            if (clientEmail) clientEmail.value = '';
            if (clientAddress) clientAddress.value = '';
        }
    }

    // --- FUNGSI UNTUK MENYIMPAN PELANGGAN BAHARU ---
    async function saveNewClient() {
        const name = document.getElementById('new-client-name').value.trim();
        const email = document.getElementById('new-client-email').value.trim();
        const phone = document.getElementById('new-client-phone').value.trim();
        const address = document.getElementById('new-client-address').value.trim();
        
        if (!name) {
            showNotification('Sila masukkan nama pelanggan.', 'error');
            return;
        }
        
        try {
            showLoading();
            
            const clientData = {
                uid: currentUser.uid,
                name,
                email,
                phone,
                address,
                createdAt: new Date()
            };
            
            const docRef = await db.collection('clients').add(clientData);
            
            // Add to clients array
            clients.push({ id: docRef.id, ...clientData });
            
            // Repopulate client select
            populateClientSelect();
            
            // Select the new client
            selectClient({ id: docRef.id, ...clientData });
            
            hideNewClientModal();
            hideLoading();
            showNotification('Pelanggan berjaya ditambah.', 'success');
        } catch (error) {
            console.error('Error saving client:', error);
            showNotification('Gagal menambah pelanggan. Sila cuba lagi.', 'error');
            hideLoading();
        }
    }

    function hideNewClientModal() {
        if (newClientModal) {
            newClientModal.classList.remove('show');
            
            // Clear form
            const nameInput = document.getElementById('new-client-name');
            const emailInput = document.getElementById('new-client-email');
            const phoneInput = document.getElementById('new-client-phone');
            const addressInput = document.getElementById('new-client-address');
            
            if (nameInput) nameInput.value = '';
            if (emailInput) emailInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (addressInput) addressInput.value = '';
        }
    }

    // --- FUNGSI UNTUK MENAMBAH BARIS ITEM ---
    function addItemRow(sku = '', description = '', size = '', quantity = 1, price = 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="item-sku" value="${sku}" placeholder="Kod"></td>
            <td><input type="text" class="item-description" value="${description}" placeholder="Penerangan"></td>
            <td><input type="text" class="item-size" value="${size}" placeholder="Saiz"></td>
            <td><input type="number" class="item-quantity" value="${quantity}" min="1"></td>
            <td><input type="number" class="item-price" value="${price}" min="0" step="0.01"></td>
            <td class="item-total">0.00</td>
            <td><button type="button" class="btn-remove-item"><i class="fas fa-trash"></i></button></td>
        `;
        
        itemsTableBody.appendChild(row);
        
        // Add event listeners to the new row
        attachEventListenersToRow(row);
    }

    // --- FUNGSI UNTUK MENAMBAH EVENT LISTENERS PADA BARIS ITEM ---
    function attachEventListenersToRow(row) {
        const removeBtn = row.querySelector('.btn-remove-item');
        const inputs = row.querySelectorAll('input');
        
        inputs.forEach(input => {
            input.addEventListener('input', calculateTotals);
        });
        
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                row.remove();
                calculateTotals();
            });
        }
    }

    // --- FUNGSI UNTUK MENGIRA JUMLAH ---
    function calculateTotals() {
        let subtotal = 0;
        
        // Calculate subtotal from items
        const rows = itemsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const total = quantity * price;
            
            row.querySelector('.item-total').textContent = total.toFixed(2);
            subtotal += total;
        });
        
        // Calculate discount and tax
        const discountValue = parseFloat(discountInput.value) || 0;
        const taxRate = parseFloat(taxInput.value) || 0;
        
        const subtotalAfterDiscount = subtotal - discountValue;
        const taxAmount = subtotalAfterDiscount * (taxRate / 100);
        const grandTotal = subtotalAfterDiscount + taxAmount;
        
        // Update summary
        if (subtotalSpan) subtotalSpan.textContent = subtotal.toFixed(2);
        if (grandTotalSpan) grandTotalSpan.textContent = grandTotal.toFixed(2);
    }

    // --- FUNGSI UNTUK MEMUATKAN DATA INVOIS ---
    async function loadInvoiceData(id) {
        try {
            showLoading();
            
            const doc = await db.collection('invoices').doc(id).get();
            
            if (doc.exists) {
                const invoice = doc.data();
                
                // Populate form with invoice data
                if (invoiceNumberInput) invoiceNumberInput.value = invoice.invoiceNumber;
                
                const poNumberInput = document.getElementById('po-number');
                if (poNumberInput) poNumberInput.value = invoice.poNumber || '';
                
                const invoiceDateInput = document.getElementById('invoice-date');
                if (invoiceDateInput) invoiceDateInput.value = invoice.date;
                
                const dueDateInput = document.getElementById('due-date');
                if (dueDateInput) dueDateInput.value = invoice.dueDate;
                
                const statusSelect = document.getElementById('invoice-status');
                if (statusSelect) statusSelect.value = invoice.status || 'draft';
                
                // Populate client details
                if (invoice.client) {
                    if (clientName) clientName.value = invoice.client.name || '';
                    if (clientEmail) clientEmail.value = invoice.client.email || '';
                    if (clientAddress) clientAddress.value = invoice.client.address || '';
                }
                
                // Populate items
                if (invoice.items && itemsTableBody) {
                    itemsTableBody.innerHTML = '';
                    invoice.items.forEach(item => {
                        addItemRow(
                            item.sku || '', 
                            item.description || '', 
                            item.size || '', 
                            item.quantity || 1, 
                            item.price || 0
                        );
                    });
                }
                
                // Populate notes
                const notesInput = document.getElementById('notes');
                if (notesInput) notesInput.value = invoice.notes || '';
                
                // Populate bank details
                if (invoice.bankDetails) {
                    if (bankName) bankName.value = invoice.bankDetails.bankName || '';
                    if (accountName) accountName.value = invoice.bankDetails.accountName || '';
                    if (accountNumber) accountNumber.value = invoice.bankDetails.accountNumber || '';
                }
                
                // Set tax and discount
                if (discountInput) discountInput.value = invoice.discount || 0;
                if (taxInput) taxInput.value = invoice.tax || 6;
                
                // Calculate totals
                calculateTotals();
            } else {
                showNotification('Invois tidak dijumpai.', 'error');
                window.location.href = 'dashboard.html';
            }
            
            hideLoading();
        } catch (error) {
            console.error('Error loading invoice:', error);
            showNotification('Gagal memuatkan data invois. Sila cuba lagi.', 'error');
            hideLoading();
        }
    }

    // --- FUNGSI UNTUK MENYIMPAN ATAU MENGEMASKINI INVOIS ---
    async function saveOrUpdateInvoice(status) {
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        try {
            showLoading();
            
            // Get items
            const items = [];
            const rows = itemsTableBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const sku = row.querySelector('.item-sku').value.trim();
                const description = row.querySelector('.item-description').value.trim();
                const size = row.querySelector('.item-size').value.trim();
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const price = parseFloat(row.querySelector('.item-price').value) || 0;
                
                if (description && quantity > 0 && price >= 0) {
                    items.push({
                        sku,
                        description,
                        size,
                        quantity,
                        price,
                        total: quantity * price
                    });
                }
            });
            
            if (items.length === 0) {
                showNotification('Sila tambah sekurang-kurangnya satu item.', 'error');
                hideLoading();
                return;
            }
            
            // Get invoice data
            const invoiceData = {
                uid: currentUser.uid,
                invoiceNumber: invoiceNumberInput.value,
                poNumber: document.getElementById('po-number').value,
                date: document.getElementById('invoice-date').value,
                dueDate: document.getElementById('due-date').value,
                status: status,
                company: {
                    name: companyName.value,
                    address: companyAddress.value,
                    email: companyEmail.value,
                    phone: companyPhone.value
                },
                client: {
                    name: clientName.value,
                    email: clientEmail.value,
                    address: clientAddress.value
                },
                items,
                subtotal: parseFloat(subtotalSpan.textContent),
                discount: parseFloat(discountInput.value),
                tax: parseFloat(taxInput.value),
                grandTotal: parseFloat(grandTotalSpan.textContent),
                notes: document.getElementById('notes').value,
                bankDetails: {
                    bankName: bankName.value,
                    accountName: accountName.value,
                    accountNumber: accountNumber.value
                },
                updatedAt: new Date()
            };
            
            // Add createdAt timestamp only for new invoices
            if (!currentInvoiceId) {
                invoiceData.createdAt = new Date();
            }
            
            // Save or update invoice
            if (currentInvoiceId) {
                // Update existing invoice
                await db.collection('invoices').doc(currentInvoiceId).update(invoiceData);
                showNotification('Invois berjaya dikemaskini.', 'success');
            } else {
                // Create new invoice
                await db.collection('invoices').add(invoiceData);
                showNotification('Invois berjaya dicipta.', 'success');
            }
            
            // Redirect to invoices page
            setTimeout(() => {
                window.location.href = 'invoices.html';
            }, 1500);
            
        } catch (error) {
            console.error('Error saving invoice:', error);
            showNotification('Gagal menyimpan invois. Sila cuba lagi.', 'error');
            hideLoading();
        }
    }

    // --- FUNGSI UNTUK MENGESAHKAN BORANG ---
    function validateForm() {
        if (!clientName.value.trim()) {
            showNotification('Sila masukkan nama pelanggan.', 'error');
            return false;
        }
        
        const invoiceDate = document.getElementById('invoice-date').value;
        if (!invoiceDate) {
            showNotification('Sila pilih tarikh invois.', 'error');
            return false;
        }
        
        const dueDate = document.getElementById('due-date').value;
        if (!dueDate) {
            showNotification('Sila pilih tarikh jatuh tempo.', 'error');
            return false;
        }
        
        return true;
    }

    // --- FUNGSI UNTUK MEMAPARKAN LOADING ---
    function showLoading() {
        if (loadingOverlay) loadingOverlay.classList.add('show');
    }

    // --- FUNGSI UNTUK MENYEMBUNYIKAN LOADING ---
    function hideLoading() {
        if (loadingOverlay) loadingOverlay.classList.remove('show');
    }

    // --- FUNGSI UNTUK MEMAPARKAN NOTIFIKASI ---
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

    // --- Cleanup on page unload ---
    window.addEventListener('beforeunload', () => {
        if (unsubscribeProfileListener) {
            unsubscribeProfileListener();
        }
    });
});
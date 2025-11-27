document.addEventListener('DOMContentLoaded', () => {
    // --- PENGESAHAN LOG MASUK ---
    let unsubscribeProfileListener; // Untuk menyimpan fungsi 'unsubscribe' pendengar profil

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            // Mula mendengar perubahan profil dan simpan fungsi 'unsubscribe'
            unsubscribeProfileListener = listenForProfileUpdates(user.uid);
            // Semak sama ada mode edit atau cipta
            checkMode();
        }
    });

    // Berhenti mendengar apabila pengguna meninggalkan halaman
    window.addEventListener('beforeunload', () => {
        if (unsubscribeProfileListener) {
            unsubscribeProfileListener();
        }
    });

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

    // Elemen untuk mode edit
    const pageTitle = document.getElementById('page-title');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const invoiceNumberInput = document.getElementById('invoice-number');

    let currentInvoiceId = null; // Untuk menyimpan ID invois semasa

    // --- FUNGSI UNTUK MENDENGAR PERUBAHAN PROFIL SECARA REAL-TIME ---
    function listenForProfileUpdates(uid) {
        // Mula mendengar perubahan pada dokumen profil pengguna
        const unsubscribe = db.collection('userProfiles').doc(uid).onSnapshot(doc => {
            if (doc.exists) {
                const profile = doc.data();
                console.log("Profile data updated in real-time:", profile);
                
                // Isi butiran syarikat dengan data terkini dari profil
                document.getElementById('company-name').value = profile.companyName || '';
                document.getElementById('company-address').value = profile.companyAddress || '';
                document.getElementById('company-email').value = profile.companyEmail || '';
                document.getElementById('company-phone').value = profile.companyPhone || '';
                
                // Jika ada logo, paparkan
                if (profile.companyLogoUrl) {
                    document.getElementById('company-logo').src = profile.companyLogoUrl;
                }

                // --- TAMBAHKAN BARIS INI UNTUK MEMUATKAN DATA BANK ---
                // Isi butiran bank dengan data terkini dari profil
                document.getElementById('bank-name').value = profile.companyBankName || '';
                document.getElementById('account-name').value = profile.companyAccountName || '';
                document.getElementById('account-number').value = profile.companyAccountNumber || '';
            }
        }, error => {
            console.error("Error listening for profile updates:", error);
        });

        // Kembalikan fungsi untuk berhenti mendengar (penting untuk pembersihan)
        return unsubscribe;
    }

    // --- SEMAK MODE (CIPTA ATAU EDIT) ---
    function checkMode() {
        const urlParams = new URLSearchParams(window.location.search);
        currentInvoiceId = urlParams.get('id');

        if (currentInvoiceId) {
            // Mode Edit
            loadInvoiceData(currentInvoiceId);
            pageTitle.textContent = `Edit Invois - InvoicePWA`;
            formTitle.textContent = `Edit Invois`;
            saveBtnText.textContent = `Kemas Kini & Hantar`;
            invoiceNumberInput.removeAttribute('readonly'); // Benarkan edit no. invois
        } else {
            // Mode Cipta
            // Tambah satu baris item kosong
            addItemRow();
        }
    }

    // --- FUNGSI UNTUK MEMUATKAN DATA INVOIS (UNTUK EDIT) ---
    async function loadInvoiceData(invoiceId) {
        try {
            const doc = await db.collection('invoices').doc(invoiceId).get();
            if (doc.exists) {
                const invoice = doc.data();
                
                // Isi semua medan borang
                document.getElementById('po-number').value = invoice.poNumber || '';
                document.getElementById('invoice-date').value = invoice.date;
                document.getElementById('due-date').value = invoice.dueDate;
                document.getElementById('invoice-status').value = invoice.status;
                
                document.getElementById('client-name').value = invoice.client.name;
                document.getElementById('client-email').value = invoice.client.email || '';
                document.getElementById('client-address').value = invoice.client.address;

                document.getElementById('notes').value = invoice.notes || '';
                document.getElementById('discount').value = invoice.discount || 0;
                document.getElementById('tax').value = invoice.tax;

                document.getElementById('bank-name').value = invoice.bankDetails.bankName;
                document.getElementById('account-name').value = invoice.bankDetails.accountName;
                document.getElementById('account-number').value = invoice.bankDetails.accountNumber;

                // Isi jadual item
                itemsTableBody.innerHTML = ''; // Kosongkan dahulu
                invoice.items.forEach(item => {
                    addItemRow(item.sku, item.description, item.size, item.quantity, item.price);
                });

            } else {
                alert('Invois tidak dijumpai!');
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error("Error loading invoice:", error);
            alert('Gagal memuatkan data invois.');
        }
    }

    // --- FUNGSI-FUNGSI TAMBAH ITEM & KIRA (KEKAL SAMA) ---
    function addItemRow(sku = '', description = '', size = '', quantity = 1, price = 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="item-sku" value="${sku}" placeholder="Kod"></td>
            <td><input type="text" class="item-description" value="${description}" placeholder="Nama baju/item"></td>
            <td><input type="text" class="item-size" value="${size}" placeholder="S, M, L"></td>
            <td><input type="number" class="item-quantity" value="${quantity}" min="1"></td>
            <td><input type="number" class="item-price" value="${price}" min="0" step="0.01"></td>
            <td class="item-total">0.00</td>
            <td><button type="button" class="btn-remove"><i class="fas fa-trash"></i></button></td>
        `;
        itemsTableBody.appendChild(row);
        attachEventListenersToRow(row);
        calculateTotals();
    }

    function attachEventListenersToRow(row) {
        const removeBtn = row.querySelector('.btn-remove');
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => input.addEventListener('input', calculateTotals));
        removeBtn.addEventListener('click', () => {
            row.remove();
            calculateTotals();
        });
    }

    function calculateTotals() {
        let subtotal = 0;
        const rows = itemsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            const total = quantity * price;
            row.querySelector('.item-total').textContent = total.toFixed(2);
            subtotal += total;
        });
        const discountValue = parseFloat(discountInput.value) || 0;
        const subtotalAfterDiscount = subtotal - discountValue;
        const taxRate = parseFloat(taxInput.value) || 0;
        const taxAmount = subtotalAfterDiscount * (taxRate / 100);
        const grandTotal = subtotalAfterDiscount + taxAmount;
        subtotalSpan.textContent = subtotal.toFixed(2);
        grandTotalSpan.textContent = grandTotal.toFixed(2);
    }
    
    // --- FUNGSI UTAMA UNTUK MENYIMPAN ATAU MENGEMASKINI INVOIS ---
    async function saveOrUpdateInvoice(status) {
        const user = auth.currentUser;
        if (!user) { alert("Ralat: Tiada pengguna log masuk."); return; }

        saveInvoiceBtn.disabled = true;
        saveDraftBtn.disabled = true;
        saveBtnText.textContent = 'Menyimpan...';

        const invoiceData = {
            uid: user.uid,
            invoiceNumber: document.getElementById('invoice-number').value,
            poNumber: document.getElementById('po-number').value,
            date: document.getElementById('invoice-date').value,
            dueDate: document.getElementById('due-date').value,
            status: status,
            company: {
                name: document.getElementById('company-name').value,
                address: document.getElementById('company-address').value,
                email: document.getElementById('company-email').value,
                phone: document.getElementById('company-phone').value,
            },
            client: {
                name: document.getElementById('client-name').value,
                email: document.getElementById('client-email').value,
                address: document.getElementById('client-address').value,
            },
            items: [],
            notes: document.getElementById('notes').value,
            bankDetails: {
                bankName: document.getElementById('bank-name').value,
                accountName: document.getElementById('account-name').value,
                accountNumber: document.getElementById('account-number').value,
            },
            subtotal: subtotalSpan.textContent,
            discount: discountInput.value,
            tax: taxInput.value,
            grandTotal: grandTotalSpan.textContent,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const rows = itemsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const sku = row.querySelector('.item-sku').value;
            const description = row.querySelector('.item-description').value;
            const size = row.querySelector('.item-size').value;
            const quantity = row.querySelector('.item-quantity').value;
            const price = row.querySelector('.item-price').value;
            if (description) {
                invoiceData.items.push({ sku, description, size, quantity, price });
            }
        });
        
        try {
            if (currentInvoiceId) {
                // Mode Edit: Kemas kini dokumen sedia ada
                await db.collection('invoices').doc(currentInvoiceId).update(invoiceData);
                alert('Invois berjaya dikemas kini!');
            } else {
                // Mode Cipta: Cipta dokumen baharu
                invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('invoices').add(invoiceData);
                alert('Invois berjaya disimpan!');
            }

            if (status !== 'draft') {
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Error saving/updating invoice:', error);
            alert('Gagal menyimpan invois. Sila cuba lagi.');
        } finally {
            saveInvoiceBtn.disabled = false;
            saveDraftBtn.disabled = false;
            saveBtnText.textContent = currentInvoiceId ? 'Kemas Kini & Hantar' : 'Simpan & Hantar';
        }
    }

    // --- EVENT LISTENER ---
    addItemBtn.addEventListener('click', () => addItemRow());
    taxInput.addEventListener('input', calculateTotals);
    discountInput.addEventListener('input', calculateTotals);

    saveInvoiceBtn.addEventListener('click', () => {
        const status = document.getElementById('invoice-status').value;
        saveOrUpdateInvoice(status);
    });

    saveDraftBtn.addEventListener('click', () => {
        saveOrUpdateInvoice('draft');
    });
});
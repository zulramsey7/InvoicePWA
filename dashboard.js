document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const searchInput = document.getElementById('search-input');
    const invoicesTableBody = document.getElementById('invoices-table-body');

    // --- PENGESAHAN LOG MASUK & PENGAMBILAN DATA ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            console.log('User is logged in:', user);
            userEmailSpan.textContent = user.email;
            // Panggil fungsi untuk memuat data dari Firestore
            await fetchAndDisplayInvoices(user.uid);
        } else {
            console.log('No user logged in. Redirecting to login page.');
            window.location.href = 'index.html';
        }
    });

    // --- LOG KELUAR ---
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => console.log('User signed out.'))
            .catch(error => console.error('Sign out error:', error));
    });

    // --- FUNGSI UNTUK MENGAMBIL DATA DARI FIRESTORE ---
    async function fetchAndDisplayInvoices(uid) {
        try {
            const invoicesSnapshot = await db
                .collection('invoices')
                .where('uid', '==', uid) // Hanya ambil invois milik pengguna ini
                .orderBy('createdAt', 'desc') // Susun mengikut tarikh terkini
                .get();

            const invoices = [];
            invoicesSnapshot.forEach(doc => {
                invoices.push({ id: doc.id, ...doc.data() });
            });
            
            // Paparkan data yang diambil
            updateSummaryCards(invoices);
            renderInvoiceTable(invoices);

        } catch (error) {
            console.error("Error fetching invoices: ", error);
            alert("Gagal memuatkan invois.");
        }
    }

    // --- FUNGSI UNTUK MENGEMASKINI KAD RINGKASAN ---
    function updateSummaryCards(invoices) {
        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
        const unpaidInvoices = invoices.filter(inv => inv.status === 'sent').length; // Status 'sent' dianggap belum dibayar
        const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0);

        document.getElementById('total-invoices').textContent = totalInvoices;
        document.getElementById('paid-invoices').textContent = paidInvoices;
        document.getElementById('unpaid-invoices').textContent = unpaidInvoices + draftInvoices; // Gabungkan belum dibayar dan draf
        document.getElementById('total-revenue').textContent = `RM ${totalRevenue.toLocaleString('en-MY')}`;
    }

    // --- FUNGSI UNTUK MEMAPARKAN JADUAL INVOIS ---
    function renderInvoiceTable(invoices) {
        invoicesTableBody.innerHTML = ''; // Kosongkan jadual dahulu

        if (invoices.length === 0) {
            invoicesTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tiada invois dijumpai.</td></tr>';
            return;
        }

        invoices.forEach(invoice => {
            const row = document.createElement('tr');
            
            // Guna status sebenar dari data
            const status = invoice.status || 'sent'; 
            const statusClass = status; 
            
            row.innerHTML = `
                <td>${invoice.invoiceNumber}</td>
                <td>${invoice.client.name}</td>
                <td>${invoice.dueDate}</td>
                <td>${parseFloat(invoice.grandTotal).toLocaleString('en-MY')}</td>
                <td><span class="status-badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td class="action-btns">
                    <a href="view-invoice.html?id=${invoice.id}" title="Lihat"><i class="fas fa-eye"></i></a>
                    <a href="create-invoice.html?id=${invoice.id}" title="Edit"><i class="fas fa-edit"></i></a>
                    <a href="#" class="delete" title="Hapus" data-id="${invoice.id}"><i class="fas fa-trash"></i></a>
                </td>
            `;
            invoicesTableBody.appendChild(row);
        });

        // Tambah event listener untuk butang delete
        document.querySelectorAll('.action-btns .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Elakkan link bergerak ke atas
                const invoiceId = btn.getAttribute('data-id');
                deleteInvoice(invoiceId);
            });
        });
    }

    // --- FUNGSI UNTUK MEMADAM INVOIS ---
    async function deleteInvoice(invoiceId) {
        // Paparkan kotak pengesahan
        const isConfirmed = confirm('Adakah anda pasti ingin memadam invois ini? Tindakan ini tidak boleh dibatalkan.');

        if (!isConfirmed) {
            return; // Jika pengguna batal, hentikan fungsi
        }

        try {
            await db.collection('invoices').doc(invoiceId).delete();
            alert('Invois berjaya dipadam.');
            // Muat semula senarai invois untuk mengemaskini paparan
            const user = auth.currentUser;
            if (user) {
                await fetchAndDisplayInvoices(user.uid);
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Gagal memadam invois. Sila cuba lagi.');
        }
    }

    // --- FUNGSI CARI ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = invoicesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const invoiceId = row.cells[0].textContent.toLowerCase();
            const clientName = row.cells[1].textContent.toLowerCase();
            if (invoiceId.includes(searchTerm) || clientName.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
});

// --- FUNGSI UNTUK MENAMPILKAN SKELETON ---
function showSkeletons() {
    document.querySelector('.summary-cards').innerHTML = `
        <div class="skeleton-summary-cards">
            ${[1,2,3,4].map(() => `
                <div class="skeleton-summary-card">
                    <div class="skeleton skeleton-icon"></div>
                    <div class="skeleton-info">
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('invoices-table-body').innerHTML = `
        ${[1,2,3,4,5].map(() => `
            <tr>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
            </tr>
        `).join('')}
    `;
}

// --- FUNGSI UNTUK MENGAMBIL DATA DARI FIRESTORE ---
async function fetchAndDisplayInvoices(uid) {
    // Paparkan skeleton SEBELUM mula mengambil data
    showSkeletons();

    try {
        const invoicesSnapshot = await db
            .collection('invoices')
            .where('uid', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();

        const invoices = [];
        invoicesSnapshot.forEach(doc => {
            invoices.push({ id: doc.id, ...doc.data() });
        });
        
        // Paparkan data yang sebenar
        updateSummaryCards(invoices);
        renderInvoiceTable(invoices);

    } catch (error) {
        console.error("Error fetching invoices: ", error);
        alert("Gagal memuatkan invois.");
    }
}
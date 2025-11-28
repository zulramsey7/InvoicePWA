document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutLink = document.querySelector('.logout-link');
    const searchInput = document.getElementById('search-input');
    const invoicesTableBody = document.getElementById('invoices-table-body');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const chartPeriodSelect = document.getElementById('chart-period');
    const summaryCards = document.querySelector('.summary-cards');
    
    // --- ELEMEN DOM NOTIFIKASI ---
    const notificationBtn = document.getElementById('notification-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationList = document.getElementById('notification-list');
    const markAllReadBtn = document.getElementById('mark-all-read');
    
    // --- VARIABEL CARTA ---
    let revenueChart = null;
    let statusChart = null;
    
    // --- INISIALISASI ---
    initDashboard();
    
    function initDashboard() {
        // Event listeners
        setupEventListeners();
        
        // Check authentication state
        auth.onAuthStateChanged(async user => {
            if (user) {
                console.log('User is logged in:', user);
                userEmailSpan.textContent = user.email;
                // Panggil fungsi untuk memuat data dari Firestore
                await fetchAndDisplayInvoices(user.uid);
                // Load notifications
                loadNotifications();
            } else {
                console.log('No user logged in. Redirecting to login page.');
                window.location.href = 'index.html';
            }
        });
    }
    
    // --- SETUP EVENT LISTENERS ---
    function setupEventListeners() {
        // Logout buttons
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        if (logoutLink) {
            logoutLink.addEventListener('click', handleLogout);
        }
        
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
        }
        
        // Sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', toggleSidebar);
        }
        
        // Mobile menu toggle
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
        }
        
        // Chart period selector
        if (chartPeriodSelect) {
            chartPeriodSelect.addEventListener('change', handleChartPeriodChange);
        }
        
        // Notification button
        if (notificationBtn) {
            notificationBtn.addEventListener('click', toggleNotificationDropdown);
        }
        
        // Mark all as read
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
        }
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            // Close sidebar when clicking outside on mobile
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
            
            // Close notification dropdown when clicking outside
            if (notificationDropdown && 
                notificationDropdown.classList.contains('show') && 
                !notificationBtn.contains(e.target) && 
                !notificationDropdown.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
            }
        });
    }
    
    // --- FUNGSI LOG KELUAR ---
    function handleLogout() {
        auth.signOut().then(() => {
            console.log('User signed out.');
            showNotification('Anda telah log keluar.', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }).catch(error => {
            console.error('Sign out error:', error);
            showNotification('Gagal log keluar. Sila cuba lagi.', 'error');
        });
    }
    
    // --- FUNGSI TOGGLE SIDEBAR ---
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
    
    // --- FUNGSI TOGGLE MOBILE SIDEBAR ---
    function toggleMobileSidebar() {
        sidebar.classList.toggle('active');
    }
    
    // --- FUNGSI UNTUK MENGAMBIL DATA DARI FIRESTORE ---
    async function fetchAndDisplayInvoices(uid) {
        // Paparkan skeleton SEBELUM mula mengambil data
        showSkeletons();
        
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
            
            // Initialize charts after data is loaded and skeletons are removed
            setTimeout(() => {
                initializeCharts(invoices);
            }, 100);

        } catch (error) {
            console.error("Error fetching invoices: ", error);
            showNotification("Gagal memuatkan invois.", 'error');
            hideSkeletons();
        }
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI KAD RINGKASAN ---
    function updateSummaryCards(invoices) {
        // First restore the original summary cards structure
        restoreSummaryCards();
        
        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
        const unpaidInvoices = invoices.filter(inv => inv.status === 'sent').length; // Status 'sent' dianggap belum dibayar
        const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
        const overdueInvoices = invoices.filter(inv => {
            if (inv.status === 'sent' && inv.dueDate) {
                return new Date(inv.dueDate) < new Date();
            }
            return false;
        }).length;
        
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + parseFloat(inv.grandTotal || 0), 0);

        // Update summary cards with animation
        animateValue('total-invoices', 0, totalInvoices, 1000);
        animateValue('paid-invoices', 0, paidInvoices, 1000);
        animateValue('unpaid-invoices', 0, unpaidInvoices + draftInvoices, 1000);
        
        // Format revenue with animation
        const revenueElement = document.getElementById('total-revenue');
        animateValue('total-revenue', 0, totalRevenue, 1000, true);
        
        // Update change indicators (this would ideally be calculated from historical data)
        updateChangeIndicators(invoices);
    }
    
    // --- FUNGSI UNTUK MEMULIHKAN STRUKTUR KAD RINGKASAN ---
    function restoreSummaryCards() {
        if (!summaryCards) return;
        
        summaryCards.innerHTML = `
            <div class="card">
                <div class="card-icon">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <div class="card-info">
                    <h3 id="total-invoices">0</h3>
                    <p>Jumlah Invois</p>
                    <div class="card-change positive">
                        <i class="fas fa-arrow-up"></i>
                        <span>12% dari bulan lalu</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-icon paid">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="card-info">
                    <h3 id="paid-invoices">0</h3>
                    <p>Dibayar</p>
                    <div class="card-change positive">
                        <i class="fas fa-arrow-up"></i>
                        <span>8% dari bulan lalu</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-icon unpaid">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="card-info">
                    <h3 id="unpaid-invoices">0</h3>
                    <p>Belum Dibayar</p>
                    <div class="card-change negative">
                        <i class="fas fa-arrow-down"></i>
                        <span>5% dari bulan lalu</span>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-icon revenue">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="card-info">
                    <h3 id="total-revenue">RM 0</h3>
                    <p>Jumlah Kutipan</p>
                    <div class="card-change positive">
                        <i class="fas fa-arrow-up"></i>
                        <span>23% dari bulan lalu</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI PENUNJUK PERUBAHAN ---
    function updateChangeIndicators(invoices) {
        // In a real app, you would compare with previous period data
        // For demo purposes, we'll use random values
        const changeElements = document.querySelectorAll('.card-change');
        
        changeElements.forEach((element, index) => {
            const isPositive = Math.random() > 0.3;
            const changeValue = (Math.random() * 20).toFixed(1);
            
            element.classList.toggle('positive', isPositive);
            element.classList.toggle('negative', !isPositive);
            
            const icon = element.querySelector('i');
            icon.className = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            
            element.querySelector('span').textContent = `${changeValue}% dari bulan lalu`;
        });
    }
    
    // --- FUNGSI UNTUK MEMAPARKAN JADUAL INVOIS ---
    function renderInvoiceTable(invoices) {
        invoicesTableBody.innerHTML = ''; // Kosongkan jadual dahulu

        if (invoices.length === 0) {
            invoicesTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tiada invois dijumpai.</td></tr>';
            return;
        }

        // Limit to 10 most recent invoices for dashboard
        const recentInvoices = invoices.slice(0, 10);

        recentInvoices.forEach(invoice => {
            const row = document.createElement('tr');
            
            // Guna status sebenar dari data
            let status = invoice.status || 'sent';
            
            // Check if invoice is overdue
            if (status === 'sent' && invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
                status = 'overdue';
            }
            
            const statusClass = status;
            const statusText = getStatusText(status);
            
            row.innerHTML = `
                <td>${invoice.invoiceNumber || 'N/A'}</td>
                <td>${invoice.client ? invoice.client.name : 'Pelanggan Tidak Diketahui'}</td>
                <td>${formatDate(invoice.dueDate)}</td>
                <td>${parseFloat(invoice.grandTotal || 0).toLocaleString('en-MY')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
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
            showNotification('Invois berjaya dipadam.', 'success');
            // Muat semula senarai invois untuk mengemaskini paparan
            const user = auth.currentUser;
            if (user) {
                await fetchAndDisplayInvoices(user.uid);
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            showNotification('Gagal memadam invois. Sila cuba lagi.', 'error');
        }
    }
    
    // --- FUNGSI CARI ---
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        const rows = invoicesTableBody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    // --- FUNGSI UNTUK MENUKAR TEMPoh CARTA ---
    function handleChartPeriodChange(e) {
        const period = e.target.value;
        const user = auth.currentUser;
        
        if (user) {
            updateChartsWithPeriod(user.uid, period);
        }
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI CARTA MENGIKUT TEMPOH ---
    async function updateChartsWithPeriod(uid, period) {
        try {
            // Calculate date range based on period
            const now = new Date();
            let startDate;
            
            switch (period) {
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'quarter':
                    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
                    startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            
            // Fetch invoices for the selected period
            const invoicesSnapshot = await db
                .collection('invoices')
                .where('uid', '==', uid)
                .where('createdAt', '>=', startDate)
                .orderBy('createdAt', 'asc')
                .get();
                
            const invoices = [];
            invoicesSnapshot.forEach(doc => {
                invoices.push({ id: doc.id, ...doc.data() });
            });
            
            // Update charts with new data
            updateRevenueChart(invoices, period);
            updateStatusChart(invoices);
            
        } catch (error) {
            console.error('Error updating charts:', error);
            showNotification('Gagal mengemaskini carta.', 'error');
        }
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI CARTA PENDAPATAN ---
    function updateRevenueChart(invoices, period) {
        // Check if canvas element exists
        const canvasElement = document.getElementById('revenue-chart');
        if (!canvasElement) {
            console.error('Canvas element with ID "revenue-chart" not found');
            return;
        }
        
        const ctx = canvasElement.getContext('2d');
        
        // Group invoices by month and calculate revenue
        const revenueData = processRevenueData(invoices, period);
        
        if (revenueChart) {
            revenueChart.destroy();
        }
        
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: revenueData.labels,
                datasets: [{
                    label: 'Pendapatan (RM)',
                    data: revenueData.values,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Pendapatan: RM ${context.raw.toLocaleString('en-MY')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + value.toLocaleString('en-MY');
                            }
                        }
                    }
                }
            }
        });
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI CARTA STATUS ---
    function updateStatusChart(invoices) {
        // Check if canvas element exists
        const canvasElement = document.getElementById('status-chart');
        if (!canvasElement) {
            console.error('Canvas element with ID "status-chart" not found');
            return;
        }
        
        const ctx = canvasElement.getContext('2d');
        
        // Count invoices by status
        const statusCounts = {
            paid: 0,
            sent: 0,
            draft: 0,
            overdue: 0
        };
        
        invoices.forEach(invoice => {
            let status = invoice.status || 'sent';
            
            // Check if invoice is overdue
            if (status === 'sent' && invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
                status = 'overdue';
            }
            
            statusCounts[status]++;
        });
        
        if (statusChart) {
            statusChart.destroy();
        }
        
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Dibayar', 'Belum Dibayar', 'Draf', 'Lewat'],
                datasets: [{
                    data: [
                        statusCounts.paid,
                        statusCounts.sent,
                        statusCounts.draft,
                        statusCounts.overdue
                    ],
                    backgroundColor: [
                        '#22c55e',
                        '#f59e0b',
                        '#6b7280',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // --- FUNGSI UNTUK MEMPROSES DATA PENDAPATAN ---
    function processRevenueData(invoices, period) {
        const labels = [];
        const values = [];
        
        // Create a map to store revenue by month
        const revenueByMonth = {};
        
        // Initialize months based on period
        const now = new Date();
        let monthsToShow;
        
        switch (period) {
            case 'month':
                monthsToShow = 1;
                break;
            case 'quarter':
                monthsToShow = 3;
                break;
            case 'year':
                monthsToShow = 12;
                break;
            default:
                monthsToShow = 3;
        }
        
        // Initialize all months with zero revenue
        for (let i = monthsToShow - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthLabel = date.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' });
            
            revenueByMonth[monthKey] = 0;
            labels.push(monthLabel);
        }
        
        // Calculate revenue for each month
        invoices.forEach(invoice => {
            if (invoice.status === 'paid' && invoice.createdAt) {
                const createdDate = new Date(invoice.createdAt.toDate ? invoice.createdAt.toDate() : invoice.createdAt);
                const monthKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
                
                if (revenueByMonth.hasOwnProperty(monthKey)) {
                    revenueByMonth[monthKey] += parseFloat(invoice.grandTotal || 0);
                }
            }
        });
        
        // Extract values in the same order as labels
        labels.forEach((label, index) => {
            const date = new Date(label);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            values.push(revenueByMonth[monthKey]);
        });
        
        return { labels, values };
    }
    
    // --- FUNGSI UNTUK MENGANIMASIKAN NILAI ---
    function animateValue(id, start, end, duration, isCurrency = false) {
        const element = document.getElementById(id);
        if (!element) return;
        
        const range = end - start;
        const increment = range / (duration / 16); // 60fps
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            
            if (isCurrency) {
                element.textContent = `RM ${current.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    }
    
    // --- FUNGSI UNTUK MEMAPARKAN SKELETON ---
    function showSkeletons() {
        // Summary cards skeleton
        if (summaryCards) {
            summaryCards.innerHTML = `
                ${[1,2,3,4].map(() => `
                    <div class="card skeleton-card">
                        <div class="skeleton skeleton-icon"></div>
                        <div class="card-info">
                            <div class="skeleton skeleton-text" style="width: 60px; height: 24px;"></div>
                            <div class="skeleton skeleton-text" style="width: 100px; height: 16px;"></div>
                            <div class="skeleton skeleton-text" style="width: 80px; height: 14px;"></div>
                        </div>
                    </div>
                `).join('')}
            `;
        }
        
        // Table skeleton
        if (invoicesTableBody) {
            invoicesTableBody.innerHTML = `
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
        
        // Chart skeletons - preserve canvas elements
        const revenueChartContainer = document.querySelector('#revenue-chart').parentElement;
        const statusChartContainer = document.querySelector('#status-chart').parentElement;
        
        if (revenueChartContainer) {
            revenueChartContainer.innerHTML = `
                <canvas id="revenue-chart"></canvas>
                <div class="skeleton-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.7); display: flex; justify-content: center; align-items: center;">
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            `;
        }
        
        if (statusChartContainer) {
            statusChartContainer.innerHTML = `
                <canvas id="status-chart"></canvas>
                <div class="skeleton-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.7); display: flex; justify-content: center; align-items: center;">
                    <div class="spinner" style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
            `;
        }
    }
    
    // --- FUNGSI UNTUK MENYEMBUNYIKAN SKELETON ---
    function hideSkeletons() {
        // Restore summary cards
        restoreSummaryCards();
        
        // Table skeleton
        if (invoicesTableBody) {
            invoicesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Gagal memuatkan data invois. Sila segarkan halaman.</p>
                    </td>
                </tr>
            `;
        }
    }
    
    // --- FUNGSI UNTUK MEMAPARKAN NOTIFIKASI ---
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Add close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.add('hide');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }
    
    // --- FUNGSI UNTUK MENDAPATKAN IKON NOTIFIKASI ---
    function getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return 'fa-check-circle';
            case 'error':
                return 'fa-exclamation-circle';
            case 'warning':
                return 'fa-exclamation-triangle';
            default:
                return 'fa-info-circle';
        }
    }
    
    // --- FUNGSI UNTUK MEMFORMAT TARIKH ---
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
        return date.toLocaleDateString('ms-MY', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    }
    
    // --- FUNGSI UNTUK MENDAPATKAN TEKS STATUS ---
    function getStatusText(status) {
        switch (status) {
            case 'paid':
                return 'Dibayar';
            case 'sent':
                return 'Belum Dibayar';
            case 'draft':
                return 'Draf';
            case 'overdue':
                return 'Lewat';
            default:
                return 'Tidak Diketahui';
        }
    }
    
    // --- FUNGSI UNTUK MENGEMASKINI CARTA ---
    function initializeCharts(invoices) {
        // Get the current period from the select element
        const period = chartPeriodSelect ? chartPeriodSelect.value : 'month';
        
        // Remove skeleton overlays
        const revenueOverlay = document.querySelector('#revenue-chart').parentElement.querySelector('.skeleton-overlay');
        const statusOverlay = document.querySelector('#status-chart').parentElement.querySelector('.skeleton-overlay');
        
        if (revenueOverlay) {
            revenueOverlay.remove();
        }
        
        if (statusOverlay) {
            statusOverlay.remove();
        }
        
        // Update charts with data
        updateRevenueChart(invoices, period);
        updateStatusChart(invoices);
    }
    
    // --- FUNGSI NOTIFIKASI ---
    
    // Toggle notification dropdown
    function toggleNotificationDropdown() {
        if (notificationDropdown) {
            notificationDropdown.classList.toggle('show');
            
            // Load notifications when dropdown is opened
            if (notificationDropdown.classList.contains('show')) {
                loadNotifications();
            }
        }
    }

    // Load notifications from Firestore
    async function loadNotifications() {
        if (!notificationList) return;
        
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            const notificationsSnapshot = await db
                .collection('notifications')
                .where('uid', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
                
            const notifications = [];
            notificationsSnapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            
            // Update notification badge
            updateNotificationBadge(notifications);
            
            // Render notifications
            renderNotifications(notifications);
            
        } catch (error) {
            console.error('Error loading notifications:', error);
            notificationList.innerHTML = `
                <div class="notification-item">
                    <div class="notification-content">
                        <div class="notification-text">
                            <p>Gagal memuatkan notifikasi.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Update notification badge
    function updateNotificationBadge(notifications) {
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.querySelector('.notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Render notifications
    function renderNotifications(notifications) {
        if (!notificationList) return;
        
        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-item">
                    <div class="notification-content">
                        <div class="notification-text">
                            <p>Tiada notifikasi baru.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        notificationList.innerHTML = '';
        
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${!notification.read ? 'unread' : ''}`;
            
            const iconClass = getNotificationIconClass(notification.type);
            const timeAgo = getTimeAgo(notification.createdAt);
            
            item.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon ${iconClass}">
                        <i class="fas ${getNotificationIcon(notification.type)}"></i>
                    </div>
                    <div class="notification-text">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
            `;
            
            notificationList.appendChild(item);
            
            // Mark as read when clicked
            item.addEventListener('click', () => {
                markNotificationAsRead(notification.id);
                item.classList.remove('unread');
            });
        });
    }

    // Get notification icon class
    function getNotificationIconClass(type) {
        switch (type) {
            case 'payment':
                return 'success';
            case 'overdue':
                return 'warning';
            case 'error':
                return 'error';
            default:
                return 'info';
        }
    }

    // Get time ago
    function getTimeAgo(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return `${interval} tahun yang lalu`;
        
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return `${interval} bulan yang lalu`;
        
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return `${interval} hari yang lalu`;
        
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return `${interval} jam yang lalu`;
        
        interval = Math.floor(seconds / 60);
        if (interval > 1) return `${interval} minit yang lalu`;
        
        return 'Baru sahaja';
    }

    // Mark notification as read
    async function markNotificationAsRead(notificationId) {
        try {
            await db.collection('notifications').doc(notificationId).update({
                read: true
            });
            
            // Reload notifications to update the badge
            loadNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Mark all notifications as read
    async function markAllNotificationsAsRead() {
        try {
            const user = auth.currentUser;
            if (!user) return;
            
            const notificationsSnapshot = await db
                .collection('notifications')
                .where('uid', '==', user.uid)
                .where('read', '==', false)
                .get();
                
            const batch = db.batch();
            notificationsSnapshot.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            
            await batch.commit();
            
            // Reload notifications
            loadNotifications();
            
            showNotification('Semua notifikasi telah ditandai sebagai dibaca.', 'success');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            showNotification('Gagal menandai notifikasi sebagai dibaca.', 'error');
        }
    }
});
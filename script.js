// Data Storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// DOM Elements
const totalSaldoEl = document.getElementById('totalSaldo');
const totalPemasukanEl = document.getElementById('totalPemasukan');
const totalPengeluaranEl = document.getElementById('totalPengeluaran');
const transactionsContainer = document.getElementById('transactionsContainer');
const transactionForm = document.getElementById('transactionForm');
const filterTipe = document.getElementById('filterTipe');
const filterKategori = document.getElementById('filterKategori');
let myChart = null;

// Set default date to today
document.getElementById('tanggal').valueAsDate = new Date();

// Initialize the app
function init() {
    updateStats();
    renderTransactions();
    updateReport();
    renderTips();
}

// Format currency to IDR
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

// Update statistics
function updateStats() {
    const totalPemasukan = transactions
        .filter(t => t.tipe === 'pemasukan')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const totalPengeluaran = transactions
        .filter(t => t.tipe === 'pengeluaran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const totalSaldo = totalPemasukan - totalPengeluaran;
    
    totalSaldoEl.textContent = formatRupiah(totalSaldo);
    totalPemasukanEl.textContent = formatRupiah(totalPemasukan);
    totalPengeluaranEl.textContent = formatRupiah(totalPengeluaran);
}

// Render transactions based on filters
function renderTransactions() {
    const tipeFilter = filterTipe.value;
    const kategoriFilter = filterKategori.value;
    
    let filteredTransactions = transactions;
    
    if (tipeFilter !== 'semua') {
        filteredTransactions = filteredTransactions.filter(t => t.tipe === tipeFilter);
    }
    
    if (kategoriFilter !== 'semua') {
        filteredTransactions = filteredTransactions.filter(t => t.kategori === kategoriFilter);
    }
    
    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (filteredTransactions.length === 0) {
        transactionsContainer.innerHTML = '<p class="no-data">Belum ada transaksi</p>';
        return;
    }
    
    transactionsContainer.innerHTML = filteredTransactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-desc">${t.deskripsi}</div>
                <div class="transaction-meta">
                    <span>${new Date(t.tanggal).toLocaleDateString('id-ID')}</span>
                    <span class="transaction-category">${t.kategori}</span>
                </div>
            </div>
            <div class="transaction-amount ${t.tipe}">
                ${formatRupiah(t.jumlah)}
            </div>
            <button class="btn-delete" onclick="deleteTransaction('${t.id}')">×</button>
        </div>
    `).join('');
}

// Add new transaction
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const deskripsi = document.getElementById('deskripsi').value;
    const jumlah = parseInt(document.getElementById('jumlah').value);
    const tipe = document.getElementById('tipe').value;
    const kategori = document.getElementById('kategori').value;
    const tanggal = document.getElementById('tanggal').value;
    
    if (jumlah <= 0) {
        alert('Jumlah harus lebih dari 0');
        return;
    }
    
    const transaction = {
        id: Date.now().toString(),
        deskripsi,
        jumlah,
        tipe,
        kategori,
        tanggal
    };
    
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    transactionForm.reset();
    document.getElementById('tanggal').valueAsDate = new Date();
    
    updateStats();
    renderTransactions();
    updateReport();
    
    // Show success message
    alert('Transaksi berhasil ditambahkan!');
});

// Delete transaction
window.deleteTransaction = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        
        updateStats();
        renderTransactions();
        updateReport();
    }
};

// Filter listeners
filterTipe.addEventListener('change', renderTransactions);
filterKategori.addEventListener('change', renderTransactions);

// Update report section
function updateReport() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Filter transactions for current month
    const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.tanggal);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const monthlyPemasukan = monthlyTransactions
        .filter(t => t.tipe === 'pemasukan')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    const monthlyPengeluaran = monthlyTransactions
        .filter(t => t.tipe === 'pengeluaran')
        .reduce((sum, t) => sum + t.jumlah, 0);
    
    // Find largest expense
    const expenses = transactions.filter(t => t.tipe === 'pengeluaran');
    const largestExpense = expenses.length > 0 
        ? Math.max(...expenses.map(e => e.jumlah))
        : 0;
    
    // Calculate daily average
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyAverage = monthlyPengeluaran / daysInMonth;
    
    document.getElementById('pemasukanBulanIni').textContent = formatRupiah(monthlyPemasukan);
    document.getElementById('pengeluaranBulanIni').textContent = formatRupiah(monthlyPengeluaran);
    document.getElementById('pengeluaranTerbesar').textContent = formatRupiah(largestExpense);
    document.getElementById('rataHarian').textContent = formatRupiah(dailyAverage);
    
    updateChart();
}

// Update chart
function updateChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Get last 7 days data
    const labels = [];
    const pemasukanData = [];
    const pengeluaranData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
        
        const dayTransactions = transactions.filter(t => {
            const tDate = new Date(t.tanggal);
            return tDate.toDateString() === date.toDateString();
        });
        
        const dayPemasukan = dayTransactions
            .filter(t => t.tipe === 'pemasukan')
            .reduce((sum, t) => sum + t.jumlah, 0);
        
        const dayPengeluaran = dayTransactions
            .filter(t => t.tipe === 'pengeluaran')
            .reduce((sum, t) => sum + t.jumlah, 0);
        
        pemasukanData.push(dayPemasukan);
        pengeluaranData.push(dayPengeluaran);
    }
    
    if (myChart) {
        myChart.destroy();
    }
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Pemasukan',
                    data: pemasukanData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Pengeluaran',
                    data: pengeluaranData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Grafik Transaksi 7 Hari Terakhir'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });
}

// Render financial tips
function renderTips() {
    const tips = [
        {
            icon: '💰',
            title: 'Budgeting 50/30/20',
            description: 'Alokasikan 50% untuk kebutuhan, 30% untuk keinginan, dan 20% untuk tabungan.'
        },
        {
            icon: '📱',
            title: 'Catat Setiap Transaksi',
            description: 'Selalu catat pengeluaran sekecil apapun untuk kontrol keuangan yang lebih baik.'
        },
        {
            icon: '🎯',
            title: 'Tetapkan Tujuan Finansial',
            description: 'Buat tujuan jangka pendek dan panjang untuk memotivasi menabung.'
        },
        {
            icon: '💳',
            title: 'Hindari Hutang Konsumtif',
            description: 'Gunakan kartu kredit dengan bijak dan hindari hutang untuk hal yang tidak perlu.'
        }
    ];
    
    const tipsContainer = document.getElementById('tipsContainer');
    tipsContainer.innerHTML = tips.map(tip => `
        <div class="tip-card">
            <div class="tip-icon">${tip.icon}</div>
            <h3>${tip.title}</h3>
            <p>${tip.description}</p>
        </div>
    `).join('');
}

// Initialize the app
init();
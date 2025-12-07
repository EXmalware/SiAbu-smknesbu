let currentUser = null;
let currentAbsenData = [];

// Helper function untuk API calls
// Helper function untuk API calls
async function apiCall(action, method = 'GET', data = null) {
    // Cek apakah mode mock aktif (dari config.js)
    if (typeof USE_MOCK_API !== 'undefined' && USE_MOCK_API === true) {
        console.warn(`[MOCK MODE] Menggunakan mock data untuk action: ${action}`);
        return new Promise((resolve) => {
            setTimeout(() => {
                if (typeof MOCK_DATA !== 'undefined' && MOCK_DATA[action]) {
                    resolve(MOCK_DATA[action]);
                } else {
                    resolve({ status: "error", message: "Mock data not found for action: " + action });
                }
            }, 800);
        });
    }

    try {
        const url = method === 'GET' && data
            ? `${API_URL}?action=${action}&${new URLSearchParams(data).toString()}`
            : `${API_URL}?action=${action}`;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Call Error:', error);

        // Fallback otomatis ke mock data jika terjadi error (misalnya CORS)
        if (typeof MOCK_DATA !== 'undefined' && MOCK_DATA[action]) {
            console.warn(`[FALLBACK] API Error, menggunakan mock data untuk: ${action}`);
            showNotification("Mode Offline/Lokal: Menggunakan data simulasi.", "warning");
            return MOCK_DATA[action];
        }

        throw error;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("userPanel").style.display = "block";
        document.getElementById("userInfo").innerText = "Halo, " + currentUser.nama;

        apiCall('getFilterData')
            .then(res => {
                const today = new Date();
                const currentMonth = today.getMonth() + 1;
                const currentYear = today.getFullYear();
                populateSelect(document.getElementById("bulanFilter"), res.bulan, "id", "nama");
                populateSelect(document.getElementById("tahunFilter"), res.tahun, null, null);
                document.getElementById("bulanFilter").value = currentMonth;
                document.getElementById("tahunFilter").value = currentYear;
                showAbsenPanel();
            })
            .catch(err => {
                console.error('Error loading filter data:', err);
                showNotification("Gagal memuat data filter", "error");
            });
    } else {
        document.getElementById("loginForm").style.display = "block";
        document.getElementById("userPanel").style.display = "none";
    }

    const toggle = document.getElementById('darkModeToggle');
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
        toggle.checked = true;
    } else {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
        toggle.checked = false;
    }
    updateThemeLabel();
    toggle.addEventListener('change', () => {
        toggleDarkMode();
        updateThemeLabel();
    });

    // Jam digital realtime
    setInterval(updateClock, 1000);
    updateClock();
});

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('digital-clock').innerText = `${hours}:${minutes}:${seconds}`;
}

function toggleDarkMode() {
    const body = document.body;
    if (body.classList.contains("light-mode")) {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
    } else {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
    }
}

function updateThemeLabel() {
    const body = document.body;
    const label = document.getElementById('theme-label');
    if (body.classList.contains('light-mode')) {
        label.textContent = "❂";
    } else {
        label.textContent = "☽";
    }
}

function showNotification(message, type) {
    const notificationBar = document.getElementById('notification-bar');
    notificationBar.textContent = message;
    notificationBar.className = '';
    notificationBar.classList.add(type);
    notificationBar.style.opacity = '1';
    notificationBar.style.visibility = 'visible';
    setTimeout(() => {
        notificationBar.style.opacity = '0';
        notificationBar.style.visibility = 'hidden';
    }, 3000);
}

function showLoading(message) {
    document.getElementById('loading-text').textContent = message;
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function populateSelect(selectElement, data, valueKey, textKey) {
    selectElement.innerHTML = "";
    data.forEach(item => {
        const option = document.createElement("option");
        option.value = valueKey ? item[valueKey] : item;
        option.innerText = textKey ? item[textKey] : item;
        selectElement.appendChild(option);
    });
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginBtn = document.getElementById("loginBtn");

    if (!username || !password) {
        showNotification("Masukkan NIS/Email dan password.", "error");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-small"></span> Tunggu...';
    showLoading("Mencoba login, mohon tunggu...");

    try {
        const res = await apiCall('login', 'POST', { username, password });
        hideLoading();
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt inline-block mr-2"></i>Login';

        if (res.status === "success") {
            localStorage.setItem('currentUser', JSON.stringify(res));
            showNotification("Login Berhasil!", "success");
            currentUser = res;
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("userPanel").style.display = "block";
            document.getElementById("userInfo").innerText = "Halo, " + res.nama;
            setTimeout(() => {
                document.getElementById("userPanel").classList.add("fade-in");
            }, 10);

            if (!res.email || res.email.trim() === "") {
                document.getElementById("email-notification-modal").style.display = "block";
            } else {
                showAbsenPanel();
            }
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt inline-block mr-2"></i>Login';
        showNotification("Terjadi kesalahan: " + err.message, "error");
    }
}

function showLogoutConfirmation() {
    document.getElementById("logout-confirmation-modal").style.display = "block";
}

function performLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    closeModal('logout-confirmation-modal');
    document.getElementById("userPanel").style.display = "none";
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("loginForm").classList.add("fade-in");
    document.getElementById("userPanel").classList.remove("fade-in");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    showNotification("Logout berhasil.", "success");
}

function showForgotPasswordPanel() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("forgotPasswordPanel").style.display = "block";
    document.getElementById("forgotPasswordPanel").classList.add("fade-in");
    document.getElementById("loginForm").classList.remove("fade-in");
}

function backToLogin() {
    document.getElementById("forgotPasswordPanel").style.display = "none";
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("loginForm").classList.add("fade-in");
    document.getElementById("forgotPasswordPanel").classList.remove("fade-in");
}

async function resetPassword() {
    const email = document.getElementById("resetEmail").value.trim();
    if (!email) {
        showNotification("Masukkan email Anda.", "error");
        return;
    }

    showLoading("Mengirim email reset password...");

    try {
        const res = await apiCall('forgotPassword', 'POST', { email });
        hideLoading();

        if (res.status === "success") {
            showNotification(res.message, "success");
            backToLogin();
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        showNotification("Terjadi kesalahan: " + err.message, "error");
    }
}

function showAbsenPanel() {
    document.getElementById("absenContent").style.display = "block";
    closeModal('profileContent');
    document.getElementById("absenContent").classList.add("fade-in");
    filterData();
}

function showProfilePanel() {
    document.getElementById("absenContent").style.display = "none";
    document.getElementById("profileContent").style.display = "block";
    loadProfile();
}

async function loadProfile() {
    if (!currentUser || !currentUser.nis) {
        showNotification("Tidak ada NIS ditemukan.", "error");
        return;
    }

    showLoading("Memuat data profil...");

    try {
        const res = await apiCall('getProfile', 'GET', { nis: currentUser.nis });
        hideLoading();

        if (res.status === "success") {
            document.getElementById("profileNama").innerText = res.nama;
            document.getElementById("profileNis").innerText = res.nis;
            document.getElementById("profileEmail").value = res.email;
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        showNotification("Terjadi kesalahan saat memuat profil: " + err.message, "error");
    }
}

async function updateProfile() {
    const newPassword = document.getElementById("profilePassword").value.trim();
    const newEmail = document.getElementById("profileEmail").value.trim();

    if (!currentUser) return;

    showLoading("Menyimpan perubahan profil...");

    try {
        const res = await apiCall('updateProfile', 'POST', {
            nis: currentUser.nis,
            newPassword,
            newEmail
        });
        hideLoading();

        if (res.status === "success") {
            showNotification(res.message, "success");
            currentUser.email = newEmail;
            document.getElementById("profilePassword").value = "";
            loadProfile();
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        showNotification("Terjadi kesalahan: " + err.message, "error");
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

function toggleProfilePasswordVisibility() {
    const passwordInput = document.getElementById("profilePassword");
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
}

async function filterData() {
    if (!currentUser) return;

    const nis = currentUser.nis;
    const bulan = document.getElementById("bulanFilter").value;
    const tahun = document.getElementById("tahunFilter").value;

    showLoading("Memuat data, mohon tunggu!");
    document.getElementById("status").innerText = "";

    try {
        const res = await apiCall('getRiwayatAbsen', 'GET', {
            nis,
            bulan,
            tahun
        });
        hideLoading();
        currentAbsenData = res;
        renderCalendar(currentAbsenData, bulan, tahun);
        updateSummaryDashboard(currentAbsenData);
    } catch (err) {
        hideLoading();
        document.getElementById("status").innerText = "Terjadi kesalahan saat memuat data.";
        showNotification("Gagal memuat data: " + err.message, "error");
    }
}

function updateSummaryDashboard(data) {
    let hadir = 0, absen = 0, terlambat = 0, izin = 0;
    data.forEach(day => {
        const status = day.keterangan.toUpperCase();
        if (status === "H" || status === "HB") hadir++;
        else if (status === "A") absen++;
        else if (["T", "TAPT", "TAM", "PT", "TAP"].includes(status)) terlambat++;
        else if (["I", "S"].includes(status)) izin++;
    });
    document.getElementById("sum-hadir").innerText = hadir;
    document.getElementById("sum-absen").innerText = absen;
    document.getElementById("sum-terlambat").innerText = terlambat;
    document.getElementById("sum-izin").innerText = izin;
}

async function generatePdfReport() {
    if (!currentUser) {
        showNotification("Silakan login terlebih dahulu.", "error");
        return;
    }

    const nis = currentUser.nis;
    const bulan = document.getElementById("bulanFilter").value;
    const tahun = document.getElementById("tahunFilter").value;
    const pdfBtn = document.getElementById("pdfBtn");

    pdfBtn.disabled = true;
    pdfBtn.innerHTML = '<span class="spinner-small"></span>';
    showLoading("Membuat laporan PDF, mohon tunggu...");

    try {
        const res = await apiCall('createPdfReport', 'GET', {
            nis,
            bulan,
            tahun
        });
        hideLoading();
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = '<i class="fas fa-file-pdf inline-block"></i>';

        if (res.status === "error") {
            showNotification(res.message, "error");
        } else {
            const byteCharacters = atob(res.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = res.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            showNotification("Laporan PDF berhasil diunduh!", "success");
        }
    } catch (err) {
        hideLoading();
        pdfBtn.disabled = false;
        pdfBtn.innerHTML = '<i class="fas fa-file-pdf inline-block"></i>';
        showNotification("Gagal membuat PDF: " + err.message, "error");
    }
}

function renderCalendar(data, bulan, tahun) {
    const grid = document.getElementById("calendar-grid");
    const monthYearDisplay = document.getElementById("month-year-display");
    const statusText = document.getElementById("status");
    grid.innerHTML = "";
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    monthYearDisplay.innerText = `${months[bulan - 1]} ${tahun}`;

    const firstDay = new Date(tahun, bulan - 1, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.classList.add("calendar-day", "empty-day");
        grid.appendChild(emptyDay);
    }

    data.forEach(dayData => {
        const day = document.createElement("div");
        day.classList.add("calendar-day");

        const statusClass = getStatusClass(dayData.keterangan);
        if (statusClass) {
            day.classList.add(statusClass);
        } else {
            const date = new Date(tahun, bulan - 1, dayData.tanggal.split('-')[0]);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                day.classList.add("weekend-day");
            }
        }

        day.innerHTML = `<span class="day-number">${dayData.tanggal.split('-')[0]}</span><span class="day-status">${dayData.keterangan || ''}</span>`;
        day.addEventListener("click", () => showDetails(dayData));

        grid.appendChild(day);
    });

    if (data && data.length > 0 && data.every(d => d.keterangan === "A" || d.keterangan === "OFF" || d.keterangan === "HB")) {
        statusText.innerText = "Tidak ada absensi pada bulan ini (libur atau alpa semua).";
    } else {
        statusText.innerText = "";
    }
}

function getStatusClass(status) {
    if (!status) return "";
    switch (status.toUpperCase()) {
        case "A":
            return "status-A";
        case "H":
        case "HB":
            return "status-H";
        case "T":
        case "TAPT":
        case "TAM":
        case "PT":
        case "TAP":
            return "status-T";
        case "I":
        case "S":
            return "status-I";
        case "P":
            return "status-P";
        case "OFF":
            return "weekend-day";
        default:
            return "";
    }
}

function showDetails(dayData) {
    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-date').innerText = dayData.tanggal;
    document.getElementById('modal-status').innerText = `Status: ${dayData.keterangan || "-"}`;
    document.getElementById('modal-time-in').innerText = `Jam Masuk: ${dayData.jamMasuk || "-"}`;
    document.getElementById('modal-time-out').innerText = `Jam Pulang: ${dayData.jamPulang || "-"}`;
    modal.style.display = "block";
}

// Fungsi untuk share detail modal sebagai gambar
async function shareDetailModal() {
    const modalContent = document.querySelector('#detail-modal .modal-content');
    try {
        const canvas = await html2canvas(modalContent);
        canvas.toBlob(async (blob) => {
            const file = new File([blob], "absen-detail.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Detail Absen',
                    text: 'Bagikan detail absen saya.',
                });
            } else {
                showNotification("Fitur share tidak didukung di browser ini.", "error");
            }
        });
    } catch (err) {
        showNotification("Gagal generate gambar untuk share: " + err.message, "error");
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function redirectToProfileAndClose() {
    closeModal('email-notification-modal');
    showProfilePanel();
}

// Fungsi untuk toggle menu ellipsis pada mobile
function toggleMobileMenu() {
    const dropdown = document.getElementById('nav-dropdown');
    dropdown.classList.toggle('show');
}

window.onclick = function (event) {
    const modal1 = document.getElementById('detail-modal');
    const modal2 = document.getElementById('logout-confirmation-modal');
    const modal3 = document.getElementById('email-notification-modal');
    const modal4 = document.getElementById('profileContent');
    if (event.target == modal1) closeModal('detail-modal');
    if (event.target == modal2) closeModal('logout-confirmation-modal');
    if (event.target == modal3) closeModal('email-notification-modal');
    if (event.target == modal4) closeModal('profileContent');
}

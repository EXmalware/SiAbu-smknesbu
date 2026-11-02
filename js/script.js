let currentUser = null;
let currentAbsenData = [];
let filterOptionsPromise = null;
let selectedAbsenDate = null;
let lastDetailTrigger = null;
let lastQrTrigger = null;
let dashboardStatsRequested = false;
let appSplashTimeout = null;
let selectedMonitoringClass = null;
let ktdsLoaded = false;
let currentKtdsValues = {};
const KTDS_FIELDS = [
    { name: "NISN", label: "NISN", type: "text" },
    { name: "TEMPAT LAHIR", label: "Tempat lahir", type: "text" },
    { name: "TANGGAL LAHIR", label: "Tanggal lahir", type: "date" },
    { name: "JENIS KELAMIN", label: "Jenis kelamin", type: "text" },
    { name: "AGAMA", label: "Agama", type: "text" },
    { name: "STATUS DALAM KELUARGA", label: "Status dalam keluarga", type: "text" },
    { name: "ANAK KE", label: "Anak ke", type: "text" },
    { name: "ALAMAT PESERTA DIDIK", label: "Alamat peserta didik", type: "textarea", wide: true },
    { name: "NOMOR TELPON RUMAH", label: "Nomor telepon rumah", type: "tel" },
    { name: "SEKOLAH ASAL", label: "Sekolah asal", type: "text" },
    { name: "NAMA AYAH", label: "Nama ayah", type: "text" },
    { name: "NAMA IBU", label: "Nama ibu", type: "text" },
    { name: "PEKERJAAN AYAH", label: "Pekerjaan ayah", type: "text" },
    { name: "PEKERJAAN IBU", label: "Pekerjaan ibu", type: "text" },
    { name: "ALAMAT ORANG TUA", label: "Alamat orang tua", type: "textarea", wide: true },
    { name: "NOMOR TELPON ORANG TUA", label: "Nomor telepon orang tua", type: "tel" },
    { name: "NAMA WALI SISWA", label: "Nama wali siswa", type: "text" },
    { name: "ALAMAT WALI SISWA", label: "Alamat wali siswa", type: "textarea", wide: true },
    { name: "NOMER TELPON WALI SISWA", label: "Nomor telepon wali siswa", type: "tel" },
    { name: "PEKERJAAN WALI SISWA", label: "Pekerjaan wali siswa", type: "text" }
];

function showAppSplash() {
    const splash = document.getElementById("app-splash-screen");
    if (!splash) return;

    window.clearTimeout(appSplashTimeout);
    splash.classList.remove("is-hidden");
    splash.setAttribute("aria-hidden", "false");
    appSplashTimeout = window.setTimeout(hideAppSplash, 900);
}

function hideAppSplash() {
    const splash = document.getElementById("app-splash-screen");
    if (!splash) return;

    splash.classList.add("is-hidden");
    splash.setAttribute("aria-hidden", "true");
    appSplashTimeout = null;
}

window.addEventListener("pageshow", event => {
    if (event.persisted) showAppSplash();
});

// Helper function untuk API calls
// Helper function untuk API calls
async function apiCall(action, method = 'GET', data = null) {
    // Cek apakah mode mock aktif (dari config.js)
    if (typeof USE_MOCK_API !== 'undefined' && USE_MOCK_API === true) {
        console.warn(`[MOCK MODE] Menggunakan mock data untuk action: ${action}`);
        return new Promise((resolve) => {
            setTimeout(() => {
                if (typeof MOCK_DATA !== 'undefined' && MOCK_DATA[action]) {
                    const mockResult = MOCK_DATA[action];
                    resolve(typeof mockResult === "function" ? mockResult(data) : mockResult);
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
            method: method
        };

        if (method === 'POST' && data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API mengembalikan HTTP ${response.status}`);
        }
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

document.addEventListener("DOMContentLoaded", function () {
    showAppSplash();

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        currentUser.role = String(currentUser.role || "SISWA").toUpperCase();
        document.getElementById("loginForm").style.display = "none";
        document.getElementById("userPanel").style.display = "block";
        configureDashboardForRole(currentUser.role);
        renderDashboardUserInfo(currentUser, currentUser.role === "SISWA" && !currentUser.kelas ? "Memuat kelas..." : "");
        document.querySelector(".main-container").classList.add("dashboard-mode");

        showDashboardHome();
        if (currentUser.role === "SISWA" && !currentUser.kelas) loadDashboardUserClass();
    } else {
        document.getElementById("loginForm").style.display = "grid";
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

    document.addEventListener("keydown", event => {
        const detailModal = document.getElementById("detail-modal");
        const qrModal = document.getElementById("student-qr-modal");
        if (event.key === "Escape") {
            if (qrModal.style.display === "flex") closeModal("student-qr-modal");
            else if (detailModal.style.display === "flex") closeModal("detail-modal");
        }
    });

    ["absenContent", "profileContent"].forEach(panelId => {
        const panel = document.getElementById(panelId);
        let swipeStart = null;

        panel.addEventListener("touchstart", event => {
            if (event.touches.length !== 1 || !(event.target instanceof Element)) {
                swipeStart = null;
                return;
            }
            if (event.target.closest("button, a, input, select, textarea, [role='button'], [contenteditable='true'], .modal")) {
                swipeStart = null;
                return;
            }
            swipeStart = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }, { passive: true });

        panel.addEventListener("touchend", event => {
            if (window.innerWidth > 640 || !swipeStart || event.changedTouches.length !== 1) {
                swipeStart = null;
                return;
            }
            const deltaX = event.changedTouches[0].clientX - swipeStart.x;
            const deltaY = event.changedTouches[0].clientY - swipeStart.y;
            swipeStart = null;
            if (deltaX >= 100 && Math.abs(deltaY) < 70) {
                showDashboardHome();
            }
        }, { passive: true });
    });

    // Jam digital realtime
    setInterval(updateClock, 1000);
    updateClock();
});

function updateClock() {
    const clock = document.getElementById('digital-clock');
    if (!clock) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    clock.innerText = `${hours}:${minutes}:${seconds}`;
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

async function loadFilterOptions() {
    if (filterOptionsPromise) return filterOptionsPromise;

    filterOptionsPromise = (async () => {
        const res = await apiCall('getFilterData');
        if (res && res.status === "error") {
            throw new Error(res.message || "API gagal memuat data filter.");
        }
        if (!res || !Array.isArray(res.bulan) || !res.bulan.length ||
            !Array.isArray(res.tahun) || !res.tahun.length) {
            throw new Error("Format data filter dari API tidak valid.");
        }

        const months = res.bulan.filter(item =>
            item && Number.isInteger(Number(item.id)) && item.nama
        );
        const years = res.tahun.map(Number).filter(Number.isInteger);
        if (!months.length || !years.length) {
            throw new Error("Pilihan bulan atau tahun dari API kosong.");
        }

        const monthSelect = document.getElementById("bulanFilter");
        const yearSelect = document.getElementById("tahunFilter");
        const currentMonth = String(new Date().getMonth() + 1);
        const currentYear = String(new Date().getFullYear());

        populateSelect(monthSelect, months, "id", "nama");
        populateSelect(yearSelect, years, null, null);
        monthSelect.value = [...monthSelect.options].some(option => option.value === currentMonth)
            ? currentMonth
            : monthSelect.options[0].value;
        yearSelect.value = [...yearSelect.options].some(option => option.value === currentYear)
            ? currentYear
            : yearSelect.options[0].value;
    })();

    try {
        await filterOptionsPromise;
    } finally {
        filterOptionsPromise = null;
    }
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginBtn = document.getElementById("loginBtn");

    if (!username || !password) {
        showNotification("Masukkan username dan password.", "error");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.setAttribute("aria-busy", "true");
    loginBtn.innerHTML = '<span class="spinner-small"></span><span>Memproses...</span>';
    showLoading("Mencoba login, mohon tunggu...");

    try {
        const res = await apiCall('login', 'POST', { username, password });
        hideLoading();
        loginBtn.disabled = false;
        loginBtn.removeAttribute("aria-busy");
        loginBtn.innerHTML = '<span>Masuk</span><i class="fas fa-arrow-right" aria-hidden="true"></i>';

        if (res.status === "success") {
            res.role = String(res.role || "SISWA").toUpperCase();
            if (!["SISWA", "ADMIN", "GURU", "SUPERADMIN"].includes(res.role)) {
                throw new Error("Role akun tidak valid.");
            }
            localStorage.setItem('currentUser', JSON.stringify(res));
            showNotification("Login Berhasil!", "success");
            currentUser = res;
            document.getElementById("loginForm").style.display = "none";
            document.getElementById("userPanel").style.display = "block";
            configureDashboardForRole(res.role);
            renderDashboardUserInfo(res, res.role === "SISWA" && !res.kelas ? "Memuat kelas..." : "");
            document.querySelector(".main-container").classList.add("dashboard-mode");
            setTimeout(() => {
                document.getElementById("userPanel").classList.add("fade-in");
            }, 10);

            if (res.role === "SISWA" && (!res.email || res.email.trim() === "")) {
                document.getElementById("email-notification-modal").style.display = "block";
            }
            showDashboardHome();
            if (currentUser.role === "SISWA" && !currentUser.kelas) loadDashboardUserClass();
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        loginBtn.disabled = false;
        loginBtn.removeAttribute("aria-busy");
        loginBtn.innerHTML = '<span>Masuk</span><i class="fas fa-arrow-right" aria-hidden="true"></i>';
        showNotification("Terjadi kesalahan: " + err.message, "error");
    }
}

function showLogoutConfirmation() {
    document.getElementById("logout-confirmation-modal").style.display = "block";
}

async function performLogout() {
    const sessionToken = currentUser && currentUser.sessionToken;
    currentUser = null;
    dashboardStatsRequested = false;
    currentAbsenData = [];
    document.getElementById("header-qr-button").hidden = true;
    document.querySelector(".main-container").classList.remove("dashboard-mode");
    localStorage.removeItem('currentUser');
    closeModal('logout-confirmation-modal');
    document.getElementById("userPanel").style.display = "none";
    document.getElementById("loginForm").style.display = "grid";
    document.getElementById("loginForm").classList.add("fade-in");
    document.getElementById("userPanel").classList.remove("fade-in");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    if (sessionToken) {
        try {
            await apiCall("revokeStaffSession", "POST", { sessionToken });
        } catch (error) {
            console.error("Gagal mengakhiri sesi staf di server:", error);
            showNotification("Logout berhasil. Sesi server akan berakhir otomatis.", "error");
            return;
        }
    }
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
    document.getElementById("loginForm").style.display = "grid";
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

function showDashboardHome() {
    const directoryPanel = document.getElementById("staff-directory-panel");
    if (!directoryPanel.hidden) {
        directoryPanel.hidden = true;
        document.getElementById("staff-directory-content").replaceChildren();
        document.getElementById("staff-directory-status").textContent = "";
    }
    const monitoringPanel = document.getElementById("staff-monitoring-panel");
    if (!monitoringPanel.hidden) {
        monitoringPanel.hidden = true;
        document.getElementById("staff-monitoring-class-controls").hidden = true;
        document.getElementById("staff-monitoring-student-view").hidden = true;
        document.getElementById("staff-monitoring-class-list").replaceChildren();
        document.getElementById("staff-monitoring-students").replaceChildren();
        document.getElementById("staff-monitoring-status").textContent = "";
    }
    const eventPanel = document.getElementById("staff-event-panel");
    if (!eventPanel.hidden) {
        eventPanel.hidden = true;
        document.getElementById("staff-event-list").replaceChildren();
        document.getElementById("staff-event-status").textContent = "";
        cancelEventEdit();
    }
    const holidayPanel = document.getElementById("staff-holiday-panel");
    if (!holidayPanel.hidden) {
        holidayPanel.hidden = true;
        document.getElementById("staff-holiday-list").replaceChildren();
        document.getElementById("staff-holiday-status").textContent = "";
        cancelHolidayEdit();
    }
    const earlyDismissalPanel = document.getElementById("staff-early-dismissal-panel");
    if (!earlyDismissalPanel.hidden) {
        earlyDismissalPanel.hidden = true;
        document.getElementById("staff-early-dismissal-list").replaceChildren();
        document.getElementById("staff-early-dismissal-status").textContent = "";
        cancelEarlyDismissalEdit();
        document.getElementById("staff-early-dismissal-status").classList.remove("is-error");
    }
    const isStudent = !currentUser || currentUser.role === "SISWA";
    document.getElementById("staff-menu-grid").hidden = isStudent;
    document.getElementById("staff-dashboard-note").hidden = isStudent;
    setDashboardMenuView(false);
    setActiveDashboardPanel("home");
    document.getElementById("dashboardBackButton").style.display = "none";
    document.getElementById("dashboardHome").style.display = "block";
    document.getElementById("absenContent").style.display = "none";
    document.getElementById("profileContent").style.display = "none";
    document.getElementById("ktdsContent").style.display = "none";
    document.getElementById("dashboardHome").classList.add("fade-in");
    updateDashboardGreeting();
    document.getElementById("dashboard-home-title").focus({ preventScroll: true });
    if (currentUser && currentUser.role === "SISWA" && !dashboardStatsRequested) {
        dashboardStatsRequested = true;
        filterData();
    }
}

function configureDashboardForRole(role) {
    const isStudent = role === "SISWA";
    const isAdmin = role === "ADMIN" || role === "SUPERADMIN";
    document.getElementById("dashboard-account-label").textContent = isStudent
        ? "Dashboard siswa"
        : role === "SUPERADMIN" ? "Dashboard superadmin" : isAdmin ? "Dashboard admin" : "Dashboard guru";
    document.getElementById("dashboard-home-description").textContent = isStudent
        ? "Pilih menu untuk mulai menjelajahi layanan siswa."
        : isAdmin
            ? "Kelola data guru atau pantau layanan sekolah."
            : "Pantau layanan sekolah melalui menu guru.";
    document.getElementById("header-qr-button").hidden = !isStudent;
    document.getElementById("student-dashboard-statistics").hidden = !isStudent;
    document.getElementById("student-menu-grid").hidden = !isStudent;
    document.getElementById("staff-menu-grid").hidden = isStudent;
    document.getElementById("staff-dashboard-note").hidden = isStudent;
    document.getElementById("staff-dashboard-note").textContent = role === "SUPERADMIN"
        ? "Superadmin dapat mengelola akun guru/admin, event, hari libur, dan pulang cepat. Role superadmin dilindungi."
        : isAdmin
            ? "Admin dapat mengelola data guru, event, hari libur, dan memantau layanan sekolah."
        : "Guru dapat memantau daftar siswa berdasarkan kelas.";
    document.getElementById("staff-manage-menu").hidden = !isAdmin;
    document.getElementById("staff-event-menu").hidden = !isAdmin;
    document.getElementById("staff-holiday-menu").hidden = !isAdmin;
    document.getElementById("staff-early-dismissal-menu").hidden = role !== "SUPERADMIN";
}

function updateDashboardGreeting() {
    const hour = new Date().getHours();
    let greeting;
    let timePeriod;

    if (hour >= 5 && hour < 11) {
        greeting = "Selamat Pagi";
        timePeriod = "morning";
    } else if (hour >= 11 && hour < 15) {
        greeting = "Selamat Siang";
        timePeriod = "afternoon";
    } else if (hour >= 15 && hour < 19) {
        greeting = "Selamat Sore";
        timePeriod = "evening";
    } else {
        greeting = "Selamat Malam";
        timePeriod = "night";
    }

    document.getElementById("dashboard-home-title").textContent = greeting;
    document.querySelector(".dashboard-home-heading").dataset.timePeriod = timePeriod;
}

function renderDashboardUserInfo(user, classPlaceholder = "Kelas tidak tersedia") {
    document.getElementById("userInfo").textContent = `Halo, ${user.nama || "siswa"}`;
    const classElement = document.getElementById("userClass");
    const role = String(user.role || "SISWA").toUpperCase();
    const className = role === "SISWA" ? String(user.kelas || "").trim() : role;
    classElement.textContent = className || classPlaceholder;
    classElement.hidden = false;
}

function showStaffFeature(feature) {
    const role = currentUser && String(currentUser.role || "").toUpperCase();
    if (!["ADMIN", "GURU", "SUPERADMIN"].includes(role)) {
        showNotification("Menu ini hanya tersedia untuk akun admin atau guru.", "error");
        return;
    }
    if (!["monitoring", "manage", "events", "holidays", "earlyDismissals"].includes(feature)) {
        showNotification("Menu staf tidak dikenal.", "error");
        return;
    }
    if (feature === "manage" && !["ADMIN", "SUPERADMIN"].includes(role)) {
        showNotification("Hanya admin atau superadmin yang dapat mengelola data guru.", "error");
        return;
    }
    if (feature === "events" && !["ADMIN", "SUPERADMIN"].includes(role)) {
        showNotification("Menu event hanya tersedia untuk admin atau superadmin.", "error");
        return;
    }
    if (feature === "holidays" && !["ADMIN", "SUPERADMIN"].includes(role)) {
        showNotification("Menu hari libur hanya tersedia untuk admin atau superadmin.", "error");
        return;
    }
    if (feature === "earlyDismissals" && role !== "SUPERADMIN") {
        showNotification("Menu pulang cepat hanya tersedia untuk superadmin.", "error");
        return;
    }

    if (feature === "manage") {
        showGuruManagement();
        return;
    }
    if (feature === "events") {
        showEventManagement();
        return;
    }
    if (feature === "holidays") {
        showHolidayManagement();
        return;
    }
    if (feature === "earlyDismissals") {
        showEarlyDismissalManagement();
        return;
    }
    showStaffMonitoring();
}

async function refreshStaffFeature(feature, button) {
    if (!currentUser || !["GURU", "ADMIN", "SUPERADMIN"].includes(String(currentUser.role || "").toUpperCase())) {
        showNotification("Sesi staf tidak valid. Silakan masuk kembali.", "error");
        return;
    }

    const icon = button.querySelector("i");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    if (icon) icon.classList.add("fa-spin");
    try {
        if (feature === "monitoring") {
            const studentView = document.getElementById("staff-monitoring-student-view");
            if (!studentView.hidden && selectedMonitoringClass) {
                await loadMonitoringStudents(selectedMonitoringClass);
            } else {
                await loadMonitoringClasses();
            }
        } else if (feature === "manage") {
            await loadGuruDirectory();
        } else if (feature === "events") {
            await loadEvents();
        } else if (feature === "holidays") {
            await loadHolidays();
        } else if (feature === "earlyDismissals") {
            await loadEarlyDismissals();
        } else {
            throw new Error("Menu staf tidak dikenal.");
        }
    } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (icon) icon.classList.remove("fa-spin");
    }
}

function showEventManagement() {
    setDashboardMenuView(true);
    document.getElementById("staff-dashboard-note").hidden = true;
    document.getElementById("staff-menu-grid").hidden = true;
    document.getElementById("staff-directory-panel").hidden = true;
    document.getElementById("staff-monitoring-panel").hidden = true;
    document.getElementById("staff-holiday-panel").hidden = true;
    document.getElementById("staff-early-dismissal-panel").hidden = true;
    document.getElementById("staff-event-panel").hidden = false;
    cancelEventEdit();
    loadEvents();
}

async function loadEvents() {
    const status = document.getElementById("staff-event-status");
    const list = document.getElementById("staff-event-list");
    status.textContent = "Memuat daftar event...";
    status.classList.remove("is-error");
    list.replaceChildren();

    try {
        const result = await apiCall("getEventDates", "POST", {
            sessionToken: currentUser && currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !Array.isArray(result.events)) {
            throw new Error(result && result.message ? result.message : "Format daftar event tidak valid.");
        }
        renderEvents(result.events);
        status.textContent = result.events.length
            ? `${result.events.length} event terdaftar.`
            : "Belum ada event pada sheet EVENT.";
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    }
}

function renderEvents(events) {
    const list = document.getElementById("staff-event-list");
    list.replaceChildren();
    events.forEach(eventItem => {
        const item = document.createElement("li");
        const details = document.createElement("div");
        details.className = "staff-event-details";
        const name = document.createElement("strong");
        name.textContent = eventItem.name;
        const date = document.createElement("time");
        date.dateTime = eventItem.date;
        const [year, month, day] = eventItem.date.split("-").map(Number);
        date.textContent = new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(year, month - 1, day));
        details.append(name, date);
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "staff-event-edit";
        editButton.setAttribute("aria-label", `Edit event ${eventItem.name}`);
        editButton.title = "Edit event";
        const icon = document.createElement("i");
        icon.className = "fas fa-pencil";
        icon.setAttribute("aria-hidden", "true");
        editButton.appendChild(icon);
        editButton.addEventListener("click", () => editEvent(eventItem));
        const actions = document.createElement("div");
        actions.className = "staff-event-actions";
        actions.appendChild(editButton);
        if (currentUser && String(currentUser.role || "").toUpperCase() === "SUPERADMIN") {
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "staff-event-delete";
            deleteButton.setAttribute("aria-label", `Hapus event ${eventItem.name}`);
            const deleteIcon = document.createElement("i");
            deleteIcon.className = "fas fa-trash";
            deleteIcon.setAttribute("aria-hidden", "true");
            deleteButton.title = "Hapus event";
            deleteButton.appendChild(deleteIcon);
            deleteButton.addEventListener("click", () => deleteEventItem(eventItem, deleteButton));
            actions.appendChild(deleteButton);
        }
        item.append(details, actions);
        list.appendChild(item);
    });
}

function showEventForm() {
    const form = document.getElementById("staff-event-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = false;
    document.getElementById("staff-event-add").hidden = true;
    document.getElementById("staff-event-form-title").textContent = "Tambah Event";
    document.querySelector("#staff-event-save span").textContent = "Tambah Event";
    document.getElementById("staff-event-cancel").hidden = false;
    document.getElementById("staff-event-date").focus();
}

async function deleteEventItem(eventItem, button) {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Hanya superadmin yang dapat menghapus event.", "error");
        return;
    }
    if (!window.confirm(`Hapus event "${eventItem.name}" pada ${eventItem.date}?`)) return;

    const status = document.getElementById("staff-event-status");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = "Menghapus event...";
    status.classList.remove("is-error");
    try {
        const result = await apiCall("deleteEvent", "POST", {
            sessionToken: currentUser.sessionToken,
            date: eventItem.date,
            name: eventItem.name
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Event gagal dihapus.");
        }
        await loadEvents();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
        button.disabled = false;
        button.removeAttribute("aria-busy");
    }
}

function editEvent(eventItem) {
    const form = document.getElementById("staff-event-form");
    form.hidden = false;
    document.getElementById("staff-event-add").hidden = true;
    document.getElementById("staff-event-date").value = eventItem.date;
    document.getElementById("staff-event-name").value = eventItem.name;
    document.getElementById("staff-event-form-title").textContent = "Edit Event";
    document.querySelector("#staff-event-save span").textContent = "Simpan Perubahan";
    document.getElementById("staff-event-cancel").hidden = false;
    form.dataset.originalDate = eventItem.date;
    form.dataset.originalName = eventItem.name;
    document.getElementById("staff-event-date").focus();
}

function cancelEventEdit() {
    const form = document.getElementById("staff-event-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = true;
    document.getElementById("staff-event-add").hidden = false;
    document.getElementById("staff-event-form-title").textContent = "Tambah Event";
    document.querySelector("#staff-event-save span").textContent = "Tambah Event";
    document.getElementById("staff-event-cancel").hidden = true;
}

async function saveEventForm() {
    const form = document.getElementById("staff-event-form");
    const saveButton = document.getElementById("staff-event-save");
    const status = document.getElementById("staff-event-status");
    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
    status.textContent = "Menyimpan event...";
    status.classList.remove("is-error");

    try {
        const result = await apiCall("saveEvent", "POST", {
            sessionToken: currentUser && currentUser.sessionToken,
            date: document.getElementById("staff-event-date").value,
            name: document.getElementById("staff-event-name").value,
            originalDate: form.dataset.originalDate || "",
            originalName: form.dataset.originalName || ""
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Event gagal disimpan.");
        }
        cancelEventEdit();
        await loadEvents();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    } finally {
        saveButton.disabled = false;
        saveButton.removeAttribute("aria-busy");
    }
}

function showHolidayManagement() {
    setDashboardMenuView(true);
    document.getElementById("staff-dashboard-note").hidden = true;
    document.getElementById("staff-menu-grid").hidden = true;
    document.getElementById("staff-directory-panel").hidden = true;
    document.getElementById("staff-monitoring-panel").hidden = true;
    document.getElementById("staff-event-panel").hidden = true;
    document.getElementById("staff-early-dismissal-panel").hidden = true;
    document.getElementById("staff-holiday-panel").hidden = false;
    cancelHolidayEdit();
    loadHolidays();
}

async function loadHolidays() {
    const status = document.getElementById("staff-holiday-status");
    const list = document.getElementById("staff-holiday-list");
    status.textContent = "Memuat daftar hari libur...";
    status.classList.remove("is-error");
    list.replaceChildren();

    try {
        const result = await apiCall("getHolidayActivities", "POST", {
            sessionToken: currentUser && currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !Array.isArray(result.holidays)) {
            throw new Error(result && result.message ? result.message : "Format daftar hari libur tidak valid.");
        }
        renderHolidays(result.holidays);
        status.textContent = result.holidays.length
            ? `${result.holidays.length} hari libur terdaftar.`
            : "Belum ada hari libur pada sheet HARILIBUR.";
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    }
}

function renderHolidays(holidays) {
    const list = document.getElementById("staff-holiday-list");
    list.replaceChildren();
    holidays.forEach(holiday => {
        const item = document.createElement("li");
        const details = document.createElement("div");
        details.className = "staff-event-details";
        const displayName = String(holiday.name || "").trim() || "-";
        const name = document.createElement("strong");
        name.textContent = displayName;
        const date = document.createElement("time");
        date.dateTime = holiday.date;
        const [year, month, day] = holiday.date.split("-").map(Number);
        date.textContent = new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(year, month - 1, day));
        details.append(name, date);

        const actions = document.createElement("div");
        actions.className = "staff-event-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "staff-event-edit";
        editButton.setAttribute("aria-label", `Edit hari libur ${displayName}`);
        editButton.title = "Edit hari libur";
        const editIcon = document.createElement("i");
        editIcon.className = "fas fa-pencil";
        editIcon.setAttribute("aria-hidden", "true");
        editButton.appendChild(editIcon);
        editButton.addEventListener("click", () => editHoliday(holiday));
        actions.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "staff-event-delete";
        deleteButton.setAttribute("aria-label", `Hapus hari libur ${displayName}`);
        deleteButton.title = "Hapus hari libur";
        const deleteIcon = document.createElement("i");
        deleteIcon.className = "fas fa-trash";
        deleteIcon.setAttribute("aria-hidden", "true");
        deleteButton.appendChild(deleteIcon);
        deleteButton.addEventListener("click", () => deleteHolidayItem(holiday, deleteButton));
        actions.appendChild(deleteButton);

        item.append(details, actions);
        list.appendChild(item);
    });
}

function showHolidayForm() {
    const form = document.getElementById("staff-holiday-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = false;
    document.getElementById("staff-holiday-add").hidden = true;
    document.getElementById("staff-holiday-form-title").textContent = "Tambah Hari Libur";
    document.querySelector("#staff-holiday-save span").textContent = "Tambah Hari Libur";
    document.getElementById("staff-holiday-cancel").hidden = false;
    document.getElementById("staff-holiday-date").focus();
}

function editHoliday(holiday) {
    const form = document.getElementById("staff-holiday-form");
    form.hidden = false;
    document.getElementById("staff-holiday-add").hidden = true;
    document.getElementById("staff-holiday-date").value = holiday.date;
    document.getElementById("staff-holiday-name").value = holiday.name;
    document.getElementById("staff-holiday-form-title").textContent = "Edit Hari Libur";
    document.querySelector("#staff-holiday-save span").textContent = "Simpan Perubahan";
    document.getElementById("staff-holiday-cancel").hidden = false;
    form.dataset.originalDate = holiday.date;
    form.dataset.originalName = holiday.name;
    document.getElementById("staff-holiday-date").focus();
}

function cancelHolidayEdit() {
    const form = document.getElementById("staff-holiday-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = true;
    document.getElementById("staff-holiday-add").hidden = false;
    document.getElementById("staff-holiday-form-title").textContent = "Tambah Hari Libur";
    document.querySelector("#staff-holiday-save span").textContent = "Tambah Hari Libur";
    document.getElementById("staff-holiday-cancel").hidden = true;
}

async function saveHolidayForm() {
    const form = document.getElementById("staff-holiday-form");
    const saveButton = document.getElementById("staff-holiday-save");
    const status = document.getElementById("staff-holiday-status");
    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
    status.textContent = "Menyimpan hari libur...";
    status.classList.remove("is-error");

    try {
        const result = await apiCall("saveHoliday", "POST", {
            sessionToken: currentUser && currentUser.sessionToken,
            date: document.getElementById("staff-holiday-date").value,
            name: document.getElementById("staff-holiday-name").value,
            originalDate: form.dataset.originalDate || "",
            originalName: form.dataset.originalName || ""
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Hari libur gagal disimpan.");
        }
        cancelHolidayEdit();
        await loadHolidays();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    } finally {
        saveButton.disabled = false;
        saveButton.removeAttribute("aria-busy");
    }
}

async function deleteHolidayItem(holiday, button) {
    if (!currentUser || !["ADMIN", "SUPERADMIN"].includes(String(currentUser.role || "").toUpperCase())) {
        showNotification("Hanya admin atau superadmin yang dapat menghapus hari libur.", "error");
        return;
    }
    const displayName = String(holiday.name || "").trim() || "-";
    if (!window.confirm(`Hapus hari libur "${displayName}" pada ${holiday.date}?`)) return;

    const status = document.getElementById("staff-holiday-status");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = "Menghapus hari libur...";
    status.classList.remove("is-error");
    try {
        const result = await apiCall("deleteHoliday", "POST", {
            sessionToken: currentUser.sessionToken,
            date: holiday.date,
            name: holiday.name
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Hari libur gagal dihapus.");
        }
        await loadHolidays();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
        button.disabled = false;
        button.removeAttribute("aria-busy");
    }
}

function showEarlyDismissalManagement() {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Menu pulang cepat hanya tersedia untuk superadmin.", "error");
        return;
    }
    setDashboardMenuView(true);
    document.getElementById("staff-dashboard-note").hidden = true;
    document.getElementById("staff-menu-grid").hidden = true;
    document.getElementById("staff-directory-panel").hidden = true;
    document.getElementById("staff-directory-content").replaceChildren();
    document.getElementById("staff-monitoring-panel").hidden = true;
    document.getElementById("staff-event-panel").hidden = true;
    document.getElementById("staff-holiday-panel").hidden = true;
    document.getElementById("staff-early-dismissal-panel").hidden = false;
    cancelEarlyDismissalEdit();
    loadEarlyDismissals();
}

async function loadEarlyDismissals() {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Hanya superadmin yang dapat mengatur tanggal pulang cepat.", "error");
        return;
    }
    const status = document.getElementById("staff-early-dismissal-status");
    const list = document.getElementById("staff-early-dismissal-list");
    status.textContent = "Memuat daftar pulang cepat...";
    status.classList.remove("is-error");
    list.replaceChildren();

    try {
        const result = await apiCall("getEarlyDismissals", "POST", {
            sessionToken: currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !Array.isArray(result.earlyDismissals)) {
            throw new Error(result && result.message ? result.message : "Format daftar pulang cepat tidak valid.");
        }
        renderEarlyDismissals(result.earlyDismissals);
        status.textContent = result.earlyDismissals.length
            ? `${result.earlyDismissals.length} tanggal pulang cepat terdaftar.`
            : "Belum ada tanggal pada sheet PULANGCEPAT.";
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    }
}

function renderEarlyDismissals(activities) {
    const list = document.getElementById("staff-early-dismissal-list");
    list.replaceChildren();
    activities.forEach(activity => {
        const item = document.createElement("li");
        const details = document.createElement("div");
        details.className = "staff-event-details";
        const displayName = String(activity.name || "").trim() || "-";
        const name = document.createElement("strong");
        name.textContent = displayName;
        const date = document.createElement("time");
        date.dateTime = activity.date;
        const [year, month, day] = activity.date.split("-").map(Number);
        date.textContent = new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(year, month - 1, day));
        details.append(name, date);

        const actions = document.createElement("div");
        actions.className = "staff-event-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "staff-event-edit";
        editButton.setAttribute("aria-label", `Edit tanggal pulang cepat ${displayName}`);
        editButton.title = "Edit tanggal pulang cepat";
        const editIcon = document.createElement("i");
        editIcon.className = "fas fa-pencil";
        editIcon.setAttribute("aria-hidden", "true");
        editButton.appendChild(editIcon);
        editButton.addEventListener("click", () => editEarlyDismissal(activity));
        actions.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "staff-event-delete";
        deleteButton.setAttribute("aria-label", `Hapus tanggal pulang cepat ${displayName}`);
        deleteButton.title = "Hapus tanggal pulang cepat";
        const deleteIcon = document.createElement("i");
        deleteIcon.className = "fas fa-trash";
        deleteIcon.setAttribute("aria-hidden", "true");
        deleteButton.appendChild(deleteIcon);
        deleteButton.addEventListener("click", () => deleteEarlyDismissal(activity, deleteButton));
        actions.appendChild(deleteButton);

        item.append(details, actions);
        list.appendChild(item);
    });
}

function showEarlyDismissalForm() {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Hanya superadmin yang dapat mengatur tanggal pulang cepat.", "error");
        return;
    }
    const form = document.getElementById("staff-early-dismissal-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = false;
    document.getElementById("staff-early-dismissal-add").hidden = true;
    document.getElementById("staff-early-dismissal-form-title").textContent = "Tambah Pulang Cepat";
    document.querySelector("#staff-early-dismissal-save span").textContent = "Tambah Pulang Cepat";
    document.getElementById("staff-early-dismissal-cancel").hidden = false;
    document.getElementById("staff-early-dismissal-date").focus();
}

function editEarlyDismissal(activity) {
    const form = document.getElementById("staff-early-dismissal-form");
    form.hidden = false;
    document.getElementById("staff-early-dismissal-add").hidden = true;
    document.getElementById("staff-early-dismissal-date").value = activity.date;
    document.getElementById("staff-early-dismissal-name").value = activity.name || "";
    document.getElementById("staff-early-dismissal-form-title").textContent = "Edit Pulang Cepat";
    document.querySelector("#staff-early-dismissal-save span").textContent = "Simpan Perubahan";
    document.getElementById("staff-early-dismissal-cancel").hidden = false;
    form.dataset.originalDate = activity.date;
    form.dataset.originalName = activity.name || "";
    document.getElementById("staff-early-dismissal-date").focus();
}

function cancelEarlyDismissalEdit() {
    const form = document.getElementById("staff-early-dismissal-form");
    form.reset();
    delete form.dataset.originalDate;
    delete form.dataset.originalName;
    form.hidden = true;
    document.getElementById("staff-early-dismissal-add").hidden = false;
    document.getElementById("staff-early-dismissal-form-title").textContent = "Tambah Pulang Cepat";
    document.querySelector("#staff-early-dismissal-save span").textContent = "Tambah Pulang Cepat";
    document.getElementById("staff-early-dismissal-cancel").hidden = true;
}

async function saveEarlyDismissalForm() {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Hanya superadmin yang dapat mengatur tanggal pulang cepat.", "error");
        return;
    }
    const form = document.getElementById("staff-early-dismissal-form");
    const saveButton = document.getElementById("staff-early-dismissal-save");
    const status = document.getElementById("staff-early-dismissal-status");
    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
    status.textContent = "Menyimpan tanggal pulang cepat...";
    status.classList.remove("is-error");

    try {
        const result = await apiCall("saveEarlyDismissal", "POST", {
            sessionToken: currentUser.sessionToken,
            date: document.getElementById("staff-early-dismissal-date").value,
            name: document.getElementById("staff-early-dismissal-name").value,
            originalDate: form.dataset.originalDate || "",
            originalName: form.dataset.originalName || ""
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Tanggal pulang cepat gagal disimpan.");
        }
        cancelEarlyDismissalEdit();
        await loadEarlyDismissals();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    } finally {
        saveButton.disabled = false;
        saveButton.removeAttribute("aria-busy");
    }
}

async function deleteEarlyDismissal(activity, button) {
    if (!currentUser || String(currentUser.role || "").toUpperCase() !== "SUPERADMIN") {
        showNotification("Hanya superadmin yang dapat menghapus tanggal pulang cepat.", "error");
        return;
    }
    const displayName = String(activity.name || "").trim() || "-";
    if (!window.confirm(`Hapus tanggal pulang cepat "${displayName}" pada ${activity.date}?`)) return;

    const status = document.getElementById("staff-early-dismissal-status");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    status.textContent = "Menghapus tanggal pulang cepat...";
    status.classList.remove("is-error");
    try {
        const result = await apiCall("deleteEarlyDismissal", "POST", {
            sessionToken: currentUser.sessionToken,
            date: activity.date,
            name: activity.name || ""
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Tanggal pulang cepat gagal dihapus.");
        }
        await loadEarlyDismissals();
        showNotification(result.message, "success");
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
        button.disabled = false;
        button.removeAttribute("aria-busy");
    }
}

function showStaffMonitoring() {
    selectedMonitoringClass = null;
    setDashboardMenuView(true);
    document.getElementById("staff-dashboard-note").hidden = true;
    document.getElementById("staff-menu-grid").hidden = true;
    document.getElementById("staff-directory-panel").hidden = true;
    document.getElementById("staff-event-panel").hidden = true;
    document.getElementById("staff-holiday-panel").hidden = true;
    document.getElementById("staff-early-dismissal-panel").hidden = true;
    document.getElementById("staff-monitoring-panel").hidden = false;
    loadMonitoringClasses();
}

async function loadMonitoringClasses() {
    const role = currentUser && String(currentUser.role || "").toUpperCase();
    if (!["GURU", "ADMIN", "SUPERADMIN"].includes(role)) {
        showNotification("Hanya akun staf yang dapat memantau data siswa.", "error");
        return;
    }
    const status = document.getElementById("staff-monitoring-status");
    const classList = document.getElementById("staff-monitoring-class-list");
    const classControls = document.getElementById("staff-monitoring-class-controls");
    const studentView = document.getElementById("staff-monitoring-student-view");
    if (!currentUser.sessionToken) {
        status.textContent = "Sesi login belum mendukung fitur ini. Silakan keluar dan masuk kembali.";
        status.classList.add("is-error");
        return;
    }
    classControls.hidden = true;
    studentView.hidden = true;
    classList.replaceChildren();
    document.getElementById("staff-monitoring-students").replaceChildren();
    status.textContent = "Memuat daftar kelas...";
    status.classList.remove("is-error");

    try {
        const result = await apiCall("getMonitoringClasses", "POST", {
            sessionToken: currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !Array.isArray(result.classes)) {
            throw new Error(result && result.message ? result.message : "Format daftar kelas tidak valid.");
        }
        if (result.classes.length === 0) {
            status.textContent = "Belum ada data kelas pada sheet SISWA.";
            return;
        }
        result.classes.forEach(className => {
            const item = document.createElement("li");
            const button = document.createElement("button");
            button.type = "button";
            button.className = "staff-monitoring-class-button";
            button.textContent = className;
            button.setAttribute("aria-pressed", "false");
            button.addEventListener("click", () => {
                selectedMonitoringClass = className;
                classControls.hidden = true;
                studentView.hidden = false;
                document.getElementById("staff-monitoring-student-title").textContent = `Siswa Kelas ${className}`;
                loadMonitoringStudents(className);
            });
            item.appendChild(button);
            classList.appendChild(item);
        });
        classControls.hidden = false;
        status.textContent = `${result.classes.length} kelas tersedia. Pilih kelas untuk melihat siswanya.`;
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    }
}

function showMonitoringClasses() {
    selectedMonitoringClass = null;
    document.getElementById("staff-monitoring-student-view").hidden = true;
    document.getElementById("staff-monitoring-class-controls").hidden = false;
    document.getElementById("staff-monitoring-students").replaceChildren();
    const status = document.getElementById("staff-monitoring-status");
    status.textContent = "Pilih kelas untuk melihat daftar siswanya.";
    status.classList.remove("is-error");
    const firstClassButton = document.getElementById("staff-monitoring-class-list").querySelector("button");
    if (firstClassButton) firstClassButton.focus();
}

async function loadMonitoringStudents(className) {
    if (!currentUser || !currentUser.sessionToken) {
        showNotification("Sesi login tidak valid. Silakan masuk kembali.", "error");
        showStaffMonitoring();
        return;
    }
    const status = document.getElementById("staff-monitoring-status");
    const container = document.getElementById("staff-monitoring-students");
    status.textContent = `Memuat data siswa kelas ${className}...`;
    status.classList.remove("is-error");
    container.replaceChildren();

    try {
        const result = await apiCall("getMonitoringStudents", "POST", {
            sessionToken: currentUser.sessionToken,
            kelas: className
        });
        if (!result || result.status !== "success" || !Array.isArray(result.students)) {
            throw new Error(result && result.message ? result.message : "Format daftar siswa tidak valid.");
        }
        renderMonitoringStudents(result.students);
        status.textContent = result.students.length
            ? `${result.students.length} siswa di kelas ${result.kelas || className}.`
            : `Belum ada siswa pada kelas ${result.kelas || className}.`;
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    }
}

function renderMonitoringStudents(students) {
    const container = document.getElementById("staff-monitoring-students");
    container.replaceChildren();
    if (!students.length) return;

    const table = document.createElement("table");
    table.className = "staff-directory-table staff-monitoring-table";
    const head = table.createTHead().insertRow();
    ["Nama Siswa", "Jam Masuk", "Jam Pulang", "Keterangan"].forEach(label => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        head.appendChild(cell);
    });
    const body = table.createTBody();
    students.forEach(student => {
        const row = body.insertRow();
        const identity = row.insertCell();
        identity.className = "staff-monitoring-identity";
        const name = document.createElement("strong");
        name.textContent = student.nama || "-";
        const nis = document.createElement("span");
        nis.textContent = student.nis || "-";
        identity.append(name, nis);

        ["jamMasuk", "jamPulang"].forEach(field => {
            const cell = row.insertCell();
            cell.className = "staff-monitoring-time";
            cell.textContent = student[field] || "-";
        });

        const statusCell = row.insertCell();
        const status = document.createElement("span");
        status.className = "staff-monitoring-attendance-status";
        status.textContent = getStatusDescription(student.keterangan);
        statusCell.appendChild(status);
    });
    container.appendChild(table);
}

function showGuruManagement() {
    setDashboardMenuView(true);
    document.getElementById("staff-dashboard-note").hidden = true;
    document.getElementById("staff-menu-grid").hidden = true;
    document.getElementById("staff-directory-panel").hidden = false;
    document.getElementById("staff-event-panel").hidden = true;
    document.getElementById("staff-holiday-panel").hidden = true;
    document.getElementById("staff-early-dismissal-panel").hidden = true;
    document.getElementById("staff-monitoring-panel").hidden = true;
    loadGuruDirectory();
}

async function loadGuruDirectory() {
    const role = currentUser && String(currentUser.role || "").toUpperCase();
    if (!["ADMIN", "SUPERADMIN"].includes(role)) {
        showNotification("Hanya admin atau superadmin yang dapat melihat data guru.", "error");
        return;
    }
    const status = document.getElementById("staff-directory-status");
    status.textContent = "Memuat data guru...";
    status.classList.remove("is-error");

    try {
        const result = await apiCall("getGuruList", "POST", {
            sessionToken: currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !Array.isArray(result.gurus)) {
            throw new Error(result && result.message ? result.message : "Format data guru tidak valid.");
        }
        renderGuruDirectory(result.gurus);
        status.textContent = `${result.gurus.length} akun guru ditemukan.`;
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
        document.getElementById("staff-directory-content").replaceChildren();
    }
}

function renderGuruDirectory(gurus) {
    const container = document.getElementById("staff-directory-content");
    container.replaceChildren();
    if (!gurus.length) {
        container.textContent = "Belum ada data guru.";
        return;
    }

    const table = document.createElement("table");
    table.className = "staff-directory-table";
    const head = table.createTHead().insertRow();
    ["Nama", "Role", "Aksi"].forEach(label => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        head.appendChild(cell);
    });
    const body = table.createTBody();
    gurus.forEach(guru => {
        const row = body.insertRow();
        const identityCell = row.insertCell();
        identityCell.className = "staff-guru-identity";
        const currentRole = String(guru.role || "").toUpperCase();
        if (currentRole === "ADMIN") row.classList.add("is-admin");
        const name = document.createElement("strong");
        name.textContent = guru.nama || "-";
        const nip = document.createElement("span");
        nip.textContent = guru.nip || "-";
        const email = document.createElement("span");
        email.className = "staff-guru-email";
        email.textContent = guru.email || "-";
        identityCell.append(name, nip, email);
        const roleCell = row.insertCell();
        const isCurrentAccount = currentUser && String(currentUser.nip || "") === String(guru.nip || "");
        if (currentRole === "SUPERADMIN" || isCurrentAccount) {
            const badge = document.createElement("span");
            badge.className = "staff-role-badge is-protected";
            badge.textContent = currentRole === "SUPERADMIN"
                ? "SUPERADMIN · Dilindungi"
                : `${currentRole} · Akun aktif`;
            roleCell.appendChild(badge);
        } else {
            const select = document.createElement("select");
            select.setAttribute("aria-label", `Role ${guru.nama || guru.nip}`);
            ["GURU", "ADMIN"].forEach(role => {
                const option = document.createElement("option");
                option.value = role;
                option.textContent = role;
                select.appendChild(option);
            });
            select.value = ["GURU", "ADMIN"].includes(currentRole) ? currentRole : "GURU";
            roleCell.appendChild(select);

            const actionCell = row.insertCell();
            const saveButton = document.createElement("button");
            saveButton.type = "button";
            saveButton.className = "staff-role-save";
            saveButton.textContent = "Simpan";
            saveButton.disabled = select.value === currentRole;
            select.addEventListener("change", () => {
                saveButton.disabled = select.value === currentRole;
            });
            saveButton.addEventListener("click", () => {
                updateGuruRole(guru.nip, select.value, saveButton);
            });
            actionCell.appendChild(saveButton);
            return;
        }
        const protectedActionCell = row.insertCell();
        protectedActionCell.textContent = currentRole === "SUPERADMIN"
            ? "Tidak dapat diubah"
            : "Role akun aktif dilindungi";
    });
    container.appendChild(table);
}

async function updateGuruRole(targetNip, role, button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
        const result = await apiCall("updateGuruRole", "POST", {
            sessionToken: currentUser && currentUser.sessionToken,
            targetNip,
            role
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "Role guru gagal diperbarui.");
        }
        showNotification(result.message, "success");
        await loadGuruDirectory();
    } catch (error) {
        showNotification(error.message, "error");
        button.disabled = false;
        button.removeAttribute("aria-busy");
    }
}

async function loadDashboardUserClass() {
    if (!currentUser || currentUser.role !== "SISWA" || !currentUser.nis) {
        const classElement = document.getElementById("userClass");
        classElement.textContent = "Kelas tidak tersedia";
        classElement.hidden = false;
        return;
    }

    try {
        const profile = await apiCall("getProfile", "GET", { nis: currentUser.nis });
        if (!currentUser || profile.status !== "success") {
            throw new Error(profile.message || "Data kelas siswa tidak ditemukan.");
        }

        currentUser.kelas = profile.kelas || "";
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        renderDashboardUserInfo(currentUser);
    } catch (error) {
        const classElement = document.getElementById("userClass");
        classElement.textContent = "Kelas tidak tersedia";
        classElement.hidden = false;
        console.error("Gagal memuat kelas siswa:", error);
        showNotification("Kelas siswa gagal dimuat: " + error.message, "error");
    }
}

function showStudentQrModal() {
    if (!currentUser || currentUser.role !== "SISWA" || !currentUser.nis) {
        showNotification("QR siswa hanya tersedia untuk akun siswa.", "error");
        return;
    }

    lastQrTrigger = document.activeElement;
    const qrNis = String(currentUser.nis);
    const modal = document.getElementById("student-qr-modal");
    const qrContainer = document.getElementById("student-qr-code");
    const message = document.getElementById("student-qr-message");
    qrContainer.replaceChildren();
    document.getElementById("student-qr-name").textContent = currentUser.nama || "Nama siswa tidak tersedia";
    document.getElementById("student-qr-class").textContent = currentUser.kelas || "Memuat kelas...";
    document.getElementById("student-qr-nis").textContent = `NIS ${currentUser.nis}`;
    modal.style.display = "flex";

    const closeButton = modal.querySelector(".close-button");
    closeButton.focus();
    if (typeof window.QRCode !== "function") {
        message.textContent = "QR code tidak dapat dibuat karena pustaka QR belum tersedia.";
        showNotification("Pustaka QR belum termuat. Periksa koneksi lalu coba lagi.", "error");
        return;
    }

    try {
        new window.QRCode(qrContainer, {
            text: qrNis,
            width: 220,
            height: 220,
            colorDark: "#17233c",
            colorLight: "#ffffff",
            correctLevel: window.QRCode.CorrectLevel.M
        });
        message.textContent = "";
    } catch (error) {
        message.textContent = "QR code gagal dibuat.";
        showNotification("Gagal membuat QR siswa: " + error.message, "error");
    }

    if (!currentUser.kelas) {
        loadDashboardUserClass().then(() => {
            if (currentUser && String(currentUser.nis) === qrNis) {
                document.getElementById("student-qr-class").textContent = currentUser.kelas || "Kelas tidak tersedia";
            }
        });
    }
}

function showAbsenPanel() {
    if (!currentUser || currentUser.role !== "SISWA") {
        showNotification("Panel absensi siswa tidak tersedia untuk akun ini.", "error");
        return;
    }
    setDashboardMenuView(true);
    setActiveDashboardPanel("attendance");
    document.getElementById("dashboardBackButton").style.display = "inline-flex";
    document.getElementById("dashboardHome").style.display = "none";
    document.getElementById("absenContent").style.display = "block";
    document.getElementById("profileContent").style.display = "none";
    document.getElementById("ktdsContent").style.display = "none";
    document.getElementById("absenContent").classList.add("fade-in");
    document.getElementById("attendance-title").focus({ preventScroll: true });
    filterData();
}

function showProfilePanel() {
    if (!currentUser || currentUser.role !== "SISWA") {
        showNotification("Panel profil siswa tidak tersedia untuk akun ini.", "error");
        return;
    }
    setDashboardMenuView(true);
    setActiveDashboardPanel("profile");
    document.getElementById("dashboardBackButton").style.display = "inline-flex";
    document.getElementById("dashboardHome").style.display = "none";
    document.getElementById("absenContent").style.display = "none";
    document.getElementById("profileContent").style.display = "block";
    document.getElementById("ktdsContent").style.display = "none";
    document.getElementById("profileContent").classList.add("fade-in");
    document.getElementById("profile-title").focus({ preventScroll: true });
    loadProfile();
}

function showKtdsPanel() {
    if (!currentUser || currentUser.role !== "SISWA") {
        showNotification("KTDS hanya tersedia untuk akun siswa.", "error");
        return;
    }
    setDashboardMenuView(true);
    setActiveDashboardPanel("ktds");
    document.getElementById("dashboardBackButton").style.display = "inline-flex";
    document.getElementById("dashboardHome").style.display = "none";
    document.getElementById("absenContent").style.display = "none";
    document.getElementById("profileContent").style.display = "none";
    document.getElementById("ktdsContent").style.display = "block";
    document.getElementById("ktdsContent").classList.add("fade-in");
    document.getElementById("ktdsNama").textContent = currentUser.nama || "-";
    document.getElementById("ktdsNis").textContent = currentUser.nis || "-";
    document.getElementById("ktds-title").focus({ preventScroll: true });
    loadKtds();
}

function renderKtdsForm(values = {}) {
    const container = document.getElementById("ktds-fields");
    container.replaceChildren();
    KTDS_FIELDS.forEach(field => {
        const wrapper = document.createElement("div");
        wrapper.className = `ktds-field${field.wide ? " is-wide" : ""}`;
        const id = `ktds-field-${container.children.length}`;
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = field.label;
        const control = field.type === "textarea"
            ? document.createElement("textarea")
            : document.createElement("input");
        if (control instanceof HTMLInputElement) control.type = field.type;
        control.id = id;
        control.name = field.name;
        control.dataset.ktdsField = field.name;
        control.maxLength = 500;
        const fieldValue = values[field.name] || "";
        control.value = field.name === "TANGGAL LAHIR" ? fieldValue : String(fieldValue).toUpperCase();
        if (field.name === "NISN") {
            control.inputMode = "numeric";
            control.maxLength = 10;
            control.pattern = "\\d{10}";
            control.title = "NISN harus terdiri dari 10 digit angka.";
        }
        control.addEventListener("input", () => {
            const start = control.selectionStart;
            const end = control.selectionEnd;
            const uppercaseValue = control.value.toUpperCase();
            if (control.value !== uppercaseValue) {
                control.value = uppercaseValue;
                if (start !== null && end !== null) control.setSelectionRange(start, end);
            }
        });
        wrapper.append(label, control);
        container.appendChild(wrapper);
    });
}

function renderKtdsReadOnly(values = {}) {
    const container = document.getElementById("ktds-readonly-fields");
    container.replaceChildren();
    KTDS_FIELDS.forEach(field => {
        const wrapper = document.createElement("div");
        wrapper.className = `ktds-field ktds-readonly-field${field.wide ? " is-wide" : ""}`;
        const label = document.createElement("span");
        label.className = "ktds-readonly-label";
        label.textContent = field.label;
        const value = document.createElement("p");
        value.className = "ktds-readonly-value";
        const fieldValue = String(values[field.name] || "").trim();
        value.textContent = fieldValue
            ? field.name === "TANGGAL LAHIR"
                ? new Date(`${fieldValue}T00:00:00`).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })
                : fieldValue.toUpperCase()
            : "-";
        wrapper.append(label, value);
        container.appendChild(wrapper);
    });
}

function setKtdsEditMode(isEditing) {
    if (!ktdsLoaded) return;
    document.getElementById("ktds-readonly-fields").hidden = isEditing;
    document.getElementById("ktds-form").hidden = !isEditing;
    document.getElementById("ktds-edit-button").hidden = isEditing;
    if (!isEditing) {
        renderKtdsForm(currentKtdsValues);
    }
}

async function loadKtds() {
    const status = document.getElementById("ktds-status");
    const fields = document.getElementById("ktds-fields");
    const saveButton = document.getElementById("ktds-save-button");
    const editButton = document.getElementById("ktds-edit-button");
    ktdsLoaded = false;
    saveButton.disabled = true;
    editButton.disabled = true;
    document.getElementById("ktds-form").hidden = true;
    document.getElementById("ktds-readonly-fields").hidden = false;
    editButton.hidden = false;
    if (!currentUser || currentUser.role !== "SISWA") {
        status.textContent = "KTDS hanya tersedia untuk akun siswa.";
        status.classList.add("is-error");
        return;
    }
    if (!currentUser.sessionToken) {
        status.textContent = "Sesi login perlu diperbarui. Silakan keluar dan masuk kembali.";
        status.classList.add("is-error");
        return;
    }

    status.textContent = "Memuat KTDS...";
    status.classList.remove("is-error");
    fields.setAttribute("aria-busy", "true");
    try {
        const result = await apiCall("getKtds", "POST", {
            sessionToken: currentUser.sessionToken
        });
        if (!result || result.status !== "success" || !result.ktds) {
            throw new Error(result && result.message ? result.message : "Data KTDS tidak dapat dimuat.");
        }
        currentKtdsValues = { ...result.ktds };
        renderKtdsReadOnly(currentKtdsValues);
        renderKtdsForm(result.ktds);
        ktdsLoaded = true;
        saveButton.disabled = false;
        editButton.disabled = false;
        status.textContent = "Periksa dan lengkapi data diri Anda.";
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    } finally {
        fields.removeAttribute("aria-busy");
    }
}

async function saveKtds() {
    const status = document.getElementById("ktds-status");
    const fields = document.getElementById("ktds-fields");
    const saveButton = document.getElementById("ktds-save-button");
    if (!currentUser || currentUser.role !== "SISWA" || !currentUser.sessionToken) {
        status.textContent = "Sesi login perlu diperbarui. Silakan keluar dan masuk kembali.";
        status.classList.add("is-error");
        return;
    }

    const ktds = {};
    const controls = fields.querySelectorAll("[data-ktds-field]");
    if (!ktdsLoaded || controls.length !== KTDS_FIELDS.length) {
        status.textContent = "Muat data KTDS terlebih dahulu sebelum menyimpan.";
        status.classList.add("is-error");
        saveButton.disabled = true;
        return;
    }
    controls.forEach(control => {
        ktds[control.dataset.ktdsField] = control.value.trim().toUpperCase();
    });
    const nisn = ktds.NISN;
    if (nisn && !/^\d{10}$/.test(nisn)) {
        const nisnField = fields.querySelector('[data-ktds-field="NISN"]');
        nisnField.setCustomValidity("NISN harus terdiri dari 10 digit angka.");
        nisnField.reportValidity();
        nisnField.addEventListener("input", () => nisnField.setCustomValidity(""), { once: true });
        return;
    }
    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
    fields.setAttribute("aria-busy", "true");
    status.textContent = "Menyimpan KTDS...";
    status.classList.remove("is-error");
    try {
        const result = await apiCall("saveKtds", "POST", {
            sessionToken: currentUser.sessionToken,
            ktds
        });
        if (!result || result.status !== "success") {
            throw new Error(result && result.message ? result.message : "KTDS gagal disimpan.");
        }
        showNotification(result.message, "success");
        await loadKtds();
    } catch (error) {
        status.textContent = error.message;
        status.classList.add("is-error");
    } finally {
        saveButton.disabled = !ktdsLoaded;
        saveButton.removeAttribute("aria-busy");
        fields.removeAttribute("aria-busy");
    }
}

function setDashboardMenuView(isMenuOpen) {
    document.querySelector(".dashboard-topbar").classList.toggle("menu-view", isMenuOpen);
    document.getElementById("dashboardHome").classList.toggle("menu-view", isMenuOpen);
    document.getElementById("dashboardBackButton").style.display = isMenuOpen ? "inline-flex" : "none";
}

function setActiveDashboardPanel(panel) {
    document.querySelectorAll(".dashboard-menu-card").forEach(button => {
        const isActive = button.dataset.panel === panel;
        button.classList.toggle("active", isActive);
        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

async function loadProfile() {
    if (!currentUser || currentUser.role !== "SISWA" || !currentUser.nis) {
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
    const saveButton = document.querySelector(".profile-save-button");

    if (!currentUser || currentUser.role !== "SISWA") {
        showNotification("Perubahan profil hanya tersedia untuk akun siswa.", "error");
        return;
    }

    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
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
            document.getElementById("profilePassword").type = "password";
            const passwordToggle = document.querySelector(".profile-password-toggle");
            passwordToggle.setAttribute("aria-label", "Tampilkan password baru");
            passwordToggle.setAttribute("aria-pressed", "false");
            passwordToggle.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';
            loadProfile();
        } else {
            showNotification(res.message, "error");
        }
    } catch (err) {
        hideLoading();
        showNotification("Terjadi kesalahan: " + err.message, "error");
    } finally {
        saveButton.disabled = false;
        saveButton.removeAttribute("aria-busy");
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById("password");
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    const toggleButton = document.querySelector(".login-password-toggle");
    toggleButton.setAttribute("aria-label", showPassword ? "Sembunyikan password" : "Tampilkan password");
    toggleButton.innerHTML = `<i class="fas ${showPassword ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
}

function toggleProfilePasswordVisibility() {
    const passwordInput = document.getElementById("profilePassword");
    const showPassword = passwordInput.type === "password";
    const toggleButton = document.querySelector(".profile-password-toggle");
    passwordInput.type = showPassword ? "text" : "password";
    toggleButton.setAttribute("aria-label", showPassword ? "Sembunyikan password baru" : "Tampilkan password baru");
    toggleButton.setAttribute("aria-pressed", String(showPassword));
    toggleButton.innerHTML = `<i class="fas ${showPassword ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
}

async function filterData() {
    if (!currentUser || currentUser.role !== "SISWA") return;

    setDashboardStatsState("loading", "Memuat statistik absensi...");
    setAttendanceState("loading", "Memuat absensi", "Menyiapkan kalender dan rekap kehadiran Anda.");

    try {
        const monthSelect = document.getElementById("bulanFilter");
        const yearSelect = document.getElementById("tahunFilter");
        if (!monthSelect.options.length || !yearSelect.options.length ||
            !monthSelect.value || !yearSelect.value) {
            await loadFilterOptions();
        }

        const nis = currentUser.nis;
        const bulan = monthSelect.value;
        const tahun = yearSelect.value;
        if (!bulan || !tahun) {
            throw new Error("Silakan pilih bulan dan tahun.");
        }

        const res = await apiCall('getRiwayatAbsen', 'GET', {
            nis,
            bulan,
            tahun
        });
        if (res && res.status === "error") {
            throw new Error(res.message || "API gagal mengambil data absensi.");
        }
        if (!Array.isArray(res)) {
            throw new Error("Format data absensi dari API tidak valid.");
        }
        currentAbsenData = res;
        updateSummaryDashboard(currentAbsenData, bulan, tahun);
        if (res.length === 0) {
            setDashboardStatsState("empty", "Belum ada data absensi untuk periode ini.");
            setAttendanceState("empty", "Belum ada data absensi", "Belum ada catatan kehadiran untuk periode yang dipilih.");
            return;
        }
        setAttendanceState(null);
        renderCalendar(currentAbsenData, bulan, tahun);
    } catch (err) {
        setDashboardStatsState("error", "Statistik tidak dapat dimuat. Periksa koneksi lalu coba lagi.", true);
        setAttendanceState("error", "Absensi gagal dimuat", err.message || "Periksa koneksi Anda lalu coba lagi.", true);
        showNotification("Gagal memuat data: " + err.message, "error");
    }
}

function setDashboardStatsState(state, message, canRetry = false) {
    const status = document.getElementById("dashboard-stats-status");
    if (!status) return;
    status.textContent = message;
    status.className = `dashboard-stats-status is-${state}`;
    document.getElementById("dashboard-stats-retry").hidden = !canRetry;
    if (state === "loading" || state === "error") {
        [
            "stats-active-days",
            "stats-hadir",
            "stats-sakit",
            "stats-izin",
            "stats-alpha",
            "stats-terlambat",
            "stats-lainnya",
            "stats-libur"
        ].forEach(id => {
            document.getElementById(id).textContent = "—";
        });
        document.querySelectorAll(".dashboard-stat-track").forEach(track => {
            track.setAttribute("aria-valuenow", "0");
            track.querySelector("span").style.width = "0%";
        });
    }
}

function setAttendanceState(state, title = "", message = "", canRetry = false) {
    const statePanel = document.getElementById("attendance-state");
    const isVisible = Boolean(state);
    const stateIcon = statePanel.querySelector(".attendance-state-icon i");
    statePanel.hidden = !isVisible;
    statePanel.classList.toggle("is-loading", state === "loading");
    statePanel.classList.toggle("is-error", state === "error");
    statePanel.classList.toggle("is-empty", state === "empty");
    stateIcon.className = state === "error"
        ? "fas fa-circle-exclamation"
        : state === "empty"
            ? "fas fa-calendar-check"
            : "fas fa-circle-notch";
    document.getElementById("attendance-state-title").textContent = title;
    document.getElementById("attendance-state-message").textContent = message;
    document.getElementById("attendance-retry").hidden = !canRetry;
    document.getElementById("attendance-calendar").hidden = isVisible;
    document.getElementById("summary-dashboard").hidden = isVisible;
    document.getElementById("attendance-legend").hidden = isVisible;
}

function updateSummaryDashboard(data, month, year) {
    let hadir = 0, absen = 0, terlambat = 0, izin = 0;
    data.forEach(day => {
        if (!shouldIncludeAttendanceDay(day)) return;
        const status = String(day.keterangan || "").trim().toUpperCase();
        if (status === "H" || status === "HB") hadir++;
        else if (status === "A") absen++;
        else if (["T", "TAPT", "TAM", "PT", "TAP"].includes(status)) terlambat++;
        else if (["I", "S"].includes(status)) izin++;
    });
    document.getElementById("sum-hadir").innerText = hadir;
    document.getElementById("sum-absen").innerText = absen;
    document.getElementById("sum-terlambat").innerText = terlambat;
    document.getElementById("sum-izin").innerText = izin;
    const monthSelect = document.getElementById("bulanFilter");
    const selectedMonth = monthSelect.options[monthSelect.selectedIndex];
    const period = `${selectedMonth ? selectedMonth.textContent : month} ${year}`;
    document.getElementById("summary-period").textContent = period;
    document.getElementById("dashboard-stats-period").textContent = period;
    updateDashboardStats(data);
}

function shouldIncludeAttendanceDay(day, now = new Date()) {
    const [dayOfMonth, month, year] = String(day.tanggal || "").split("-").map(Number);
    if (!dayOfMonth || !month || !year) return false;

    const attendanceDate = new Date(year, month - 1, dayOfMonth);
    if (attendanceDate.getFullYear() !== year ||
        attendanceDate.getMonth() !== month - 1 ||
        attendanceDate.getDate() !== dayOfMonth) {
        return false;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (attendanceDate > today) return false;

    const status = String(day.keterangan || "").trim().toUpperCase();
    if (attendanceDate.getTime() === today.getTime() && status === "A") {
        const cutoff = new Date(today);
        cutoff.setHours(15, 0, 0, 0);
        return now >= cutoff;
    }

    return true;
}

function updateDashboardStats(data) {
    const counts = {
        activeDays: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        terlambat: 0,
        lainnya: 0,
        libur: 0
    };
    const lateStatuses = ["T", "TAPT", "TAM", "PT", "TAP"];

    data.forEach(day => {
        if (!shouldIncludeAttendanceDay(day)) return;
        const status = String(day.keterangan || "").trim().toUpperCase();
        if (status === "OFF" || status === "HB") {
            counts.libur++;
            return;
        }

        counts.activeDays++;
        if (status === "H") counts.hadir++;
        else if (status === "S") counts.sakit++;
        else if (status === "I") counts.izin++;
        else if (status === "A") counts.alpha++;
        else if (lateStatuses.includes(status)) counts.terlambat++;
        else counts.lainnya++;
    });

    Object.entries(counts).forEach(([key, value]) => {
        document.getElementById(`stats-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`).textContent = value;
    });
    updateDashboardStatBars(counts, data.length);
    setDashboardStatsState("loaded", `${counts.activeDays} hari aktif pada periode ini.`);
}

function updateDashboardStatBars(counts, totalDays) {
    const activeStatusKeys = ["hadir", "sakit", "izin", "alpha", "terlambat", "lainnya"];
    const activeStatusTotal = activeStatusKeys.reduce((total, key) => total + counts[key], 0);
    const percentages = {
        hadir: activeStatusTotal ? counts.hadir / activeStatusTotal * 100 : 0,
        sakit: activeStatusTotal ? counts.sakit / activeStatusTotal * 100 : 0,
        izin: activeStatusTotal ? counts.izin / activeStatusTotal * 100 : 0,
        alpha: activeStatusTotal ? counts.alpha / activeStatusTotal * 100 : 0,
        terlambat: activeStatusTotal ? counts.terlambat / activeStatusTotal * 100 : 0,
        lainnya: activeStatusTotal ? counts.lainnya / activeStatusTotal * 100 : 0,
        libur: totalDays ? counts.libur / totalDays * 100 : 0
    };

    Object.entries(percentages).forEach(([key, percentage]) => {
        const track = document.querySelector(`.dashboard-stat-row[data-stat="${key}"] .dashboard-stat-track`);
        const roundedPercentage = Math.round(percentage);
        track.setAttribute("aria-valuenow", roundedPercentage);
        track.setAttribute("aria-valuetext", `${roundedPercentage}% dari ${key === "libur" ? "seluruh catatan" : "hari aktif"}`);
        track.querySelector("span").style.width = `${percentage}%`;
    });
}

function toggleStatusLegend() {
    const legend = document.getElementById("legend-grid");
    const toggle = document.getElementById("legend-toggle");
    const isExpanded = legend.classList.toggle("expanded");
    toggle.setAttribute("aria-expanded", String(isExpanded));
    toggle.textContent = isExpanded ? "Tampilkan lebih sedikit" : "Lihat semua status";
}

async function generatePdfReport() {
    if (!currentUser || currentUser.role !== "SISWA" || !currentUser.nis) {
        showNotification("Unduh laporan hanya tersedia untuk akun siswa.", "error");
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
        const [dayNumber, dayMonth, dayYear] = dayData.tanggal.split("-").map(Number);
        const dateKey = `${dayYear}-${String(dayMonth).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
        const date = new Date(dayYear, dayMonth - 1, dayNumber);
        day.dataset.date = dateKey;
        day.setAttribute("role", "button");
        day.setAttribute("tabindex", "0");
        day.setAttribute("aria-label",
            `${dayData.tanggal}, ${dayData.keterangan || "status tidak tersedia"}: ${getStatusDescription(dayData.keterangan)}`);

        if (dateKey === selectedAbsenDate) {
            day.classList.add("selected-day");
            day.setAttribute("aria-pressed", "true");
        } else {
            day.setAttribute("aria-pressed", "false");
        }
        if (dayNumber === new Date().getDate() &&
            dayMonth === new Date().getMonth() + 1 &&
            dayYear === new Date().getFullYear()) {
            day.classList.add("today");
        }

        const statusClass = getStatusClass(dayData.keterangan);
        if (statusClass) {
            day.classList.add(statusClass);
        } else {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                day.classList.add("weekend-day");
            }
        }

        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = dayNumber;
        const status = document.createElement("span");
        status.className = "day-status";
        status.textContent = dayData.keterangan || "";
        day.append(number, status);
        day.addEventListener("click", () => showDetails(dayData));
        day.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                showDetails(dayData);
            }
        });

        grid.appendChild(day);
    });

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

function getStatusDescription(status) {
    const descriptions = {
        H: "Hadir",
        A: "Alpa",
        I: "Izin",
        S: "Sakit",
        T: "Terlambat",
        TAP: "Tidak Absen Pulang",
        TAM: "Tidak Absen Masuk",
        TAPT: "Tidak Absen Pulang & Terlambat",
        P: "Pulang",
        PT: "Pulang & Terlambat",
        HB: "Hari Besar",
        OFF: "Libur"
    };
    const code = String(status || "").trim().toUpperCase();
    return descriptions[code] || status || "-";
}

function showDetails(dayData) {
    const modal = document.getElementById('detail-modal');
    lastDetailTrigger = document.activeElement;
    const [day, month, year] = dayData.tanggal.split("-").map(Number);
    selectedAbsenDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    document.querySelectorAll("#calendar-grid .calendar-day").forEach(calendarDay => {
        const isSelected = calendarDay.dataset.date === selectedAbsenDate;
        calendarDay.classList.toggle("selected-day", isSelected);
        calendarDay.setAttribute("aria-pressed", String(isSelected));
    });
    document.getElementById('modal-date').innerText = new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
    document.getElementById('modal-status').innerText =
        `Status: ${getStatusDescription(dayData.keterangan)}`;
    document.getElementById('modal-time-in').innerText = `Jam Masuk: ${dayData.jamMasuk || "-"}`;
    document.getElementById('modal-time-out').innerText = `Jam Pulang: ${dayData.jamPulang || "-"}`;
    modal.style.display = "flex";
    modal.querySelector(".close-button").focus();
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
    if (modalId === "detail-modal" && lastDetailTrigger instanceof HTMLElement && lastDetailTrigger.isConnected) {
        lastDetailTrigger.focus();
        lastDetailTrigger = null;
    }
    if (modalId === "student-qr-modal" && lastQrTrigger instanceof HTMLElement && lastQrTrigger.isConnected) {
        lastQrTrigger.focus();
        lastQrTrigger = null;
    }
}

function redirectToProfileAndClose() {
    closeModal('email-notification-modal');
    showProfilePanel();
}

// Fungsi untuk toggle menu ellipsis pada mobile
window.onclick = function (event) {
    const modal1 = document.getElementById('detail-modal');
    const modal2 = document.getElementById('logout-confirmation-modal');
    const modal3 = document.getElementById('email-notification-modal');
    const modal4 = document.getElementById('student-qr-modal');
    if (event.target == modal1) closeModal('detail-modal');
    if (event.target == modal2) closeModal('logout-confirmation-modal');
    if (event.target == modal3) closeModal('email-notification-modal');
    if (event.target == modal4) closeModal('student-qr-modal');

}

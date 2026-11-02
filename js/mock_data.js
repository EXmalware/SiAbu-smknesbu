const MOCK_GURU_ACCOUNTS = [
    { nip: "1988123", nama: "Guru Mock", email: "guru@mock.test", password: "teacher-mock", role: "GURU" },
    { nip: "1977001", nama: "Admin Mock", email: "admin@mock.test", password: "admin-mock", role: "ADMIN" },
    { nip: "1965001", nama: "Superadmin Mock", email: "superadmin@mock.test", password: "superadmin-mock", role: "SUPERADMIN" }
];

const MOCK_STUDENT_ACCOUNTS = [
    { nis: "24111003", nama: "Siswa Mock", kelas: "XII RPL 1" },
    { nis: "24111004", nama: "Alya Mock", kelas: "XII RPL 1" },
    { nis: "24111005", nama: "Bima Mock", kelas: "XI RPL 2" }
];

const MOCK_EVENTS = [
    { date: "2026-11-01", name: "Hari Besar Mock" },
    { date: "2026-12-25", name: "Kegiatan Sekolah Mock" }
];
const MOCK_HOLIDAYS = [
    { date: "2026-11-10", name: "Hari Pahlawan Mock" },
    { date: "2026-12-26", name: "Libur Sekolah Mock" }
];
const MOCK_EARLY_DISMISSALS = [
    { date: "2026-11-20", name: "Rapat Guru Mock" },
    { date: "2026-12-18", name: "" }
];
const MOCK_STAFF_SESSIONS = new Map();
const MOCK_STUDENT_SESSIONS = new Map();
const MOCK_KTDS_FIELDS = [
    "NISN", "TEMPAT LAHIR", "TANGGAL LAHIR", "JENIS KELAMIN", "AGAMA",
    "STATUS DALAM KELUARGA", "ANAK KE", "ALAMAT PESERTA DIDIK", "NOMOR TELPON RUMAH",
    "SEKOLAH ASAL", "NAMA AYAH", "NAMA IBU", "PEKERJAAN AYAH", "PEKERJAAN IBU",
    "ALAMAT ORANG TUA", "NOMOR TELPON ORANG TUA", "NAMA WALI SISWA",
    "ALAMAT WALI SISWA", "NOMER TELPON WALI SISWA", "PEKERJAAN WALI SISWA"
];
const MOCK_STUDENT_KTDS = new Map();

function authenticateMockStudent(sessionToken) {
    const nis = MOCK_STUDENT_SESSIONS.get(String(sessionToken || ""));
    return MOCK_STUDENT_ACCOUNTS.find(student => student.nis === nis) || null;
}

function getMockKtds(nis) {
    if (!MOCK_STUDENT_KTDS.has(nis)) {
        MOCK_STUDENT_KTDS.set(nis, Object.fromEntries(MOCK_KTDS_FIELDS.map(field => [field, ""])));
    }
    return MOCK_STUDENT_KTDS.get(nis);
}

function authenticateMockManager(sessionToken) {
    const account = authenticateMockMonitoringStaff(sessionToken);
    return account && ["ADMIN", "SUPERADMIN"].includes(account.role) ? account : null;
}

function authenticateMockMonitoringStaff(sessionToken) {
    const nip = MOCK_STAFF_SESSIONS.get(String(sessionToken || ""));
    const account = MOCK_GURU_ACCOUNTS.find(item => item.nip === nip);
    return account || null;
}

const MOCK_DATA = {
    login: ({ username, password } = {}) => {
        const studentAccount = {
            username: "24111003",
            email: "siswa@mock.test",
            password: "student-mock",
            user: { nis: "24111003", nama: "Siswa Mock", kelas: "XII RPL 1", email: "siswa@mock.test", role: "SISWA" }
        };
        const normalizedUsername = String(username || "").trim().toLowerCase();
        if ((studentAccount.username === normalizedUsername || studentAccount.email === normalizedUsername) &&
            studentAccount.password === String(password || "")) {
            const sessionToken = `mock-student-session-${studentAccount.user.nis}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            MOCK_STUDENT_SESSIONS.set(sessionToken, studentAccount.user.nis);
            return { status: "success", ...studentAccount.user, sessionToken };
        }

        const account =
            MOCK_GURU_ACCOUNTS.find(item =>
                item.nip === normalizedUsername || item.email.toLowerCase() === normalizedUsername
            );
        if (account && account.password === String(password || "")) {
            const sessionToken = `mock-session-${account.nip}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            MOCK_STAFF_SESSIONS.set(sessionToken, account.nip);
            return {
                status: "success",
                nip: account.nip,
                nama: account.nama,
                email: account.email,
                sessionToken,
                role: account.role
            };
        }

        return { status: "error", message: "Username/email atau password salah (akun simulasi)." };
    },
    getKtds: ({ sessionToken } = {}) => {
        const student = authenticateMockStudent(sessionToken);
        if (!student) return { status: "error", message: "Sesi siswa tidak valid. Silakan masuk kembali." };
        return { status: "success", ktds: { ...getMockKtds(student.nis) } };
    },
    saveKtds: ({ sessionToken, ktds } = {}) => {
        const student = authenticateMockStudent(sessionToken);
        if (!student) return { status: "error", message: "Sesi siswa tidak valid. Silakan masuk kembali." };
        if (!ktds || typeof ktds !== "object" || Array.isArray(ktds) ||
            MOCK_KTDS_FIELDS.some(field => !Object.prototype.hasOwnProperty.call(ktds, field))) {
            return { status: "error", message: "Data KTDS tidak lengkap." };
        }
        const values = {};
        for (const field of MOCK_KTDS_FIELDS) {
            let value = ktds[field] === null || ktds[field] === undefined
                ? ""
                : String(ktds[field]).trim();
            if (field !== "TANGGAL LAHIR") value = value.toUpperCase();
            if (value.length > 500) {
                return { status: "error", message: `${field} maksimal 500 karakter.` };
            }
            if (field === "NISN" && value && !/^\d{10}$/.test(value)) {
                return { status: "error", message: "NISN harus terdiri dari 10 digit angka." };
            }
            if (field === "TANGGAL LAHIR" && value) {
                const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
                if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
                    return { status: "error", message: "Tanggal lahir tidak valid." };
                }
            }
            values[field] = value;
        }
        const profile = getMockKtds(student.nis);
        MOCK_KTDS_FIELDS.forEach(field => {
            profile[field] = values[field];
        });
        return { status: "success", message: "Keterangan diri siswa berhasil diperbarui." };
    },
    getGuruList: ({ sessionToken } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        return {
            status: "success",
            gurus: MOCK_GURU_ACCOUNTS.map(({ nip, nama, email, role }) => ({ nip, nama, email, role }))
        };
    },
    updateGuruRole: ({ sessionToken, targetNip, role } = {}) => {
        const manager = authenticateMockManager(sessionToken);
        if (!manager) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        const target = MOCK_GURU_ACCOUNTS.find(item => item.nip === String(targetNip || "").trim());
        const nextRole = String(role || "").trim().toUpperCase();
        if (!target) return { status: "error", message: "Data guru tidak ditemukan." };
        if (target.role === "SUPERADMIN") {
            return { status: "error", message: "Role SUPERADMIN dilindungi dan tidak dapat diubah." };
        }
        if (target === manager) {
            return { status: "error", message: "Anda tidak dapat mengubah role akun yang sedang digunakan." };
        }
        if (!["ADMIN", "GURU"].includes(nextRole)) {
            return { status: "error", message: "Role hanya dapat diubah menjadi ADMIN atau GURU." };
        }
        const remainingPrivilegedAccounts = MOCK_GURU_ACCOUNTS.filter(item =>
            item !== target && ["ADMIN", "SUPERADMIN"].includes(item.role)
        ).length;
        if (target.role === "ADMIN" && remainingPrivilegedAccounts === 0) {
            return { status: "error", message: "Admin terakhir tidak dapat diturunkan rolenya." };
        }
        target.role = nextRole;
        return { status: "success", message: "Role guru berhasil diperbarui.", role: nextRole };
    },
    getMonitoringClasses: ({ sessionToken } = {}) => {
        if (!authenticateMockMonitoringStaff(sessionToken)) {
            return { status: "error", message: "Sesi login tidak valid. Silakan masuk kembali." };
        }
        return {
            status: "success",
            classes: [...new Set(MOCK_STUDENT_ACCOUNTS.map(student => student.kelas))].sort()
        };
    },
    getMonitoringStudents: ({ sessionToken, kelas } = {}) => {
        if (!authenticateMockMonitoringStaff(sessionToken)) {
            return { status: "error", message: "Sesi login tidak valid. Silakan masuk kembali." };
        }
        const selectedClass = String(kelas || "").trim();
        if (!selectedClass) return { status: "error", message: "Pilih kelas terlebih dahulu." };
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const isEventDay = MOCK_EVENTS.some(eventItem => eventItem.date === todayKey);
        const students = MOCK_STUDENT_ACCOUNTS
            .filter(student => student.kelas.toUpperCase() === selectedClass.toUpperCase())
            .map(({ nis, nama }) => ({
                nis,
                nama,
                jamMasuk: nis === "24111003" ? "07:03" : "-",
                jamPulang: isEventDay ? "-" : nis === "24111003" ? "15:02" : "-",
                keterangan: isEventDay
                    ? nis === "24111003" ? "HB" : "A"
                    : nis === "24111003" ? "H" : "Belum absen"
            }));
        return { status: "success", kelas: selectedClass, students };
    },
    getEventDates: ({ sessionToken } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Menu event hanya tersedia untuk admin atau superadmin." };
        }
        return {
            status: "success",
            events: [...MOCK_EVENTS].sort((first, second) =>
                first.date.localeCompare(second.date) || first.name.localeCompare(second.name)
            )
        };
    },
    saveEvent: ({ sessionToken, date, name, originalDate, originalName } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        const eventName = String(name || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !eventName) {
            return { status: "error", message: "Tanggal dan nama kegiatan wajib diisi dengan benar." };
        }
        const isEditing = Boolean(originalDate || originalName);
        if (isEditing) {
            const matches = MOCK_EVENTS.filter(item =>
                item.date === originalDate && item.name === originalName
            );
            if (matches.length !== 1) {
                return { status: "error", message: "Event tidak ditemukan atau tercatat lebih dari sekali." };
            }
            matches[0].date = date;
            matches[0].name = eventName;
        } else {
            const duplicate = MOCK_EVENTS.some(item =>
                item.date === date && item.name.toLowerCase() === eventName.toLowerCase()
            );
            if (duplicate) {
                return { status: "error", message: "Event dengan tanggal dan nama kegiatan tersebut sudah ada." };
            }
            MOCK_EVENTS.push({ date, name: eventName });
        }
        return {
            status: "success",
            message: isEditing ? "Event berhasil diperbarui." : "Event berhasil ditambahkan."
        };
    },
    deleteEvent: ({ sessionToken, date, name } = {}) => {
        const account = authenticateMockManager(sessionToken);
        if (!account) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        if (account.role !== "SUPERADMIN") {
            return { status: "error", message: "Hanya superadmin yang dapat menghapus event." };
        }
        const matches = MOCK_EVENTS
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.date === date && item.name === name);
        if (matches.length !== 1) {
            return { status: "error", message: "Event tidak ditemukan atau tercatat lebih dari sekali." };
        }
        MOCK_EVENTS.splice(matches[0].index, 1);
        return { status: "success", message: "Event berhasil dihapus." };
    },
    getHolidayActivities: ({ sessionToken } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Menu hari libur hanya tersedia untuk admin atau superadmin." };
        }
        return {
            status: "success",
            holidays: [...MOCK_HOLIDAYS].sort((first, second) =>
                first.date.localeCompare(second.date) || first.name.localeCompare(second.name)
            )
        };
    },
    saveHoliday: ({ sessionToken, date, name, originalDate, originalName } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        const activityName = String(name || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !activityName) {
            return { status: "error", message: "Tanggal dan nama hari libur wajib diisi dengan benar." };
        }
        const isEditing = Boolean(originalDate || originalName);
        if (isEditing) {
            const matches = MOCK_HOLIDAYS.filter(item =>
                item.date === originalDate && item.name === originalName
            );
            if (matches.length !== 1) {
                return { status: "error", message: "Hari libur tidak ditemukan atau tercatat lebih dari sekali." };
            }
            const duplicate = MOCK_HOLIDAYS.some(item =>
                item !== matches[0] &&
                item.date === date &&
                item.name.toLowerCase() === activityName.toLowerCase()
            );
            if (duplicate) {
                return { status: "error", message: "Hari libur dengan tanggal dan nama kegiatan tersebut sudah ada." };
            }
            matches[0].date = date;
            matches[0].name = activityName;
        } else {
            const duplicate = MOCK_HOLIDAYS.some(item =>
                item.date === date && item.name.toLowerCase() === activityName.toLowerCase()
            );
            if (duplicate) {
                return { status: "error", message: "Hari libur dengan tanggal dan nama kegiatan tersebut sudah ada." };
            }
            MOCK_HOLIDAYS.push({ date, name: activityName });
        }
        return {
            status: "success",
            message: isEditing ? "Hari libur berhasil diperbarui." : "Hari libur berhasil ditambahkan."
        };
    },
    deleteHoliday: ({ sessionToken, date, name } = {}) => {
        if (!authenticateMockManager(sessionToken)) {
            return { status: "error", message: "Sesi admin tidak valid. Silakan masuk kembali." };
        }
        const matches = MOCK_HOLIDAYS
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.date === date && item.name === name);
        if (matches.length !== 1) {
            return { status: "error", message: "Hari libur tidak ditemukan atau tercatat lebih dari sekali." };
        }
        MOCK_HOLIDAYS.splice(matches[0].index, 1);
        return { status: "success", message: "Hari libur berhasil dihapus." };
    },
    getEarlyDismissals: ({ sessionToken } = {}) => {
        const account = authenticateMockMonitoringStaff(sessionToken);
        if (!account || account.role !== "SUPERADMIN") {
            return { status: "error", message: "Hanya superadmin yang dapat mengatur tanggal pulang cepat." };
        }
        return {
            status: "success",
            earlyDismissals: [...MOCK_EARLY_DISMISSALS].sort((first, second) =>
                first.date.localeCompare(second.date) || first.name.localeCompare(second.name)
            )
        };
    },
    saveEarlyDismissal: ({ sessionToken, date, name, originalDate, originalName } = {}) => {
        const account = authenticateMockMonitoringStaff(sessionToken);
        if (!account || account.role !== "SUPERADMIN") {
            return { status: "error", message: "Hanya superadmin yang dapat mengatur tanggal pulang cepat." };
        }
        const activityName = String(name || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) {
            return { status: "error", message: "Tanggal pulang cepat wajib diisi dengan benar." };
        }
        const isEditing = Boolean(originalDate || originalName);
        if (isEditing) {
            const matches = MOCK_EARLY_DISMISSALS.filter(item =>
                item.date === originalDate && item.name === (originalName || "")
            );
            if (matches.length !== 1) {
                return { status: "error", message: "Tanggal pulang cepat tidak ditemukan atau tercatat lebih dari sekali." };
            }
            const duplicate = MOCK_EARLY_DISMISSALS.some(item =>
                item !== matches[0] &&
                item.date === date &&
                item.name.toLowerCase() === activityName.toLowerCase()
            );
            if (duplicate) {
                return { status: "error", message: "Tanggal pulang cepat dengan nama kegiatan tersebut sudah ada." };
            }
            matches[0].date = date;
            matches[0].name = activityName;
        } else {
            const duplicate = MOCK_EARLY_DISMISSALS.some(item =>
                item.date === date && item.name.toLowerCase() === activityName.toLowerCase()
            );
            if (duplicate) {
                return { status: "error", message: "Tanggal pulang cepat dengan nama kegiatan tersebut sudah ada." };
            }
            MOCK_EARLY_DISMISSALS.push({ date, name: activityName });
        }
        return {
            status: "success",
            message: isEditing ? "Tanggal pulang cepat berhasil diperbarui." : "Tanggal pulang cepat berhasil ditambahkan."
        };
    },
    deleteEarlyDismissal: ({ sessionToken, date, name } = {}) => {
        const account = authenticateMockMonitoringStaff(sessionToken);
        if (!account || account.role !== "SUPERADMIN") {
            return { status: "error", message: "Hanya superadmin yang dapat menghapus tanggal pulang cepat." };
        }
        const matches = MOCK_EARLY_DISMISSALS
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.date === date && item.name === (name || ""));
        if (matches.length !== 1) {
            return { status: "error", message: "Tanggal pulang cepat tidak ditemukan atau tercatat lebih dari sekali." };
        }
        MOCK_EARLY_DISMISSALS.splice(matches[0].index, 1);
        return { status: "success", message: "Tanggal pulang cepat berhasil dihapus." };
    },
    revokeStaffSession: ({ sessionToken } = {}) => {
        MOCK_STAFF_SESSIONS.delete(String(sessionToken || ""));
        MOCK_STUDENT_SESSIONS.delete(String(sessionToken || ""));
        return { status: "success" };
    },
    getFilterData: {
        bulan: [
            { id: 1, nama: "Januari" }, { id: 2, nama: "Februari" }, { id: 3, nama: "Maret" },
            { id: 4, nama: "April" }, { id: 5, nama: "Mei" }, { id: 6, nama: "Juni" },
            { id: 7, nama: "Juli" }, { id: 8, nama: "Agustus" }, { id: 9, nama: "September" },
            { id: 10, nama: "Oktober" }, { id: 11, nama: "November" }, { id: 12, nama: "Desember" }
        ],
        tahun: Array.from({ length: 4 }, (_, index) => new Date().getFullYear() + index)
    },
    getRiwayatAbsen: [
        { tanggal: "01-12-2025", keterangan: "H", jamMasuk: "07:00", jamPulang: "15:00" },
        { tanggal: "02-12-2025", keterangan: "H", jamMasuk: "07:05", jamPulang: "15:05" },
        { tanggal: "03-12-2025", keterangan: "S", jamMasuk: "-", jamPulang: "-" },
        { tanggal: "04-12-2025", keterangan: "I", jamMasuk: "-", jamPulang: "-" },
        { tanggal: "05-12-2025", keterangan: "A", jamMasuk: "-", jamPulang: "-" },
        { tanggal: "06-12-2025", keterangan: "T", jamMasuk: "08:00", jamPulang: "15:00" },
        { tanggal: "07-12-2025", keterangan: "OFF", jamMasuk: "-", jamPulang: "-" }
    ],
    getProfile: {
        status: "success",
        nis: "24111003",
        nama: "Siswa Mock",
        kelas: "XII RPL 1",
        email: "siswa@smknesbu.sch.id"
    },
    updateProfile: {
        status: "success",
        message: "Profil (Mock) berhasil diperbarui."
    },
    forgotPassword: {
        status: "success",
        message: "Email reset password (Mock) telah dikirim."
    },
    createPdfReport: {
        status: "success",
        base64: "JVBERi0xLjcKCjEgMCBvYmogICB...", // Dummy base64
        fileName: "Laporan_Mock.pdf"
    }
};

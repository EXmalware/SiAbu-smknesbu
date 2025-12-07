const MOCK_DATA = {
    login: {
        status: "success",
        nis: "24111003",
        nama: "Siswa Mock",
        email: "siswa@smknesbu.sch.id"
    },
    getFilterData: {
        bulan: [
            { id: 1, nama: "Januari" }, { id: 2, nama: "Februari" }, { id: 3, nama: "Maret" },
            { id: 4, nama: "April" }, { id: 5, nama: "Mei" }, { id: 6, nama: "Juni" },
            { id: 7, nama: "Juli" }, { id: 8, nama: "Agustus" }, { id: 9, nama: "September" },
            { id: 10, nama: "Oktober" }, { id: 11, nama: "November" }, { id: 12, nama: "Desember" }
        ],
        tahun: [2023, 2024, 2025]
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

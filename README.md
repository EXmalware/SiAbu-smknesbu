# SiAbu - Sistem Absensi Siswa SMK Negeri 1 Bumijawa

Aplikasi absensi siswa berbasis web dengan arsitektur API-based. Backend menggunakan Google Apps Script sebagai REST API, frontend di-hosting di GitHub Pages. Aplikasi sudah dioptimalkan untuk perangkat mobile dan siap dikonversi menjadi aplikasi Android/iOS.

## 🏗️ Arsitektur

```
Frontend (GitHub Pages)          Backend (Google Apps Script)      Database (Google Sheets)
┌─────────────────────┐         ┌─────────────────────┐          ┌─────────────────────┐
│   index.html        │         │   Code.gs           │          │   SISWA             │
│   css/styles.css    │ ──────> │   REST API          │ ──────>  │   ABSEN             │
│   js/script.js      │  HTTPS  │   doGet/doPost      │  R/W     │   IZIN              │
│   js/config.js      │         │                     │          │   HARILIBUR, EVENT, PULANGCEPAT │
└─────────────────────┘         └─────────────────────┘          └─────────────────────┘
```

## 📁 Struktur Folder

```
Project Absensi Siswa SiAbu/
├── Code.gs                 # Backend API (deploy ke Google Apps Script)
├── index.html              # HTML utama
├── manifest.webmanifest    # Metadata instalasi PWA
├── sw.js                   # Service worker untuk app shell offline
├── apple-touch-icon.png    # Ikon layar utama iOS
├── icons/                  # Ikon aplikasi PWA
├── css/
│   └── styles.css          # Semua styling
├── js/
│   ├── config.js           # API URL configuration (tidak di-commit)
│   ├── config.example.js   # Template config
│   └── script.js           # Semua JavaScript dengan fetch API
├── .gitignore              # Git ignore file
├── DEPLOYMENT.md           # Panduan deployment lengkap
└── README.md               # File ini
```

## 🚀 Quick Start

### 1. Deploy Backend (Google Apps Script)

1. Buka https://script.google.com
2. Buat project baru
3. Copy `Code.gs` dan update `SHEET_ID`
4. Deploy sebagai Web App (Who has access: `Anyone`)
5. Copy deployment URL

### 2. Deploy Frontend (GitHub Pages)

1. Fork/clone repository ini
2. Copy `js/config.example.js` ke `js/config.js`
3. Update `API_URL` di `config.js` dengan deployment URL dari step 1
4. Push ke GitHub
5. Enable GitHub Pages di Settings → Pages

**📖 Panduan lengkap**: Lihat [DEPLOYMENT.md](DEPLOYMENT.md)

### Progressive Web App (PWA)

Frontend menyertakan `manifest.webmanifest`, ikon aplikasi, dan service worker. Setelah frontend dipublikasikan melalui HTTPS (misalnya GitHub Pages), browser yang kompatibel dapat menawarkan opsi instalasi. Service worker memeriksa pembaruan aset app shell saat aplikasi dibuka dan memakai cache hanya jika jaringan tidak tersedia. Pada perangkat sentuh, tarik layar ke bawah dari bagian paling atas untuk memuat ulang aplikasi. App shell yang sudah tersimpan dapat dibuka saat offline, tetapi login dan pemuatan data tetap memerlukan koneksi internet. Service worker hanya menyimpan aset frontend; respons API dan data siswa tidak disimpan di cache.

## ✨ Fitur

- ✅ Login dengan NIS atau Email
- ✅ Sesi login dipertahankan dan username dapat diingat tanpa menyimpan password
- ✅ Splash screen saat halaman dibuka
- ✅ Reset password via email
- ✅ Kalender absensi interaktif
- ✅ Dark mode / Light mode
- ✅ Filter berdasarkan bulan dan tahun
- ✅ Summary dashboard (Hadir, Absen, Terlambat, Izin)
- ✅ Detail absensi per tanggal
- ✅ Update profil dan password
- ✅ Tampilan data izin siswa untuk admin dan superadmin
- ✅ Generate laporan PDF
- ✅ Share detail absensi
- ✅ **Responsive design untuk mobile**
- ✅ **Mobile menu dengan ellipsis**
- ✅ **REST API ready untuk mobile app**
- ✅ **PWA: dapat dipasang dan membuka app shell saat offline**

## 🎨 Kustomisasi

### Mengubah Warna Tema

Edit `css/styles.css` di bagian `:root`:
```css
:root {
  --color-primary: #0d6efd;    /* Warna utama */
  --color-secondary: #fd7e14;  /* Warna sekunder */
  --color-accent: #20c997;     /* Warna aksen */
}
```

### Menambah Fungsi Baru

Tambahkan fungsi di `js/script.js`:
```javascript
async function newFeature() {
  const result = await apiCall('newAction', 'POST', { data });
  // Implementasi fitur baru
}
```

Tambahkan endpoint di `Code.gs`:
```javascript
function doPost(e) {
  // ...
  case 'newAction':
    response = handleNewAction(postData);
    break;
  // ...
}
```

## 🔧 Konfigurasi

### Google Apps Script (Code.gs)

```javascript
const SHEET_ID = "YOUR_GOOGLE_SHEETS_ID";
const SHEET_ABSEN = "ABSEN";
const SHEET_SISWA = "SISWA";
const SHEET_GURU = "GURU";
const SHEET_IZIN = "IZIN";
const SHEET_HARILIBUR = "HARILIBUR";
const SHEET_EVENT = "EVENT";
```

### Frontend (js/config.js)

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 📊 Struktur Google Sheets

### Sheet SISWA
| NIS | KELAS | NAMA | PASSWORD | Email | NISN | TEMPAT LAHIR | TANGGAL LAHIR | JENIS KELAMIN | AGAMA | STATUS DALAM KELUARGA | ANAK KE | ALAMAT PESERTA DIDIK | NOMOR TELPON RUMAH | SEKOLAH ASAL | NAMA AYAH | NAMA IBU | PEKERJAAN AYAH | PEKERJAAN IBU | ALAMAT ORANG TUA | NOMOR TELPON ORANG TUA | NAMA WALI SISWA | ALAMAT WALI SISWA | NOMER TELPON WALI SISWA | PEKERJAAN WALI SISWA |
|-----|-------|------|----------|-------|------|--------------|---------------|---------------|-------|------------------------|---------|-----------------------|--------------------|-------------|-----------|----------|----------------|----------------|----------------|------------------------|-----------------|-----------------|-------------------------|--------------------|

Menu KTDS menampilkan data dalam mode baca terlebih dahulu; tombol edit membuka formulir. Data kosong ditampilkan sebagai `-`. NISN wajib berisi 10 digit jika diisi, sedangkan NISN dan nomor telepon disimpan sebagai teks agar angka nol tidak hilang. Isian teks otomatis dijadikan huruf kapital. NIS, kelas, nama, email, dan password tidak dapat diubah melalui KTDS. Backend memakai sesi siswa yang terikat ke NIS agar siswa hanya dapat mengubah datanya sendiri; sesi berlaku enam jam.

### Sheet GURU
| EMAIL | NIP | NAMA | PASSWORD | ROLE |
|-------|-----|------|----------|------|

`ROLE` berisi `ADMIN`, `GURU`, atau `SUPERADMIN`. Akun staf dapat masuk menggunakan NIP atau email. Atur `SUPERADMIN` secara langsung pada sheet; role ini tidak dapat diubah lewat menu aplikasi. Admin dan superadmin dapat melihat daftar guru dan mengubah role akun guru/admin. Endpoint pengelolaan memvalidasi sesi staf dan role terhadap sheet di backend. Admin dan superadmin dapat melihat, menambah, serta mengedit event di sheet `EVENT`; penghapusan event hanya tersedia untuk superadmin. Admin dan superadmin dapat menambah, mengedit, serta menghapus hari libur di sheet `HARILIBUR`; daftar ini juga digunakan untuk menandai hari libur pada kehadiran. Pengaturan tanggal pulang cepat di sheet `PULANGCEPAT` hanya tersedia bagi superadmin.

Dashboard guru, admin, dan superadmin menampilkan ringkasan absensi hari ini: total siswa, hadir, izin, sakit, terlambat, alpa, belum absen, dan libur/HB. Kartu ringkasan menampilkan persentase dan progress bar dalam slider otomatis; gunakan indikator titik atau geser kartu ke kiri/kanan untuk berpindah manual. Setelah navigasi manual, slider melanjutkan perpindahan otomatis lagi setelah lima detik tanpa aktivitas. Klik kartu untuk menyorot kategori dan membaca jumlah/persentasenya. Data dimuat dari sheet `SISWA`, `ABSEN`, `IZIN`, `EVENT`, dan `HARILIBUR`, dan dapat diperbarui melalui tombol muat ulang.

Menu Pantau Absensi langsung menampilkan pilihan kelas setelah dibuka dan menampilkan nama/NIS siswa setelah kelas dipilih. Nama wali kelas dan guru BK untuk kelas terpilih dibaca dari sheet `BK` dengan kolom `KELAS`, `WALIKELAS`, dan `GURUBK`. Keterangan memakai kode yang sama dengan halaman siswa: `H`, `A`, `I`, `S`, `T`, `TAP`, `TAM`, `TAPT`, `P`, `PT`, `HB`, dan `OFF`; status “Belum absen” juga ditampilkan sebagai `A`. Menu Data Izin tersedia untuk guru, admin, dan superadmin; tanggal awalnya hari ini dan ditampilkan di bawah tombol Terapkan dengan format hari, tanggal, bulan, dan tahun. Tabel menampilkan kelas, nama/NIS, serta keterangan singkat. Tanggal/kelas dapat difilter dari sheet `IZIN`. Endpoint backend memverifikasi token sesi dan role untuk setiap permintaan. Token kedaluwarsa setelah enam jam dan dicabut saat logout.

### Sheet ABSEN
| ID | Tanggal | Jam Masuk | Jam Pulang | NIS | Keterangan |
|----|---------|-----------|------------|-----|------------|

### Sheet BK
| KELAS | WALIKELAS | GURUBK |
|-------|-----------|--------|

Data wali kelas dan guru BK ditampilkan pada Pantau Absensi setelah kelas dipilih. Setiap kelas sebaiknya memiliki satu baris pemetaan.

### Sheet IZIN
| TANGGAL | HARI | KELAS | NAMA SISWA | NIS | KETERANGAN |
|---------|------|-------|------------|-----|------------|

Data ini ditampilkan melalui menu **Data Izin** untuk guru, admin, dan superadmin. Filter awal menampilkan tanggal hari ini; kosongkan tanggal atau pilih tanggal/kelas lain untuk menampilkan catatan sesuai filter.

### Sheet HARILIBUR
| TANGGAL | NAMA KEGIATAN |
|---------|---------------|

### Sheet EVENT
| TANGGAL | NAMA KEGIATAN |
|---------|---------------|

Isi `TANGGAL` dengan nilai tanggal Google Sheets dan `NAMA KEGIATAN` dengan nama hari libur. Menu pengaturan hari libur tersedia untuk admin dan superadmin.

### Sheet EVENT
| TANGGAL | NAMA KEGIATAN |
|---------|---------------|

Isi `TANGGAL` dengan nilai tanggal Google Sheets dan `NAMA KEGIATAN` dengan nama event. Menu Event tersedia untuk admin dan superadmin. Pada tanggal event, catatan hadir siswa ditampilkan sebagai `HB` dengan satu kali absen masuk dan tanpa jam pulang; siswa tanpa catatan absensi berstatus `A`.

Backend pada proyek ini membaca catatan kehadiran dari sheet `ABSEN`, tetapi tidak memiliki endpoint untuk menulis catatan absensi. Karena itu, penandaan `HB` dilakukan saat data ditampilkan; pencatat absensi yang mengisi sheet tetap perlu mengirim satu catatan masuk pada tanggal event.

### Sheet PULANGCEPAT
| TANGGAL | NAMA KEGIATAN |
|---------|---------------|

Menu Pulang Cepat hanya ditampilkan untuk superadmin. Isi `TANGGAL` dengan nilai tanggal Google Sheets dan `NAMA KEGIATAN` dengan nama kegiatan; nama kosong akan ditampilkan sebagai `-`.

## 📱 Konversi ke Mobile App

### Android (WebView)
```java
WebView webView = findViewById(R.id.webview);
webView.getSettings().setJavaScriptEnabled(true);
webView.loadUrl("https://username.github.io/siabu-absensi/");
```

### iOS (WKWebView)
```swift
let webView = WKWebView()
if let url = URL(string: "https://username.github.io/siabu-absensi/") {
    webView.load(URLRequest(url: url))
}
```

### Native App dengan API

Gunakan API endpoints langsung:
```javascript
// Login
POST https://script.google.com/.../exec?action=login
Body: { "username": "12345", "password": "pass" }

// Get Absensi
GET https://script.google.com/.../exec?action=getRiwayatAbsen&nis=12345&bulan=12&tahun=2025
```

## 🐛 Troubleshooting

### CORS Error
- Pastikan Google Apps Script deployment "Who has access" = `Anyone`

### API URL tidak ditemukan
- Periksa `js/config.js` sudah dibuat dan berisi API URL yang benar
- Periksa `index.html` sudah include `<script src="js/config.js"></script>`

### Data tidak muncul
- Periksa SHEET_ID di `Code.gs` sudah benar
- Periksa nama sheet (SISWA, ABSEN, IZIN, HARILIBUR) sudah sesuai
- Periksa struktur kolom di Google Sheets

**Troubleshooting lengkap**: Lihat [DEPLOYMENT.md](DEPLOYMENT.md#-troubleshooting)

## 🔄 Update Aplikasi

### Update Frontend
```bash
git add .
git commit -m "Update: deskripsi perubahan"
git push
```
GitHub Pages akan auto-update dalam 1-2 menit.

### Update Backend
1. Edit `Code.gs` di Google Apps Script
2. Deploy → Manage deployments → Edit → New version → Deploy
3. Tidak perlu update API URL di frontend

## 🔒 Security

- ✅ `config.js` tidak di-commit ke GitHub (ada di `.gitignore`)
- ✅ Google Apps Script rate limiting built-in
- ✅ Input validation di backend
- ✅ HTTPS only

## 📝 License

© 2025 Kesiswaan SMK Negeri 1 Bumijawa

## 👥 Credits

Developed by malware

---

**🎉 Selamat menggunakan SiAbu!**

Untuk pertanyaan dan support, silakan buka issue di GitHub atau hubungi developer.

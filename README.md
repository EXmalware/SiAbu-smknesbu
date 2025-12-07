# SiAbu - Sistem Absensi Siswa SMK Negeri 1 Bumijawa

Aplikasi absensi siswa berbasis web dengan arsitektur API-based. Backend menggunakan Google Apps Script sebagai REST API, frontend di-hosting di GitHub Pages. Aplikasi sudah dioptimalkan untuk perangkat mobile dan siap dikonversi menjadi aplikasi Android/iOS.

## 🏗️ Arsitektur

```
Frontend (GitHub Pages)          Backend (Google Apps Script)      Database (Google Sheets)
┌─────────────────────┐         ┌─────────────────────┐          ┌─────────────────────┐
│   index.html        │         │   Code.gs           │          │   SISWA             │
│   css/styles.css    │ ──────> │   REST API          │ ──────>  │   ABSEN             │
│   js/script.js      │  HTTPS  │   doGet/doPost      │  R/W     │   IZIN              │
│   js/config.js      │         │                     │          │   HARILIBUR         │
└─────────────────────┘         └─────────────────────┘          └─────────────────────┘
```

## 📁 Struktur Folder

```
Project Absensi Siswa SiAbu/
├── Code.gs                 # Backend API (deploy ke Google Apps Script)
├── index.html              # HTML utama
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

## ✨ Fitur

- ✅ Login dengan NIS atau Email
- ✅ Reset password via email
- ✅ Kalender absensi interaktif
- ✅ Dark mode / Light mode
- ✅ Filter berdasarkan bulan dan tahun
- ✅ Summary dashboard (Hadir, Absen, Terlambat, Izin)
- ✅ Detail absensi per tanggal
- ✅ Update profil dan password
- ✅ Generate laporan PDF
- ✅ Share detail absensi
- ✅ **Responsive design untuk mobile**
- ✅ **Mobile menu dengan ellipsis**
- ✅ **REST API ready untuk mobile app**

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
const SHEET_IZIN = "IZIN";
```

### Frontend (js/config.js)

```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

## 📊 Struktur Google Sheets

### Sheet SISWA
| NIS | NAMA | PASSWORD | EMAIL |
|-----|------|----------|-------|

### Sheet ABSEN
| ID | Tanggal | Jam Masuk | Jam Pulang | NIS | Keterangan |
|----|---------|-----------|------------|-----|------------|

### Sheet IZIN
| TANGGAL | HARI | KELAS | NAMA SISWA | NIS | KETERANGAN |
|---------|------|-------|------------|-----|------------|

### Sheet HARILIBUR
| Tanggal |
|---------|

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

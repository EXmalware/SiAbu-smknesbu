# Deployment Guide: SiAbu - Sistem Absensi

Panduan lengkap untuk deploy aplikasi SiAbu dengan arsitektur API-based (Backend di Google Apps Script + Frontend di GitHub Pages).

---

## 📋 Prerequisites

- Akun Google (untuk Google Apps Script)
- Akun GitHub (untuk hosting frontend)
- Google Sheets dengan data absensi
- Text editor (VS Code, Sublime, dll)

---

## 🚀 Part 1: Deploy Backend (Google Apps Script)

### Step 1: Buka Google Apps Script

1. Akses https://script.google.com
2. Klik **New Project**
3. Rename project menjadi "SiAbu API" atau nama lain

### Step 2: Upload Code.gs

1. Hapus kode default di `Code.gs`
2. Copy semua konten dari file `Code.gs` lokal Anda
3. Paste ke editor Google Apps Script
4. **PENTING**: Update `SHEET_ID` dengan ID Google Sheets Anda:
   ```javascript
   const SHEET_ID = "YOUR_GOOGLE_SHEETS_ID";
   ```

### Step 3: Deploy sebagai Web App

1. Klik **Deploy** → **New deployment**
2. Klik icon ⚙️ (gear) di samping "Select type"
3. Pilih **Web app**
4. Konfigurasi:
   - **Description**: "SiAbu API v1"
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` (agar bisa diakses dari GitHub Pages)
5. Klik **Deploy**
6. **Copy Deployment URL** - Anda akan membutuhkan ini!
   - Format: `https://script.google.com/macros/s/XXXXX/exec`

### Step 4: Test API

Test API dengan browser atau Postman:

**Test getFilterData:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getFilterData
```

**Test login (POST):**
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"12345","password":"password123"}'
```

---

## 🌐 Part 2: Deploy Frontend (GitHub Pages)

### Step 1: Buat Repository GitHub

1. Login ke GitHub
2. Klik **New repository**
3. Nama repository: `siabu-absensi` (atau nama lain)
4. Pilih **Public** (untuk GitHub Pages gratis)
5. **JANGAN** centang "Add README"
6. Klik **Create repository**

### Step 2: Konfigurasi API URL

1. Buka file `js/config.js`
2. Ganti `YOUR_DEPLOYMENT_ID` dengan deployment URL dari Step 1.3:
   ```javascript
   const API_URL = 'https://script.google.com/macros/s/XXXXX/exec';
   ```
3. **SIMPAN** file ini

### Step 3: Upload ke GitHub

**Opsi A: Menggunakan Git Command Line**

```bash
# Inisialisasi git
cd "e:\ANTIGRAFITY\Project Absensi Siswa SiAbu"
git init

# Add semua file
git add .

# Commit
git commit -m "Initial commit: SiAbu Absensi App"

# Add remote
git remote add origin https://github.com/USERNAME/siabu-absensi.git

# Push
git branch -M main
git push -u origin main
```

**Opsi B: Menggunakan GitHub Desktop**

1. Download dan install GitHub Desktop
2. File → Add Local Repository
3. Pilih folder project
4. Publish repository

**Opsi C: Upload Manual via Web**

1. Di halaman repository GitHub, klik **uploading an existing file**
2. Drag & drop semua file/folder:
   - `index.html`
   - `css/` folder
   - `js/` folder
   - `README.md`
3. Commit changes

### Step 4: Enable GitHub Pages

1. Di repository, klik **Settings**
2. Scroll ke **Pages** (di sidebar kiri)
3. Di **Source**, pilih:
   - Branch: `main`
   - Folder: `/ (root)`
4. Klik **Save**
5. Tunggu 1-2 menit
6. GitHub Pages URL akan muncul:
   - Format: `https://username.github.io/siabu-absensi/`

### Step 5: Test Aplikasi

1. Buka GitHub Pages URL
2. Test login dengan kredensial dari Google Sheets
3. Test semua fitur:
   - ✅ Login
   - ✅ Kalender absensi
   - ✅ Filter bulan/tahun
   - ✅ Dark mode
   - ✅ Profil
   - ✅ PDF download

---

## 🔧 Troubleshooting

### Error: "CORS policy"

**Solusi**: Pastikan Google Apps Script deployment setting "Who has access" = `Anyone`

### Error: "API_URL is not defined"

**Solusi**: 
1. Periksa file `js/config.js` sudah ter-upload
2. Periksa `index.html` sudah include `<script src="js/config.js"></script>`

### Error: "Failed to fetch"

**Solusi**:
1. Periksa API URL di `config.js` sudah benar
2. Test API URL langsung di browser
3. Periksa Google Apps Script deployment masih aktif

### Aplikasi tidak load di GitHub Pages

**Solusi**:
1. Tunggu 5-10 menit setelah enable GitHub Pages
2. Clear browser cache (Ctrl+Shift+R)
3. Periksa console browser untuk error (F12)

### Data tidak muncul

**Solusi**:
1. Periksa SHEET_ID di Code.gs sudah benar
2. Periksa nama sheet (SISWA, ABSEN, IZIN, HARILIBUR) sudah sesuai
3. Periksa struktur kolom di Google Sheets

---

## 🔄 Update Aplikasi

### Update Frontend (GitHub Pages)

1. Edit file lokal
2. Commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "Update: deskripsi perubahan"
   git push
   ```
3. Tunggu 1-2 menit, GitHub Pages akan auto-update

### Update Backend (Google Apps Script)

1. Edit `Code.gs` di Google Apps Script editor
2. Klik **Deploy** → **Manage deployments**
3. Klik ✏️ (edit) di deployment yang aktif
4. Ubah **Version** menjadi "New version"
5. Klik **Deploy**
6. **TIDAK PERLU** update API URL di frontend

---

## 🔒 Security Best Practices

### 1. Jangan Commit config.js ke GitHub

File `config.js` sudah ada di `.gitignore`. Jika sudah ter-commit:

```bash
# Remove from git history
git rm --cached js/config.js
git commit -m "Remove config.js from tracking"
git push
```

### 2. Gunakan Environment Variables (Advanced)

Untuk production, gunakan GitHub Actions untuk inject API URL:

```yaml
# .github/workflows/deploy.yml
- name: Set API URL
  run: |
    echo "const API_URL = '${{ secrets.API_URL }}';" > js/config.js
```

### 3. Rate Limiting

Google Apps Script memiliki quota limits:
- 20,000 URL Fetch calls/day
- 30,000 Script executions/day

Monitor usage di: https://script.google.com/home/executions

---

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

### Progressive Web App (PWA)

Tambahkan `manifest.json` untuk install di home screen mobile.

---

## 📊 Monitoring

### Google Apps Script Logs

1. Buka Google Apps Script project
2. Klik **Executions** (di sidebar)
3. Lihat semua API calls dan errors

### GitHub Pages Analytics

Gunakan Google Analytics atau Vercel Analytics untuk tracking visitors.

---

## 🆘 Support

Jika ada masalah:
1. Periksa browser console (F12)
2. Periksa Google Apps Script logs
3. Periksa GitHub Actions logs (jika ada)

---

## ✅ Checklist Deployment

- [ ] Google Sheets sudah siap dengan data
- [ ] Code.gs sudah di-deploy di Google Apps Script
- [ ] API URL sudah di-copy
- [ ] config.js sudah diupdate dengan API URL
- [ ] Repository GitHub sudah dibuat
- [ ] Semua file sudah di-upload ke GitHub
- [ ] GitHub Pages sudah di-enable
- [ ] Test login berhasil
- [ ] Test semua fitur berhasil
- [ ] Mobile responsive sudah di-test

**Selamat! Aplikasi SiAbu sudah online! 🎉**

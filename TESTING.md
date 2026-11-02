# Testing Results & CORS Fix

## Testing Summary

✅ **Aplikasi berhasil load di localhost:8000**
- HTML, CSS, JavaScript semua ter-load dengan benar
- UI tampil dengan sempurna
- Dark/Light mode toggle berfungsi

❌ **CORS Error saat login**
- Error: `Access to fetch at 'https://script.google.com/...' from origin 'http://localhost:8000' has been blocked by CORS policy`
- Ini adalah **expected behavior** karena Google Apps Script belum dikonfigurasi untuk CORS

---

## Screenshot Evidence

![Initial Load](file:///C:/Users/ddavi/.gemini/antigravity/brain/762b1624-a23e-4071-81fe-c0cedfb7bcf9/initial_load_local_1765030602711.png)

![CORS Error](file:///C:/Users/ddavi/.gemini/antigravity/brain/762b1624-a23e-4071-81fe-c0cedfb7bcf9/login_attempt_console_2_1765030677432.png)

---

## Issue: CORS Error

### Problem
Google Apps Script tidak mengizinkan requests dari `localhost:8000` karena CORS policy.

### Root Cause
Google Apps Script secara default tidak menambahkan CORS headers ke response. Kita perlu menambahkan headers secara manual.

### Solution

**CATATAN PENTING**: Google Apps Script **TIDAK MENDUKUNG** custom CORS headers untuk Web Apps yang di-deploy dengan "Execute as: Me".

Ada 2 solusi:

#### Solusi 1: Deploy ke GitHub Pages (RECOMMENDED)

Karena Google Apps Script Web Apps sudah otomatis mengizinkan requests dari domain HTTPS (termasuk GitHub Pages), cara terbaik adalah:

1. **Deploy frontend ke GitHub Pages**
2. **Test dari GitHub Pages URL** (bukan localhost)

**Keuntungan:**
- ✅ Tidak ada CORS issues
- ✅ HTTPS secure
- ✅ Production-ready
- ✅ Gratis

**Langkah:**
```bash
# 1. Init git repository
git init
git add .
git commit -m "Initial commit"

# 2. Create GitHub repo dan push
git remote add origin https://github.com/USERNAME/siabu-absensi.git
git push -u origin main

# 3. Enable GitHub Pages
# Settings → Pages → Source: main branch
```

#### Solusi 2: Test dengan JSONP (Workaround untuk localhost)

Jika ingin test di localhost, gunakan JSONP callback:

**Update Code.gs:**
```javascript
function doGet(e) {
  const callback = e.parameter.callback;
  const action = e.parameter.action;
  
  // ... existing code ...
  
  if (callback) {
    // JSONP response
    return ContentService.createTextOutput(
      callback + '(' + JSON.stringify(response) + ')'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Normal JSON response
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**Update script.js:**
```javascript
function apiCall(action, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Date.now();
    
    window[callbackName] = function(response) {
      delete window[callbackName];
      resolve(response);
    };
    
    const params = new URLSearchParams({
      action: action,
      callback: callbackName,
      ...data
    });
    
    const script = document.createElement('script');
    script.src = `${API_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });
}
```

**Kekurangan:**
- ❌ Hanya untuk GET requests
- ❌ Tidak secure untuk production
- ❌ Workaround saja

---

### Local Development: Mock Mode

Untuk menguji UI lokal tanpa memanggil Google Apps Script:

1. Ubah `USE_MOCK_API` menjadi `true` di `js/config.js`.
2. Jalankan aplikasi melalui server lokal.
3. Gunakan salah satu akun simulasi berikut:

| Role | Username | Password |
|------|----------|----------|
| Siswa | `24111003` atau `siswa@mock.test` | `student-mock` |
| Guru | `1988123` atau `guru@mock.test` | `teacher-mock` |
| Admin | `1977001` atau `admin@mock.test` | `admin-mock` |
| Superadmin | `1965001` atau `superadmin@mock.test` | `superadmin-mock` |

Admin dan superadmin dapat mencoba menu Kelola Guru; akun simulasi `SUPERADMIN` tidak dapat diubah rolenya. Semua akun staf dapat membuka Pantau Absensi tanpa konfirmasi password ulang, memilih kelas, dan menampilkan daftar siswa simulasi. Akses pemantauan memakai token sesi yang diterbitkan ketika staf login dan dicabut saat logout. Mock hanya menggunakan data dummy; login ini tidak memverifikasi akun di Google Sheets. Kembalikan `USE_MOCK_API` ke `false` sebelum deploy.

---

## Recommendation

### Untuk Development & Testing:

**Gunakan GitHub Pages** (Solusi 1) karena:
1. Tidak ada CORS issues
2. Environment sama dengan production
3. Mudah untuk share dengan team
4. Gratis dan cepat

### Deployment Flow:

```
1. Develop di localhost (edit files)
2. Commit & push ke GitHub
3. GitHub Pages auto-deploy
4. Test di GitHub Pages URL
5. Repeat
```

### Untuk Production:

Deploy ke GitHub Pages dan gunakan custom domain jika perlu:
- `siabu.smknesbu.sch.id` (contoh)

---

### Update Penting (7 Des 2025): Fix CORS Production

Kami menemukan bahwa header `Content-Type: application/json` menyebabkan error CORS di production (Preflight check failed).
Fix telah diterapkan dengan menghapus header tersebut. Request body tetap dikirim sebagai JSON string, namun browser akan menganggapnya sebagai "Simple Request" (text/plain) sehingga melewati pemeriksaan preflight.

### Next Steps

1. **Push Changes ke GitHub** (file `js/script.js` telah diupdate).
2. Tunggu deployment GitHub Pages selesai.
3. Refresh halaman live dan coba login kembali.

---

## Alternative: Test API Langsung

Jika ingin test API tanpa frontend, gunakan Postman atau curl:

**Test getFilterData:**
```bash
curl "https://script.google.com/macros/s/AKfycbx9hqGDzTdNpP9g_uLOZfTsZHCYYGjA6dcMV8pwyTsQ24YT6gDR7L6160xi79jWlbM1/exec?action=getFilterData"
```

**Test login:**
```bash
curl -X POST "https://script.google.com/macros/s/AKfycbx9hqGDzTdNpP9g_uLOZfTsZHCYYGjA6dcMV8pwyTsQ24YT6gDR7L6160xi79jWlbM1/exec?action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"24111003","password":"smknesbu"}'
```

Ini akan memverifikasi bahwa API backend berfungsi dengan baik.

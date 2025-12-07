const SHEET_ID = "19hVVj4YeXzm407382579_MLe9PbeBMO4H7KXoJfMEnE";
const SHEET_ABSEN = "ABSEN";
const SHEET_SISWA = "SISWA";
const SHEET_IZIN = "IZIN";

/**
 * Handle GET requests - API Router
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // CORS headers
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    let response = {};
    
    switch(action) {
      case 'getFilterData':
        response = getFilterData();
        break;
        
      case 'getRiwayatAbsen':
        const nis = e.parameter.nis;
        const bulan = parseInt(e.parameter.bulan);
        const tahun = parseInt(e.parameter.tahun);
        response = getRiwayatAbsen(nis, bulan, tahun);
        break;
        
      case 'getProfile':
        response = getProfile(e.parameter.nis);
        break;
        
      case 'createPdfReport':
        const pdfNis = e.parameter.nis;
        const pdfBulan = parseInt(e.parameter.bulan);
        const pdfTahun = parseInt(e.parameter.tahun);
        response = createPdfReport(pdfNis, pdfBulan, pdfTahun);
        break;
        
      default:
        response = { status: "error", message: "Invalid action" };
    }
    
    output.setContent(JSON.stringify(response));
    return output;
    
  } catch (err) {
    Logger.log('Error in doGet: ' + err.stack);
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ 
      status: "error", 
      message: err.message 
    }));
    return output;
  }
}

/**
 * Handle POST requests - API Router
 */
function doPost(e) {
  try {
    const action = e.parameter.action;
    
    // Parse JSON body
    let postData = {};
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      // If not JSON, use parameters
      postData = e.parameter;
    }
    
    // CORS headers
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    
    let response = {};
    
    switch(action) {
      case 'login':
        response = loginUser(postData.username, postData.password);
        break;
        
      case 'forgotPassword':
        response = forgotPassword(postData.email);
        break;
        
      case 'updateProfile':
        response = updateProfile(postData.nis, postData.newPassword, postData.newEmail);
        break;
        
      default:
        response = { status: "error", message: "Invalid action" };
    }
    
    output.setContent(JSON.stringify(response));
    return output;
    
  } catch (err) {
    Logger.log('Error in doPost: ' + err.stack);
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(JSON.stringify({ 
      status: "error", 
      message: err.message 
    }));
    return output;
  }
}

function loginUser(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();

    const user = data.find(r =>
        (String(r[0]) === String(username) || String(r[3]) === String(username)) &&
        String(r[2]) === String(password)
    );

    if (user) {
      return { nis: user[0], nama: user[1], email: user[3] || "", status: "success" };
    } else {
      return { status: "error", message: "NIS/Email atau password salah" };
    }
  } catch (e) {
    return { status: "error", message: e.message };
  }
}

function forgotPassword(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const rowIndex = data.findIndex(r => String(r[3]).toLowerCase() === String(email).toLowerCase());

    if (rowIndex === -1) {
      return { status: "error", message: "Email tidak ditemukan." };
    }

    const row = rowIndex + 2;
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    sheet.getRange(row, 3).setValue(newPassword);

    MailApp.sendEmail(email, "Reset Password Absensi", `Kata sandi baru Anda adalah: ${newPassword}. Silakan login dan ubah kata sandi Anda di halaman profil.`);
    return { status: "success", message: `Kata sandi baru telah dikirim ke email ${email}. Silakan cek email Anda.` };
  } catch (e) {
    Logger.log(e);
    return { status: "error", message: `Terjadi kesalahan saat mereset password: ${e.message}` };
  }
}

/**
 * Helper function to format time values.
 * It handles both Date objects and numerical time values.
 * @param {Date|number|string} timeValue The value to format.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet The active spreadsheet object.
 * @return {string} Formatted time string (HH:mm) or "-".
 */
function formatTime(timeValue, spreadsheet) {
  if (timeValue instanceof Date) {
    return Utilities.formatDate(timeValue, spreadsheet.getSpreadsheetTimeZone(), "HH:mm");
  } else if (typeof timeValue === 'number') {
    // Treat numerical value as fraction of a day
    const hours = Math.floor(timeValue * 24);
    const minutes = Math.round((timeValue * 24 * 60) % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else if (typeof timeValue === 'string' && timeValue.trim() !== "") {
    // If it's already a string, return it as is if not empty
    return timeValue;
  }
  return "-";
}

/**
 * Mengambil riwayat absen siswa dan menggabungkannya dengan data hari libur.
 * @param {string} nis NIS siswa.
 * @param {number} bulan Bulan yang dipilih.
 * @param {number} tahun Tahun yang dipilih.
 * @return {object[]} Data riwayat absen yang sudah diproses.
 */
function getRiwayatAbsen(nis, bulan, tahun) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const absenSheet = ss.getSheetByName(SHEET_ABSEN);
  const siswaSheet = ss.getSheetByName(SHEET_SISWA);
  const izinSheet = ss.getSheetByName(SHEET_IZIN);

  if (!absenSheet || !siswaSheet) {
    return { status: "error", message: "Sheet ABSEN atau SISWA tidak ditemukan." };
  }

  const holidayDates = getHolidayDates();

  const dataMap = {};
  
  // Mengambil dan memproses data Absensi
  const absenRecords = absenSheet.getDataRange().getValues();
  const headerAbsen = absenRecords.shift();
  const nisIndexAbsen = headerAbsen.indexOf("NIS"); // Kolom E (indeks 4)
  const tanggalIndex = headerAbsen.indexOf("Tanggal"); // Kolom B (indeks 1)
  const keteranganIndex = headerAbsen.indexOf("Keterangan"); // Kolom F (indeks 5)
  const jamMasukIndex = headerAbsen.indexOf("Jam Masuk"); // Kolom C (indeks 2)
  const jamPulangIndex = headerAbsen.indexOf("Jam Pulang"); // Kolom D (indeks 3)

  if (nisIndexAbsen === -1 || tanggalIndex === -1 || keteranganIndex === -1 || jamMasukIndex === -1 || jamPulangIndex === -1) {
    return { status: "error", message: "Salah satu kolom wajib (NIS, Tanggal, Keterangan, Jam Masuk, Jam Pulang) tidak ditemukan di sheet ABSEN." };
  }

  absenRecords.filter(row => String(row[nisIndexAbsen]) === String(nis)).forEach(row => {
    const tanggal = row[tanggalIndex];
    if (tanggal instanceof Date) {
      const dateKey = Utilities.formatDate(tanggal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
      const keterangan = row[keteranganIndex] || "";
      dataMap[dateKey] = {
        tanggal: Utilities.formatDate(tanggal, ss.getSpreadsheetTimeZone(), "dd-MM-yyyy"),
        keterangan: keterangan,
        jamMasuk: keterangan === "HB" ? "-" : formatTime(row[jamMasukIndex], ss),
        jamPulang: keterangan === "HB" ? "-" : formatTime(row[jamPulangIndex], ss)
      };
    }
  });

  // Mengambil dan memproses data Izin dengan struktur baru: TANGGAL, HARI, KELAS, NAMA SISWA, NIS, KETERANGAN
  if (izinSheet) {
    const izinRecords = izinSheet.getDataRange().getValues();
    const headerIzin = izinRecords.shift();
    const nisIndexIzin = headerIzin.indexOf("NIS");
    const tanggalIndexIzin = headerIzin.indexOf("TANGGAL");
    const keteranganIndexIzin = headerIzin.indexOf("KETERANGAN");
    izinRecords.filter(row => String(row[nisIndexIzin]) === String(nis)).forEach(row => {
      const tanggal = row[tanggalIndexIzin];
      let keterangan = row[keteranganIndexIzin] || "I";
      if (tanggal instanceof Date) {
        const dateKey = Utilities.formatDate(tanggal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
        let standardizedKeterangan = keterangan.toUpperCase();
        if (standardizedKeterangan.includes('S') || standardizedKeterangan.includes('SAKIT')) {
          standardizedKeterangan = "S";
        } else {
          standardizedKeterangan = "I";
        }
        if (!dataMap[dateKey]) {
          dataMap[dateKey] = {
            tanggal: Utilities.formatDate(tanggal, ss.getSpreadsheetTimeZone(), "dd-MM-yyyy"),
            keterangan: standardizedKeterangan,
            jamMasuk: "-",
            jamPulang: "-"
          };
        }
      }
    });
  }

  const processedData = [];
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(tahun, bulan - 1, i);
    const dateKey = Utilities.formatDate(currentDate, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    let status = "";
    const dayData = dataMap[dateKey];
    
    // Prioritas 1: Jika ada data di sheet ABSEN atau IZIN (termasuk HB)
    if (dayData) {
      status = dayData.keterangan;
    }
    // Prioritas 2: Cek apakah tanggal adalah hari libur (OFF)
    else if (holidayDates.has(dateKey)) {
      status = "OFF";
    }
    // Prioritas 3: Cek apakah hari Sabtu atau Minggu
    else if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      status = "OFF";
    }
    // Prioritas 4: Jika tidak ada data absen/izin atau hari libur
    else {
      status = "A";
    }

    processedData.push({
      tanggal: Utilities.formatDate(currentDate, ss.getSpreadsheetTimeZone(), "dd-MM-yyyy"),
      keterangan: status,
      jamMasuk: (status === "OFF" || status === "HB") ? "-" : (dayData ? dayData.jamMasuk : "-"),
      jamPulang: (status === "OFF" || status === "HB") ? "-" : (dayData ? dayData.jamPulang : "-")
    });
  }

  return processedData;
}

function getProfile(nis) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const row = data.find(r => String(r[0]) === String(nis));
    if (row) {
      return { status: "success", nis: row[0], nama: row[1], email: row[3] || "" };
    } else {
      return { status: "error", message: "Profil tidak ditemukan." };
    }
  } catch (e) {
    Logger.log(e);
    return { status: "error", message: e.message };
  }
}

function updateProfile(nis, newPassword, newEmail) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const rowIndex = data.findIndex(r => String(r[0]) === String(nis));
    if (rowIndex === -1) {
      return { status: "error", message: "Profil tidak ditemukan." };
    }
    const row = rowIndex + 2;
    if (newPassword) {
      sheet.getRange(row, 3).setValue(newPassword);
    }
    sheet.getRange(row, 4).setValue(newEmail);
    return { status: "success", message: "Profil berhasil diperbarui." };
  } catch (e) {
    Logger.log(e);
    return { status: "error", message: e.message };
  }
}

function getNama(nis) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const row = data.find(r => String(r[0]) === String(nis));
    if (row) {
      return row[1];
    }
    return null;
  } catch (e) {
    Logger.log(e);
    return null;
  }
}

function getHari(date) {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return hari[date.getDay()];
}

function getBulanList() {
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return bulan.map((nama, index) => ({ id: index + 1, nama: nama }));
}

function getTahunList() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 3; i <= currentYear; i++) {
    years.push(i);
  }
  return years;
}

function getFilterData() {
  return {
    bulan: getBulanList(),
    tahun: getTahunList()
  };
}

/**
 * Mengambil daftar tanggal libur dari sheet 'HARILIBUR'.
 * @return {Set<string>} Set berisi tanggal libur dalam format 'YYYY-MM-DD'.
 */
function getHolidayDates() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const holidaySheet = ss.getSheetByName("HARILIBUR");
  if (!holidaySheet) {
    console.error("Sheet 'HARILIBUR' tidak ditemukan.");
    return new Set();
  }
  const range = holidaySheet.getRange("A2:A" + holidaySheet.getLastRow());
  const values = range.getValues();
  const dates = new Set();
  values.forEach(row => {
    const date = row[0];
    if (date instanceof Date) {
      dates.add(Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd"));
    }
  });
  return dates;
}

/**
 * Mengambil riwayat absen siswa dan menghasilkan file PDF.
 * @param {string} nis NIS siswa.
 * @param {number} bulan Bulan yang dipilih.
 * @param {number} tahun Tahun yang dipilih.
 * @return {object} Object containing base64-encoded PDF and filename.
 */
function createPdfReport(nis, bulan, tahun) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const siswaSheet = ss.getSheetByName(SHEET_SISWA);
    if (!siswaSheet) throw new Error("Sheet SISWA tidak ditemukan.");

    // Dapatkan data siswa
    const siswaData = siswaSheet.getRange(2, 1, siswaSheet.getLastRow() - 1, 4).getValues();
    const headerSiswa = siswaSheet.getRange(1, 1, 1, 4).getValues()[0];
    const lowerHeader = headerSiswa.map(h => h.toString().toLowerCase());
    const nisIndexSiswa = lowerHeader.indexOf("nis");
    const namaIndexSiswa = lowerHeader.indexOf("nama");

    if (nisIndexSiswa === -1 || namaIndexSiswa === -1) {
      throw new Error("Kolom NIS atau Nama tidak ditemukan di sheet SISWA.");
    }

    const siswa = siswaData.find(row => String(row[nisIndexSiswa]) === String(nis));
    if (!siswa) {
      throw new Error("Data siswa tidak ditemukan untuk NIS: " + nis);
    }
    const namaSiswa = siswa[namaIndexSiswa] || "Nama Tidak Ditemukan";
    
    // Dapatkan data absen
    const absenData = getRiwayatAbsen(nis, bulan, tahun);
    if (absenData.status === "error") throw new Error(absenData.message);

    // Hitung rekapitulasi
    const rekap = {
      H: 0, A: 0, I: 0, S: 0, T: 0, TAP: 0, TAPT: 0, TAM: 0, P: 0, PT: 0
    };

    absenData.forEach(day => {
      const status = day.keterangan;
      if (rekap.hasOwnProperty(status)) {
        rekap[status]++;
      } else {
        // Jika status tidak ada di rekap, anggap sebagai Alfa (A)
        rekap.A++;
      }
    });

    const namaBulan = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    
    const periode = `${namaBulan[bulan - 1]} - ${tahun}`;

    // Buat HTML untuk laporan
    let htmlContent = `
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20mm auto; 
              max-width: 800px; 
              text-align: center; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .header h1 { 
              margin: 0; 
              font-size: 24px; 
            }
            .info-box { 
              border: 1px solid #ccc; 
              padding: 10px; 
              margin: 0 auto 20px auto; 
              max-width: 600px; 
              text-align: left; 
            }
            .info-box p { 
              margin: 5px 0; 
            }
            table { 
              width: 80%; 
              border-collapse: collapse; 
              margin: 0 auto; 
            }
            th, td { 
              border: 1px solid #ccc; 
              padding: 8px; 
              text-align: center; 
            }
            th {
              background-color: #4a90e2 !important; /* Warna biru muda untuk header tabel */
              color: #007bff !important; /* Teks putih untuk kontras */
              font-weight: bold;
            }
            .summary { 
              margin: 20px auto; 
              max-width: 600px; 
              text-align: left; 
            }
            .summary-item { 
              display: inline-block; 
              width: 48%; 
              margin-bottom: 5px; 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>REKAP PERSONAL ABSEN SISWA</h1>
          </div>
          <div class="info-box">
            <p><strong>NAMA / NIS:</strong> ${namaSiswa} / ${nis}</p>
            <p><strong>Periode:</strong> ${periode}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Hari</th>
                <th>Tanggal</th>
                <th>Jam Masuk</th>
                <th>Jam Pulang</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Tambahkan data ke dalam tabel
    absenData.forEach((day, index) => {
      const tanggalObj = new Date(day.tanggal.split('-').reverse().join('-'));
      const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][tanggalObj.getDay()];
      htmlContent += `
        <tr>
          <td>${index + 1}</td>
          <td>${namaHari}</td>
          <td>${day.tanggal}</td>
          <td>${day.jamMasuk}</td>
          <td>${day.jamPulang}</td>
          <td>${day.keterangan}</td>
        </tr>
      `;
    });

    htmlContent += `
            </tbody>
          </table>
          <div class="summary">
            <h3>Rekapitulasi:</h3>
            <p>H : ${rekap.H} | A : ${rekap.A} | I : ${rekap.I} | S : ${rekap.S} | T : ${rekap.T} | TAP : ${rekap.TAP} | TAPT : ${rekap.TAPT} | TAM : ${rekap.TAM} | P : ${rekap.P} | PT : ${rekap.PT}</p>
          </div>
        </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(htmlContent);
    const pdfBlob = htmlOutput.getAs('application/pdf');
    const fileName = `Laporan_Absensi_${namaSiswa}_${bulan}-${tahun}.pdf`;
    const base64Data = Utilities.base64Encode(pdfBlob.getBytes());

    return { status: "success", base64: base64Data, fileName: fileName };
  } catch (e) {
    Logger.log(e);
    return { status: "error", message: `Terjadi kesalahan saat membuat laporan PDF: ${e.message}` };
  }
}
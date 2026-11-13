function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index2')
    .setTitle('Absensi Siswa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Fungsi pembantu untuk membuat objek waktu dari string HH:mm:ss dengan baseDate
function createTimeObject(timeString, baseDate = new Date()) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  const timeDate = new Date(baseDate);
  timeDate.setHours(hours, minutes, seconds, 0);
  return timeDate;
}

// Fungsi untuk normalisasi waktu dari sheet ke baseDate
function normalizeTime(dateObj, baseDate) {
  if (!dateObj) return null;
  const norm = new Date(baseDate);
  norm.setHours(dateObj.getHours(), dateObj.getMinutes(), dateObj.getSeconds(), dateObj.getMilliseconds());
  return norm;
}

function processLog(logData) {
  const spreadsheetId = "19hVVj4YeXzm407382579_MLe9PbeBMO4H7KXoJfMEnE";
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheetAbsen = ss.getSheetByName("ABSEN");
  const sheetEvent = ss.getSheetByName("EVENT");

  const timeZone = 'Asia/Jakarta';

  // Ambil tanggal dari log pertama
  const firstLogTime = new Date(logData[0].timestamp);
  const baseDate = new Date(firstLogTime.getFullYear(), firstLogTime.getMonth(), firstLogTime.getDate());
  const scanDateToday = Utilities.formatDate(firstLogTime, timeZone, "dd-MM-yyyy");
  const dayOfWeek = firstLogTime.getDay();

  const jamMasukIdealStr = '07:00:59';
  const jamMasukAkhirStr = '09:30:59';
  const jamPulangMulaiStr = '09:31:00';
  const jamPulangIdealBiasaStr = '15:25:00';
  const jamPulangIdealJumatStr = '11:25:00';

  const isFriday = dayOfWeek === 5;
  const jamPulangIdealStr = isFriday ? jamPulangIdealJumatStr : jamPulangIdealBiasaStr;

  const jamMasukIdeal = createTimeObject(jamMasukIdealStr, baseDate);
  const jamMasukAkhir = createTimeObject(jamMasukAkhirStr, baseDate);
  const jamPulangMulai = createTimeObject(jamPulangMulaiStr, baseDate);
  const jamPulangIdeal = createTimeObject(jamPulangIdealStr, baseDate);

  // Cek hari event
  const dataEvent = sheetEvent.getDataRange().getValues().slice(1);
  const eventDates = dataEvent.map(row => Utilities.formatDate(new Date(row[0]), timeZone, "dd-MM-yyyy"));
  const isEventDay = eventDates.includes(scanDateToday);

  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) && !isEventDay;

  if (isWeekend) {
    return "Hari ini libur (Sabtu/Minggu). Kecuali hari EVENT.";
  }

  // Ambil data absen existing untuk hari ini
  const dataAbsen = sheetAbsen.getDataRange().getValues();
  let bodyData = dataAbsen.slice(1); // Skip header
  const nisMap = {};

  for (let i = 0; i < bodyData.length; i++) {
    const rowDate = Utilities.formatDate(new Date(bodyData[i][1]), timeZone, "dd-MM-yyyy");
    if (bodyData[i][4] && rowDate === scanDateToday) { // NIS di kolom 5 (index 4)
      nisMap[bodyData[i][4]] = {
        rowIndex: i + 2, // Karena slice(1), index +2 untuk range
        data: bodyData[i]
      };
    }
  }

  // Sort logData by timestamp
  logData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let newRows = [];

  logData.forEach(log => {
    const scanTime = new Date(log.timestamp);
    const scanTimeStr = Utilities.formatDate(scanTime, timeZone, 'HH:mm:ss');
    const scanTimeObj = createTimeObject(scanTimeStr, baseDate);
    const nis = log.nis;

    if (isEventDay) {
      // Untuk event, catat HB tanpa jam masuk/pulang
      if (!nisMap[nis]) {
        newRows.push([
          sheetAbsen.getLastRow() + 1 + newRows.length,
          scanTime,
          '',
          '',
          nis,
          'HB'
        ]);
      }
      return; // Skip processing lebih lanjut untuk event
    }

    const isMasuk = scanTimeObj.getTime() <= jamMasukAkhir.getTime();
    const isPulang = scanTimeObj.getTime() >= jamPulangMulai.getTime();

    if (nisMap[nis]) {
      // Update existing entry
      let existingEntry = nisMap[nis].data;
      const existingRowIndex = nisMap[nis].rowIndex;

      let jamMasuk = existingEntry[2] ? normalizeTime(new Date(existingEntry[2]), baseDate) : null;
      let jamPulang = existingEntry[3] ? normalizeTime(new Date(existingEntry[3]), baseDate) : null;

      if (isMasuk) {
        // Absen pagi: catat yang tercepat
        if (!jamMasuk || scanTime < jamMasuk) {
          jamMasuk = scanTime;
        }
      } else if (isPulang) {
        // Absen pulang: catat yang terbaru
        if (!jamPulang || scanTime > jamPulang) {
          jamPulang = scanTime;
        }
      }

      // Hitung keterangan
      let keterangan = calculateKeterangan(jamMasuk, jamPulang, jamMasukIdeal, jamPulangIdeal);

      // Update row
      sheetAbsen.getRange(existingRowIndex, 3).setValue(jamMasuk || '');
      sheetAbsen.getRange(existingRowIndex, 4).setValue(jamPulang || '');
      sheetAbsen.getRange(existingRowIndex, 6).setValue(keterangan);

      // Update nisMap untuk proses selanjutnya jika ada multiple scans
      nisMap[nis].data[2] = jamMasuk;
      nisMap[nis].data[3] = jamPulang;
      nisMap[nis].data[5] = keterangan;

    } else {
      // New entry
      let jamMasuk = null;
      let jamPulang = null;
      let keterangan = '';

      if (isMasuk) {
        jamMasuk = scanTime;
        keterangan = scanTimeObj <= jamMasukIdeal ? 'TAP' : 'TAPT'; // Belum pulang
      } else if (isPulang) {
        jamPulang = scanTime;
        keterangan = 'TAM'; // Tidak absen pagi
      }

      newRows.push([
        sheetAbsen.getLastRow() + 1 + newRows.length,
        scanTime, // Tanggal dari scanTime
        jamMasuk || '',
        jamPulang || '',
        nis,
        keterangan
      ]);

      // Tambahkan ke nisMap untuk handle multiple scans di batch yang sama
      nisMap[nis] = {
        rowIndex: sheetAbsen.getLastRow() + 1 + newRows.length, // Approximate, tapi karena batch, akan dihandle di akhir
        data: [null, scanTime, jamMasuk, jamPulang, nis, keterangan]
      };
    }
  });

  if (newRows.length > 0) {
    sheetAbsen.getRange(sheetAbsen.getLastRow() + 1, 1, newRows.length, 6).setValues(newRows);
  }

  return "Log berhasil diproses. " + logData.length + " data berhasil dikirim.";
}

function calculateKeterangan(jamMasuk, jamPulang, jamMasukIdeal, jamPulangIdeal) {
  const masukTepat = jamMasuk && jamMasuk <= jamMasukIdeal;
  const pulangTepat = jamPulang && jamPulang >= jamPulangIdeal;

  if (!jamMasuk && !jamPulang) return ''; // Belum ada absen

  if (!jamMasuk) {
    return pulangTepat ? 'TAM' : 'PT'; // Tidak masuk, pulang tepat atau cepat
  }

  if (!jamPulang) {
    return masukTepat ? 'TAP' : 'TAPT'; // Masuk tepat/terlambat, belum pulang
  }

  if (masukTepat && pulangTepat) return 'H';
  if (!masukTepat && pulangTepat) return 'T';
  if (masukTepat && !pulangTepat) return 'P';
  return 'PT';
}
  const SHEET_ID = "19hVVj4YeXzm407382579_MLe9PbeBMO4H7KXoJfMEnE";
  const SHEET_ABSEN = "ABSEN";
  const SHEET_SISWA = "SISWA";
  const SHEET_GURU = "GURU";
  const SHEET_IZIN = "IZIN";
  const SHEET_EVENT = "EVENT";
  const SHEET_HARILIBUR = "HARILIBUR";
  const SHEET_PULANGCEPAT = "PULANGCEPAT";
  const KTDS_FIELDS = [
    "NISN",
    "TEMPAT LAHIR",
    "TANGGAL LAHIR",
    "JENIS KELAMIN",
    "AGAMA",
    "STATUS DALAM KELUARGA",
    "ANAK KE",
    "ALAMAT PESERTA DIDIK",
    "NOMOR TELPON RUMAH",
    "SEKOLAH ASAL",
    "NAMA AYAH",
    "NAMA IBU",
    "PEKERJAAN AYAH",
    "PEKERJAAN IBU",
    "ALAMAT ORANG TUA",
    "NOMOR TELPON ORANG TUA",
    "NAMA WALI SISWA",
    "ALAMAT WALI SISWA",
    "NOMER TELPON WALI SISWA",
    "PEKERJAAN WALI SISWA"
  ];

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

        case 'getKtds':
          response = getKtds(postData.sessionToken);
          break;

        case 'saveKtds':
          response = saveKtds(postData);
          break;

        case 'getGuruList':
          response = getGuruList(postData.sessionToken);
          break;

        case 'updateGuruRole':
          response = updateGuruRole(
            postData.sessionToken,
            postData.targetNip,
            postData.role
          );
          break;

        case 'getMonitoringClasses':
          response = getMonitoringClasses(postData.sessionToken);
          break;

        case 'getMonitoringStudents':
          response = getMonitoringStudents(
            postData.sessionToken,
            postData.kelas
          );
          break;

        case 'getTodayAttendanceSummary':
          response = getTodayAttendanceSummary(postData.sessionToken);
          break;

        case 'getPermissionData':
          response = getPermissionData(
            postData.sessionToken,
            postData.tanggal,
            postData.kelas
          );
          break;

        case 'getEventDates':
          response = getEventDates(postData.sessionToken);
          break;

        case 'saveEvent':
          response = saveEvent(postData);
          break;

        case 'deleteEvent':
          response = deleteEvent(postData);
          break;

        case 'getHolidayActivities':
          response = getHolidayActivities(postData.sessionToken);
          break;

        case 'saveHoliday':
          response = saveHoliday(postData);
          break;

        case 'deleteHoliday':
          response = deleteHoliday(postData);
          break;

        case 'getEarlyDismissals':
          response = getEarlyDismissals(postData.sessionToken);
          break;

        case 'saveEarlyDismissal':
          response = saveEarlyDismissal(postData);
          break;

        case 'deleteEarlyDismissal':
          response = deleteEarlyDismissal(postData);
          break;

        case 'revokeStaffSession':
          response = revokeStaffSession(postData.sessionToken);
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

  function getSiswaData(sheet) {
    const lastColumn = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    if (lastColumn === 0) throw new Error("Sheet SISWA tidak memiliki header.");

    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(header => String(header).trim().toUpperCase());
    const columns = {
      nis: headers.indexOf("NIS"),
      kelas: headers.indexOf("KELAS"),
      nama: headers.indexOf("NAMA"),
      password: headers.indexOf("PASSWORD"),
      email: headers.indexOf("EMAIL")
    };
    const requiredColumns = ["nis", "nama", "password", "email"];
    const missingColumns = requiredColumns.filter(column => columns[column] === -1);
    if (missingColumns.length > 0) {
      throw new Error("Kolom wajib tidak ditemukan di sheet SISWA: " + missingColumns.join(", "));
    }

    const rows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
      : [];
    return { rows, columns };
  }

  function getGuruData(sheet) {
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) throw new Error("Sheet GURU tidak memiliki header.");

    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(header => String(header).trim().toUpperCase());
    const columns = {
      email: headers.indexOf("EMAIL"),
      nip: headers.indexOf("NIP"),
      nama: headers.indexOf("NAMA"),
      password: headers.indexOf("PASSWORD"),
      role: headers.indexOf("ROLE")
    };
    const missingColumns = Object.keys(columns).filter(column => columns[column] === -1);
    if (missingColumns.length) {
      throw new Error("Kolom wajib tidak ditemukan di sheet GURU: " + missingColumns.join(", "));
    }

    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues()
      : [];
    return { rows, columns };
  }

  function findGuruAccount(rows, columns, username, password) {
    const normalizedUsername = String(username || "").trim();
    const normalizedEmail = normalizedUsername.toLowerCase();
    const suppliedPassword = String(password || "");
    const rowIndex = rows.findIndex(row =>
      (String(row[columns.email] || "").trim().toLowerCase() === normalizedEmail ||
        String(row[columns.nip] || "").trim() === normalizedUsername) &&
      String(row[columns.password] || "") === suppliedPassword
    );
    return rowIndex;
  }

  function authenticateGuruManager(sessionToken) {
    const session = authenticateMonitoringStaff(sessionToken);
    if (!["ADMIN", "SUPERADMIN"].includes(session.role)) {
      throw new Error("Hanya admin atau superadmin yang dapat mengelola data guru.");
    }
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_GURU);
    if (!sheet) throw new Error("Sheet GURU tidak ditemukan.");
    const data = getGuruData(sheet);
    const matchingRows = data.rows.reduce((matches, row, index) => {
      if (String(row[data.columns.nip] || "").trim() === session.nip) matches.push(index);
      return matches;
    }, []);
    if (matchingRows.length !== 1) {
      throw new Error("Akun admin tidak ditemukan atau NIP terdaftar ganda.");
    }
    return { sheet, data, rowIndex: matchingRows[0], role: session.role };
  }

  function createStaffSession(nip) {
    const token = Utilities.getUuid().replace(/-/g, "");
    const session = { nip: String(nip || "").trim() };
    CacheService.getScriptCache().put("staff_session_" + token, JSON.stringify(session), 21600);
    return token;
  }

  function createStudentSession(nis) {
    const token = Utilities.getUuid().replace(/-/g, "");
    CacheService.getScriptCache().put("student_session_" + token, JSON.stringify({
      nis: String(nis || "").trim()
    }), 21600);
    return token;
  }

  function authenticateStudentSession(sessionToken) {
    const token = String(sessionToken || "").trim();
    if (!token) throw new Error("Sesi login tidak valid. Silakan keluar dan masuk kembali.");
    const cache = CacheService.getScriptCache();
    const cachedSession = cache.get("student_session_" + token);
    if (!cachedSession) throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");

    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_SISWA);
    if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
    const data = getSiswaData(sheet);
    const session = JSON.parse(cachedSession);
    const matchingRows = data.rows.reduce((matches, row, index) => {
      if (String(row[data.columns.nis] || "").trim() === session.nis) matches.push(index);
      return matches;
    }, []);
    if (matchingRows.length !== 1) {
      cache.remove("student_session_" + token);
      throw new Error("Akun siswa tidak ditemukan atau NIS terdaftar ganda.");
    }
    return { sheet, data, rowIndex: matchingRows[0], nis: session.nis };
  }

  function authenticateMonitoringStaff(sessionToken) {
    const token = String(sessionToken || "").trim();
    if (!token) throw new Error("Sesi login tidak valid. Silakan keluar dan masuk kembali.");
    const cache = CacheService.getScriptCache();
    const cachedSession = cache.get("staff_session_" + token);
    if (!cachedSession) throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_GURU);
    if (!sheet) throw new Error("Sheet GURU tidak ditemukan.");
    const data = getGuruData(sheet);
    const session = JSON.parse(cachedSession);
    const matchingRows = data.rows.reduce((matches, row, index) => {
      if (String(row[data.columns.nip] || "").trim() === session.nip) matches.push(index);
      return matches;
    }, []);
    if (matchingRows.length !== 1) {
      cache.remove("staff_session_" + token);
      throw new Error("Akun staf tidak ditemukan atau NIP terdaftar ganda.");
    }

    const role = String(data.rows[matchingRows[0]][data.columns.role] || "").trim().toUpperCase();
    if (!["GURU", "ADMIN", "SUPERADMIN"].includes(role)) {
      cache.remove("staff_session_" + token);
      throw new Error("Akun tidak memiliki izin untuk memantau data siswa.");
    }
    return { role, nip: session.nip };
  }

  function revokeStaffSession(sessionToken) {
    const token = String(sessionToken || "").trim();
    if (token) {
      const cache = CacheService.getScriptCache();
      cache.remove("staff_session_" + token);
      cache.remove("student_session_" + token);
    }
    return { status: "success" };
  }

  function getDateActivitySheetData(spreadsheet, sheetName, activityType, allowEmptyName = false) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan.`);
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) throw new Error(`Sheet ${sheetName} tidak memiliki header.`);

    const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(header => String(header).trim().toUpperCase());
    const columns = {
      date: headers.indexOf("TANGGAL"),
      name: headers.indexOf("NAMA KEGIATAN")
    };
    const missingColumns = Object.keys(columns).filter(column => columns[column] === -1);
    if (missingColumns.length) {
      throw new Error(`Kolom wajib tidak ditemukan di sheet ${sheetName}: ` + missingColumns.join(", "));
    }

    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
      : [];
    const timeZone = spreadsheet.getSpreadsheetTimeZone();
    const events = [];
    rows.forEach((row, index) => {
      const eventDate = row[columns.date];
      const eventName = String(row[columns.name] || "").trim();
      if ((eventDate === "" || eventDate === null) && !eventName) return;
      if (!(eventDate instanceof Date) || Number.isNaN(eventDate.getTime())) {
        throw new Error(`Tanggal ${activityType} pada baris ${index + 2} tidak valid.`);
      }
      if (!eventName && !allowEmptyName) {
        throw new Error(`Nama kegiatan ${activityType} pada baris ${index + 2} belum diisi.`);
      }
      events.push({
        date: Utilities.formatDate(eventDate, timeZone, "yyyy-MM-dd"),
        name: eventName,
        row: index + 2
      });
    });
    return { sheet, columns, events };
  }

  function getEventSheetData(spreadsheet) {
    return getDateActivitySheetData(spreadsheet, SHEET_EVENT, "event");
  }

  function getHolidaySheetData(spreadsheet) {
    return getDateActivitySheetData(spreadsheet, SHEET_HARILIBUR, "hari libur", true);
  }

  function getDateActivityLabel(activityType) {
    if (activityType === "event") return "Event";
    if (activityType === "hari libur") return "Hari libur";
    return "Tanggal pulang cepat";
  }

  function getEventDateKeys(spreadsheet) {
    const eventData = getEventSheetData(spreadsheet);
    return new Set(eventData.events.map(event => event.date));
  }

  function authenticateEventManager(sessionToken) {
    const session = authenticateMonitoringStaff(sessionToken);
    if (!["ADMIN", "SUPERADMIN"].includes(session.role)) {
      throw new Error("Hanya admin atau superadmin yang dapat mengelola event, hari libur, dan data izin.");
    }
    return session;
  }

  function authenticateSuperadmin(sessionToken) {
    const session = authenticateMonitoringStaff(sessionToken);
    if (session.role !== "SUPERADMIN") {
      throw new Error("Hanya superadmin yang dapat mengelola tanggal pulang cepat.");
    }
    return session;
  }

  function getEventDates(sessionToken) {
    return getDateActivities(sessionToken, SHEET_EVENT, "event", "events");
  }

  function getHolidayActivities(sessionToken) {
    return getDateActivities(sessionToken, SHEET_HARILIBUR, "hari libur", "holidays", true);
  }

  function getEarlyDismissals(sessionToken) {
    return getDateActivities(sessionToken, SHEET_PULANGCEPAT, "pulang cepat", "earlyDismissals", true, true);
  }

  function getDateActivities(sessionToken, sheetName, activityType, responseKey, allowEmptyName = false, superadminOnly = false) {
    try {
      if (superadminOnly) authenticateSuperadmin(sessionToken);
      else authenticateEventManager(sessionToken);
      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const activities = getDateActivitySheetData(spreadsheet, sheetName, activityType, allowEmptyName).events
        .sort((first, second) => first.date.localeCompare(second.date) || first.name.localeCompare(second.name, "id"))
        .map(({ date, name }) => ({ date, name }));
      return { status: "success", [responseKey]: activities };
    } catch (error) {
      Logger.log(`Get ${activityType} list error: ` + error.message);
      return { status: "error", message: error.message };
    }
  }

  function saveEvent(eventData) {
    return saveDateActivity(eventData, SHEET_EVENT, "event");
  }

  function saveHoliday(holidayData) {
    return saveDateActivity(holidayData, SHEET_HARILIBUR, "hari libur");
  }

  function saveEarlyDismissal(activityData) {
    return saveDateActivity(activityData, SHEET_PULANGCEPAT, "pulang cepat", true, true);
  }

  function saveDateActivity(activityData, sheetName, activityType, superadminOnly = false, allowEmptyName = false) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const input = activityData || {};
      if (superadminOnly) authenticateSuperadmin(input.sessionToken);
      else authenticateEventManager(input.sessionToken);

      const dateValue = String(input.date || "").trim();
      const eventName = String(input.name || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        throw new Error(`Tanggal ${activityType} tidak valid.`);
      }
      if (!eventName && !allowEmptyName) throw new Error(`Nama kegiatan ${activityType} wajib diisi.`);
      if (eventName.length > 150) throw new Error("Nama kegiatan maksimal 150 karakter.");

      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const timeZone = spreadsheet.getSpreadsheetTimeZone();
      const eventDate = Utilities.parseDate(dateValue, timeZone, "yyyy-MM-dd");
      if (Utilities.formatDate(eventDate, timeZone, "yyyy-MM-dd") !== dateValue) {
        throw new Error(`Tanggal ${activityType} tidak valid.`);
      }

      const eventDataOnSheet = getDateActivitySheetData(
        spreadsheet,
        sheetName,
        activityType,
        allowEmptyName
      );
      const originalDate = String(input.originalDate || "").trim();
      const originalName = String(input.originalName || "").trim();
      const isEditing = Boolean(originalDate || originalName);
      let targetRow;

      if (isEditing) {
        if (!originalDate || (!originalName && !allowEmptyName)) {
          throw new Error(`Data ${activityType} yang akan diedit tidak lengkap.`);
        }
        const matches = eventDataOnSheet.events.filter(event =>
          event.date === originalDate && event.name === originalName
        );
        if (matches.length !== 1) {
          throw new Error(`${activityType} tidak ditemukan atau tercatat lebih dari sekali. Muat ulang daftar.`);
        }
        targetRow = matches[0].row;
        const duplicate = eventDataOnSheet.events.some(event =>
          event.row !== targetRow &&
          event.date === dateValue &&
          event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (duplicate) throw new Error(`${activityType} dengan tanggal dan nama kegiatan tersebut sudah ada.`);
      } else {
        const duplicate = eventDataOnSheet.events.some(event =>
          event.date === dateValue && event.name.toLowerCase() === eventName.toLowerCase()
        );
        if (duplicate) throw new Error(`${activityType} dengan tanggal dan nama kegiatan tersebut sudah ada.`);
        targetRow = eventDataOnSheet.sheet.getLastRow() + 1;
      }

      eventDataOnSheet.sheet.getRange(targetRow, eventDataOnSheet.columns.date + 1).setValue(eventDate);
      eventDataOnSheet.sheet.getRange(targetRow, eventDataOnSheet.columns.name + 1).setValue(eventName);
      return {
        status: "success",
        message: isEditing
          ? `${getDateActivityLabel(activityType)} berhasil diperbarui.`
          : `${getDateActivityLabel(activityType)} berhasil ditambahkan.`
      };
    } catch (error) {
      Logger.log(`Save ${activityType} error: ` + error.message);
      return { status: "error", message: error.message };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  }

  function deleteEvent(eventData) {
    return deleteDateActivity(eventData, SHEET_EVENT, "event", true);
  }

  function deleteHoliday(holidayData) {
    return deleteDateActivity(holidayData, SHEET_HARILIBUR, "hari libur", false);
  }

  function deleteEarlyDismissal(activityData) {
    return deleteDateActivity(activityData, SHEET_PULANGCEPAT, "pulang cepat", true, true);
  }

  function deleteDateActivity(activityData, sheetName, activityType, superadminOnly, allowEmptyName = activityType === "hari libur") {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const input = activityData || {};
      if (superadminOnly) authenticateSuperadmin(input.sessionToken);
      else authenticateEventManager(input.sessionToken);

      const dateValue = String(input.date || "").trim();
      const eventName = String(input.name || "").trim();
      if (!dateValue || (!eventName && !allowEmptyName)) {
        throw new Error(`Data ${activityType} yang akan dihapus tidak lengkap.`);
      }

      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const eventDataOnSheet = getDateActivitySheetData(
        spreadsheet,
        sheetName,
        activityType,
        allowEmptyName
      );
      const matches = eventDataOnSheet.events.filter(event =>
        event.date === dateValue && event.name === eventName
      );
      if (matches.length !== 1) {
        throw new Error(`${activityType} tidak ditemukan atau tercatat lebih dari sekali. Muat ulang daftar.`);
      }

      eventDataOnSheet.sheet.deleteRow(matches[0].row);
      return {
        status: "success",
        message: `${getDateActivityLabel(activityType)} berhasil dihapus.`
      };
    } catch (error) {
      Logger.log(`Delete ${activityType} error: ` + error.message);
      return { status: "error", message: error.message };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  }

  function getMonitoringClasses(sessionToken) {
    try {
      authenticateMonitoringStaff(sessionToken);
      const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_SISWA);
      if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) throw new Error("Sheet SISWA tidak memiliki header.");
      const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const classColumn = headers.indexOf("KELAS");
      if (classColumn === -1) throw new Error("Kolom KELAS tidak ditemukan di sheet SISWA.");
      const lastRow = sheet.getLastRow();
      const rows = lastRow > 1
        ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues()
        : [];
      const classesByKey = new Map();
      rows.forEach(row => {
        const className = String(row[classColumn] || "").trim();
        if (className && !classesByKey.has(className.toUpperCase())) {
          classesByKey.set(className.toUpperCase(), className);
        }
      });
      const classes = Array.from(classesByKey.values()).sort((a, b) => a.localeCompare(b, "id"));
      return { status: "success", classes };
    } catch (error) {
      Logger.log("Get monitoring classes error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function getMonitoringStudents(sessionToken, requestedClass) {
    try {
      authenticateMonitoringStaff(sessionToken);
      const className = String(requestedClass || "").trim();
      if (!className) throw new Error("Pilih kelas terlebih dahulu.");

      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_SISWA);
      if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) throw new Error("Sheet SISWA tidak memiliki header.");
      const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const columns = {
        nis: headers.indexOf("NIS"),
        nama: headers.indexOf("NAMA"),
        kelas: headers.indexOf("KELAS")
      };
      const missingColumns = Object.keys(columns).filter(column => columns[column] === -1);
      if (missingColumns.length) {
        throw new Error("Kolom wajib tidak ditemukan di sheet SISWA: " + missingColumns.join(", "));
      }

      const lastRow = sheet.getLastRow();
      const rows = lastRow > 1
        ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues()
        : [];
      const students = rows
        .filter(row => String(row[columns.kelas] || "").trim().toUpperCase() === className.toUpperCase())
        .map(row => ({
          nis: String(row[columns.nis] || "").trim(),
          nama: String(row[columns.nama] || "").trim(),
          jamMasuk: "-",
          jamPulang: "-",
          keterangan: ""
        }))
        .filter(student => student.nis || student.nama)
        .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

      const classSheet = spreadsheet.getSheetByName("BK");
      if (!classSheet) throw new Error("Sheet BK tidak ditemukan.");
      const classLastColumn = classSheet.getLastColumn();
      if (classLastColumn === 0) throw new Error("Sheet BK tidak memiliki header.");
      const classHeaders = classSheet.getRange(1, 1, 1, classLastColumn).getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase().replace(/\s+/g, ""));
      const classColumns = {
        kelas: classHeaders.indexOf("KELAS"),
        waliKelas: classHeaders.indexOf("WALIKELAS"),
        guruBk: classHeaders.indexOf("GURUBK")
      };
      const missingClassColumns = Object.keys(classColumns)
        .filter(column => classColumns[column] === -1);
      if (missingClassColumns.length) {
        throw new Error("Kolom wajib tidak ditemukan di sheet BK: " + missingClassColumns.join(", "));
      }
      const classLastRow = classSheet.getLastRow();
      const classRows = classLastRow > 1
        ? classSheet.getRange(2, 1, classLastRow - 1, classLastColumn).getDisplayValues()
        : [];
      const matchingClassRows = classRows.filter(row =>
        String(row[classColumns.kelas] || "").trim().toUpperCase() === className.toUpperCase()
      );
      if (matchingClassRows.length > 1) {
        throw new Error(`Data kelas ${className} tercatat lebih dari sekali di sheet BK.`);
      }
      const classInfo = matchingClassRows[0] || [];
      const waliKelas = String(classInfo[classColumns.waliKelas] || "").trim();
      const guruBk = String(classInfo[classColumns.guruBk] || "").trim();

      const absenSheet = spreadsheet.getSheetByName(SHEET_ABSEN);
      if (!absenSheet) throw new Error("Sheet ABSEN tidak ditemukan.");
      const absenRecords = absenSheet.getDataRange().getValues();
      const absenHeaders = (absenRecords.shift() || []).map(header => String(header).trim().toUpperCase());
      const absenColumns = {
        nis: absenHeaders.indexOf("NIS"),
        tanggal: absenHeaders.indexOf("TANGGAL"),
        jamMasuk: absenHeaders.indexOf("JAM MASUK"),
        jamPulang: absenHeaders.indexOf("JAM PULANG"),
        keterangan: absenHeaders.indexOf("KETERANGAN")
      };
      const missingAttendanceColumns = Object.keys(absenColumns)
        .filter(column => absenColumns[column] === -1);
      if (missingAttendanceColumns.length) {
        throw new Error("Kolom wajib tidak ditemukan di sheet ABSEN: " + missingAttendanceColumns.join(", "));
      }

      const timeZone = spreadsheet.getSpreadsheetTimeZone();
      const todayKey = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
      const eventDates = getEventDateKeys(spreadsheet);
      const isEventDay = eventDates.has(todayKey);
      const attendanceByNis = new Map();
      absenRecords.forEach(row => {
        const attendanceDate = row[absenColumns.tanggal];
        if (!(attendanceDate instanceof Date) ||
          Utilities.formatDate(attendanceDate, timeZone, "yyyy-MM-dd") !== todayKey) return;
        const nis = String(row[absenColumns.nis] || "").trim();
        if (!nis) return;
        const keterangan = String(row[absenColumns.keterangan] || "").trim().toUpperCase();
        attendanceByNis.set(nis, {
          jamMasuk: isEventDay
            ? formatTime(row[absenColumns.jamMasuk], spreadsheet)
            : keterangan === "HB" ? "-" : formatTime(row[absenColumns.jamMasuk], spreadsheet),
          jamPulang: isEventDay || keterangan === "HB"
            ? "-"
            : formatTime(row[absenColumns.jamPulang], spreadsheet),
          keterangan: isEventDay ? "HB" : keterangan
        });
      });

      const izinSheet = spreadsheet.getSheetByName(SHEET_IZIN);
      const izinByNis = new Map();
      if (izinSheet) {
        const izinRecords = izinSheet.getDataRange().getValues();
        const izinHeaders = (izinRecords.shift() || []).map(header => String(header).trim().toUpperCase());
        const izinNisColumn = izinHeaders.indexOf("NIS");
        const izinDateColumn = izinHeaders.indexOf("TANGGAL");
        const izinStatusColumn = izinHeaders.indexOf("KETERANGAN");
        if (izinNisColumn !== -1 && izinDateColumn !== -1) {
          izinRecords.forEach(row => {
            const izinDate = row[izinDateColumn];
            if (!(izinDate instanceof Date) ||
              Utilities.formatDate(izinDate, timeZone, "yyyy-MM-dd") !== todayKey) return;
            const nis = String(row[izinNisColumn] || "").trim();
            if (!nis || attendanceByNis.has(nis)) return;
            const izinStatus = izinStatusColumn === -1
              ? "I"
              : String(row[izinStatusColumn] || "I").trim().toUpperCase();
            izinByNis.set(nis, izinStatus.includes("S") ? "S" : "I");
          });
        }
      }

      const now = new Date();
      const currentHour = Number(Utilities.formatDate(now, timeZone, "H"));
      const weekday = Number(Utilities.formatDate(now, timeZone, "u"));
      const holidayDates = getHolidayDates();
      students.forEach(student => {
        const attendance = attendanceByNis.get(student.nis);
        if (attendance) {
          Object.assign(student, attendance);
        } else if (isEventDay) {
          student.keterangan = "A";
        } else if (izinByNis.has(student.nis)) {
          student.keterangan = izinByNis.get(student.nis);
        } else if (weekday >= 6 || holidayDates.has(todayKey)) {
          student.keterangan = "OFF";
        } else {
          student.keterangan = currentHour >= 15 ? "A" : "Belum absen";
        }
      });

      return {
        status: "success",
        kelas: className,
        waliKelas: waliKelas || "-",
        guruBk: guruBk || "-",
        students
      };
    } catch (error) {
      Logger.log("Get monitoring students error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function getTodayAttendanceSummary(sessionToken) {
    try {
      authenticateMonitoringStaff(sessionToken);
      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const siswaSheet = spreadsheet.getSheetByName(SHEET_SISWA);
      if (!siswaSheet) throw new Error("Sheet SISWA tidak ditemukan.");
      const siswaLastColumn = siswaSheet.getLastColumn();
      if (siswaLastColumn === 0) throw new Error("Sheet SISWA tidak memiliki header.");
      const siswaHeaders = siswaSheet.getRange(1, 1, 1, siswaLastColumn).getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const nisColumn = siswaHeaders.indexOf("NIS");
      if (nisColumn === -1) throw new Error("Kolom NIS tidak ditemukan di sheet SISWA.");
      const siswaLastRow = siswaSheet.getLastRow();
      const siswaRows = siswaLastRow > 1
        ? siswaSheet.getRange(2, 1, siswaLastRow - 1, siswaLastColumn).getDisplayValues()
        : [];
      const studentsByNis = new Map();
      siswaRows.forEach(row => {
        const nis = String(row[nisColumn] || "").trim();
        if (nis && !studentsByNis.has(nis)) studentsByNis.set(nis, "");
      });

      const timeZone = spreadsheet.getSpreadsheetTimeZone();
      const todayKey = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
      const eventDates = getEventDateKeys(spreadsheet);
      const isEventDay = eventDates.has(todayKey);
      const absenSheet = spreadsheet.getSheetByName(SHEET_ABSEN);
      if (!absenSheet) throw new Error("Sheet ABSEN tidak ditemukan.");
      const absenData = absenSheet.getDataRange().getValues();
      const absenHeaders = (absenData.shift() || []).map(header => String(header).trim().toUpperCase());
      const absenColumns = {
        nis: absenHeaders.indexOf("NIS"),
        tanggal: absenHeaders.indexOf("TANGGAL"),
        keterangan: absenHeaders.indexOf("KETERANGAN")
      };
      const missingAttendanceColumns = Object.keys(absenColumns)
        .filter(column => absenColumns[column] === -1);
      if (missingAttendanceColumns.length) {
        throw new Error("Kolom wajib tidak ditemukan di sheet ABSEN: " + missingAttendanceColumns.join(", "));
      }

      const attendanceByNis = new Map();
      absenData.forEach(row => {
        const attendanceDate = row[absenColumns.tanggal];
        if (!(attendanceDate instanceof Date) ||
          Utilities.formatDate(attendanceDate, timeZone, "yyyy-MM-dd") !== todayKey) return;
        const nis = String(row[absenColumns.nis] || "").trim();
        if (!nis || !studentsByNis.has(nis)) return;
        attendanceByNis.set(nis, String(row[absenColumns.keterangan] || "").trim().toUpperCase());
      });

      const izinByNis = new Map();
      const izinSheet = spreadsheet.getSheetByName(SHEET_IZIN);
      if (izinSheet && izinSheet.getLastColumn() > 0) {
        const izinData = izinSheet.getDataRange().getValues();
        const izinHeaders = (izinData.shift() || []).map(header => String(header).trim().toUpperCase());
        const izinNisColumn = izinHeaders.indexOf("NIS");
        const izinDateColumn = izinHeaders.indexOf("TANGGAL");
        const izinStatusColumn = izinHeaders.indexOf("KETERANGAN");
        if (izinNisColumn !== -1 && izinDateColumn !== -1) {
          izinData.forEach(row => {
            const izinDate = row[izinDateColumn];
            if (!(izinDate instanceof Date) ||
              Utilities.formatDate(izinDate, timeZone, "yyyy-MM-dd") !== todayKey) return;
            const nis = String(row[izinNisColumn] || "").trim();
            if (!nis || !studentsByNis.has(nis) || attendanceByNis.has(nis)) return;
            const detail = izinStatusColumn === -1
              ? "I"
              : String(row[izinStatusColumn] || "I").trim().toUpperCase();
            izinByNis.set(nis, detail.includes("S") ? "S" : "I");
          });
        }
      }

      const currentHour = Number(Utilities.formatDate(new Date(), timeZone, "H"));
      const weekday = Number(Utilities.formatDate(new Date(), timeZone, "u"));
      const holidayDates = getHolidayDates();
      const summary = {
        total: studentsByNis.size,
        hadir: 0,
        izin: 0,
        sakit: 0,
        terlambat: 0,
        alpa: 0,
        belumAbsen: 0,
        libur: 0
      };
      studentsByNis.forEach((_, nis) => {
        let status;
        if (attendanceByNis.has(nis)) {
          status = isEventDay ? "HB" : attendanceByNis.get(nis);
        } else if (isEventDay) {
          status = "A";
        } else if (izinByNis.has(nis)) {
          status = izinByNis.get(nis);
        } else if (weekday >= 6 || holidayDates.has(todayKey)) {
          status = "OFF";
        } else {
          status = currentHour >= 15 ? "A" : "Belum absen";
        }

        if (status === "H" || status === "P") summary.hadir++;
        else if (status === "I") summary.izin++;
        else if (status === "S") summary.sakit++;
        else if (["T", "TAPT", "TAM", "PT", "TAP"].includes(status)) summary.terlambat++;
        else if (status === "A") summary.alpa++;
        else if (status === "Belum absen") summary.belumAbsen++;
        else summary.libur++;
      });

      return {
        status: "success",
        tanggal: Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd"),
        summary
      };
    } catch (error) {
      Logger.log("Get today attendance summary error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function getPermissionData(sessionToken, requestedDate, requestedClass) {
    try {
      const session = authenticateMonitoringStaff(sessionToken);
      if (!["GURU", "ADMIN", "SUPERADMIN"].includes(session.role)) {
        throw new Error("Hanya akun staf yang dapat melihat data izin.");
      }
      const dateFilter = String(requestedDate || "").trim();
      const classFilter = String(requestedClass || "").trim().toUpperCase();
      if (dateFilter && !/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        throw new Error("Format tanggal filter tidak valid.");
      }
      if (dateFilter) {
        const parsedDate = new Date(`${dateFilter}T00:00:00Z`);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateFilter) {
          throw new Error("Tanggal filter tidak valid.");
        }
      }

      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const sheet = spreadsheet.getSheetByName(SHEET_IZIN);
      if (!sheet) throw new Error("Sheet IZIN tidak ditemukan.");
      const lastColumn = sheet.getLastColumn();
      if (lastColumn === 0) throw new Error("Sheet IZIN tidak memiliki header.");
      const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const columns = {
        tanggal: headers.indexOf("TANGGAL"),
        hari: headers.indexOf("HARI"),
        kelas: headers.indexOf("KELAS"),
        nama: headers.indexOf("NAMA SISWA"),
        nis: headers.indexOf("NIS"),
        keterangan: headers.indexOf("KETERANGAN")
      };
      const missingColumns = Object.keys(columns).filter(column => columns[column] === -1);
      if (missingColumns.length) {
        throw new Error("Kolom wajib tidak ditemukan di sheet IZIN: " + missingColumns.join(", "));
      }

      const lastRow = sheet.getLastRow();
      const dataRange = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn) : null;
      const rows = dataRange ? dataRange.getValues() : [];
      const displayRows = dataRange ? dataRange.getDisplayValues() : [];
      const timeZone = spreadsheet.getSpreadsheetTimeZone();
      const classesByKey = new Map();
      const records = [];
      rows.forEach((row, index) => {
        const displayRow = displayRows[index];
        const isEmpty = Object.keys(columns).every(column =>
          String(displayRow[columns[column]] || "").trim() === ""
        );
        if (isEmpty) return;

        const dateValue = row[columns.tanggal];
        let dateKey;
        if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
          dateKey = Utilities.formatDate(dateValue, timeZone, "yyyy-MM-dd");
        } else if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
          dateKey = dateValue.trim();
        } else {
          throw new Error(`Tanggal izin pada baris ${index + 2} tidak valid.`);
        }
        const parsedDate = new Date(`${dateKey}T00:00:00Z`);
        if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateKey) {
          throw new Error(`Tanggal izin pada baris ${index + 2} tidak valid.`);
        }

        const className = String(displayRow[columns.kelas] || "").trim();
        if (className && !classesByKey.has(className.toUpperCase())) {
          classesByKey.set(className.toUpperCase(), className);
        }
        if (dateFilter && dateKey !== dateFilter) return;
        if (classFilter && className.toUpperCase() !== classFilter) return;

        records.push({
          dateKey,
          tanggal: dateKey.split("-").reverse().join("-"),
          hari: String(displayRow[columns.hari] || "").trim(),
          kelas: className,
          nama: String(displayRow[columns.nama] || "").trim(),
          nis: String(displayRow[columns.nis] || "").trim(),
          keterangan: String(displayRow[columns.keterangan] || "").trim()
        });
      });

      records.sort((first, second) =>
        second.dateKey.localeCompare(first.dateKey) ||
        first.kelas.localeCompare(second.kelas, "id") ||
        first.nama.localeCompare(second.nama, "id")
      );
      const classes = Array.from(classesByKey.values()).sort((first, second) => first.localeCompare(second, "id"));
      return {
        status: "success",
        records: records.map(({ dateKey, ...record }) => record),
        classes
      };
    } catch (error) {
      Logger.log("Get permission data error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function getGuruList(sessionToken) {
    try {
      const manager = authenticateGuruManager(sessionToken);
      const gurus = manager.data.rows.map(row => ({
        nip: String(row[manager.data.columns.nip] || "").trim(),
        nama: String(row[manager.data.columns.nama] || "").trim(),
        email: String(row[manager.data.columns.email] || "").trim(),
        role: String(row[manager.data.columns.role] || "").trim().toUpperCase()
      }));
      return { status: "success", gurus };
    } catch (error) {
      Logger.log("Get guru list error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function updateGuruRole(sessionToken, targetNip, requestedRole) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const manager = authenticateGuruManager(sessionToken);
      const normalizedNip = String(targetNip || "").trim();
      const role = String(requestedRole || "").trim().toUpperCase();
      if (!normalizedNip) throw new Error("NIP guru tidak valid.");
      if (!["ADMIN", "GURU"].includes(role)) {
        throw new Error("Role hanya dapat diubah menjadi ADMIN atau GURU.");
      }

      const targetIndices = manager.data.rows.reduce((matches, row, index) => {
        if (String(row[manager.data.columns.nip] || "").trim() === normalizedNip) {
          matches.push(index);
        }
        return matches;
      }, []);
      if (targetIndices.length === 0) throw new Error("Data guru tidak ditemukan.");
      if (targetIndices.length > 1) throw new Error("NIP terdaftar lebih dari sekali; role tidak dapat diubah.");
      const targetIndex = targetIndices[0];

      const currentRole = String(manager.data.rows[targetIndex][manager.data.columns.role] || "")
        .trim().toUpperCase();
      if (currentRole === "SUPERADMIN") {
        throw new Error("Role SUPERADMIN dilindungi dan tidak dapat diubah.");
      }
      if (targetIndex === manager.rowIndex) {
        throw new Error("Anda tidak dapat mengubah role akun yang sedang digunakan.");
      }
      if (currentRole === role) {
        return { status: "success", message: "Role guru tidak berubah." };
      }

      const remainingPrivilegedAccounts = manager.data.rows.filter((row, index) => {
        if (index === targetIndex) return false;
        return ["ADMIN", "SUPERADMIN"].includes(
          String(row[manager.data.columns.role] || "").trim().toUpperCase()
        );
      }).length;
      if (currentRole === "ADMIN" && remainingPrivilegedAccounts === 0) {
        throw new Error("Admin terakhir tidak dapat diturunkan rolenya.");
      }

      manager.sheet.getRange(targetIndex + 2, manager.data.columns.role + 1).setValue(role);
      return { status: "success", message: "Role guru berhasil diperbarui.", role };
    } catch (error) {
      Logger.log("Update guru role error: " + error.message);
      return { status: "error", message: error.message };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  }

  function loginUser(username, password) {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const siswaSheet = ss.getSheetByName(SHEET_SISWA);
      if (!siswaSheet) throw new Error("Sheet SISWA tidak ditemukan.");

      const { rows: siswaRows, columns: siswaColumns } = getSiswaData(siswaSheet);

      const normalizedUsername = String(username || "").trim();
      const suppliedPassword = String(password || "");
      const student = siswaRows.find(row =>
          (String(row[siswaColumns.nis]).trim() === normalizedUsername ||
            String(row[siswaColumns.email] || "").trim().toLowerCase() === normalizedUsername.toLowerCase()) &&
          String(row[siswaColumns.password]) === suppliedPassword
      );

      if (student) {
        return {
          nis: student[siswaColumns.nis],
          nama: student[siswaColumns.nama],
          kelas: siswaColumns.kelas === -1 ? "" : (student[siswaColumns.kelas] || ""),
          email: student[siswaColumns.email] || "",
          sessionToken: createStudentSession(student[siswaColumns.nis]),
          role: "SISWA",
          status: "success"
        };
      }

      const guruSheet = ss.getSheetByName(SHEET_GURU);
      if (!guruSheet) throw new Error("Sheet GURU tidak ditemukan.");
      const guruData = getGuruData(guruSheet);
      const staffIndex = findGuruAccount(guruData.rows, guruData.columns, normalizedUsername, suppliedPassword);
      if (staffIndex === -1) return { status: "error", message: "Username/email atau password salah." };
      const staff = guruData.rows[staffIndex];
      const role = String(staff[guruData.columns.role] || "").trim().toUpperCase();
      if (!["ADMIN", "GURU", "SUPERADMIN"].includes(role)) {
        return { status: "error", message: "Role akun GURU harus ADMIN, GURU, atau SUPERADMIN." };
      }

      return {
        nip: String(staff[guruData.columns.nip] || "").trim(),
        nama: staff[guruData.columns.nama],
        email: staff[guruData.columns.email],
        sessionToken: createStaffSession(staff[guruData.columns.nip]),
        role: role,
        status: "success"
      };
    } catch (e) {
      Logger.log("Login error: " + e.message);
      return { status: "error", message: e.message };
    }
  }

  function forgotPassword(email) {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(SHEET_SISWA);
      if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");

      const { rows, columns } = getSiswaData(sheet);
      const rowIndex = rows.findIndex(row =>
        String(row[columns.email]).toLowerCase() === String(email).toLowerCase()
      );

      if (rowIndex === -1) {
        return { status: "error", message: "Email tidak ditemukan." };
      }

      const row = rowIndex + 2;
      const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
      sheet.getRange(row, columns.password + 1).setValue(newPassword);

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
    const eventDates = getEventDateKeys(ss);
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
        const keterangan = eventDates.has(dateKey) ? "HB" : (row[keteranganIndex] || "");
        dataMap[dateKey] = {
          tanggal: Utilities.formatDate(tanggal, ss.getSpreadsheetTimeZone(), "dd-MM-yyyy"),
          keterangan: keterangan,
          jamMasuk: keterangan === "HB" && !eventDates.has(dateKey)
            ? "-"
            : formatTime(row[jamMasukIndex], ss),
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
      
      if (eventDates.has(dateKey)) {
        status = dayData && dayData.keterangan === "HB" ? "HB" : "A";
      }
      // Prioritas 1: Jika ada data di sheet ABSEN atau IZIN (termasuk HB)
      else if (dayData) {
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
        jamMasuk: (status === "OFF" || (status === "HB" && !eventDates.has(dateKey)))
          ? "-"
          : (dayData ? dayData.jamMasuk : "-"),
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
      const { rows, columns } = getSiswaData(sheet);
      const row = rows.find(dataRow => String(dataRow[columns.nis]) === String(nis));
      if (row) {
        return {
          status: "success",
          nis: row[columns.nis],
          nama: row[columns.nama],
          kelas: columns.kelas === -1 ? "" : (row[columns.kelas] || ""),
          email: row[columns.email] || ""
        };
      } else {
        return { status: "error", message: "Profil tidak ditemukan." };
      }
    } catch (e) {
      Logger.log(e);
      return { status: "error", message: e.message };
    }
  }

  function getKtds(sessionToken) {
    try {
      const student = authenticateStudentSession(sessionToken);
      const headers = student.sheet.getRange(1, 1, 1, student.sheet.getLastColumn())
        .getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const missingFields = KTDS_FIELDS.filter(field => headers.indexOf(field) === -1);
      if (missingFields.length) {
        throw new Error("Kolom KTDS tidak ditemukan di sheet SISWA: " + missingFields.join(", "));
      }

      const row = student.data.rows[student.rowIndex];
      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const values = {};
      KTDS_FIELDS.forEach(field => {
        const value = row[headers.indexOf(field)];
        values[field] = field === "TANGGAL LAHIR" && value instanceof Date
          ? Utilities.formatDate(value, spreadsheet.getSpreadsheetTimeZone(), "yyyy-MM-dd")
          : value === null || value === undefined ? "" : String(value);
      });
      return { status: "success", ktds: values };
    } catch (error) {
      Logger.log("Get KTDS error: " + error.message);
      return { status: "error", message: error.message };
    }
  }

  function saveKtds(data) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const input = data || {};
      const student = authenticateStudentSession(input.sessionToken);
      const sheet = student.sheet;
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .getDisplayValues()[0]
        .map(header => String(header).trim().toUpperCase());
      const missingFields = KTDS_FIELDS.filter(field => headers.indexOf(field) === -1);
      if (missingFields.length) {
        throw new Error("Kolom KTDS tidak ditemukan di sheet SISWA: " + missingFields.join(", "));
      }
      if (!input.ktds || typeof input.ktds !== "object" || Array.isArray(input.ktds)) {
        throw new Error("Data KTDS tidak valid.");
      }
      const missingDataFields = KTDS_FIELDS.filter(field =>
        !Object.prototype.hasOwnProperty.call(input.ktds, field)
      );
      if (missingDataFields.length) {
        throw new Error("Data KTDS tidak lengkap: " + missingDataFields.join(", "));
      }

      const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
      const timeZone = spreadsheet.getSpreadsheetTimeZone();
      const updates = [];
      KTDS_FIELDS.forEach(field => {
        const column = headers.indexOf(field);
        let value = String(input.ktds[field] === null || input.ktds[field] === undefined
          ? ""
          : input.ktds[field]).trim();
        if (field !== "TANGGAL LAHIR") value = value.toUpperCase();
        if (value.length > 500) throw new Error(`${field} maksimal 500 karakter.`);
        if (field === "NISN" && value && !/^\d{10}$/.test(value)) {
          throw new Error("NISN harus terdiri dari 10 digit angka.");
        }
        if (field === "TANGGAL LAHIR" && value) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new Error("Format tanggal lahir tidak valid.");
          }
          const birthDate = Utilities.parseDate(value, timeZone, "yyyy-MM-dd");
          if (Utilities.formatDate(birthDate, timeZone, "yyyy-MM-dd") !== value) {
            throw new Error("Tanggal lahir tidak valid.");
          }
          updates.push({ column, value: birthDate });
        } else {
          updates.push({ column, value });
        }
      });
      updates.forEach(update => {
        const range = sheet.getRange(student.rowIndex + 2, update.column + 1);
        if (["NISN", "NOMOR TELPON RUMAH", "NOMOR TELPON ORANG TUA", "NOMER TELPON WALI SISWA"]
          .includes(headers[update.column])) {
          range.setNumberFormat("@");
        }
        range.setValue(update.value);
      });
      return { status: "success", message: "Keterangan diri siswa berhasil diperbarui." };
    } catch (error) {
      Logger.log("Save KTDS error: " + error.message);
      return { status: "error", message: error.message };
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  }

  function updateProfile(nis, newPassword, newEmail) {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheet = ss.getSheetByName(SHEET_SISWA);
      if (!sheet) throw new Error("Sheet SISWA tidak ditemukan.");
      const { rows, columns } = getSiswaData(sheet);
      const rowIndex = rows.findIndex(dataRow => String(dataRow[columns.nis]) === String(nis));
      if (rowIndex === -1) {
        return { status: "error", message: "Profil tidak ditemukan." };
      }
      const row = rowIndex + 2;
      if (newPassword) {
        sheet.getRange(row, columns.password + 1).setValue(newPassword);
      }
      sheet.getRange(row, columns.email + 1).setValue(newEmail);
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
      const { rows, columns } = getSiswaData(sheet);
      const row = rows.find(dataRow => String(dataRow[columns.nis]) === String(nis));
      if (row) {
        return row[columns.nama];
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
    for (let i = currentYear; i <= currentYear + 3; i++) {
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
    return new Set(getHolidaySheetData(ss).events.map(activity => activity.date));
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
      const { rows: siswaData, columns } = getSiswaData(siswaSheet);

      const siswa = siswaData.find(row => String(row[columns.nis]) === String(nis));
      if (!siswa) {
        throw new Error("Data siswa tidak ditemukan untuk NIS: " + nis);
      }
      const namaSiswa = siswa[columns.nama] || "Nama Tidak Ditemukan";
      
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
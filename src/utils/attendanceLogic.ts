import {
  AppRole,
  AttendanceFilter,
  AttendanceFormValues,
  AttendanceRecord,
  AttendanceType,
  GasSyncStatus,
  GeoCoordinate,
  RolePermissions,
  ShiftOption,
  ValidationErrors,
} from '../types/attendance';

export const SHIFT_LABELS: Record<ShiftOption, string> = {
  [ShiftOption.SHIFT_1]: 'Shift 1',
  [ShiftOption.SHIFT_2]: 'Shift 2',
  [ShiftOption.SHIFT_3]: 'Shift 3',
  [ShiftOption.FULL]: 'Full Day',
};

export function validateAttendanceInput(values: AttendanceFormValues): {
  isValid: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = {};
  const trimmedName = values.studentName.trim();
  const trimmedNisn = values.nisn.trim();

  if (!trimmedName) {
    errors.studentName = 'Nama siswa wajib diisi.';
  } else if (trimmedName.length < 2) {
    errors.studentName = 'Nama siswa minimal 2 karakter.';
  }

  if (!trimmedNisn) {
    errors.nisn = 'NISN wajib diisi.';
  } else if (!/^\d{6,15}$/.test(trimmedNisn)) {
    errors.nisn = 'NISN harus berupa 6–15 digit angka.';
  }

  if (!values.photoDataUrl || !values.photoDataUrl.startsWith('data:image/')) {
    errors.photoDataUrl = 'Foto selfie wajib diambil langsung dari kamera depan.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatDateIndonesian(date: Date): string {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ];
  const dayName = dayNames[date.getDay()];
  const dayNum = String(date.getDate()).padStart(2, '0');
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${dayNum} ${monthName} ${year}`;
}

export function formatTimeIndonesian(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatLocalIsoWithOffset(date: Date): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const offsetHours = pad(tzOffsetMin / 60);
  const offsetMinutes = pad(tzOffsetMin % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMinutes}`;
}

export function formatCoordinates(location: GeoCoordinate | null): string {
  if (!location) {
    return 'Lokasi tidak diizinkan';
  }
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
}

export function buildGoogleMapsUrl(location: GeoCoordinate | null): string | null {
  if (!location) {
    return null;
  }
  return `https://maps.google.com/?q=${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
}

export function createAttendanceRecord(
  values: AttendanceFormValues,
  location: GeoCoordinate | null,
  now: Date = new Date(),
  id: string = generateRecordId(now)
): AttendanceRecord {
  return {
    id,
    studentName: values.studentName.trim(),
    nisn: values.nisn.trim(),
    shift: values.shift,
    attendanceType: values.attendanceType,
    timestampIso: formatLocalIsoWithOffset(now),
    formattedDate: formatDateIndonesian(now),
    formattedTime: formatTimeIndonesian(now),
    location,
    locationStatusText: formatCoordinates(location),
    photoDataUrl: values.photoDataUrl ?? '',
    gasSyncStatus: GasSyncStatus.LOCAL_ONLY,
  };
}

export function generateRecordId(now: Date = new Date()): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `PKL-${now.getTime()}-${rand}`;
}

export function filterAttendanceRecords(
  records: AttendanceRecord[],
  filter: AttendanceFilter
): AttendanceRecord[] {
  const query = filter.searchQuery.trim().toLowerCase();
  return records.filter((record) => {
    if (filter.attendanceType !== 'ALL' && record.attendanceType !== filter.attendanceType) {
      return false;
    }
    if (filter.shift !== 'ALL' && record.shift !== filter.shift) {
      return false;
    }
    if (query) {
      const matchName = record.studentName.toLowerCase().includes(query);
      const matchNisn = record.nisn.toLowerCase().includes(query);
      if (!matchName && !matchNisn) {
        return false;
      }
    }
    return true;
  });
}

export function computeAttendanceSummary(records: AttendanceRecord[]): {
  total: number;
  masuk: number;
  pulang: number;
} {
  let masuk = 0;
  let pulang = 0;
  for (const record of records) {
    if (record.attendanceType === AttendanceType.MASUK) {
      masuk += 1;
    } else if (record.attendanceType === AttendanceType.PULANG) {
      pulang += 1;
    }
  }
  return {
    total: records.length,
    masuk,
    pulang,
  };
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(str);
  const safeStr = !isPlainNumber && /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safeStr.replace(/"/g, '""')}"`;
}

export function generateAttendanceCsv(records: AttendanceRecord[]): string {
  const headers = [
    'ID Absensi',
    'Tanggal Lokal',
    'Jam Lokal',
    'Timestamp ISO',
    'Nama Siswa',
    'NISN',
    'Shift',
    'Jenis Absen',
    'Latitude',
    'Longitude',
    'Akurasi GPS (m)',
    'Status GAS',
    'Link Foto Google Drive',
  ];

  const rows = records.map((record) => [
    escapeCsvCell(record.id),
    escapeCsvCell(record.formattedDate),
    escapeCsvCell(record.formattedTime),
    escapeCsvCell(record.timestampIso),
    escapeCsvCell(record.studentName),
    escapeCsvCell(record.nisn),
    escapeCsvCell(SHIFT_LABELS[record.shift]),
    escapeCsvCell(record.attendanceType),
    escapeCsvCell(record.location ? record.location.latitude.toFixed(6) : ''),
    escapeCsvCell(record.location ? record.location.longitude.toFixed(6) : ''),
    escapeCsvCell(
      record.location && record.location.accuracyMeters !== null
        ? Math.round(record.location.accuracyMeters)
        : ''
    ),
    escapeCsvCell(record.gasSyncStatus),
    escapeCsvCell(record.drivePhotoUrl || ''),
  ]);

  return '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

export function isValidGasWebAppUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'script.google.com' &&
      parsed.pathname.includes('/macros/s/')
    );
  } catch {
    return false;
  }
}

export function buildGasPayload(record: AttendanceRecord, sheetName: string) {
  return {
    id: record.id,
    sheetName: sheetName.trim() || 'AbsensiPKL',
    timestampIso: record.timestampIso,
    tanggalLokal: record.formattedDate,
    jamLokal: record.formattedTime,
    namaSiswa: record.studentName,
    nisn: record.nisn,
    shift: SHIFT_LABELS[record.shift],
    jenisAbsen: record.attendanceType,
    latitude: record.location ? record.location.latitude : null,
    longitude: record.location ? record.location.longitude : null,
    akurasiMeter: record.location?.accuracyMeters ?? null,
    lokasiTeks: record.locationStatusText,
    drivePhotoUrl: record.drivePhotoUrl || '',
    fotoSelfieBase64: record.photoDataUrl,
  };
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script (Code.gs) - Penerima Data Absensi PKL Selfie
 * Cara pasang:
 * 1. Buka Google Sheets -> Ekstensi -> Apps Script
 * 2. Tempel kode ini lalu Simpan
 * 3. Klik Terapkan -> Deployment baru -> Aplikasi Web
 * 4. Jalankan sebagai: Saya | Yang memiliki akses: Siapa saja
 * 5. Salin URL Web App (/exec) ke Pengaturan GAS di aplikasi ini
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheetName || 'AbsensiPKL';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        'ID Absensi',
        'Tanggal Lokal',
        'Jam Lokal',
        'Timestamp ISO',
        'Nama Siswa',
        'NISN',
        'Shift',
        'Jenis Absen',
        'Latitude',
        'Longitude',
        'Akurasi (m)',
        'Link Foto Drive / Base64'
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    }

    var photoRef = payload.drivePhotoUrl || '';
    if (!photoRef && payload.fotoSelfieBase64 && payload.fotoSelfieBase64.indexOf('data:image/') === 0) {
      try {
        var folderName = 'Foto_Absensi_PKL';
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        var parts = payload.fotoSelfieBase64.split(',');
        var contentType = parts[0].match(/:(.*?);/)[1];
        var bytes = Utilities.base64Decode(parts[1]);
        var fileName = (payload.nisn || 'siswa') + '_' + (payload.id || new Date().getTime()) + '.jpg';
        var file = folder.createFile(Utilities.newBlob(bytes, contentType, fileName));
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        try {
          file.addViewer('vwati1060@gmail.com');
        } catch (shareErr) {}
        photoRef = file.getUrl();
      } catch (driveErr) {
        photoRef = 'Tersimpan lokal (Drive error: ' + driveErr.message + ')';
      }
    }

    sheet.appendRow([
      payload.id || '',
      payload.tanggalLokal || '',
      payload.jamLokal || '',
      payload.timestampIso || '',
      payload.namaSiswa || '',
      "'" + (payload.nisn || ''),
      payload.shift || '',
      payload.jenisAbsen || '',
      payload.latitude !== null ? payload.latitude : '',
      payload.longitude !== null ? payload.longitude : '',
      payload.akurasiMeter !== null ? Math.round(payload.akurasiMeter) : '',
      photoRef
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', id: payload.id, photoUrl: photoRef }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ready', service: 'Absensi PKL GAS Endpoint' }))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export function resolveInitialRole(search: string): {
  role: AppRole;
  lockedToStudent: boolean;
} {
  const params = new URLSearchParams(search);
  const mode = (params.get('mode') || '').trim().toLowerCase();
  if (mode === AppRole.ADMIN) {
    return { role: AppRole.ADMIN, lockedToStudent: false };
  }
  if (mode === AppRole.SISWA) {
    return { role: AppRole.SISWA, lockedToStudent: true };
  }
  return { role: AppRole.SISWA, lockedToStudent: false };
}

export function getRolePermissions(role: AppRole): RolePermissions {
  if (role === AppRole.ADMIN) {
    return {
      canViewForm: true,
      canViewLog: true,
      canExportCsv: true,
      canConfigureGas: true,
      canDeleteLogs: true,
    };
  }
  return {
    canViewForm: true,
    canViewLog: false,
    canExportCsv: false,
    canConfigureGas: false,
    canDeleteLogs: false,
  };
}

export function buildStudentShareUrl(origin: string, pathname: string): string {
  const normalizedPath = pathname || '/';
  return `${origin}${normalizedPath}?mode=siswa`;
}

export const TARGET_DRIVE_EMAIL = 'irwan.zex777@gmail.com';
export const TARGET_PHOTO_DRIVE_EMAIL = 'vwati1060@gmail.com';

const ADMIN_NUMERIC_KEY = '2026';

export function verifyAdminPin(pinInput: string): boolean {
  const normalized = pinInput.replace(/\D/g, '');
  return normalized.length === 4 && normalized === ADMIN_NUMERIC_KEY;
}

export function buildDriveCsvFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `rekap-absensi-pkl-${year}-${month}-${day}.csv`;
}

export function buildDrivePhotoFilename(record: AttendanceRecord): string {
  const safeName = record.studentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'siswa';
  const safeNisn = record.nisn.replace(/\D/g, '') || '0000';
  return `selfie-${safeName}-${safeNisn}-${record.id}.jpg`;
}

export function parseImageDataUrl(dataUrl: string): {
  mimeType: string;
  bytes: Uint8Array;
} | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) {
    return null;
  }
  const mimeType = match[1];
  const base64 = match[2];
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return { mimeType, bytes };
}

export function buildDriveMultipartBody(
  csvContent: string,
  fileName: string,
  boundary: string
): string {
  const metadata = JSON.stringify({
    name: fileName,
    mimeType: 'text/csv',
  });

  return [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadata,
    `--${boundary}`,
    'Content-Type: text/csv; charset=UTF-8',
    '',
    csvContent,
    `--${boundary}--`,
  ].join('\r\n');
}



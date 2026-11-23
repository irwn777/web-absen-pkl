import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AppRole,
  AttendanceType,
  GasSyncStatus,
  ShiftOption,
} from '../types/attendance';
import {
  buildDriveCsvFilename,
  buildDriveMultipartBody,
  buildDrivePhotoFilename,
  buildGasPayload,
  buildGoogleMapsUrl,
  buildStudentShareUrl,
  computeAttendanceSummary,
  createAttendanceRecord,
  escapeCsvCell,
  filterAttendanceRecords,
  formatCoordinates,
  formatDateIndonesian,
  formatTimeIndonesian,
  generateAttendanceCsv,
  getRolePermissions,
  isValidGasWebAppUrl,
  parseImageDataUrl,
  resolveInitialRole,
  validateAttendanceInput,
  verifyAdminPin,
} from './attendanceLogic';

test('validateAttendanceInput rejects empty fields and invalid NISN', () => {
  const res = validateAttendanceInput({
    studentName: '  ',
    nisn: 'abc12',
    shift: ShiftOption.SHIFT_1,
    attendanceType: AttendanceType.MASUK,
    photoDataUrl: null,
  });

  assert.equal(res.isValid, false);
  assert.ok(res.errors.studentName);
  assert.ok(res.errors.nisn);
  assert.ok(res.errors.photoDataUrl);
});

test('validateAttendanceInput accepts valid student data and captured selfie', () => {
  const res = validateAttendanceInput({
    studentName: 'Siti Rahmawati',
    nisn: '0074512890',
    shift: ShiftOption.FULL,
    attendanceType: AttendanceType.PULANG,
    photoDataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  });

  assert.equal(res.isValid, true);
  assert.deepEqual(res.errors, {});
});

test('formatDateIndonesian and formatTimeIndonesian format deterministically', () => {
  const sampleDate = new Date(2026, 10, 23, 7, 5, 9); // Senin, 23 Nov 2026 07:05:09
  assert.equal(formatDateIndonesian(sampleDate), 'Senin, 23 Nov 2026');
  assert.equal(formatTimeIndonesian(sampleDate), '07:05:09');
});

test('formatCoordinates and buildGoogleMapsUrl handle granted and denied GPS', () => {
  assert.equal(formatCoordinates(null), 'Lokasi tidak diizinkan');
  assert.equal(buildGoogleMapsUrl(null), null);

  const loc = { latitude: -6.2087634, longitude: 106.845599, accuracyMeters: 14.2 };
  assert.equal(formatCoordinates(loc), '-6.208763, 106.845599');
  assert.equal(buildGoogleMapsUrl(loc), 'https://maps.google.com/?q=-6.208763,106.845599');
});

test('filterAttendanceRecords filters by search query, shift, and jenis absen', () => {
  const date = new Date(2026, 10, 23, 8, 0, 0);
  const rec1 = createAttendanceRecord(
    {
      studentName: 'Budi Santoso',
      nisn: '0071112233',
      shift: ShiftOption.SHIFT_1,
      attendanceType: AttendanceType.MASUK,
      photoDataUrl: 'data:image/jpeg;base64,abc',
    },
    null,
    date,
    'PKL-1'
  );
  const rec2 = createAttendanceRecord(
    {
      studentName: 'Ani Wijaya',
      nisn: '0079998877',
      shift: ShiftOption.SHIFT_2,
      attendanceType: AttendanceType.PULANG,
      photoDataUrl: 'data:image/jpeg;base64,def',
    },
    { latitude: -7.25, longitude: 112.75, accuracyMeters: 10 },
    date,
    'PKL-2'
  );

  const list = [rec1, rec2];
  assert.equal(
    filterAttendanceRecords(list, { searchQuery: 'ani', attendanceType: 'ALL', shift: 'ALL' }).length,
    1
  );
  assert.equal(
    filterAttendanceRecords(list, { searchQuery: '', attendanceType: AttendanceType.MASUK, shift: 'ALL' })[0].id,
    'PKL-1'
  );
  assert.equal(
    filterAttendanceRecords(list, { searchQuery: '', attendanceType: 'ALL', shift: ShiftOption.SHIFT_2 })[0].id,
    'PKL-2'
  );

  const summary = computeAttendanceSummary(list);
  assert.deepEqual(summary, { total: 2, masuk: 1, pulang: 1 });
});

test('escapeCsvCell neutralizes formula injection and escapes quotes', () => {
  assert.equal(escapeCsvCell('=CMD()'), `"'=CMD()"`);
  assert.equal(escapeCsvCell('Budi "Bos"'), `"Budi ""Bos"""`);
  assert.equal(escapeCsvCell(null), `""`);
});

test('generateAttendanceCsv outputs UTF-8 BOM, headers, and escaped rows', () => {
  const date = new Date(2026, 10, 23, 8, 15, 30);
  const rec = createAttendanceRecord(
    {
      studentName: 'Dewi Lestari',
      nisn: '0081234567',
      shift: ShiftOption.SHIFT_3,
      attendanceType: AttendanceType.MASUK,
      photoDataUrl: 'data:image/jpeg;base64,xyz',
    },
    { latitude: -6.914744, longitude: 107.60981, accuracyMeters: 12.6 },
    date,
    'PKL-CSV-1'
  );
  rec.gasSyncStatus = GasSyncStatus.SYNCED;

  const csv = generateAttendanceCsv([rec]);
  assert.ok(csv.startsWith('\uFEFF'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes('"Nama Siswa"'));
  assert.ok(lines[1].includes('"Dewi Lestari"'));
  assert.ok(lines[1].includes('"0081234567"'));
  assert.ok(lines[1].includes('"Shift 3"'));
  assert.ok(lines[1].includes('"-6.914744"'));
  assert.ok(lines[1].includes('"Tersinkron GAS"'));
});

test('isValidGasWebAppUrl validates Google Apps Script exec URLs and buildGasPayload maps fields', () => {
  assert.equal(
    isValidGasWebAppUrl('https://script.google.com/macros/s/AKfycbxTest123/exec'),
    true
  );
  assert.equal(isValidGasWebAppUrl('https://example.com/exec'), false);
  assert.equal(isValidGasWebAppUrl('http://script.google.com/macros/s/abc/exec'), false);

  const date = new Date(2026, 10, 23, 9, 0, 0);
  const rec = createAttendanceRecord(
    {
      studentName: 'Rizky Pratama',
      nisn: '0075554443',
      shift: ShiftOption.FULL,
      attendanceType: AttendanceType.MASUK,
      photoDataUrl: 'data:image/jpeg;base64,photo',
    },
    null,
    date,
    'PKL-GAS-1'
  );
  const payload = buildGasPayload(rec, 'Rekap_Nov');
  assert.equal(payload.namaSiswa, 'Rizky Pratama');
  assert.equal(payload.sheetName, 'Rekap_Nov');
  assert.equal(payload.shift, 'Full Day');
  assert.equal(payload.lokasiTeks, 'Lokasi tidak diizinkan');
});

test('resolveInitialRole parses URL mode and locks student-only links', () => {
  assert.deepEqual(resolveInitialRole(''), { role: AppRole.SISWA, lockedToStudent: false });
  assert.deepEqual(resolveInitialRole('?mode=admin'), {
    role: AppRole.ADMIN,
    lockedToStudent: false,
  });
  assert.deepEqual(resolveInitialRole('?mode=siswa'), {
    role: AppRole.SISWA,
    lockedToStudent: true,
  });
});

test('getRolePermissions restricts siswa to form only and grants admin full access', () => {
  const siswaPerms = getRolePermissions(AppRole.SISWA);
  assert.deepEqual(siswaPerms, {
    canViewForm: true,
    canViewLog: false,
    canExportCsv: false,
    canConfigureGas: false,
    canDeleteLogs: false,
  });

  const adminPerms = getRolePermissions(AppRole.ADMIN);
  assert.deepEqual(adminPerms, {
    canViewForm: true,
    canViewLog: true,
    canExportCsv: true,
    canConfigureGas: true,
    canDeleteLogs: true,
  });
});

test('buildStudentShareUrl builds direct siswa mode URL', () => {
  assert.equal(
    buildStudentShareUrl('https://absensi.sekolah.sch.id', '/'),
    'https://absensi.sekolah.sch.id/?mode=siswa'
  );
});

test('verifyAdminPin accepts only numeric key 2026', () => {
  assert.equal(verifyAdminPin('2026'), true);
  assert.equal(verifyAdminPin('2025'), false);
  assert.equal(verifyAdminPin(''), false);
  assert.equal(verifyAdminPin('20260'), false);
  assert.equal(verifyAdminPin('abcd'), false);
});

test('buildDriveCsvFilename and buildDriveMultipartBody format valid Drive upload payload', () => {
  const filename = buildDriveCsvFilename(new Date(2026, 10, 23));
  assert.equal(filename, 'rekap-absensi-pkl-2026-11-23.csv');

  const body = buildDriveMultipartBody('\uFEFF"Nama"\r\n"Budi"', filename, 'boundary123');
  assert.ok(body.includes('--boundary123'));
  assert.ok(body.includes('"mimeType":"text/csv"'));
  assert.ok(body.includes('"name":"rekap-absensi-pkl-2026-11-23.csv"'));
  assert.ok(body.includes('Content-Type: text/csv; charset=UTF-8'));
  assert.ok(body.includes('--boundary123--'));
});

test('buildDrivePhotoFilename, parseImageDataUrl, and generateAttendanceCsv include Google Drive image link', () => {
  const date = new Date(2026, 10, 23, 8, 15, 30);
  const rec = createAttendanceRecord(
    {
      studentName: 'Budi Santoso!',
      nisn: '0074512890',
      shift: ShiftOption.SHIFT_1,
      attendanceType: AttendanceType.MASUK,
      photoDataUrl: 'data:image/jpeg;base64,/9j/4AAQ',
    },
    null,
    date,
    'PKL-IMG-1'
  );
  rec.drivePhotoUrl = 'https://drive.google.com/file/d/abc123/view';

  assert.equal(buildDrivePhotoFilename(rec), 'selfie-budi-santoso-0074512890-PKL-IMG-1.jpg');
  const parsed = parseImageDataUrl(rec.photoDataUrl);
  assert.ok(parsed);
  assert.equal(parsed.mimeType, 'image/jpeg');
  assert.ok(parsed.bytes.length > 0);
  assert.equal(parseImageDataUrl('invalid'), null);

  const csv = generateAttendanceCsv([rec]);
  assert.ok(csv.includes('"Link Foto Google Drive"'));
  assert.ok(csv.includes('"https://drive.google.com/file/d/abc123/view"'));
});




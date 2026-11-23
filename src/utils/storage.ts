import { AttendanceRecord, GasConfig } from '../types/attendance';

const RECORDS_STORAGE_KEY = 'absensi_pkl_records_v1';
const GAS_CONFIG_STORAGE_KEY = 'absensi_pkl_gas_config_v1';
const LAST_STUDENT_STORAGE_KEY = 'absensi_pkl_last_student_v1';

export const DEFAULT_GAS_CONFIG: GasConfig = {
  webAppUrl: '',
  autoSync: true,
  sheetName: 'AbsensiPKL',
};

export function loadAttendanceRecords(): AttendanceRecord[] {
  try {
    const raw = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAttendanceRecords(records: AttendanceRecord[]): { ok: boolean; error?: string } {
  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Penyimpanan browser penuh. Silakan ekspor CSV lalu hapus catatan lama.',
    };
  }
}

export function loadGasConfig(): GasConfig {
  try {
    const raw = window.localStorage.getItem(GAS_CONFIG_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GAS_CONFIG;
    }
    const parsed = JSON.parse(raw) as Partial<GasConfig>;
    return {
      webAppUrl: typeof parsed.webAppUrl === 'string' ? parsed.webAppUrl : '',
      autoSync: typeof parsed.autoSync === 'boolean' ? parsed.autoSync : true,
      sheetName:
        typeof parsed.sheetName === 'string' && parsed.sheetName.trim()
          ? parsed.sheetName
          : 'AbsensiPKL',
    };
  } catch {
    return DEFAULT_GAS_CONFIG;
  }
}

export function saveGasConfig(config: GasConfig): void {
  try {
    window.localStorage.setItem(GAS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage write errors for config
  }
}

export function loadLastStudentProfile(): { studentName: string; nisn: string } {
  try {
    const raw = window.localStorage.getItem(LAST_STUDENT_STORAGE_KEY);
    if (!raw) {
      return { studentName: '', nisn: '' };
    }
    const parsed = JSON.parse(raw) as { studentName?: string; nisn?: string };
    return {
      studentName: typeof parsed.studentName === 'string' ? parsed.studentName : '',
      nisn: typeof parsed.nisn === 'string' ? parsed.nisn : '',
    };
  } catch {
    return { studentName: '', nisn: '' };
  }
}

export function saveLastStudentProfile(studentName: string, nisn: string): void {
  try {
    window.localStorage.setItem(
      LAST_STUDENT_STORAGE_KEY,
      JSON.stringify({ studentName: studentName.trim(), nisn: nisn.trim() })
    );
  } catch {
    // Ignore storage write errors
  }
}

export enum ShiftOption {
  SHIFT_1 = '1',
  SHIFT_2 = '2',
  SHIFT_3 = '3',
  FULL = 'Full',
}

export enum AttendanceType {
  MASUK = 'Masuk',
  PULANG = 'Pulang',
}

export enum GasSyncStatus {
  LOCAL_ONLY = 'Lokal',
  SYNCING = 'Mengirim',
  SYNCED = 'Tersinkron GAS',
  FAILED = 'Gagal GAS',
}

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export type GpsPermissionState =
  | 'idle'
  | 'loading'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface AttendanceFormValues {
  studentName: string;
  nisn: string;
  shift: ShiftOption;
  attendanceType: AttendanceType;
  photoDataUrl: string | null;
}

export interface ValidationErrors {
  studentName?: string;
  nisn?: string;
  photoDataUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  studentName: string;
  nisn: string;
  shift: ShiftOption;
  attendanceType: AttendanceType;
  timestampIso: string;
  formattedDate: string;
  formattedTime: string;
  location: GeoCoordinate | null;
  locationStatusText: string;
  photoDataUrl: string;
  drivePhotoUrl?: string;
  drivePhotoFileId?: string;
  drivePhotoSavedBy?: string;
  gasSyncStatus: GasSyncStatus;
  gasSyncMessage?: string;
}

export interface GasConfig {
  webAppUrl: string;
  autoSync: boolean;
  sheetName: string;
}

export interface AttendanceFilter {
  searchQuery: string;
  attendanceType: 'ALL' | AttendanceType;
  shift: 'ALL' | ShiftOption;
}

export enum AppRole {
  SISWA = 'siswa',
  ADMIN = 'admin',
}

export interface RolePermissions {
  canViewForm: boolean;
  canViewLog: boolean;
  canExportCsv: boolean;
  canConfigureGas: boolean;
  canDeleteLogs: boolean;
}

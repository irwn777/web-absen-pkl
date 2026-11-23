import { useMemo, useState } from 'react';
import {
  CloudUpload,
  Download,
  ExternalLink,
  Router,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AttendanceFilter,
  AttendanceRecord,
  AttendanceType,
  GasSyncStatus,
  ShiftOption,
} from '../types/attendance';
import {
  buildGoogleMapsUrl,
  computeAttendanceSummary,
  filterAttendanceRecords,
  SHIFT_LABELS,
} from '../utils/attendanceLogic';

import { DriveUploadResult } from '../utils/googleDriveClient';
import { GoogleDriveExportBar } from './GoogleDriveExportBar';

interface AttendanceLogProps {
  records: AttendanceRecord[];
  filter: AttendanceFilter;
  onFilterChange: (next: AttendanceFilter) => void;
  onExportCsv: () => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onPreviewPhoto: (record: AttendanceRecord) => void;
  onRetryGasSync: (record: AttendanceRecord) => void;
  hasGasConfigured: boolean;
  driveConnectedEmail: string | null;
  driveNeedsAuth: boolean;
  isSigningInDrive: boolean;
  isUploadingDrive: boolean;
  isUploadingPhotosDrive: boolean;
  lastDriveUpload: DriveUploadResult | null;
  driveError: string | null;
  drivePhotoMessage: string | null;
  driveShareMessage: string | null;
  onSignInDrive: (loginHint?: string) => void;
  onSignOutDrive: () => void;
  onExportCsvToDrive: () => void;
  onSaveAllPhotosToDrive: () => void;
  onSaveSinglePhotoToDrive: (record: AttendanceRecord) => void;
  onConfirmShareDrive: (fileId: string) => Promise<void>;
  onConfirmSharePhotosDrive: () => Promise<void>;
}

export function AttendanceLog({
  records,
  filter,
  onFilterChange,
  onExportCsv,
  onDeleteRecord,
  onClearAll,
  onPreviewPhoto,
  onRetryGasSync,
  hasGasConfigured,
  driveConnectedEmail,
  driveNeedsAuth,
  isSigningInDrive,
  isUploadingDrive,
  isUploadingPhotosDrive,
  lastDriveUpload,
  driveError,
  drivePhotoMessage,
  driveShareMessage,
  onSignInDrive,
  onSignOutDrive,
  onExportCsvToDrive,
  onSaveAllPhotosToDrive,
  onSaveSinglePhotoToDrive,
  onConfirmShareDrive,
  onConfirmSharePhotosDrive,
}: AttendanceLogProps) {
  const [emptyImgFailed, setEmptyImgFailed] = useState(false);
  const summary = useMemo(() => computeAttendanceSummary(records), [records]);
  const filteredRecords = useMemo(
    () => filterAttendanceRecords(records, filter),
    [records, filter]
  );
  const savedPhotoCount = useMemo(
    () => records.filter((r) => Boolean(r.drivePhotoUrl)).length,
    [records]
  );
  const unsavedPhotoCount = records.length - savedPhotoCount;

  return (
    <section
      id="rekap-log"
      aria-labelledby="log-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5"
    >
      {/* Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h2 id="log-heading" className="text-xl font-bold tracking-tight text-slate-900">
            Rekap Log Kehadiran
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 tabular-nums">
            <span>
              Total <strong className="font-semibold text-slate-900">{summary.total}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Masuk <strong className="font-semibold text-teal-700">{summary.masuk}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Pulang <strong className="font-semibold text-amber-700">{summary.pulang}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {records.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="min-h-[40px] px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Bersihkan Log
            </button>
          )}
          <button
            type="button"
            onClick={onExportCsv}
            disabled={records.length === 0}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Google Drive Export Integration */}
      <GoogleDriveExportBar
        recordCount={records.length}
        unsavedPhotoCount={unsavedPhotoCount}
        savedPhotoCount={savedPhotoCount}
        connectedEmail={driveConnectedEmail}
        needsAuth={driveNeedsAuth}
        isSigningIn={isSigningInDrive}
        isUploadingCsv={isUploadingDrive}
        isUploadingPhotos={isUploadingPhotosDrive}
        lastUpload={lastDriveUpload}
        driveError={driveError}
        drivePhotoMessage={drivePhotoMessage}
        shareSuccessMessage={driveShareMessage}
        onSignIn={onSignInDrive}
        onSignOut={onSignOutDrive}
        onExportToDrive={onExportCsvToDrive}
        onSavePhotosToDrive={onSaveAllPhotosToDrive}
        onConfirmShareCsvWithTarget={onConfirmShareDrive}
        onConfirmSharePhotosWithTarget={onConfirmSharePhotosDrive}
      />

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari nama siswa atau NISN"
              placeholder="Cari nama siswa atau NISN..."
              value={filter.searchQuery}
              onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
              className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
          </div>

          <select
            aria-label="Filter berdasarkan shift"
            value={filter.shift}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                shift: e.target.value as 'ALL' | ShiftOption,
              })
            }
            className="min-h-[44px] px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 cursor-pointer"
          >
            <option value="ALL">Semua Shift</option>
            <option value={ShiftOption.SHIFT_1}>Shift 1</option>
            <option value={ShiftOption.SHIFT_2}>Shift 2</option>
            <option value={ShiftOption.SHIFT_3}>Shift 3</option>
            <option value={ShiftOption.FULL}>Full Day</option>
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-fit">
          {(['ALL', AttendanceType.MASUK, AttendanceType.PULANG] as const).map((tab) => {
            const active = filter.attendanceType === tab;
            const label = tab === 'ALL' ? 'Semua' : tab;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={active}
                onClick={() => onFilterChange({ ...filter, attendanceType: tab })}
                className={`flex-1 sm:flex-initial min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log List */}
      {records.length === 0 ? (
        <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/60 space-y-3.5">
          <div className="max-w-[240px] mx-auto aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            {!emptyImgFailed ? (
              <img
                src="/src/assets/images/tkj_empty_log_1795423322990.jpg"
                alt="Ilustrasi siswa SMK TKJ magang di meja kerja jaringan"
                referrerPolicy="no-referrer"
                onError={() => setEmptyImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-100 to-teal-50 text-slate-600 p-3">
                <Router className="w-7 h-7 text-teal-700" aria-hidden="true" />
                <span className="text-[11px] font-medium">Rekap Log TKJ</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Belum ada log absensi tersimpan</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Isi nama siswa, NISN, shift, ambil foto selfie dari kamera depan, lalu tekan tombol Simpan Absensi.
            </p>
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/60 space-y-1">
          <p className="text-sm font-semibold text-slate-800">Tidak ada catatan yang cocok</p>
          <p className="text-xs text-slate-500">
            Ubah kata kunci pencarian atau filter shift dan jenis absen.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200" data-testid="attendance-log-list">
          {filteredRecords.map((record) => {
            const mapsUrl = buildGoogleMapsUrl(record.location);
            return (
              <li key={record.id} className="py-4 first:pt-1 last:pb-1">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  {/* Selfie Thumbnail */}
                  <button
                    type="button"
                    onClick={() => onPreviewPhoto(record)}
                    aria-label={`Lihat foto selfie ${record.studentName}`}
                    className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <img
                      src={record.photoDataUrl}
                      alt={`Foto selfie ${record.studentName}`}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Entry Details */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {record.studentName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                          <span className="font-mono tabular-nums">NISN {record.nisn}</span>
                          <span aria-hidden="true">·</span>
                          <span>{SHIFT_LABELS[record.shift]}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              record.attendanceType === AttendanceType.MASUK
                                ? 'text-teal-700'
                                : 'text-amber-700'
                            }`}
                          >
                            Absen {record.attendanceType}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteRecord(record.id)}
                        aria-label={`Hapus catatan ${record.studentName} pukul ${record.formattedTime}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Time & Location metadata */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <p className="font-mono tabular-nums text-slate-800">
                        {record.formattedDate} · {record.formattedTime}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {mapsUrl ? (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono tabular-nums text-teal-700 hover:text-teal-800 hover:underline"
                          >
                            <span>{record.locationStatusText}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-slate-500">{record.locationStatusText}</span>
                        )}

                        {record.drivePhotoUrl ? (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              |
                            </span>
                            <a
                              href={record.drivePhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800 hover:underline"
                            >
                              <span>Link Foto Drive</span>
                              <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                            </a>
                          </>
                        ) : (
                          !driveNeedsAuth && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                |
                              </span>
                              <button
                                type="button"
                                onClick={() => onSaveSinglePhotoToDrive(record)}
                                disabled={isUploadingPhotosDrive}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50 cursor-pointer"
                              >
                                <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Simpan Foto ke Drive</span>
                              </button>
                            </>
                          )
                        )}

                        {hasGasConfigured && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              |
                            </span>
                            <span
                              className={`font-medium ${
                                record.gasSyncStatus === GasSyncStatus.SYNCED
                                  ? 'text-teal-700'
                                  : record.gasSyncStatus === GasSyncStatus.FAILED
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {record.gasSyncStatus}
                            </span>
                            {(record.gasSyncStatus === GasSyncStatus.LOCAL_ONLY ||
                              record.gasSyncStatus === GasSyncStatus.FAILED) && (
                              <button
                                type="button"
                                onClick={() => onRetryGasSync(record)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                              >
                                <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Kirim ke GAS</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

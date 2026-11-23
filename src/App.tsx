import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppRole,
  AttendanceFilter,
  AttendanceFormValues,
  AttendanceRecord,
  AttendanceType,
  GasConfig,
  GasSyncStatus,
  GeoCoordinate,
  GpsPermissionState,
  ShiftOption,
} from './types/attendance';
import {
  buildDriveCsvFilename,
  createAttendanceRecord,
  generateAttendanceCsv,
  getRolePermissions,
  isValidGasWebAppUrl,
  resolveInitialRole,
  TARGET_DRIVE_EMAIL,
  TARGET_PHOTO_DRIVE_EMAIL,
} from './utils/attendanceLogic';
import { sendRecordToGas } from './utils/gasClient';
import {
  DriveUploadResult,
  ensureDrivePhotoFolder,
  getDriveAccessToken,
  initDriveAuth,
  shareDriveFileWithEmail,
  signInWithGoogleForDrive,
  signOutDrive,
  uploadCsvToGoogleDrive,
  uploadPhotoToGoogleDrive,
} from './utils/googleDriveClient';
import {
  loadAttendanceRecords,
  loadGasConfig,
  loadLastStudentProfile,
  saveAttendanceRecords,
  saveGasConfig,
  saveLastStudentProfile,
} from './utils/storage';
import { Header } from './components/Header';
import { RoleSwitcherBar } from './components/RoleSwitcherBar';
import { TkjHeroBanner } from './components/TkjHeroBanner';
import { StudentGuidePanel } from './components/StudentGuidePanel';
import { AttendanceForm } from './components/AttendanceForm';
import { AttendanceLog } from './components/AttendanceLog';
import { GasConfigModal } from './components/GasConfigModal';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { AdminPinModal } from './components/AdminPinModal';

export default function App() {
  const initialMode = useMemo(
    () => resolveInitialRole(typeof window !== 'undefined' ? window.location.search : ''),
    []
  );
  const [role, setRole] = useState<AppRole>(initialMode.role);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(
    () => initialMode.role === AppRole.ADMIN
  );

  const effectiveRole =
    role === AppRole.ADMIN && isAdminUnlocked ? AppRole.ADMIN : AppRole.SISWA;
  const permissions = useMemo(() => getRolePermissions(effectiveRole), [effectiveRole]);

  const [records, setRecords] = useState<AttendanceRecord[]>(() => loadAttendanceRecords());
  const [gasConfig, setGasConfig] = useState<GasConfig>(() => loadGasConfig());

  const [formValues, setFormValues] = useState<AttendanceFormValues>(() => {
    const profile = loadLastStudentProfile();
    return {
      studentName: profile.studentName,
      nisn: profile.nisn,
      shift: ShiftOption.SHIFT_1,
      attendanceType: AttendanceType.MASUK,
      photoDataUrl: null,
    };
  });

  const [now, setNow] = useState<Date>(() => new Date());
  const [location, setLocation] = useState<GeoCoordinate | null>(null);
  const [gpsState, setGpsState] = useState<GpsPermissionState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filter, setFilter] = useState<AttendanceFilter>({
    searchQuery: '',
    attendanceType: 'ALL',
    shift: 'ALL',
  });

  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<AttendanceRecord | null>(null);

  // Google Drive OAuth & upload states (token kept strictly in memory)
  const [driveConnectedEmail, setDriveConnectedEmail] = useState<string | null>(null);
  const [driveNeedsAuth, setDriveNeedsAuth] = useState(true);
  const [isSigningInDrive, setIsSigningInDrive] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [isUploadingPhotosDrive, setIsUploadingPhotosDrive] = useState(false);
  const [lastDriveUpload, setLastDriveUpload] = useState<DriveUploadResult | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [drivePhotoMessage, setDrivePhotoMessage] = useState<string | null>(null);
  const [driveShareMessage, setDriveShareMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user) => {
        setDriveConnectedEmail(user.email || null);
        setDriveNeedsAuth(false);
      },
      () => {
        setDriveConnectedEmail(null);
        setDriveNeedsAuth(true);
      }
    );
    return unsubscribe;
  }, []);

  // Live local clock
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Automatic GPS coordinate detection (if permitted)
  const requestGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState('unavailable');
      setLocation(null);
      return;
    }

    setGpsState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        });
        setGpsState('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsState('denied');
        } else {
          setGpsState('unavailable');
        }
        setLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  useEffect(() => {
    requestGpsLocation();
  }, [requestGpsLocation]);

  const updateRecords = useCallback((updater: (prev: AttendanceRecord[]) => AttendanceRecord[]) => {
    setRecords((prev) => {
      const next = updater(prev);
      saveAttendanceRecords(next);
      return next;
    });
  }, []);

  const hasGasConfigured = isValidGasWebAppUrl(gasConfig.webAppUrl);

  const handleSaveAttendance = async (
    values: AttendanceFormValues
  ): Promise<{ ok: boolean; message: string }> => {
    setIsSubmitting(true);
    try {
      const captureTime = new Date();
      const newRecord = createAttendanceRecord(values, location, captureTime);

      saveLastStudentProfile(values.studentName, values.nisn);

      // Best-effort automatic photo upload if user already has an active Google Drive token in memory
      const activeDriveToken = getDriveAccessToken();
      if (activeDriveToken && newRecord.photoDataUrl) {
        try {
          const folderId = await ensureDrivePhotoFolder(activeDriveToken);
          const uploadedPhoto = await uploadPhotoToGoogleDrive(newRecord, activeDriveToken, folderId);
          newRecord.drivePhotoUrl = uploadedPhoto.webViewLink;
          newRecord.drivePhotoFileId = uploadedPhoto.id;
          newRecord.drivePhotoSavedBy = driveConnectedEmail || TARGET_PHOTO_DRIVE_EMAIL;
          setDrivePhotoMessage(
            `Foto selfie ${newRecord.studentName} tersimpan ke Google Drive (folder Foto_Absensi_PKL).`
          );
        } catch {
          // Keep attendance submission successful locally; admin can retry Drive photo upload later
        }
      }

      const shouldSyncGas = hasGasConfigured && gasConfig.autoSync;
      if (shouldSyncGas) {
        newRecord.gasSyncStatus = GasSyncStatus.SYNCING;
      }

      const nextRecords = [newRecord, ...records];
      const storageResult = saveAttendanceRecords(nextRecords);
      if (!storageResult.ok) {
        return { ok: false, message: storageResult.error || 'Gagal menyimpan catatan.' };
      }

      setRecords(nextRecords);
      setFormValues((prev) => ({
        ...prev,
        photoDataUrl: null,
      }));

      if (shouldSyncGas) {
        const gasRes = await sendRecordToGas(newRecord, gasConfig);
        updateRecords((prev) =>
          prev.map((item) =>
            item.id === newRecord.id
              ? {
                  ...item,
                  gasSyncStatus: gasRes.success ? GasSyncStatus.SYNCED : GasSyncStatus.FAILED,
                  gasSyncMessage: gasRes.message,
                }
              : item
          )
        );
        if (role === AppRole.SISWA) {
          return {
            ok: true,
            message: `Absensi ${newRecord.attendanceType} untuk ${newRecord.studentName} berhasil dikirim.`,
          };
        }
        return {
          ok: true,
          message: gasRes.success
            ? `Absensi ${newRecord.attendanceType} tersimpan & terkirim ke Google Sheets (GAS).`
            : `Absensi tersimpan di perangkat, tetapi pengiriman GAS gagal: ${gasRes.message}`,
        };
      }

      return {
        ok: true,
        message: `Absensi ${newRecord.attendanceType} untuk ${newRecord.studentName} berhasil disimpan.`,
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryGasSync = async (record: AttendanceRecord) => {
    updateRecords((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, gasSyncStatus: GasSyncStatus.SYNCING } : item
      )
    );
    const gasRes = await sendRecordToGas(record, gasConfig);
    updateRecords((prev) =>
      prev.map((item) =>
        item.id === record.id
          ? {
              ...item,
              gasSyncStatus: gasRes.success ? GasSyncStatus.SYNCED : GasSyncStatus.FAILED,
              gasSyncMessage: gasRes.message,
            }
          : item
      )
    );
  };

  const handleExportCsv = () => {
    if (records.length === 0) {
      return;
    }
    const csvContent = generateAttendanceCsv(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `rekap-absensi-pkl-${dateStamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecord = (id: string) => {
    updateRecords((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    updateRecords(() => []);
  };

  const handleSaveGasConfig = (next: GasConfig) => {
    setGasConfig(next);
    saveGasConfig(next);
  };

  const handleSignInDrive = async (loginHint?: string) => {
    setDriveError(null);
    setDrivePhotoMessage(null);
    setDriveShareMessage(null);
    setIsSigningInDrive(true);
    try {
      const result = await signInWithGoogleForDrive(loginHint);
      setDriveConnectedEmail(result.user.email || null);
      setDriveNeedsAuth(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk ke akun Google Drive.';
      setDriveError(msg);
    } finally {
      setIsSigningInDrive(false);
    }
  };

  const handleSignOutDrive = async () => {
    setDriveError(null);
    setDrivePhotoMessage(null);
    setDriveShareMessage(null);
    setLastDriveUpload(null);
    await signOutDrive();
    setDriveConnectedEmail(null);
    setDriveNeedsAuth(true);
  };

  const uploadRecordsToDrive = async (targetRecords: AttendanceRecord[]) => {
    const pending = targetRecords.filter((r) => !r.drivePhotoUrl && r.photoDataUrl);
    if (pending.length === 0) {
      return;
    }
    const token = getDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      setDriveError(
        'Silakan masuk dengan Google terlebih dahulu untuk menyimpan foto ke Google Drive.'
      );
      return;
    }

    setDriveError(null);
    setDrivePhotoMessage(null);
    setIsUploadingPhotosDrive(true);
    let uploadedCount = 0;
    try {
      const folderId = await ensureDrivePhotoFolder(token);
      for (const rec of pending) {
        const uploaded = await uploadPhotoToGoogleDrive(rec, token, folderId);
        uploadedCount += 1;
        updateRecords((prev) =>
          prev.map((item) =>
            item.id === rec.id
              ? {
                  ...item,
                  drivePhotoUrl: uploaded.webViewLink,
                  drivePhotoFileId: uploaded.id,
                  drivePhotoSavedBy: driveConnectedEmail || TARGET_PHOTO_DRIVE_EMAIL,
                }
              : item
          )
        );
      }
      setDrivePhotoMessage(
        `${uploadedCount} foto selfie tersimpan di Google Drive (folder Foto_Absensi_PKL) dan link gambar sudah tercatat di log serta CSV.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto ke Google Drive.';
      setDriveError(msg);
      if (uploadedCount > 0) {
        setDrivePhotoMessage(
          `${uploadedCount} foto berhasil disimpan sebelum terhenti. Silakan lanjutkan ulang.`
        );
      }
      if (!getDriveAccessToken()) {
        setDriveNeedsAuth(true);
      }
    } finally {
      setIsUploadingPhotosDrive(false);
    }
  };

  const handleSaveAllPhotosToDrive = async () => {
    await uploadRecordsToDrive(records);
  };

  const handleSaveSinglePhotoToDrive = async (record: AttendanceRecord) => {
    await uploadRecordsToDrive([record]);
  };

  const handleExportCsvToDrive = async () => {
    if (records.length === 0) {
      return;
    }
    const token = getDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      setDriveError('Silakan masuk dengan Google terlebih dahulu untuk menyimpan ke Google Drive.');
      return;
    }

    setDriveError(null);
    setDriveShareMessage(null);
    setIsUploadingDrive(true);
    try {
      const csvContent = generateAttendanceCsv(records);
      const fileName = buildDriveCsvFilename(new Date());
      const uploaded = await uploadCsvToGoogleDrive(csvContent, fileName, token);
      setLastDriveUpload(uploaded);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah CSV ke Google Drive.';
      setDriveError(msg);
      if (!getDriveAccessToken()) {
        setDriveNeedsAuth(true);
      }
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleConfirmShareDrive = async (fileId: string) => {
    const token = getDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      setDriveError('Sesi Google Drive tidak ditemukan. Silakan masuk kembali.');
      return;
    }
    setDriveError(null);
    try {
      await shareDriveFileWithEmail(fileId, TARGET_DRIVE_EMAIL, token);
      setDriveShareMessage(`File CSV berhasil dibagikan ke ${TARGET_DRIVE_EMAIL}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membagikan file Google Drive.';
      setDriveError(msg);
    }
  };

  const handleConfirmSharePhotosDrive = async () => {
    const token = getDriveAccessToken();
    if (!token) {
      setDriveNeedsAuth(true);
      setDriveError('Sesi Google Drive tidak ditemukan. Silakan masuk kembali.');
      return;
    }
    const driveFiles = records.filter((r) => Boolean(r.drivePhotoFileId));
    if (driveFiles.length === 0) {
      setDriveError('Belum ada foto yang tersimpan di Google Drive untuk dibagikan.');
      return;
    }

    setDriveError(null);
    let sharedCount = 0;
    try {
      for (const rec of driveFiles) {
        if (rec.drivePhotoFileId) {
          await shareDriveFileWithEmail(rec.drivePhotoFileId, TARGET_PHOTO_DRIVE_EMAIL, token);
          sharedCount += 1;
        }
      }
      setDrivePhotoMessage(
        `${sharedCount} foto selfie & link Google Drive berhasil dibagikan ke ${TARGET_PHOTO_DRIVE_EMAIL}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membagikan foto ke Google Drive.';
      setDriveError(msg);
    }
  };

  const handleSelectStudent = () => {
    setRole(AppRole.SISWA);
    setIsAdminUnlocked(false);
  };

  const handleRequestAdminUnlock = () => {
    if (role === AppRole.ADMIN && isAdminUnlocked) {
      return;
    }
    setIsPinModalOpen(true);
  };

  const handleUnlockAdmin = () => {
    setIsAdminUnlocked(true);
    setRole(AppRole.ADMIN);
    setIsPinModalOpen(false);
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setRole(AppRole.SISWA);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        permissions={permissions}
        recordCount={records.length}
        onExportCsv={handleExportCsv}
        onOpenGasModal={() => setIsGasModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {!initialMode.lockedToStudent && (
          <RoleSwitcherBar
            role={role}
            isAdminUnlocked={isAdminUnlocked}
            onSelectStudent={handleSelectStudent}
            onRequestAdminUnlock={handleRequestAdminUnlock}
            onLockAdmin={handleLockAdmin}
          />
        )}

        <TkjHeroBanner isAdminView={permissions.canViewLog} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-5">
            <AttendanceForm
              values={formValues}
              onChange={setFormValues}
              now={now}
              location={location}
              gpsState={gpsState}
              onRefreshGps={requestGpsLocation}
              onSubmit={handleSaveAttendance}
              isSubmitting={isSubmitting}
              hasGasConfigured={hasGasConfigured}
              isAdminView={permissions.canViewLog}
            />
          </div>

          {permissions.canViewLog ? (
            <div className="lg:col-span-7 lg:sticky lg:top-20">
              <AttendanceLog
                records={records}
                filter={filter}
                onFilterChange={setFilter}
                onExportCsv={handleExportCsv}
                onDeleteRecord={handleDeleteRecord}
                onClearAll={handleClearAll}
                onPreviewPhoto={setPreviewRecord}
                onRetryGasSync={handleRetryGasSync}
                hasGasConfigured={hasGasConfigured}
                driveConnectedEmail={driveConnectedEmail}
                driveNeedsAuth={driveNeedsAuth}
                isSigningInDrive={isSigningInDrive}
                isUploadingDrive={isUploadingDrive}
                isUploadingPhotosDrive={isUploadingPhotosDrive}
                lastDriveUpload={lastDriveUpload}
                driveError={driveError}
                drivePhotoMessage={drivePhotoMessage}
                driveShareMessage={driveShareMessage}
                onSignInDrive={(loginHint) => void handleSignInDrive(loginHint)}
                onSignOutDrive={() => void handleSignOutDrive()}
                onExportCsvToDrive={() => void handleExportCsvToDrive()}
                onSaveAllPhotosToDrive={() => void handleSaveAllPhotosToDrive()}
                onSaveSinglePhotoToDrive={(record) => void handleSaveSinglePhotoToDrive(record)}
                onConfirmShareDrive={handleConfirmShareDrive}
                onConfirmSharePhotosDrive={handleConfirmSharePhotosDrive}
              />
            </div>
          ) : (
            <div className="lg:col-span-7 lg:sticky lg:top-20">
              <StudentGuidePanel />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Sistem Absensi PKL SMK Negeri 1 Jawai Selatan · Berbasis Foto Selfie &amp; Google Apps Script
          </span>
          {permissions.canConfigureGas && (
            <button
              type="button"
              onClick={() => setIsGasModalOpen(true)}
              className="font-medium text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
            >
              {hasGasConfigured ? 'Ubah Konfigurasi GAS' : 'Pasang Skrip Google Apps Script (Code.gs)'}
            </button>
          )}
        </div>
      </footer>

      {permissions.canConfigureGas && (
        <GasConfigModal
          isOpen={isGasModalOpen}
          config={gasConfig}
          onSave={handleSaveGasConfig}
          onClose={() => setIsGasModalOpen(false)}
        />
      )}

      {permissions.canViewLog && (
        <PhotoPreviewModal
          record={previewRecord}
          onClose={() => setPreviewRecord(null)}
        />
      )}

      {!initialMode.lockedToStudent && (
        <AdminPinModal
          isOpen={isPinModalOpen}
          onUnlock={handleUnlockAdmin}
          onClose={() => {
            setIsPinModalOpen(false);
            if (!isAdminUnlocked) {
              setRole(AppRole.SISWA);
            }
          }}
        />
      )}
    </div>
  );
}

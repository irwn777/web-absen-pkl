import { useState } from 'react';
import { CloudUpload, ExternalLink, ImageUp, LogOut, Share2 } from 'lucide-react';
import {
  TARGET_DRIVE_EMAIL,
  TARGET_PHOTO_DRIVE_EMAIL,
} from '../utils/attendanceLogic';
import { DriveUploadResult } from '../utils/googleDriveClient';

interface GoogleDriveExportBarProps {
  recordCount: number;
  unsavedPhotoCount: number;
  savedPhotoCount: number;
  connectedEmail: string | null;
  needsAuth: boolean;
  isSigningIn: boolean;
  isUploadingCsv: boolean;
  isUploadingPhotos: boolean;
  lastUpload: DriveUploadResult | null;
  driveError: string | null;
  drivePhotoMessage: string | null;
  shareSuccessMessage: string | null;
  onSignIn: (loginHint?: string) => void;
  onSignOut: () => void;
  onExportToDrive: () => void;
  onSavePhotosToDrive: () => void;
  onConfirmShareCsvWithTarget: (fileId: string) => Promise<void>;
  onConfirmSharePhotosWithTarget: () => Promise<void>;
}

export function GoogleDriveExportBar({
  recordCount,
  unsavedPhotoCount,
  savedPhotoCount,
  connectedEmail,
  needsAuth,
  isSigningIn,
  isUploadingCsv,
  isUploadingPhotos,
  lastUpload,
  driveError,
  drivePhotoMessage,
  shareSuccessMessage,
  onSignIn,
  onSignOut,
  onExportToDrive,
  onSavePhotosToDrive,
  onConfirmShareCsvWithTarget,
  onConfirmSharePhotosWithTarget,
}: GoogleDriveExportBarProps) {
  const [confirmMode, setConfirmMode] = useState<'csv' | 'photos' | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const isDifferentCsvAccount =
    Boolean(connectedEmail) &&
    connectedEmail?.toLowerCase() !== TARGET_DRIVE_EMAIL.toLowerCase();

  const isDifferentPhotoAccount =
    Boolean(connectedEmail) &&
    connectedEmail?.toLowerCase() !== TARGET_PHOTO_DRIVE_EMAIL.toLowerCase();

  const handleConfirmShare = async () => {
    setIsSharing(true);
    try {
      if (confirmMode === 'csv' && lastUpload) {
        await onConfirmShareCsvWithTarget(lastUpload.id);
      } else if (confirmMode === 'photos') {
        await onConfirmSharePhotosWithTarget();
      }
      setConfirmMode(null);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-slate-900">
            Sinkronisasi Google Drive (CSV &amp; Foto Selfie)
          </p>
          <div className="space-y-0.5 text-xs text-slate-600 break-words">
            <p>
              Target CSV: <span className="font-mono text-slate-800">{TARGET_DRIVE_EMAIL}</span>
            </p>
            <p>
              Target Foto &amp; Link Gambar:{' '}
              <span className="font-mono text-slate-800">{TARGET_PHOTO_DRIVE_EMAIL}</span>
            </p>
            {!needsAuth && connectedEmail && (
              <p className="text-teal-800 font-medium pt-0.5">
                Terhubung sebagai <span className="font-mono">{connectedEmail}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {needsAuth || !connectedEmail ? (
            <button
              type="button"
              onClick={() => onSignIn(TARGET_PHOTO_DRIVE_EMAIL)}
              disabled={isSigningIn}
              className="min-h-[42px] inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-60 border border-slate-300 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onSavePhotosToDrive}
                disabled={unsavedPhotoCount === 0 || isUploadingPhotos || isUploadingCsv}
                className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <ImageUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isUploadingPhotos
                    ? 'Mengunggah Foto...'
                    : unsavedPhotoCount > 0
                    ? `Simpan ${unsavedPhotoCount} Foto ke Drive`
                    : 'Semua Foto di Drive'}
                </span>
              </button>

              <button
                type="button"
                onClick={onExportToDrive}
                disabled={recordCount === 0 || isUploadingCsv || isUploadingPhotos}
                className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <CloudUpload className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isUploadingCsv ? 'Mengunggah CSV...' : 'Simpan CSV ke Google Drive'}</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                aria-label="Keluar dari akun Google Drive"
                className="min-h-[42px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {driveError && (
        <p role="alert" className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {driveError}
        </p>
      )}

      {drivePhotoMessage && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2 text-xs text-teal-950">
          <p>{drivePhotoMessage}</p>
          {isDifferentPhotoAccount && savedPhotoCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-200/80">
              <span>
                Anda masuk sebagai {connectedEmail}. Bagikan foto &amp; link ke {TARGET_PHOTO_DRIVE_EMAIL}?
              </span>
              <button
                type="button"
                onClick={() => setConfirmMode('photos')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-teal-900 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Bagikan Foto ke {TARGET_PHOTO_DRIVE_EMAIL}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {lastUpload && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2 text-xs text-teal-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              File <strong className="font-mono">{lastUpload.name}</strong> tersimpan di Google Drive.
            </span>
            {lastUpload.webViewLink && (
              <a
                href={lastUpload.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline"
              >
                <span>Buka di Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </div>

          {isDifferentCsvAccount && !shareSuccessMessage && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-200/80">
              <span className="text-teal-900">
                Anda masuk sebagai {connectedEmail}. Bagikan CSV ini ke {TARGET_DRIVE_EMAIL}?
              </span>
              <button
                type="button"
                onClick={() => setConfirmMode('csv')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-teal-900 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Bagikan ke {TARGET_DRIVE_EMAIL}</span>
              </button>
            </div>
          )}

          {shareSuccessMessage && (
            <p className="font-medium text-teal-800 pt-1 border-t border-teal-200/80">
              {shareSuccessMessage}
            </p>
          )}
        </div>
      )}

      {/* Explicit user confirmation dialog before mutating Drive file permissions */}
      {confirmMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-drive-confirm-title"
        >
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            <h3 id="share-drive-confirm-title" className="text-base font-bold text-slate-900">
              Konfirmasi Berbagi File Google Drive
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmMode === 'csv' && lastUpload ? (
                <>
                  Berikan akses baca untuk file{' '}
                  <strong className="font-mono text-slate-900">{lastUpload.name}</strong> kepada akun{' '}
                  <strong className="font-mono text-slate-900">{TARGET_DRIVE_EMAIL}</strong>?
                </>
              ) : (
                <>
                  Berikan akses baca untuk{' '}
                  <strong className="text-slate-900">{savedPhotoCount} foto selfie</strong> yang tersimpan
                  di Google Drive kepada akun{' '}
                  <strong className="font-mono text-slate-900">{TARGET_PHOTO_DRIVE_EMAIL}</strong>?
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                disabled={isSharing}
                className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmShare()}
                disabled={isSharing}
                className="min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {isSharing ? 'Membagikan...' : 'Ya, Bagikan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

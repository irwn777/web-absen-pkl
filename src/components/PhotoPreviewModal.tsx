import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { buildGoogleMapsUrl, SHIFT_LABELS } from '../utils/attendanceLogic';

interface PhotoPreviewModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export function PhotoPreviewModal({ record, onClose }: PhotoPreviewModalProps) {
  useEffect(() => {
    if (!record) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  if (!record) {
    return null;
  }

  const mapsUrl = buildGoogleMapsUrl(record.location);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h2 id="photo-modal-title" className="text-sm font-bold text-slate-900 truncate">
              {record.studentName}
            </h2>
            <p className="text-xs font-mono tabular-nums text-slate-500">
              NISN {record.nisn} · {SHIFT_LABELS[record.shift]} · {record.attendanceType}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau foto"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-slate-900 aspect-[3/4] max-h-[65vh] w-full flex items-center justify-center">
          <img
            src={record.photoDataUrl}
            alt={`Foto selfie lengkap ${record.studentName}`}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="p-4 space-y-1.5 text-xs text-slate-600 bg-slate-50 border-t border-slate-200">
          <p className="font-mono tabular-nums text-slate-900">
            {record.formattedDate} · {record.formattedTime}
          </p>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono tabular-nums text-teal-700 hover:underline"
            >
              <span>Lokasi: {record.locationStatusText}</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p>Lokasi: {record.locationStatusText}</p>
          )}
          {record.drivePhotoUrl && (
            <div className="pt-1">
              <a
                href={record.drivePhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
              >
                <span>Buka Gambar di Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

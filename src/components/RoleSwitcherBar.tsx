import { useState } from 'react';
import { Check, Link2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { AppRole } from '../types/attendance';
import { buildStudentShareUrl } from '../utils/attendanceLogic';

interface RoleSwitcherBarProps {
  role: AppRole;
  isAdminUnlocked: boolean;
  onSelectStudent: () => void;
  onRequestAdminUnlock: () => void;
  onLockAdmin: () => void;
}

export function RoleSwitcherBar({
  role,
  isAdminUnlocked,
  onSelectStudent,
  onRequestAdminUnlock,
  onLockAdmin,
}: RoleSwitcherBarProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const isAdminActive = role === AppRole.ADMIN && isAdminUnlocked;

  const handleCopyStudentLink = async () => {
    const shareUrl = buildStudentShareUrl(window.location.origin, window.location.pathname);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      aria-label="Pengaturan tampilan peran"
      className="mb-6 bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit">
        <button
          type="button"
          aria-pressed={!isAdminActive}
          onClick={onSelectStudent}
          className={`flex-1 sm:flex-initial min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            !isAdminActive
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserRound className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tampilan Siswa</span>
        </button>

        <button
          type="button"
          aria-pressed={isAdminActive}
          onClick={onRequestAdminUnlock}
          className={`flex-1 sm:flex-initial min-h-[40px] inline-flex items-center justify-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            isAdminActive
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isAdminActive ? (
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          <span>Tampilan Admin</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
        <p className="text-xs text-slate-600">
          {!isAdminActive
            ? 'Akses siswa dibatasi hanya untuk pengisian formulir absensi PKL.'
            : 'Akses penuh admin: formulir, rekap log, ekspor CSV ke Google Drive, dan skrip GAS.'}
        </p>

        {isAdminActive && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyStudentLink}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{copiedLink ? 'Link Siswa Tersalin' : 'Salin Link Siswa'}</span>
            </button>

            <button
              type="button"
              onClick={onLockAdmin}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Kunci Admin</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

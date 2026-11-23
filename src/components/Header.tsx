import { useState } from 'react';
import { Download, GraduationCap } from 'lucide-react';
import { RolePermissions } from '../types/attendance';

const SCHOOL_LOGO_SRC = '/assets/aistudio/LOGO_SMKN_1_JASEL_JPG_494674a5.jpg';

interface HeaderProps {
  permissions: RolePermissions;
  recordCount: number;
  onExportCsv: () => void;
  onOpenGasModal: () => void;
}

export function Header({
  permissions,
  recordCount,
  onExportCsv,
  onOpenGasModal,
}: HeaderProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3 md:gap-8">
        <a
          href="#formulir-absensi"
          className="inline-flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          {!logoFailed ? (
            <img
              src={SCHOOL_LOGO_SRC}
              alt="Logo SMK Negeri 1 Jawai Selatan"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="w-8 h-8 object-contain shrink-0 rounded"
            />
          ) : (
            <span className="w-8 h-8 rounded bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
            </span>
          )}
          <span className="truncate">SMK Negeri 1 Jawai Selatan</span>
        </a>

        {permissions.canViewLog ? (
          <>
            <nav
              aria-label="Navigasi utama"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 shrink-0"
            >
              <a
                href="#formulir-absensi"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1"
              >
                Formulir
              </a>
              <a
                href="#rekap-log"
                className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1"
              >
                Rekap Log
              </a>
              {permissions.canConfigureGas && (
                <button
                  type="button"
                  onClick={onOpenGasModal}
                  className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
                >
                  Skrip GAS
                </button>
              )}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              {permissions.canExportCsv && (
                <button
                  type="button"
                  onClick={onExportCsv}
                  disabled={recordCount === 0}
                  className="min-h-[40px] inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Ekspor CSV</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <nav aria-label="Navigasi siswa" className="flex items-center gap-4 shrink-0">
            <a
              href="#formulir-absensi"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1"
            >
              Formulir Absen
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}

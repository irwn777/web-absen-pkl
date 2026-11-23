import { useEffect, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import { GasConfig } from '../types/attendance';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  isValidGasWebAppUrl,
} from '../utils/attendanceLogic';
import { testGasEndpoint } from '../utils/gasClient';

interface GasConfigModalProps {
  isOpen: boolean;
  config: GasConfig;
  onSave: (next: GasConfig) => void;
  onClose: () => void;
}

export function GasConfigModal({ isOpen, config, onSave, onClose }: GasConfigModalProps) {
  const [webAppUrl, setWebAppUrl] = useState(config.webAppUrl);
  const [sheetName, setSheetName] = useState(config.sheetName);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWebAppUrl(config.webAppUrl);
      setSheetName(config.sheetName);
      setAutoSync(config.autoSync);
      setTestResult(null);
    }
  }, [isOpen, config]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  const handleDownloadGs = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_TEMPLATE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testGasEndpoint(webAppUrl);
    setTestResult({ ok: result.success, message: result.message });
    setTesting(false);
  };

  const handleSave = () => {
    const trimmedUrl = webAppUrl.trim();
    if (trimmedUrl && !isValidGasWebAppUrl(trimmedUrl)) {
      setTestResult({
        ok: false,
        message: 'URL tidak valid. Harus berupa https://script.google.com/macros/s/.../exec',
      });
      return;
    }
    onSave({
      webAppUrl: trimmedUrl,
      sheetName: sheetName.trim() || 'AbsensiPKL',
      autoSync,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gas-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="space-y-1">
            <h2 id="gas-modal-title" className="text-lg font-bold text-slate-900">
              Integrasi Google Apps Script (GAS)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Hubungkan aplikasi ini ke Google Sheets & Google Drive menggunakan Web App GAS.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan GAS"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Config Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="gas-url" className="block text-sm font-semibold text-slate-900">
              URL Web App GAS
            </label>
            <input
              id="gas-url"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webAppUrl}
              onChange={(e) => {
                setWebAppUrl(e.target.value);
                setTestResult(null);
              }}
              className="w-full min-h-[44px] px-3.5 py-2 font-mono text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="gas-sheet" className="block text-sm font-semibold text-slate-900">
                Nama Tab Sheet
              </label>
              <input
                id="gas-sheet"
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="AbsensiPKL"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
              />
            </div>

            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-800">
                  Kirim otomatis saat Simpan Absensi
                </span>
              </label>
            </div>
          </div>

          {testResult && (
            <div
              role="status"
              className={`rounded-xl p-3 text-xs font-medium border ${
                testResult.ok
                  ? 'bg-teal-50 text-teal-900 border-teal-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleTest}
              disabled={!webAppUrl.trim() || testing}
              className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-45 rounded-xl transition-colors cursor-pointer"
            >
              {testing ? 'Menguji...' : 'Uji Koneksi Endpoint'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[44px] px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>

        {/* Code.gs Template */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Skrip Server Google Apps Script (Code.gs)</h3>
              <p className="text-xs text-slate-500">
                Salin ke Google Sheets &rarr; Ekstensi &rarr; Apps Script, lalu deploy sebagai Web App.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copied ? 'Tersalin' : 'Salin Kode'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadGs}
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unduh Code.gs</span>
              </button>
            </div>
          </div>

          <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-[11px] leading-relaxed font-mono overflow-x-auto max-h-56">
            <code>{GOOGLE_APPS_SCRIPT_TEMPLATE}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { verifyAdminPin } from '../utils/attendanceLogic';

interface AdminPinModalProps {
  isOpen: boolean;
  onUnlock: () => void;
  onClose: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function AdminPinModal({ isOpen, onUnlock, onClose }: AdminPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

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

  const handleDigitPress = (digit: string) => {
    setError(null);
    setPin((prev) => (prev.length < 4 ? `${prev}${digit}` : prev));
  };

  const handleBackspace = () => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPin(pin)) {
      setError('Kunci angka salah. Masukkan 4 digit kunci admin yang benar.');
      setPin('');
      inputRef.current?.focus();
      return;
    }
    setPin('');
    setError(null);
    onUnlock();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="admin-pin-title" className="text-base font-bold text-slate-900">
                Kunci Tampilan Admin
              </h2>
              <p className="text-xs text-slate-600">
                Masukkan 4 digit kunci angka untuk membuka akses Admin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup kunci admin"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-pin-input" className="sr-only">
              Kunci Angka Admin
            </label>
            <input
              ref={inputRef}
              id="admin-pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(digitsOnly);
                if (error) {
                  setError(null);
                }
              }}
              aria-invalid={Boolean(error)}
              className={`w-full min-h-[52px] px-4 py-2 text-center font-mono text-2xl tracking-[0.5em] tabular-nums bg-slate-50 border rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
                error ? 'border-rose-500' : 'border-slate-300'
              }`}
            />
            {error && (
              <p role="alert" className="text-xs font-medium text-rose-600 text-center">
                {error}
              </p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2" aria-label="Papan angka kunci admin">
            {KEYPAD_DIGITS.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                className="min-h-[48px] text-base font-semibold font-mono tabular-nums text-slate-900 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPin('');
                setError(null);
              }}
              className="min-h-[48px] text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              className="min-h-[48px] text-base font-semibold font-mono tabular-nums text-slate-900 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Hapus satu angka"
              className="min-h-[48px] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Delete className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full min-h-[48px] px-4 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
          >
            Buka Akses Admin
          </button>
        </form>
      </div>
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { CheckCircle2, Clock, LocateFixed, MapPin, Send } from 'lucide-react';
import {
  AttendanceFormValues,
  AttendanceType,
  GeoCoordinate,
  GpsPermissionState,
  ShiftOption,
  ValidationErrors,
} from '../types/attendance';
import {
  formatCoordinates,
  formatDateIndonesian,
  formatTimeIndonesian,
  validateAttendanceInput,
} from '../utils/attendanceLogic';
import { SelfieCamera } from './SelfieCamera';

interface AttendanceFormProps {
  values: AttendanceFormValues;
  onChange: (next: AttendanceFormValues) => void;
  now: Date;
  location: GeoCoordinate | null;
  gpsState: GpsPermissionState;
  onRefreshGps: () => void;
  onSubmit: (values: AttendanceFormValues) => Promise<{ ok: boolean; message: string }>;
  isSubmitting: boolean;
  hasGasConfigured: boolean;
  isAdminView?: boolean;
}

const SHIFT_OPTIONS: Array<{ value: ShiftOption; label: string }> = [
  { value: ShiftOption.SHIFT_1, label: 'Shift 1' },
  { value: ShiftOption.SHIFT_2, label: 'Shift 2' },
  { value: ShiftOption.SHIFT_3, label: 'Shift 3' },
  { value: ShiftOption.FULL, label: 'Full' },
];

export function AttendanceForm({
  values,
  onChange,
  now,
  location,
  gpsState,
  onRefreshGps,
  onSubmit,
  isSubmitting,
  hasGasConfigured,
  isAdminView = true,
}: AttendanceFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const formattedDate = formatDateIndonesian(now);
  const formattedTime = formatTimeIndonesian(now);
  const timestampDisplay = `${formattedDate} · ${formattedTime}`;
  const locationDisplay =
    gpsState === 'loading' ? 'Mencari koordinat GPS...' : formatCoordinates(location);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitFeedback(null);

    const validation = validateAttendanceInput(values);
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    const result = await onSubmit(values);
    if (result.ok) {
      setErrors({});
      setSubmitFeedback({ type: 'success', message: result.message });
    } else {
      setSubmitFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <section
      id="formulir-absensi"
      aria-labelledby="form-heading"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5"
    >
      <div className="space-y-1">
        <h2
          id="form-heading"
          className="text-lg sm:text-xl font-bold tracking-tight text-slate-900"
        >
          Catat Kehadiran PKL
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Isi data siswa, ambil foto selfie langsung dari kamera depan, lalu simpan absensi.
        </p>
      </div>

      {/* Live local timestamp & GPS readout */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 min-w-0">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{formattedDate}</span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 shrink-0">
            {formattedTime}
          </span>
        </div>

        <div className="pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 space-y-0.5">
              <p className="font-mono text-xs tabular-nums text-slate-800 break-words">
                {locationDisplay}
              </p>
              {location && location.accuracyMeters !== null && (
                <p className="text-[11px] text-slate-500 tabular-nums">
                  Akurasi sekitar {Math.round(location.accuracyMeters)} m
                </p>
              )}
              {gpsState === 'denied' && (
                <p className="text-[11px] text-amber-700 leading-snug">
                  Izin lokasi ditolak; absensi tetap dapat disimpan tanpa koordinat.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshGps}
            className="min-h-[40px] self-start sm:self-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Perbarui GPS</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Nama Siswa */}
        <div className="space-y-1.5">
          <label htmlFor="student-name" className="block text-sm font-semibold text-slate-900">
            Nama Siswa
          </label>
          <input
            id="student-name"
            name="studentName"
            type="text"
            autoComplete="name"
            placeholder="Contoh: Ahmad Fauzan"
            value={values.studentName}
            onChange={(e) => {
              onChange({ ...values, studentName: e.target.value });
              if (errors.studentName) {
                setErrors((prev) => ({ ...prev, studentName: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.studentName)}
            aria-describedby={errors.studentName ? 'student-name-error' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
              errors.studentName ? 'border-rose-500' : 'border-slate-300'
            }`}
          />
          {errors.studentName && (
            <p id="student-name-error" role="alert" className="text-xs font-medium text-rose-600">
              {errors.studentName}
            </p>
          )}
        </div>

        {/* NISN */}
        <div className="space-y-1.5">
          <label htmlFor="student-nisn" className="block text-sm font-semibold text-slate-900">
            NISN
          </label>
          <input
            id="student-nisn"
            name="nisn"
            type="text"
            inputMode="numeric"
            placeholder="Contoh: 0074512890"
            value={values.nisn}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
              onChange({ ...values, nisn: digitsOnly });
              if (errors.nisn) {
                setErrors((prev) => ({ ...prev, nisn: undefined }));
              }
            }}
            aria-invalid={Boolean(errors.nisn)}
            aria-describedby={errors.nisn ? 'student-nisn-error' : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 placeholder:font-sans placeholder:text-slate-400 bg-white border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700 ${
              errors.nisn ? 'border-rose-500' : 'border-slate-300'
            }`}
          />
          {errors.nisn && (
            <p id="student-nisn-error" role="alert" className="text-xs font-medium text-rose-600">
              {errors.nisn}
            </p>
          )}
        </div>

        {/* Shift */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-900">Shift PKL</legend>
          <div className="grid grid-cols-4 gap-2">
            {SHIFT_OPTIONS.map((option) => {
              const isSelected = values.shift === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange({ ...values, shift: option.value })}
                  className={`min-h-[44px] px-2 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Jenis Absen */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-900">Jenis Absen</legend>
          <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {[AttendanceType.MASUK, AttendanceType.PULANG].map((type) => {
              const isSelected = values.attendanceType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange({ ...values, attendanceType: type })}
                  className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isSelected
                      ? type === AttendanceType.MASUK
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Selfie Camera */}
        <SelfieCamera
          photoDataUrl={values.photoDataUrl}
          onCapture={(photoDataUrl) => {
            onChange({ ...values, photoDataUrl });
            if (photoDataUrl && errors.photoDataUrl) {
              setErrors((prev) => ({ ...prev, photoDataUrl: undefined }));
            }
          }}
          timestampLabel={timestampDisplay}
          locationLabel={locationDisplay}
          errorMessage={errors.photoDataUrl}
        />

        {/* Submit Feedback */}
        {submitFeedback && (
          <div
            role="status"
            className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs sm:text-sm font-medium border ${
              submitFeedback.type === 'success'
                ? 'bg-teal-50 text-teal-900 border-teal-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{submitFeedback.message}</span>
          </div>
        )}

        {/* Primary CTA */}
        <div className="pt-1 space-y-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isSubmitting ? 'Menyimpan Absensi...' : 'Simpan Absensi'}</span>
          </button>
          <p className="text-xs text-slate-500 text-center">
            {!isAdminView
              ? 'Pastikan nama, NISN, shift, dan foto selfie sudah benar sebelum menyimpan.'
              : hasGasConfigured
              ? 'Data otomatis tersimpan ke perangkat dan dikirim ke Google Apps Script (GAS).'
              : 'Data tersimpan di perangkat. Konfigurasikan URL GAS jika ingin sinkronisasi ke Google Sheets.'}
          </p>
        </div>
      </form>
    </section>
  );
}

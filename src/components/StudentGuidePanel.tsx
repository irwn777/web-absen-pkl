import { useState } from 'react';
import { Router } from 'lucide-react';

const GUIDE_IMAGE_SRC = '/src/assets/images/tkj_empty_log_1795423322990.jpg';

const STEPS = [
  {
    num: '01',
    title: 'Lengkapi Identitas & Shift PKL',
    desc: 'Masukkan nama lengkap, NISN 6–15 digit, lalu pilih jadwal Shift 1, 2, 3, atau Full sesuai penempatan industri.',
  },
  {
    num: '02',
    title: 'Ambil Foto Selfie Langsung',
    desc: 'Gunakan kamera depan perangkat di area kerja magang yang terang. Foto diambil langsung tanpa unggah file lama.',
  },
  {
    num: '03',
    title: 'Verifikasi Jam & Lokasi GPS',
    desc: 'Pastikan izin lokasi aktif agar koordinat tempat magang tercatat otomatis bersama timestamp lokal.',
  },
  {
    num: '04',
    title: 'Simpan Absensi Masuk / Pulang',
    desc: 'Tekan tombol Simpan Absensi untuk mencatat kehadiran harian ke sistem rekap pembimbing PKL.',
  },
];

export function StudentGuidePanel() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <aside
      aria-labelledby="student-guide-heading"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5"
    >
      <div className="space-y-1">
        <p className="text-xs font-medium text-teal-800">Panduan Presensi Siswa PKL</p>
        <h2
          id="student-guide-heading"
          className="text-lg sm:text-xl font-bold tracking-tight text-slate-900"
        >
          Alur Absensi Harian Praktik Kerja Lapangan TKJ
        </h2>
      </div>

      <div className="aspect-[16/9] max-h-64 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
        {!imgFailed ? (
          <img
            src={GUIDE_IMAGE_SRC}
            alt="Ilustrasi siswa SMK TKJ magang bekerja dengan laptop dan router jaringan di meja kerja"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-[center_20%]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-teal-50 text-slate-600 p-4 text-center">
            <Router className="w-8 h-8 text-teal-700" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-700">
              Praktik Kerja Lapangan SMK TKJ
            </span>
          </div>
        )}
      </div>

      <ol className="divide-y divide-slate-200">
        {STEPS.map((step) => (
          <li key={step.num} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
            <span className="font-mono text-xs font-semibold tabular-nums text-teal-700 pt-0.5 shrink-0">
              {step.num}.
            </span>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

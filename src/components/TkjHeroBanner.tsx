import { useState } from 'react';
import { GraduationCap, Network } from 'lucide-react';

const HERO_IMAGE_SRC = '/src/assets/images/tkj_magang_hero_1795423322706.jpg';
const SCHOOL_LOGO_SRC = '/assets/aistudio/LOGO_SMKN_1_JASEL_JPG_494674a5.jpg';

interface TkjHeroBannerProps {
  isAdminView: boolean;
}

export function TkjHeroBanner({ isAdminView }: TkjHeroBannerProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <section
      aria-label="Informasi absensi PKL SMK Negeri 1 Jawai Selatan"
      className="mb-5 bg-white border border-slate-200 rounded-2xl p-4 sm:px-6 sm:py-5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-7 items-center">
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center gap-3">
            {!logoFailed ? (
              <img
                src={SCHOOL_LOGO_SRC}
                alt="Logo SMK Negeri 1 Jawai Selatan"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0"
              />
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 border border-teal-200">
                <GraduationCap className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                SMK Negeri 1 Jawai Selatan
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-teal-800 mt-0.5">
                <span>Teknik Komputer &amp; Jaringan</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>PKL &amp; Magang Industri</span>
              </div>
            </div>
          </div>

          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug text-balance">
            {isAdminView
              ? 'Pantau Kehadiran & Arsip Foto Siswa Magang TKJ'
              : 'Presensi Harian Siswa Magang SMK TKJ'}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            {isAdminView
              ? 'Kelola rekap presensi harian siswa PKL SMK Negeri 1 Jawai Selatan lengkap dengan verifikasi selfie kamera depan, koordinat GPS, penyimpanan gambar Google Drive, serta ekspor CSV terpadu.'
              : 'Laporkan kehadiran masuk maupun pulang siswa SMK Negeri 1 Jawai Selatan langsung dari tempat magang menggunakan foto selfie kamera depan, jam lokal otomatis, dan koordinat GPS.'}
          </p>

          <div className="hidden sm:flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 text-xs text-slate-500">
            <span>Kamera Depan Langsung</span>
            <span aria-hidden="true">·</span>
            <span>Timestamp &amp; GPS Otomatis</span>
            <span aria-hidden="true">·</span>
            <span>Integrasi GAS &amp; Google Drive</span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="aspect-[16/9] max-h-40 sm:max-h-48 lg:max-h-none w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
            {!imgFailed ? (
              <img
                src={HERO_IMAGE_SRC}
                alt="Ilustrasi dua siswa SMK TKJ magang mengambil selfie absensi dan mengonfigurasi jaringan di kantor"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover object-[center_20%]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-100 to-teal-50 text-slate-600 p-4 text-center">
                <Network className="w-8 h-8 text-teal-700" aria-hidden="true" />
                <span className="text-xs font-medium text-slate-700">
                  Siswa Magang SMK Teknik Komputer &amp; Jaringan
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

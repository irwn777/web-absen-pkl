import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, RefreshCw, SwitchCamera } from 'lucide-react';
import {
  acquireCameraStream,
  mapCameraErrorToIndonesian,
} from '../utils/cameraHelpers';

interface SelfieCameraProps {
  photoDataUrl: string | null;
  onCapture: (dataUrl: string | null) => void;
  timestampLabel: string;
  locationLabel: string;
  errorMessage?: string;
}

type CameraStatus = 'initializing' | 'ready' | 'captured' | 'error';

export function SelfieCamera({
  photoDataUrl,
  onCapture,
  timestampLabel,
  locationLabel,
  errorMessage,
}: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const selectedDeviceIdRef = useRef<string | undefined>(undefined);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>(
    photoDataUrl ? 'captured' : 'initializing'
  );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoReady(false);
  }, []);

  const syncVideoReadiness = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return false;
    }
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoReady(true);
      return true;
    }
    return false;
  }, []);

  const refreshDeviceList = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      if (isMountedRef.current) {
        setVideoDevices(cameras);
      }
    } catch {
      // Ignore enumerateDevices failures
    }
  }, []);

  const startCamera = useCallback(
    async (deviceIdOverride?: string) => {
      const seq = ++requestSeqRef.current;
      const hadActiveStream = Boolean(streamRef.current);

      stopCameraStream();
      setCameraError(null);
      setCameraStatus('initializing');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('error');
        setCameraError(
          mapCameraErrorToIndonesian(
            new Error('NotSupportedError'),
            typeof window !== 'undefined' ? window.isSecureContext : true
          )
        );
        return;
      }

      // Brief pause if replacing an active track so hardware drivers release cleanly
      if (hadActiveStream) {
        await new Promise((r) => window.setTimeout(r, 150));
      }

      if (!isMountedRef.current || seq !== requestSeqRef.current) {
        return;
      }

      try {
        const targetDeviceId = deviceIdOverride ?? selectedDeviceIdRef.current;
        const stream = await acquireCameraStream(
          (constraints) => navigator.mediaDevices.getUserMedia(constraints),
          targetDeviceId
        );

        if (!isMountedRef.current || seq !== requestSeqRef.current) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;
        const activeTrack = stream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings?.().deviceId;
        if (activeDeviceId) {
          selectedDeviceIdRef.current = activeDeviceId;
        }

        const attachStream = async () => {
          const video = videoRef.current;
          if (!video) {
            return;
          }
          // Ensure muted & playsInline DOM properties are set before srcObject for Safari/Chrome autoplay
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', '');
          video.setAttribute('webkit-playsinline', '');
          video.srcObject = stream;

          try {
            await video.play();
          } catch {
            // Autoplay may resolve via muted attribute or subsequent user click
          }
          syncVideoReadiness();
        };

        setCameraStatus('ready');
        // Attach immediately and on next animation frame in case React just mounted <video>
        await attachStream();
        window.requestAnimationFrame(() => {
          if (isMountedRef.current && seq === requestSeqRef.current) {
            void attachStream();
          }
        });

        void refreshDeviceList();
      } catch (err) {
        if (!isMountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        setCameraStatus('error');
        setCameraError(
          mapCameraErrorToIndonesian(
            err,
            typeof window !== 'undefined' ? window.isSecureContext : true
          )
        );
      }
    },
    [refreshDeviceList, stopCameraStream, syncVideoReadiness]
  );

  // Start or stop stream only when photoDataUrl transitions
  useEffect(() => {
    if (!photoDataUrl) {
      void startCamera();
    } else {
      requestSeqRef.current += 1;
      stopCameraStream();
      setCameraStatus('captured');
    }
    return () => {
      requestSeqRef.current += 1;
      stopCameraStream();
    };
  }, [photoDataUrl, startCamera, stopCameraStream]);

  // Poll video dimensions briefly while status is ready until first frame renders
  useEffect(() => {
    if (cameraStatus !== 'ready' || videoReady) {
      return;
    }
    const timer = window.setInterval(() => {
      if (syncVideoReadiness()) {
        window.clearInterval(timer);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [cameraStatus, videoReady, syncVideoReadiness]);

  const handleTakePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const targetWidth = Math.round(video.videoWidth * scale);
    const targetHeight = Math.round(video.videoHeight * scale);

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Mirror horizontally to match natural front-camera preview
    ctx.save();
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    stopCameraStream();
    setCameraStatus('captured');
    onCapture(dataUrl);
  };

  const handleRetake = () => {
    onCapture(null);
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) {
      void startCamera();
      return;
    }
    const currentIndex = videoDevices.findIndex(
      (d) => d.deviceId === selectedDeviceIdRef.current
    );
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    selectedDeviceIdRef.current = nextDevice.deviceId;
    void startCamera(nextDevice.deviceId);
  };

  const handleTapVideoPlay = () => {
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      void video.play().catch(() => {});
      syncVideoReadiness();
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900 truncate">
          Foto Selfie (Kamera Depan)
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {!photoDataUrl && videoDevices.length > 1 && (
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ganti Kamera</span>
            </button>
          )}
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            {photoDataUrl ? 'Siap disimpan' : 'Kamera langsung'}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-200 aspect-[4/3] sm:aspect-[16/11] max-h-[290px] w-full mx-auto flex items-center justify-center">
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt="Hasil foto selfie absensi PKL"
            className="w-full h-full object-cover"
          />
        ) : cameraStatus === 'error' ? (
          <div className="p-5 text-center max-w-sm space-y-3.5">
            <div className="w-11 h-11 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-white">Kamera Tidak Dapat Diakses</p>
              <p className="text-xs leading-relaxed text-slate-300">{cameraError}</p>
            </div>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Aktifkan Kamera</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              onClick={handleTapVideoPlay}
              onLoadedMetadata={syncVideoReadiness}
              onLoadedData={syncVideoReadiness}
              onCanPlay={syncVideoReadiness}
              onPlaying={syncVideoReadiness}
              onResize={syncVideoReadiness}
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {cameraStatus === 'initializing' && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <Camera className="w-7 h-7 text-slate-400" aria-hidden="true" />
                <p className="text-xs font-medium text-slate-300">
                  Mengaktifkan kamera depan...
                </p>
              </div>
            )}
            {cameraStatus === 'ready' && !videoReady && (
              <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
                <p className="text-xs font-medium text-slate-200">
                  Memuat gambar kamera...
                </p>
                <button
                  type="button"
                  onClick={handleTapVideoPlay}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Tampilkan Kamera
                </button>
              </div>
            )}
          </>
        )}

        {(photoDataUrl || (cameraStatus === 'ready' && videoReady)) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pt-8 pb-3 text-white">
            <p className="font-mono text-[11px] tabular-nums text-slate-100 truncate">
              {timestampLabel}
            </p>
            <p className="font-mono text-[11px] tabular-nums text-slate-300 truncate mt-0.5">
              GPS: {locationLabel}
            </p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {errorMessage && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-3">
        {!photoDataUrl ? (
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={cameraStatus !== 'ready' || !videoReady}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ambil Foto</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRetake}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ulangi</span>
          </button>
        )}
      </div>
    </div>
  );
}

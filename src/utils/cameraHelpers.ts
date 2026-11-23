export interface CameraConstraintOption {
  label: string;
  constraints: MediaStreamConstraints;
}

export function buildCameraConstraintChain(preferredDeviceId?: string): CameraConstraintOption[] {
  if (preferredDeviceId) {
    return [
      {
        label: 'selected-device-hd',
        constraints: {
          video: {
            deviceId: { exact: preferredDeviceId },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        },
      },
      {
        label: 'selected-device-basic',
        constraints: {
          video: { deviceId: { exact: preferredDeviceId } },
          audio: false,
        },
      },
      {
        label: 'any-camera',
        constraints: {
          video: true,
          audio: false,
        },
      },
    ];
  }

  return [
    {
      label: 'front-camera-ideal',
      constraints: {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      },
    },
    {
      label: 'front-camera-basic',
      constraints: {
        video: { facingMode: 'user' },
        audio: false,
      },
    },
    {
      label: 'any-camera',
      constraints: {
        video: true,
        audio: false,
      },
    },
  ];
}

export async function acquireCameraStream(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>,
  preferredDeviceId?: string
): Promise<MediaStream> {
  const attempts = buildCameraConstraintChain(preferredDeviceId);
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const stream = await getUserMedia(attempt.constraints);
      if (stream && stream.getVideoTracks().length > 0) {
        return stream;
      }
      if (stream) {
        for (const t of stream.getTracks()) {
          t.stop();
        }
      }
    } catch (err) {
      lastError = err;
      const name = err instanceof Error ? err.name : '';
      // Do not keep retrying if user explicitly denied permission or no secure context
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        throw err;
      }
    }
  }

  throw lastError ?? new Error('Kamera tidak tersedia.');
}

export function mapCameraErrorToIndonesian(err: unknown, isSecureContext: boolean): string {
  if (!isSecureContext) {
    return 'Akses kamera memerlukan koneksi HTTPS atau localhost. Buka aplikasi melalui HTTPS.';
  }

  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Izin kamera ditolak oleh browser atau iFrame. Izinkan akses kamera pada ikon gembok di bilah alamat lalu klik Aktifkan Kamera.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Kamera tidak terdeteksi di perangkat ini. Pastikan webcam/kamera depan aktif dan tidak dilepas.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Kamera sedang dipakai aplikasi atau tab lain. Tutup aplikasi kamera lain lalu klik Aktifkan Kamera.';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return 'Kamera perangkat tidak mendukung resolusi yang diminta. Klik Aktifkan Kamera untuk mencoba ulang.';
  }
  return 'Tidak dapat membuka pratinjau kamera. Pastikan izin kamera aktif lalu klik Aktifkan Kamera.';
}

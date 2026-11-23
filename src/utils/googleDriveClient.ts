import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AttendanceRecord } from '../types/attendance';
import {
  buildDriveMultipartBody,
  buildDrivePhotoFilename,
  parseImageDataUrl,
  TARGET_DRIVE_EMAIL,
} from './attendanceLogic';

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let isSigningIn = false;
// Keep OAuth access token strictly in memory (never localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedPhotoFolderId: string | null = null;

export interface DriveUploadResult {
  id: string;
  name: string;
  webViewLink?: string;
}

export function initDriveAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user && cachedAccessToken) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      cachedPhotoFolderId = null;
      onAuthFailure?.();
    }
  });
}

export async function signInWithGoogleForDrive(
  loginHint: string = TARGET_DRIVE_EMAIL
): Promise<{
  user: User;
  accessToken: string;
}> {
  const provider = new GoogleAuthProvider();
  for (const scope of SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    login_hint: loginHint,
    prompt: 'select_account',
  });

  try {
    isSigningIn = true;
    cachedPhotoFolderId = null;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Token akses Google Drive tidak diterima.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export async function signOutDrive(): Promise<void> {
  await auth.signOut();
  cachedAccessToken = null;
  cachedPhotoFolderId = null;
}

export async function ensureDrivePhotoFolder(accessToken: string): Promise<string | null> {
  if (cachedPhotoFolderId) {
    return cachedPhotoFolderId;
  }

  try {
    const query = encodeURIComponent(
      "name='Foto_Absensi_PKL' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const data = (await searchRes.json()) as { files?: Array<{ id: string }> };
      if (data.files && data.files.length > 0) {
        cachedPhotoFolderId = data.files[0].id;
        return cachedPhotoFolderId;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Foto_Absensi_PKL',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const created = (await createRes.json()) as { id?: string };
      if (created.id) {
        cachedPhotoFolderId = created.id;
        return cachedPhotoFolderId;
      }
    }
  } catch {
    // Fallback to uploading into root Drive if folder creation fails
  }
  return null;
}

export async function uploadCsvToGoogleDrive(
  csvContent: string,
  fileName: string,
  accessToken: string
): Promise<DriveUploadResult> {
  const boundary = `absensi_pkl_csv_${Date.now()}`;
  const multipartBody = buildDriveMultipartBody(csvContent, fileName, boundary);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesi Google Drive berakhir. Silakan masuk kembali dengan Google.');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Gagal mengunggah CSV ke Google Drive (${response.status})${errText ? `: ${errText}` : '.'}`
    );
  }

  return (await response.json()) as DriveUploadResult;
}

export async function uploadPhotoToGoogleDrive(
  record: AttendanceRecord,
  accessToken: string,
  folderId?: string | null
): Promise<DriveUploadResult> {
  const parsed = parseImageDataUrl(record.photoDataUrl);
  if (!parsed) {
    throw new Error(`Format gambar untuk ${record.studentName} tidak valid.`);
  }

  const fileName = buildDrivePhotoFilename(record);
  const boundary = `absensi_pkl_img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const metadataObj: Record<string, unknown> = {
    name: fileName,
    mimeType: parsed.mimeType,
    description: `Selfie Absensi PKL - ${record.studentName} (NISN ${record.nisn}) - ${record.formattedDate} ${record.formattedTime}`,
  };
  if (folderId) {
    metadataObj.parents = [folderId];
  }

  const preamble = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadataObj),
    `--${boundary}`,
    `Content-Type: ${parsed.mimeType}`,
    '',
    '',
  ].join('\r\n');

  const epilogue = `\r\n--${boundary}--`;
  const binaryCopy = new Uint8Array(parsed.bytes.length);
  binaryCopy.set(parsed.bytes);
  const bodyBlob = new Blob([preamble, binaryCopy.buffer, epilogue], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: bodyBlob,
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sesi Google Drive berakhir. Silakan masuk kembali dengan Google.');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Gagal mengunggah foto ke Google Drive (${response.status})${errText ? `: ${errText}` : '.'}`
    );
  }

  const uploaded = (await response.json()) as DriveUploadResult;
  if (!uploaded.webViewLink && uploaded.id) {
    uploaded.webViewLink = `https://drive.google.com/file/d/${uploaded.id}/view`;
  }
  return uploaded;
}

export async function shareDriveFileWithEmail(
  fileId: string,
  emailAddress: string,
  accessToken: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'user',
        emailAddress,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gagal membagikan file ke ${emailAddress} (${response.status}).`);
  }
}

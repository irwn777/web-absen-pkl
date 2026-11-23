import { AttendanceRecord, GasConfig } from '../types/attendance';
import { buildGasPayload, isValidGasWebAppUrl } from './attendanceLogic';

export interface GasSyncResult {
  success: boolean;
  message: string;
}

export async function sendRecordToGas(
  record: AttendanceRecord,
  config: GasConfig
): Promise<GasSyncResult> {
  if (!isValidGasWebAppUrl(config.webAppUrl)) {
    return {
      success: false,
      message: 'URL Web App GAS belum valid.',
    };
  }

  const payload = buildGasPayload(record, config.sheetName);

  try {
    // text/plain avoids CORS preflight OPTIONS requests on Google Apps Script Web Apps
    const response = await fetch(config.webAppUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Server GAS mengembalikan status ${response.status}.`,
      };
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text) as { status?: string; message?: string };
      if (json.status === 'error') {
        return {
          success: false,
          message: json.message || 'Skrip GAS gagal memproses data.',
        };
      }
      return {
        success: true,
        message: 'Tersimpan ke Google Sheets via GAS.',
      };
    } catch {
      return {
        success: true,
        message: 'Terkirim ke endpoint GAS.',
      };
    }
  } catch {
    // Fallback with no-cors when GAS deployment returns opaque redirect response
    try {
      await fetch(config.webAppUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return {
        success: true,
        message: 'Terkirim ke GAS (mode kompatibilitas lintas-domain).',
      };
    } catch {
      return {
        success: false,
        message: 'Gagal menghubungi endpoint GAS. Periksa koneksi internet atau URL Web App.',
      };
    }
  }
}

export async function testGasEndpoint(webAppUrl: string): Promise<GasSyncResult> {
  if (!isValidGasWebAppUrl(webAppUrl)) {
    return {
      success: false,
      message: 'URL harus diawali https://script.google.com/macros/s/.../exec',
    };
  }

  try {
    const res = await fetch(webAppUrl.trim(), { method: 'GET' });
    if (!res.ok) {
      return {
        success: false,
        message: `Endpoint merespons dengan HTTP ${res.status}. Pastikan akses disetel ke "Siapa saja".`,
      };
    }
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { status?: string; service?: string };
      if (parsed.status === 'ready') {
        return {
          success: true,
          message: `Terhubung: ${parsed.service || 'Endpoint GAS siap menerima data.'}`,
        };
      }
    } catch {
      // Non-JSON response still indicates reachable endpoint
    }
    return {
      success: true,
      message: 'Endpoint GAS dapat dijangkau.',
    };
  } catch {
    return {
      success: false,
      message: 'Tidak dapat memverifikasi endpoint langsung karena pembatasan CORS. Simpan URL dan uji dengan kirim absensi.',
    };
  }
}

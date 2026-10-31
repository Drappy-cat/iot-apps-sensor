import { ref, set } from "firebase/database";
import { OfflineSensorRecord } from "../types/sensor";
import {
  getUnsyncedRecords,
  updateRecordSyncStatus,
  getSyncStats,
} from "./indexedDbService";
import {
  getSavedFirebaseConfig,
  initFirebase,
} from "./firebaseService";

export interface SyncResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  isOnline: boolean;
  message: string;
}

/**
 * Mengecek apakah peramban saat ini memiliki koneksi internet
 */
export function isBrowserOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Menyinkronkan seluruh data sensor lokal di IndexedDB yang belum tersinkron ke Firebase RTDB
 */
export async function syncOfflineDataToFirebase(
  onProgress?: (processed: number, total: number) => void
): Promise<SyncResult> {
  // 1. Cek koneksi internet
  if (!isBrowserOnline()) {
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      isOnline: false,
      message: "Tidak ada koneksi internet. Data tetap tersimpan aman di penyimpanan lokal.",
    };
  }

  // 2. Cek konfigurasi Firebase
  const config = getSavedFirebaseConfig();
  if (!config.databaseURL || !config.apiKey) {
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      isOnline: true,
      message: "Konfigurasi Firebase belum diisi di menu Pengaturan.",
    };
  }

  const db = initFirebase(config);
  if (!db) {
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      isOnline: true,
      message: "Gagal menghubungkan ke Firebase Realtime Database. Periksa API Key dan Database URL.",
    };
  }

  // 3. Ambil data lokal yang belum tersinkron
  const unsyncedRecords = await getUnsyncedRecords(200);
  if (unsyncedRecords.length === 0) {
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      isOnline: true,
      message: "Semua data lokal sudah tersinkronisasi.",
    };
  }

  let successCount = 0;
  let failedCount = 0;
  const sensorPath = config.sensorPath || "sensor_npk";

  // Temukan record dengan timestamp paling baru untuk memperbarui node live sensor_npk
  let latestRecord: OfflineSensorRecord = unsyncedRecords[0];
  for (const r of unsyncedRecords) {
    if (r.timestamp > latestRecord.timestamp) {
      latestRecord = r;
    }
  }

  // 4. Proses sinkronisasi setiap record secara atomic
  for (let i = 0; i < unsyncedRecords.length; i++) {
    const record = unsyncedRecords[i];

    // Tandai sebagai "pending" saat mulai dikirim
    await updateRecordSyncStatus(record.id, "pending");

    try {
      // Siapkan payload data untuk Firebase
      const payload = {
        id: record.id,
        timestamp: record.timestamp,
        slaveId: record.slaveId,
        moisture: record.moisture,
        temperature: record.temperature,
        ec: record.ec,
        ph: record.ph,
        nitrogen: record.nitrogen,
        phosphorus: record.phosphorus,
        potassium: record.potassium,
        status: record.status,
        source: "usb_serial_offline",
        syncedAt: Date.now(),
      };

      // Tulis ke path riwayat: ${sensorPath}_logs/${record.id}
      // ID unik menjamin tidak akan ada record duplikat (Idempotent)
      const logRef = ref(db, `${sensorPath}_logs/${record.id}`);
      await set(logRef, payload);

      // Jika ini adalah record terbaru, perbarui juga state realtime pada root sensorPath
      if (record.id === latestRecord.id) {
        const liveRef = ref(db, sensorPath);
        await set(liveRef, {
          moisture: record.moisture,
          temperature: record.temperature,
          ec: record.ec,
          ph: record.ph,
          nitrogen: record.nitrogen,
          phosphorus: record.phosphorus,
          potassium: record.potassium,
          timestamp: record.timestamp,
          lastSync: Date.now(),
        });
      }

      // Berhasil: perbarui status di IndexedDB menjadi "synced"
      await updateRecordSyncStatus(record.id, "synced", Date.now());
      successCount++;
    } catch (err: any) {
      console.error(`Gagal sinkron record ${record.id}:`, err);
      // Gagal: jangan hapus record, tandai sebagai "failed"
      await updateRecordSyncStatus(record.id, "failed", undefined, err.message || "Gagal upload");
      failedCount++;
    }

    onProgress?.(i + 1, unsyncedRecords.length);
  }

  const message =
    failedCount === 0
      ? `Berhasil menyinkronkan ${successCount} data ke Firebase.`
      : `${successCount} data berhasil disinkronkan, ${failedCount} data gagal dan tetap disimpan lokal.`;

  return {
    totalProcessed: unsyncedRecords.length,
    successCount,
    failedCount,
    isOnline: true,
    message,
  };
}

/**
 * Memasang pendengar event status internet untuk auto-sync opsional
 */
export function setupAutoSyncListener(
  onAutoSyncCompleted?: (result: SyncResult) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    console.log("Internet terdeteksi kembali. Menjalankan auto-sync background...");
    try {
      const stats = await getSyncStats();
      if (stats.local > 0 || stats.failed > 0) {
        const res = await syncOfflineDataToFirebase();
        onAutoSyncCompleted?.(res);
      }
    } catch (e) {
      console.warn("Auto sync background gagal:", e);
    }
  };

  window.addEventListener("online", handleOnline);
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

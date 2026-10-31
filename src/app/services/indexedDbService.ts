import { OfflineSensorRecord, SyncStatus } from "../types/sensor";

const DB_NAME = "iot_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "sensor_readings";

let dbInstance: IDBDatabase | null = null;

/**
 * Membuka atau menginisialisasi database IndexedDB lokal
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Browser ini tidak mendukung IndexedDB."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("idx_syncStatus", "syncStatus", { unique: false });
        store.createIndex("idx_timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      const err = (event.target as IDBOpenDBRequest).error;
      console.error("Gagal membuka IndexedDB:", err);
      reject(err);
    };
  });
}

/**
 * Menghasilkan ID unik global yang aman untuk setiap pembacaan sensor
 */
export function generateRecordId(timestamp: number = Date.now()): string {
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `rec_${timestamp}_${randomPart}`;
}

/**
 * Menyimpan data pembacaan sensor ke IndexedDB
 */
export async function saveSensorRecord(record: OfflineSensorRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil seluruh riwayat pembacaan sensor, diurutkan dari yang terbaru
 */
export async function getOfflineRecords(options?: {
  limit?: number;
  syncStatus?: SyncStatus;
}): Promise<OfflineSensorRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const records: OfflineSensorRecord[] = [];

    // Jika filter syncStatus aktif, gunakan index idx_syncStatus
    if (options?.syncStatus) {
      const index = store.index("idx_syncStatus");
      const request = index.openCursor(IDBKeyRange.only(options.syncStatus), "prev");

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          records.push(cursor.value);
          if (options.limit && records.length >= options.limit) {
            resolve(records);
            return;
          }
          cursor.continue();
        } else {
          // Sort descending by timestamp
          records.sort((a, b) => b.timestamp - a.timestamp);
          resolve(records);
        }
      };

      request.onerror = () => reject(request.error);
      return;
    }

    // Default: gunakan index timestamp terbalik (paling baru di atas)
    const index = store.index("idx_timestamp");
    const request = index.openCursor(null, "prev");

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        records.push(cursor.value);
        if (options?.limit && records.length >= options.limit) {
          resolve(records);
          return;
        }
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Mengambil semua record yang belum tersinkronisasi (local, pending, atau failed)
 */
export async function getUnsyncedRecords(limit: number = 200): Promise<OfflineSensorRecord[]> {
  const all = await getOfflineRecords({ limit: 1000 });
  return all
    .filter((r) => r.syncStatus !== "synced")
    .slice(0, limit);
}

/**
 * Mengubah status sinkronisasi satu record
 */
export async function updateRecordSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  syncedAt?: number,
  errorMessage?: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record = getReq.result as OfflineSensorRecord | undefined;
      if (!record) {
        resolve();
        return;
      }
      record.syncStatus = syncStatus;
      if (syncedAt !== undefined) record.syncedAt = syncedAt;
      if (errorMessage !== undefined) record.errorMessage = errorMessage;

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Mengubah status sinkronisasi banyak record sekaligus (batch update)
 */
export async function batchUpdateSyncStatus(
  updates: Array<{ id: string; syncStatus: SyncStatus; syncedAt?: number; errorMessage?: string }>
): Promise<void> {
  if (updates.length === 0) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    let completed = 0;
    updates.forEach((u) => {
      const getReq = store.get(u.id);
      getReq.onsuccess = () => {
        const record = getReq.result as OfflineSensorRecord | undefined;
        if (record) {
          record.syncStatus = u.syncStatus;
          if (u.syncedAt !== undefined) record.syncedAt = u.syncedAt;
          if (u.errorMessage !== undefined) record.errorMessage = u.errorMessage;
          store.put(record);
        }
        completed++;
        if (completed === updates.length) {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Mengambil ringkasan statistik status data lokal
 */
export async function getSyncStats(): Promise<{
  total: number;
  local: number;
  pending: number;
  synced: number;
  failed: number;
}> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();

    const stats = {
      total: 0,
      local: 0,
      pending: 0,
      synced: 0,
      failed: 0,
    };

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        stats.total++;
        const status = (cursor.value as OfflineSensorRecord).syncStatus;
        if (status === "local") stats.local++;
        else if (status === "pending") stats.pending++;
        else if (status === "synced") stats.synced++;
        else if (status === "failed") stats.failed++;
        cursor.continue();
      } else {
        resolve(stats);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Menghapus seluruh data lokal (untuk keperluan reset pengujian)
 */
export async function clearAllLocalRecords(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

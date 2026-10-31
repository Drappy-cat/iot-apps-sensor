export interface NPKSensorData {
  moisture: number;      // % (Kelembaban tanah)
  temperature: number;   // °C (Suhu tanah)
  ph: number;            // pH (0 - 14)
  ec: number;            // µS/cm (Konduktivitas listrik)
  nitrogen: number;      // mg/kg (Nitrogen N)
  phosphorus: number;    // mg/kg (Fosfor P)
  potassium: number;     // mg/kg (Kalium K)
  timestamp?: number;    // epoch ms
}

export interface SoilAnalysis {
  status: "SANGAT BAIK" | "OPTIMAL" | "KURANG SUBUR" | "KRITIS";
  confidence: number;
  fertilityScore: number;
  moistureStatus: "KERING" | "OPTIMAL" | "BASAH";
  phStatus: "ASAM" | "NETRAL" | "BASA";
  ruleActive: string;
  recommendation: string;
  irrigationNeeded: boolean;
  fertilizerNeeded: boolean;
}

export interface FirebaseConfigState {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  sensorPath: string;
}

export type SyncStatus = "local" | "pending" | "synced" | "failed";

export type SensorReadingStatus = "OK" | "MODBUS_ERROR" | "PARSE_ERROR" | "TIMEOUT";

export interface ArduinoSerialPacket {
  slaveId?: number;
  moisture: number;
  temperature: number;
  ec: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  status: string;
  timestamp?: number;
}

export interface OfflineSensorRecord {
  id: string;
  timestamp: number;
  slaveId: number;
  moisture: number;
  temperature: number;
  ec: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  status: SensorReadingStatus;
  syncStatus: SyncStatus;
  syncedAt?: number | null;
  errorMessage?: string;
}

export type SerialConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "unsupported"
  | "error";

export interface SerialPortMetadata {
  usbVendorId?: string;
  usbProductId?: string;
  baudRate: number;
}

import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, off, set, Database } from "firebase/database";
import { NPKSensorData, FirebaseConfigState } from "../types/sensor";

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfigState = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  sensorPath: import.meta.env.VITE_FIREBASE_SENSOR_PATH || "sensor_npk",
};

export const STORAGE_KEY_FIREBASE = "iot_firebase_config";
export const STORAGE_KEY_SIM_ENABLED = "iot_settings_sim_enabled";

export function getSavedFirebaseConfig(): FirebaseConfigState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (raw) {
      return { ...DEFAULT_FIREBASE_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Failed to parse firebase config from storage", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfigState) {
  localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(config));
}

let dbInstance: Database | null = null;

export function initFirebase(config: FirebaseConfigState): Database | null {
  if (!config.databaseURL || !config.apiKey) {
    return null;
  }
  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getDatabase(app);
    return dbInstance;
  } catch (err) {
    console.error("Firebase init failed:", err);
    return null;
  }
}

export const INITIAL_SENSOR_DATA: NPKSensorData = {
  moisture: 65.4,
  ph: 6.7,
  timestamp: Date.now(),
};

export function listenToNPKSensor(
  onData: (data: NPKSensorData) => void,
  onStatusChange: (status: "live" | "demo" | "connecting" | "error") => void
): () => void {
  const config = getSavedFirebaseConfig();
  const simEnabled = localStorage.getItem(STORAGE_KEY_SIM_ENABLED) === "true";

  // If user forces simulation or Firebase credentials are not provided
  if (simEnabled || !config.databaseURL) {
    onStatusChange("demo");
    const interval = setInterval(() => {
      // Realistic micro-fluctuations for Soil Moisture and pH sensor
      const baseRaw = localStorage.getItem("iot_sim_base_data");
      let base: NPKSensorData = INITIAL_SENSOR_DATA;
      if (baseRaw) {
        try {
          base = JSON.parse(baseRaw);
        } catch (e) {
          // ignore
        }
      }

      const noise = (Math.random() - 0.5);
      const simulated: NPKSensorData = {
        moisture: Math.max(10, Math.min(100, +(base.moisture + noise * 0.4).toFixed(1))),
        ph: Math.max(3.5, Math.min(9.5, +(base.ph + noise * 0.05).toFixed(2))),
        timestamp: Date.now(),
      };

      onData(simulated);
    }, 2000);

    return () => clearInterval(interval);
  }

  // Connect to Firebase Realtime Database
  onStatusChange("connecting");
  const db = initFirebase(config);
  if (!db) {
    onStatusChange("error");
    return () => {};
  }

  const path = config.sensorPath || "sensor_npk";
  const sensorRef = ref(db, path);

  const unsubscribe = onValue(
    sensorRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const parsed: NPKSensorData = {
          moisture: Number(val.moisture ?? val.kelembaban ?? INITIAL_SENSOR_DATA.moisture),
          ph: Number(val.ph ?? INITIAL_SENSOR_DATA.ph),
          timestamp: Number(val.timestamp ?? Date.now()),
        };
        onData(parsed);
        onStatusChange("live");
      } else {
        onStatusChange("error");
      }
    },
    (error) => {
      console.error("Firebase RTDB error:", error);
      onStatusChange("error");
    }
  );

  return () => {
    off(sensorRef);
  };
}

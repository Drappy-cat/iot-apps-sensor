export interface NPKSensorData {
  moisture: number;      // % (Kelembaban tanah)
  ph: number;            // pH (0 - 14)
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

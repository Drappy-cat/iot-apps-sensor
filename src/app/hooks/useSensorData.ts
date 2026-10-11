import { useState, useEffect, useMemo, useCallback } from "react";
import { NPKSensorData, SoilAnalysis, FirebaseConfigState } from "../types/sensor";
import {
  listenToNPKSensor,
  INITIAL_SENSOR_DATA,
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  STORAGE_KEY_SIM_ENABLED,
} from "../services/firebaseService";
import { analyzeSoilData } from "../utils/soilAnalyzer";

export function useSensorData() {
  const [sensorData, setSensorData] = useState<NPKSensorData>(INITIAL_SENSOR_DATA);
  const [connectionStatus, setConnectionStatus] = useState<"live" | "demo" | "connecting" | "error">("demo");
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigState>(getSavedFirebaseConfig);

  const [setpoint, setSetpoint] = useState<number>(() => {
    const saved = localStorage.getItem("iot_setpoint_moisture");
    return saved ? parseInt(saved, 10) : 65;
  });

  const [manualIrrigation, setManualIrrigation] = useState<boolean | null>(null);
  const [manualFertilizer, setManualFertilizer] = useState<boolean | null>(null);

  useEffect(() => {
    localStorage.setItem("iot_setpoint_moisture", setpoint.toString());
  }, [setpoint]);

  // Subscribe to Firebase RTDB or simulated fallback
  useEffect(() => {
    const unsub = listenToNPKSensor(
      (data) => {
        setSensorData(data);
      },
      (status) => {
        setConnectionStatus(status);
      }
    );
    return () => unsub();
  }, [firebaseConfig]);

  const analysis: SoilAnalysis = useMemo(() => {
    return analyzeSoilData(sensorData, setpoint);
  }, [sensorData, setpoint]);

  // Actuator statuses: manual override takes precedence, otherwise automated intelligence
  const irrigationOn = manualIrrigation !== null ? manualIrrigation : analysis.irrigationNeeded;
  const fertilizerOn = manualFertilizer !== null ? manualFertilizer : analysis.fertilizerNeeded;

  const toggleIrrigation = useCallback(() => {
    setManualIrrigation((prev) => (prev !== null ? !prev : !analysis.irrigationNeeded));
  }, [analysis.irrigationNeeded]);

  const toggleFertilizer = useCallback(() => {
    setManualFertilizer((prev) => (prev !== null ? !prev : !analysis.fertilizerNeeded));
  }, [analysis.fertilizerNeeded]);

  const updateConfig = useCallback((newConfig: FirebaseConfigState) => {
    saveFirebaseConfig(newConfig);
    setFirebaseConfig(newConfig);
  }, []);

  return {
    sensorData,
    analysis,
    connectionStatus,
    setpoint,
    setSetpoint,
    irrigationOn,
    fertilizerOn,
    toggleIrrigation,
    toggleFertilizer,
    firebaseConfig,
    updateConfig,
  };
}

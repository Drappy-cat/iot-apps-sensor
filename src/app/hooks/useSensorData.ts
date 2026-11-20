import { useState, useEffect, useMemo, useCallback } from "react";
import { NPKSensorData, SoilAnalysis, FirebaseConfigState } from "../types/sensor";
import {
  listenToNPKSensor,
  INITIAL_SENSOR_DATA,
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  updateActuatorControlInFirebase,
  getSavedSensorMode,
  saveSensorMode,
  type SensorMode,
} from "../services/firebaseService";
import { analyzeSoilData } from "../utils/soilAnalyzer";

export function useSensorData() {
  const [sensorData, setSensorData] = useState<NPKSensorData>(INITIAL_SENSOR_DATA);
  const [connectionStatus, setConnectionStatus] = useState<"live" | "demo" | "connecting" | "error">("demo");
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfigState>(getSavedFirebaseConfig);
  const [sensorMode, setSensorModeState] = useState<SensorMode>(getSavedSensorMode);

  const [setpoint, setSetpoint] = useState<number>(() => {
    const saved = localStorage.getItem("iot_setpoint_moisture");
    return saved ? parseInt(saved, 10) : 65;
  });

  const [manualIrrigation, setManualIrrigation] = useState<boolean | null>(null);
  const [manualFertilizer, setManualFertilizer] = useState<boolean | null>(null);

  useEffect(() => {
    localStorage.setItem("iot_setpoint_moisture", setpoint.toString());
  }, [setpoint]);

  // Listen to sensorMode changes across components/tabs
  useEffect(() => {
    const syncMode = () => setSensorModeState(getSavedSensorMode());
    window.addEventListener("iot-sensor-mode-changed", syncMode);
    window.addEventListener("storage", syncMode);
    return () => {
      window.removeEventListener("iot-sensor-mode-changed", syncMode);
      window.removeEventListener("storage", syncMode);
    };
  }, []);

  const updateSensorMode = useCallback((mode: SensorMode) => {
    saveSensorMode(mode);
    setSensorModeState(mode);
  }, []);

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
    return analyzeSoilData(sensorData, setpoint, sensorMode);
  }, [sensorData, setpoint, sensorMode]);

  // Actuator statuses: manual override takes precedence, otherwise automated intelligence
  const irrigationOn = manualIrrigation !== null ? manualIrrigation : analysis.irrigationNeeded;
  const fertilizerOn = manualFertilizer !== null ? manualFertilizer : analysis.fertilizerNeeded;

  // Write-back actuator control & setpoint state to Firebase RTDB (/actuator_control) when live
  useEffect(() => {
    if (connectionStatus !== "live") return;
    const mode = manualIrrigation !== null || manualFertilizer !== null ? "manual" : "auto";
    updateActuatorControlInFirebase({
      irrigationOn,
      fertilizerOn,
      setpointMoisture: setpoint,
      mode,
      updatedAt: Date.now(),
    });
  }, [irrigationOn, fertilizerOn, setpoint, manualIrrigation, manualFertilizer, connectionStatus]);

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
    sensorMode,
    updateSensorMode,
  };
}

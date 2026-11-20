import { NPKSensorData, SoilAnalysis } from "../types/sensor";
import type { SensorMode } from "../services/firebaseService";

export function analyzeSoilData(
  data: NPKSensorData,
  setpointMoisture: number = 65,
  sensorMode: SensorMode = "focused"
): SoilAnalysis {
  const {
    moisture,
    ph,
    ec = 1350,
    nitrogen = 48,
    phosphorus = 35,
    potassium = 115,
  } = data;

  // Moisture evaluation
  let moistureStatus: "KERING" | "OPTIMAL" | "BASAH" = "OPTIMAL";
  let irrigationNeeded = false;
  if (moisture < setpointMoisture - 5) {
    moistureStatus = "KERING";
    irrigationNeeded = true;
  } else if (moisture > 82) {
    moistureStatus = "BASAH";
  }

  // pH evaluation
  let phStatus: "ASAM" | "NETRAL" | "BASA" = "NETRAL";
  if (ph < 6.0) {
    phStatus = "ASAM";
  } else if (ph > 7.5) {
    phStatus = "BASA";
  }

  const lowN = sensorMode === "full_npk" && nitrogen < 30;
  const lowP = sensorMode === "full_npk" && phosphorus < 20;
  const lowK = sensorMode === "full_npk" && potassium < 70;
  const lowEC = sensorMode === "full_npk" && ec < 700;

  const fertilizerNeeded =
    phStatus !== "NETRAL" || lowN || lowP || lowK || lowEC;

  let score = 96;

  if (ph < 5.5 || ph > 8.0) score -= 25;
  else if (ph < 6.0 || ph > 7.5) score -= 12;

  if (moistureStatus === "KERING") score -= 20;
  else if (moistureStatus === "BASAH") score -= 10;

  if (sensorMode === "full_npk") {
    if (lowN) score -= 12;
    if (lowP) score -= 12;
    if (lowK) score -= 12;
    if (ec < 600 || ec > 2200) score -= 12;
  }

  const fertilityScore = Math.max(30, Math.min(99, score));

  let status: SoilAnalysis["status"] = "OPTIMAL";
  let ruleActive = "Rule #1: Kelembaban & pH Seimbang";
  let recommendation = "Kelembaban dan tingkat pH tanah optimal. Pertahankan target irigasi.";

  if (fertilityScore >= 88) {
    status = "SANGAT BAIK";
    ruleActive =
      sensorMode === "full_npk"
        ? "Rule #1: Tanah Sangat Subur (NPK & pH Ideal)"
        : "Rule #1: Tanah Sangat Subur & Seimbang";
    recommendation =
      sensorMode === "full_npk"
        ? `Kelembaban (${moisture}%), pH (${ph.toFixed(1)}), dan makronutrisi N-P-K (${nitrogen}/${phosphorus}/${potassium} mg/kg) sangat ideal.`
        : `Kelembaban (${moisture}%) dan pH tanah (${ph.toFixed(1)}) berada di batas ideal penyerapan nutrisi perakaran.`;
  } else if (moistureStatus === "KERING") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #2: Defisit Kelembaban Tanah";
    recommendation = `Kelembaban (${moisture}%) di bawah target (${setpointMoisture}%). Disarankan aktifkan pompa irigasi tetes.`;
  } else if (sensorMode === "full_npk" && (lowN || lowP || lowK)) {
    status = "KURANG SUBUR";
    ruleActive = "Rule #3: Defisiensi Makronutrisi NPK";
    const missing = [
      lowN && `Nitrogen (${nitrogen} mg/kg)`,
      lowP && `Fosfor (${phosphorus} mg/kg)`,
      lowK && `Kalium (${potassium} mg/kg)`,
    ]
      .filter(Boolean)
      .join(", ");
    recommendation = `Kadar unsur ${missing} tergolong rendah. Disarankan pemberian pupuk NPK berimbang.`;
  } else if (phStatus !== "NETRAL") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #4: Anomali Keasaman pH";
    recommendation =
      phStatus === "ASAM"
        ? `pH tanah masam (${ph.toFixed(1)}). Taburkan kapur dolomit untuk menetralkan tanah ke pH 6.0-7.0.`
        : `pH tanah basa (${ph.toFixed(1)}). Tambahkan bahan organik atau kompos matang untuk menurunkan pH.`;
  } else {
    status = "OPTIMAL";
    ruleActive = "Rule #5: Parameter Terjaga";
    recommendation = "Kondisi kelembaban dan keasaman tanah dalam batas toleransi normal.";
  }

  const confidence = Math.min(98, Math.max(78, Math.round(fertilityScore * 0.95 + 4)));

  return {
    status,
    confidence,
    fertilityScore,
    moistureStatus,
    phStatus,
    ruleActive,
    recommendation,
    irrigationNeeded,
    fertilizerNeeded,
  };
}

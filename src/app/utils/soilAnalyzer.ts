import { NPKSensorData, SoilAnalysis } from "../types/sensor";

export function analyzeSoilData(data: NPKSensorData, setpointMoisture: number = 65): SoilAnalysis {
  const { moisture, ph } = data;

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

  // Perlu perlakuan pH / Pengkondisi tanah jika pH di luar 6.0 - 7.5
  const fertilizerNeeded = phStatus !== "NETRAL";

  // Skor Kesuburan Tanah berdasarkan Kelembaban dan pH (0 - 100)
  let score = 96;

  if (ph < 5.5 || ph > 8.0) score -= 25;
  else if (ph < 6.0 || ph > 7.5) score -= 12;

  if (moistureStatus === "KERING") score -= 20;
  else if (moistureStatus === "BASAH") score -= 10;

  const fertilityScore = Math.max(35, Math.min(99, score));

  // Menentukan status keseluruhan dan rekomendasi
  let status: SoilAnalysis["status"] = "OPTIMAL";
  let ruleActive = "Rule #1: Kelembaban & pH Seimbang";
  let recommendation = "Kelembaban dan tingkat pH tanah optimal. Pertahankan target irigasi.";

  if (fertilityScore >= 88) {
    status = "SANGAT BAIK";
    ruleActive = "Rule #1: Tanah Sangat Subur & Seimbang";
    recommendation = `Kelembaban (${moisture}%) dan pH tanah (${ph.toFixed(1)}) berada di batas ideal penyerapan nutrisi perakaran.`;
  } else if (moistureStatus === "KERING") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #2: Defisit Kelembaban Tanah";
    recommendation = `Kelembaban (${moisture}%) di bawah target (${setpointMoisture}%). Disarankan aktifkan pompa irigasi tetes.`;
  } else if (phStatus !== "NETRAL") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #3: Anomali Keasaman pH";
    recommendation = phStatus === "ASAM"
      ? `pH tanah masam (${ph.toFixed(1)}). Taburkan kapur dolomit untuk menetralkan tanah ke pH 6.0-7.0.`
      : `pH tanah basa (${ph.toFixed(1)}). Tambahkan bahan organik atau kompos matang untuk menurunkan pH.`;
  } else {
    status = "OPTIMAL";
    ruleActive = "Rule #4: Parameter Terjaga";
    recommendation = "Kondisi kelembaban dan keasaman tanah dalam batas toleransi normal.";
  }

  const confidence = Math.min(98, Math.max(80, Math.round(fertilityScore * 0.95 + 4)));

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

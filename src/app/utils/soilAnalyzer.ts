import { NPKSensorData, SoilAnalysis } from "../types/sensor";

export function analyzeSoilData(data: NPKSensorData, setpointMoisture: number = 65): SoilAnalysis {
  const { moisture, ph, ec, nitrogen, phosphorus, potassium } = data;

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

  // Fertilizer needs
  const lowN = nitrogen < 30;
  const lowP = phosphorus < 20;
  const lowK = potassium < 70;
  const fertilizerNeeded = lowN || lowP || lowK || ec < 700;

  // Composite fertility score calculation (0 - 100)
  let score = 95;

  if (ph < 5.5 || ph > 8.0) score -= 20;
  else if (ph < 6.0 || ph > 7.5) score -= 10;

  if (lowN) score -= 15;
  if (lowP) score -= 15;
  if (lowK) score -= 15;

  if (ec < 600 || ec > 2200) score -= 15;
  else if (ec < 800 || ec > 2000) score -= 8;

  if (moistureStatus === "KERING") score -= 12;

  const fertilityScore = Math.max(30, Math.min(99, score));

  // Determine overall status and rule
  let status: SoilAnalysis["status"] = "OPTIMAL";
  let ruleActive = "Rule #1: Kondisi Subur & Stabil";
  let recommendation = "Parameter tanah seimbang dan optimal. Pertahankan kelembaban sesuai target.";

  if (fertilityScore >= 88) {
    status = "SANGAT BAIK";
    ruleActive = "Rule #1: Tanah Sangat Subur";
    recommendation = "Kandungan N-P-K dan pH tanah sangat ideal untuk pertumbuhan vegetatif tanaman.";
  } else if (moistureStatus === "KERING") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #3: Stres Air Tanah Kering";
    recommendation = `Kelembaban (${moisture}%) di bawah target (${setpointMoisture}%). Disarankan aktifkan pompa irigasi tetes.`;
  } else if (fertilizerNeeded) {
    status = "KURANG SUBUR";
    ruleActive = "Rule #2: Defisiensi Nutrisi NPK";
    const lowNutrients = [lowN && "Nitrogen (N)", lowP && "Fosfor (P)", lowK && "Kalium (K)"].filter(Boolean).join(", ");
    recommendation = `Kadar unsur ${lowNutrients || "nutrisi"} tergolong rendah. Disarankan pemberian pupuk NPK berimbang.`;
  } else if (phStatus !== "NETRAL") {
    status = "KURANG SUBUR";
    ruleActive = "Rule #4: Anomali Keasaman pH";
    recommendation = phStatus === "ASAM"
      ? `pH tanah masam (${ph}). Taburkan kapur dolomit untuk menetralkan tanah.`
      : `pH tanah basa (${ph}). Berikan bahan organik/kompos untuk menurunkan pH ke tingkat ideal.`;
  } else {
    status = "OPTIMAL";
    ruleActive = "Rule #5: Parameter Cukup Seimbang";
    recommendation = "Kondisi tanah dalam batas toleransi normal. Pantau fluktuasi harian.";
  }

  const confidence = Math.min(98, Math.max(75, Math.round(fertilityScore * 0.95 + 4)));

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

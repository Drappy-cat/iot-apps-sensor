import * as ort from "onnxruntime-web/wasm";
import type { NPKSensorData } from "../types/sensor";
import { PEST_DATABASE, type PestDetectionResult } from "../utils/pestDatabase";

export type AIEngineMode = "auto" | "onnx_edge" | "python_api";

export const STORAGE_KEY_AI_ENGINE_MODE = "iot_ai_engine_mode";
export const STORAGE_KEY_AI_API_URL = "iot_ai_api_url";
export const DEFAULT_AI_API_URL = "http://localhost:8000";
export const ONNX_MODEL_URL = "/models/yolo11s_6cls.onnx";
const MODEL_INPUT_SIZE = 640;

/**
 * Pemetaan Class ID internal yang terverifikasi langsung di checkpoint:
 * models/trained_weights/yolo11s_6cls_e50/weights/best.pt
 */
export const YOLO11_CLASS_MAP: Record<number, string> = {
  0: "kutu_daun_aphids",
  1: "ulat_grayak",
  2: "daun_layu_fusarium",
  3: "ulat_penggulung",
  4: "kutu_kebul",
  5: "tanaman_sehat",
};

export const CLASS_DISPLAY_LABELS: Record<string, string> = {
  kutu_daun_aphids: "Kutu Daun (Aphids)",
  ulat_grayak: "Ulat Grayak",
  daun_layu_fusarium: "Daun Layu Fusarium",
  ulat_penggulung: "Ulat Penggulung",
  kutu_kebul: "Kutu Kebul",
  tanaman_sehat: "Tanaman Sehat",
};

export const CLASS_BOX_COLORS: Record<string, string> = {
  kutu_daun_aphids: "#F59E0B",
  ulat_grayak: "#EA580C",
  daun_layu_fusarium: "#DC2626",
  ulat_penggulung: "#EAB308",
  kutu_kebul: "#EF4444",
  tanaman_sehat: "#22C55E",
};

export interface YoloDetection {
  classId: number;
  className: string;
  label: string;
  confidence: number; // 0..1
  bbox: [number, number, number, number]; // normalized [x1, y1, x2, y2]
  color: string;
}

export interface YoloInferenceOutput {
  engineUsed: "python_best_pt" | "onnx_edge" | "fallback";
  inferMs: number;
  detections: YoloDetection[];
  primaryClassKey: string;
  diagnosis: PestDetectionResult;
  visualConfidence: number; // 0..100
  multimodalConfidence: number; // 0..100
  sensorFusionNote: string;
  detectionSummary: string;
  annotatedDataUrl: string;
}

export function getSavedAIEngineMode(): AIEngineMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AI_ENGINE_MODE);
    if (val === "auto" || val === "onnx_edge" || val === "python_api") {
      return val;
    }
  } catch {
    // ignore storage read error
  }
  return "auto";
}

export function saveAIEngineMode(mode: AIEngineMode): void {
  localStorage.setItem(STORAGE_KEY_AI_ENGINE_MODE, mode);
}

export function getSavedAIAPIUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_AI_API_URL);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
  } catch {
    // ignore storage read error
  }
  return DEFAULT_AI_API_URL;
}

export function saveAIAPIUrl(url: string): void {
  const cleaned = url.trim().replace(/\/+$/, "") || DEFAULT_AI_API_URL;
  localStorage.setItem(STORAGE_KEY_AI_API_URL, cleaned);
}

export async function checkPythonServerHealth(
  apiUrl: string = getSavedAIAPIUrl(),
  timeoutMs: number = 700
): Promise<{ online: boolean; device?: string; model?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return {
      online: data?.status === "ok",
      device: data?.device,
      model: data?.model,
    };
  } catch {
    return { online: false };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Singleton Lazy Session Cache (Optimasi RAM HP Spek Rendah) ───────
let cachedSessionPromise: Promise<ort.InferenceSession> | null = null;

async function getOnnxSession(): Promise<ort.InferenceSession> {
  if (!cachedSessionPromise) {
    cachedSessionPromise = (async () => {
      // Optimasi HP spek rendah: batasi thread WASM & nonaktifkan arena memori berlebih
      ort.env.wasm.wasmPaths = "/ort/";
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      return await ort.InferenceSession.create(ONNX_MODEL_URL, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: false,
        enableMemPattern: false,
      });
    })().catch((err) => {
      cachedSessionPromise = null;
      throw err;
    });
  }
  return cachedSessionPromise;
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat citra input ke canvas."));
    img.src = dataUrl;
  });
}

interface LetterboxResult {
  tensorData: Float32Array;
  srcWidth: number;
  srcHeight: number;
  scale: number;
  padX: number;
  padY: number;
}

function preprocessLetterbox(img: HTMLImageElement): LetterboxResult {
  const srcWidth = img.naturalWidth || img.width || MODEL_INPUT_SIZE;
  const srcHeight = img.naturalHeight || img.height || MODEL_INPUT_SIZE;

  const scale = Math.min(MODEL_INPUT_SIZE / srcWidth, MODEL_INPUT_SIZE / srcHeight);
  const newW = Math.round(srcWidth * scale);
  const newH = Math.round(srcHeight * scale);
  const padX = Math.floor((MODEL_INPUT_SIZE - newW) / 2);
  const padY = Math.floor((MODEL_INPUT_SIZE - newH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Context canvas 2D tidak tersedia.");
  }

  // Ultralytics standard letterbox pad color (114, 114, 114)
  ctx.fillStyle = "rgb(114, 114, 114)";
  ctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  ctx.drawImage(img, padX, padY, newW, newH);

  const imgData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE).data;
  const area = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const tensorData = new Float32Array(3 * area);

  for (let i = 0; i < area; i++) {
    const offset = i * 4;
    tensorData[i] = imgData[offset] / 255.0;
    tensorData[area + i] = imgData[offset + 1] / 255.0;
    tensorData[2 * area + i] = imgData[offset + 2] / 255.0;
  }

  return { tensorData, srcWidth, srcHeight, scale, padX, padY };
}

function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number]
): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (interArea <= 0) return 0;

  const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
  const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const union = areaA + areaB - interArea;
  return union > 0 ? interArea / union : 0;
}

function applyNMS(candidates: YoloDetection[], iouThreshold: number = 0.45): YoloDetection[] {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const selected: YoloDetection[] = [];

  for (const cand of sorted) {
    const overlaps = selected.some(
      (kept) => kept.classId === cand.classId && computeIoU(kept.bbox, cand.bbox) > iouThreshold
    );
    if (!overlaps) {
      selected.push(cand);
      if (selected.length >= 15) break;
    }
  }
  return selected;
}

function decodeYolo11Tensor(
  outputTensor: ort.Tensor,
  prep: LetterboxResult,
  confThreshold: number = 0.22
): { detections: YoloDetection[]; bestRawClassKey: string; bestRawScore: number } {
  const dims = outputTensor.dims; // expected [1, 10, 8400]
  const data = outputTensor.data as Float32Array;
  const numChannels = dims.length === 3 ? dims[1] : 10;
  const numAnchors = dims.length === 3 ? dims[2] : 8400;
  const numClasses = Math.max(1, numChannels - 4);

  const candidates: YoloDetection[] = [];
  let bestRawScore = 0;
  let bestRawClassId = 5;

  for (let i = 0; i < numAnchors; i++) {
    let bestCls = 0;
    let maxProb = 0;
    for (let c = 0; c < numClasses; c++) {
      const prob = data[(4 + c) * numAnchors + i];
      if (prob > maxProb) {
        maxProb = prob;
        bestCls = c;
      }
    }

    if (maxProb > bestRawScore) {
      bestRawScore = maxProb;
      bestRawClassId = bestCls;
    }

    if (maxProb < confThreshold) continue;

    const cx = data[0 * numAnchors + i];
    const cy = data[1 * numAnchors + i];
    const bw = data[2 * numAnchors + i];
    const bh = data[3 * numAnchors + i];

    const x1 = Math.max(0, Math.min(1, (cx - bw / 2 - prep.padX) / (prep.scale * prep.srcWidth)));
    const y1 = Math.max(0, Math.min(1, (cy - bh / 2 - prep.padY) / (prep.scale * prep.srcHeight)));
    const x2 = Math.max(0, Math.min(1, (cx + bw / 2 - prep.padX) / (prep.scale * prep.srcWidth)));
    const y2 = Math.max(0, Math.min(1, (cy + bh / 2 - prep.padY) / (prep.scale * prep.srcHeight)));

    if (x2 - x1 <= 0.005 || y2 - y1 <= 0.005) continue;

    const className = YOLO11_CLASS_MAP[bestCls] || "tanaman_sehat";
    candidates.push({
      classId: bestCls,
      className,
      label: CLASS_DISPLAY_LABELS[className] || className,
      confidence: maxProb,
      bbox: [x1, y1, x2, y2],
      color: CLASS_BOX_COLORS[className] || "#3B82F6",
    });
  }

  return {
    detections: applyNMS(candidates, 0.45),
    bestRawClassKey: YOLO11_CLASS_MAP[bestRawClassId] || "tanaman_sehat",
    bestRawScore,
  };
}

/**
 * Menggambar overlay bounding box hasil deteksi YOLOv11s langsung ke snapshot image.
 */
async function renderAnnotatedImage(
  imageDataUrl: string,
  detections: YoloDetection[]
): Promise<string> {
  if (detections.length === 0) return imageDataUrl;

  const img = await loadImageElement(imageDataUrl);
  const w = img.naturalWidth || img.width || 640;
  const h = img.naturalHeight || img.height || 480;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageDataUrl;

  ctx.drawImage(img, 0, 0, w, h);

  const lineWidth = Math.max(2, Math.round(Math.min(w, h) / 220));
  const fontSize = Math.max(12, Math.round(Math.min(w, h) / 36));
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;

  for (const det of detections) {
    const [nx1, ny1, nx2, ny2] = det.bbox;
    const x = nx1 * w;
    const y = ny1 * h;
    const bw = (nx2 - nx1) * w;
    const bh = (ny2 - ny1) * h;

    // Box outline + subtle fill
    ctx.strokeStyle = det.color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, bw, bh);

    ctx.fillStyle = `${det.color}22`;
    ctx.fillRect(x, y, bw, bh);

    // Label pill
    const tag = `${det.label} ${Math.round(det.confidence * 100)}%`;
    const textMetrics = ctx.measureText(tag);
    const padX = 8;
    const tagH = fontSize + 8;
    const tagW = textMetrics.width + padX * 2;
    const tagY = y >= tagH + 4 ? y - tagH : y;

    ctx.fillStyle = det.color;
    ctx.fillRect(x, tagY, Math.min(tagW, w - x), tagH);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(tag, x + padX, tagY + fontSize + 1);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * Logika Multimodal Bayesian (ai_training_implementation_guide.md Bab 10):
 * Menggabungkan skor visual model YOLOv11s dengan kelembaban & pH tanah saat ini.
 */
function applyMultimodalSensorFusion(
  detections: YoloDetection[],
  fallbackKey: string,
  fallbackScore: number,
  sensorData: NPKSensorData
): {
  primaryClassKey: string;
  visualConfidence: number;
  multimodalConfidence: number;
  sensorFusionNote: string;
  detectionSummary: string;
} {
  const moisture = sensorData.moisture;
  const ph = sensorData.ph;

  if (detections.length === 0) {
    // Tidak ada kotak deteksi melewati ambang batas -> evaluasi dengan aman
    const visualConf = Math.max(55, Math.round(fallbackScore * 100));
    const healthyFallback = fallbackScore < 0.14 ? "tanaman_sehat" : fallbackKey;
    let note = `Tidak ada objek hama dominan melewati ambang batas (skor tertinggi ${Math.round(
      fallbackScore * 100
    )}%). Kondisi tanah: Kelembaban ${moisture.toFixed(1)}%, pH ${ph.toFixed(1)}.`;

    if (healthyFallback === "daun_layu_fusarium" && moisture > 78 && ph < 6.0) {
      note = `Tanah becek (${moisture.toFixed(1)}%) & masam (pH ${ph.toFixed(1)}) meningkatkan kewaspadaan gejala layu.`;
    }

    return {
      primaryClassKey: healthyFallback,
      visualConfidence: visualConf,
      multimodalConfidence: Math.min(97, visualConf + (healthyFallback === "tanaman_sehat" ? 5 : 0)),
      sensorFusionNote: note,
      detectionSummary:
        healthyFallback === "tanaman_sehat"
          ? "Tidak ditemukan hama aktif pada gambar"
          : `Indikasi awal ${CLASS_DISPLAY_LABELS[healthyFallback] || healthyFallback}`,
    };
  }

  // Hitung skor maksimum per kelas dari kotak deteksi
  const classScores: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  for (const d of detections) {
    classScores[d.className] = Math.max(classScores[d.className] || 0, d.confidence);
    classCounts[d.className] = (classCounts[d.className] || 0) + 1;
  }

  // Terapkan bobot Bayesian IoT
  const fusedScores: Record<string, number> = { ...classScores };
  const notes: string[] = [];

  if (fusedScores["daun_layu_fusarium"] !== undefined) {
    if (moisture > 78 && ph < 6.0) {
      fusedScores["daun_layu_fusarium"] = Math.min(0.99, fusedScores["daun_layu_fusarium"] * 1.35);
      notes.push(`Kelembaban tinggi (${moisture.toFixed(1)}%) & pH masam (${ph.toFixed(1)}) memperkuat indikasi Layu Fusarium.`);
    } else if (moisture < 55) {
      fusedScores["daun_layu_fusarium"] *= 0.78;
      notes.push(`Tanah cukup kering (${moisture.toFixed(1)}%), memperlambat penyebaran spora Fusarium.`);
    }
  }

  if (moisture < 55) {
    if (fusedScores["kutu_kebul"] !== undefined) {
      fusedScores["kutu_kebul"] = Math.min(0.98, fusedScores["kutu_kebul"] * 1.25);
      notes.push(`Kelembaban rendah (${moisture.toFixed(1)}%) memicu agresivitas Kutu Kebul.`);
    }
    if (fusedScores["kutu_daun_aphids"] !== undefined) {
      fusedScores["kutu_daun_aphids"] = Math.min(0.98, fusedScores["kutu_daun_aphids"] * 1.2);
      notes.push(`Kondisi kering (${moisture.toFixed(1)}%) mendukung koloni Kutu Daun (Aphids).`);
    }
  }

  if (moisture > 75) {
    if (fusedScores["ulat_grayak"] !== undefined) {
      fusedScores["ulat_grayak"] = Math.min(0.98, fusedScores["ulat_grayak"] * 1.15);
      notes.push(`Kelembaban tajuk/tanah tinggi (${moisture.toFixed(1)}%) cocok untuk penetasan larva Ulat Grayak.`);
    }
    if (fusedScores["ulat_penggulung"] !== undefined) {
      fusedScores["ulat_penggulung"] = Math.min(0.98, fusedScores["ulat_penggulung"] * 1.15);
    }
  }

  // Pilih kelas pemenang pasca-fusi (prioritaskan hama/penyakit jika ada selain tanaman_sehat)
  const pestEntries = Object.entries(fusedScores).filter(([k]) => k !== "tanaman_sehat");
  const sortedEntries = (pestEntries.length > 0 ? pestEntries : Object.entries(fusedScores)).sort(
    (a, b) => b[1] - a[1]
  );

  const primaryClassKey = sortedEntries[0][0];
  const rawVisual = classScores[primaryClassKey] ?? detections[0].confidence;
  const fused = sortedEntries[0][1];

  const visualConfidence = Math.min(99, Math.round(rawVisual * 100));
  const multimodalConfidence = Math.min(99, Math.round(fused * 100));

  const summaryParts = Object.entries(classCounts).map(
    ([k, cnt]) => `${cnt} ${CLASS_DISPLAY_LABELS[k] || k}`
  );

  return {
    primaryClassKey,
    visualConfidence,
    multimodalConfidence,
    sensorFusionNote:
      notes.join(" ") ||
      `Korelasi sensor (Kelembaban ${moisture.toFixed(1)}%, pH ${ph.toFixed(1)}) konsisten dengan deteksi visual.`,
    detectionSummary: `${detections.length} objek terdeteksi (${summaryParts.join(", ")})`,
  };
}

async function runPythonApiInference(
  imageDataUrl: string,
  sensorData: NPKSensorData,
  apiUrl: string
): Promise<{ engineUsed: "python_best_pt"; inferMs: number; detections: YoloDetection[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${apiUrl}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        imageBase64: imageDataUrl,
        confThreshold: 0.25,
        iouThreshold: 0.45,
        moisture: sensorData.moisture,
        ph: sensorData.ph,
      }),
    });

    if (!res.ok) {
      throw new Error(`Python AI API error (${res.status})`);
    }
    const data = await res.json();
    const detections: YoloDetection[] = (data.detections || []).map((d: any) => {
      const clsName = YOLO11_CLASS_MAP[d.classId] || d.className || "tanaman_sehat";
      return {
        classId: Number(d.classId),
        className: clsName,
        label: CLASS_DISPLAY_LABELS[clsName] || clsName,
        confidence: Number(d.confidence),
        bbox: d.bbox as [number, number, number, number],
        color: CLASS_BOX_COLORS[clsName] || "#3B82F6",
      };
    });

    return {
      engineUsed: "python_best_pt",
      inferMs: Number(data.inferMs ?? 0),
      detections,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runOnnxEdgeInference(imageDataUrl: string): Promise<{
  engineUsed: "onnx_edge";
  inferMs: number;
  detections: YoloDetection[];
  bestRawClassKey: string;
  bestRawScore: number;
}> {
  const img = await loadImageElement(imageDataUrl);
  const prep = preprocessLetterbox(img);
  const session = await getOnnxSession();

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const inputTensor = new ort.Tensor("float32", prep.tensorData, [
    1,
    3,
    MODEL_INPUT_SIZE,
    MODEL_INPUT_SIZE,
  ]);

  const t0 = performance.now();
  const results = await session.run({ [inputName]: inputTensor });
  const inferMs = Math.round((performance.now() - t0) * 10) / 10;

  const outputTensor = results[outputName];
  const decoded = decodeYolo11Tensor(outputTensor, prep, 0.22);

  return {
    engineUsed: "onnx_edge",
    inferMs,
    detections: decoded.detections,
    bestRawClassKey: decoded.bestRawClassKey,
    bestRawScore: decoded.bestRawScore,
  };
}

/**
 * Entry point utama Hybrid YOLOv11s AI Vision Inference:
 * 1. Mode "auto": Cek server Python best.pt lokal (timeout 600ms) -> jika aktif pakai GPU/CPU laptop,
 *    jika tidak aktif pakai model ONNX Edge in-browser / APK offline.
 * 2. Mode "python_api": Paksa pakai endpoint Python best.pt.
 * 3. Mode "onnx_edge": Paksa pakai ONNX Edge lokal tanpa request jaringan ke Python.
 */
export async function runYoloPestInference(
  imageDataUrl: string,
  sensorData: NPKSensorData
): Promise<YoloInferenceOutput> {
  const mode = getSavedAIEngineMode();
  const apiUrl = getSavedAIAPIUrl();

  let engineUsed: YoloInferenceOutput["engineUsed"] = "onnx_edge";
  let inferMs = 0;
  let detections: YoloDetection[] = [];
  let bestRawClassKey = "tanaman_sehat";
  let bestRawScore = 0.85;

  try {
    let usedPython = false;

    if (mode === "python_api") {
      const pyRes = await runPythonApiInference(imageDataUrl, sensorData, apiUrl);
      engineUsed = pyRes.engineUsed;
      inferMs = pyRes.inferMs;
      detections = pyRes.detections;
      usedPython = true;
    } else if (mode === "auto") {
      const health = await checkPythonServerHealth(apiUrl, 600);
      if (health.online) {
        try {
          const pyRes = await runPythonApiInference(imageDataUrl, sensorData, apiUrl);
          engineUsed = pyRes.engineUsed;
          inferMs = pyRes.inferMs;
          detections = pyRes.detections;
          usedPython = true;
        } catch {
          usedPython = false;
        }
      }
    }

    if (!usedPython) {
      const onnxRes = await runOnnxEdgeInference(imageDataUrl);
      engineUsed = onnxRes.engineUsed;
      inferMs = onnxRes.inferMs;
      detections = onnxRes.detections;
      bestRawClassKey = onnxRes.bestRawClassKey;
      bestRawScore = onnxRes.bestRawScore;
    }
  } catch (err) {
    console.warn("YOLOv11s inference fallback aktif:", err);
    engineUsed = "fallback";
    if (sensorData.moisture > 78 && sensorData.ph < 6.0) {
      bestRawClassKey = "daun_layu_fusarium";
    } else if (sensorData.moisture < 50) {
      bestRawClassKey = "kutu_kebul";
    } else {
      bestRawClassKey = "tanaman_sehat";
    }
    bestRawScore = 0.78;
  }

  const fusion = applyMultimodalSensorFusion(
    detections,
    bestRawClassKey,
    bestRawScore,
    sensorData
  );

  const baseDiagnosis =
    PEST_DATABASE[fusion.primaryClassKey] || PEST_DATABASE["tanaman_sehat"];

  const annotatedDataUrl = await renderAnnotatedImage(imageDataUrl, detections);

  return {
    engineUsed,
    inferMs,
    detections,
    primaryClassKey: fusion.primaryClassKey,
    diagnosis: {
      ...baseDiagnosis,
      confidence: fusion.multimodalConfidence,
    },
    visualConfidence: fusion.visualConfidence,
    multimodalConfidence: fusion.multimodalConfidence,
    sensorFusionNote: fusion.sensorFusionNote,
    detectionSummary: fusion.detectionSummary,
    annotatedDataUrl,
  };
}

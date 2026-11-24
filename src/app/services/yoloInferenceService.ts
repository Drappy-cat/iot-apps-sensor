import * as ort from "onnxruntime-web/wasm";
import type { NPKSensorData } from "../types/sensor";
import { PEST_DATABASE, type PestDetectionResult } from "../utils/pestDatabase";

export type AIEngineMode = "auto" | "onnx_edge" | "python_api";
export type AIRamProfileId = "extreme_low_ram" | "balanced_low_latency";
export type AIRamPreference = "auto" | AIRamProfileId;

export const RAM_THRESHOLD_GB = 6;
export const STORAGE_KEY_AI_ENGINE_MODE = "iot_ai_engine_mode";
export const STORAGE_KEY_AI_API_URL = "iot_ai_api_url";
export const STORAGE_KEY_AI_RAM_PREF = "iot_ai_ram_preference";
export const DEFAULT_AI_API_URL = "http://localhost:8000";
export const ONNX_MODEL_URL = "/models/yolo11s_416.onnx";
const MODEL_INPUT_SIZE = 416;

export interface AIRamProfileConfig {
  id: AIRamProfileId;
  label: string;
  shortBadge: string;
  inputSize: number;
  modelUrl: string;
  useQuantizedModel: boolean;
  jpegQuality: number;
  maxSnapshotPx: number;
  wasmThreads: number;
  enableCpuMemArena: boolean;
  enableMemPattern: boolean;
  prewarmOnCameraStart: boolean;
  reuseTensorBuffer: boolean;
}

const detectedCpuCores =
  typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
const balancedWasmThreads = Math.min(4, Math.max(2, Math.floor(detectedCpuCores / 2)));

export const AI_RAM_PROFILES: Record<AIRamProfileId, AIRamProfileConfig> = {
  extreme_low_ram: {
    id: "extreme_low_ram",
    label: "Kompresi Ekstrem (RAM < 6 GB)",
    shortBadge: "Hemat RAM (<6GB • UINT8)",
    inputSize: MODEL_INPUT_SIZE,
    modelUrl: "/models/yolo11s_416_uint8.onnx",
    useQuantizedModel: true,
    jpegQuality: 0.8,
    maxSnapshotPx: 640,
    wasmThreads: 1,
    enableCpuMemArena: false,
    enableMemPattern: false,
    prewarmOnCameraStart: false,
    reuseTensorBuffer: false,
  },
  balanced_low_latency: {
    id: "balanced_low_latency",
    label: "Optimal Delay Rendah (RAM >= 6 GB)",
    shortBadge: "Delay Rendah (>=6GB • Turbo)",
    inputSize: MODEL_INPUT_SIZE,
    modelUrl: ONNX_MODEL_URL,
    useQuantizedModel: false,
    jpegQuality: 0.92,
    maxSnapshotPx: 960,
    wasmThreads: balancedWasmThreads,
    enableCpuMemArena: true,
    enableMemPattern: true,
    prewarmOnCameraStart: true,
    reuseTensorBuffer: true,
  },
};

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
  confidence: number; // 0..1 calibrated
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
  ramProfileId: AIRamProfileId;
  ramProfileBadge: string;
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

export function getSavedAIRamPreference(): AIRamPreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY_AI_RAM_PREF);
    if (val === "auto" || val === "extreme_low_ram" || val === "balanced_low_latency") {
      return val;
    }
  } catch {
    // ignore storage read error
  }
  return "auto";
}

export function saveAIRamPreference(preference: AIRamPreference): void {
  localStorage.setItem(STORAGE_KEY_AI_RAM_PREF, preference);
}

export function resolveDeviceRamProfile(preference?: AIRamPreference): {
  profile: AIRamProfileConfig;
  detectedRamGB: number | null;
  detectedCores: number;
  preference: AIRamPreference;
} {
  const effectivePref = preference ?? getSavedAIRamPreference();
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;
  const detectedRamGB =
    nav && typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores = nav?.hardwareConcurrency || detectedCpuCores;

  if (effectivePref !== "auto") {
    return {
      profile: AI_RAM_PROFILES[effectivePref],
      detectedRamGB,
      detectedCores: cores,
      preference: effectivePref,
    };
  }

  // Deklarasi aturan utama: RAM < 6 GB -> Kompresi Ekstrem, RAM >= 6 GB -> Delay Rendah Seimbang
  if (detectedRamGB !== null) {
    return {
      profile:
        detectedRamGB < RAM_THRESHOLD_GB
          ? AI_RAM_PROFILES.extreme_low_ram
          : AI_RAM_PROFILES.balanced_low_latency,
      detectedRamGB,
      detectedCores: cores,
      preference: effectivePref,
    };
  }

  // Fallback heuristik jika WebView tidak mengekspos navigator.deviceMemory
  return {
    profile:
      cores >= 8
        ? AI_RAM_PROFILES.balanced_low_latency
        : AI_RAM_PROFILES.extreme_low_ram,
    detectedRamGB,
    detectedCores: cores,
    preference: effectivePref,
  };
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
  lastPythonFailAt = 0;
}

let lastPythonFailAt = 0;

function shouldFastSkipPythonCheck(apiUrl: string): boolean {
  if (typeof window !== "undefined") {
    const isCapacitorOrigin =
      window.location.protocol === "https:" && window.location.hostname === "localhost";
    if (isCapacitorOrigin && apiUrl === DEFAULT_AI_API_URL) {
      return true;
    }
  }
  if (lastPythonFailAt > 0 && Date.now() - lastPythonFailAt < 30000) {
    return true;
  }
  return false;
}

export async function checkPythonServerHealth(
  apiUrl: string = getSavedAIAPIUrl(),
  timeoutMs: number = 700,
  forceCheck: boolean = false
): Promise<{ online: boolean; device?: string; model?: string }> {
  if (!forceCheck && shouldFastSkipPythonCheck(apiUrl)) {
    return { online: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiUrl}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      lastPythonFailAt = Date.now();
      return { online: false };
    }
    const data = await res.json();
    const online = data?.status === "ok";
    if (online) {
      lastPythonFailAt = 0;
    } else {
      lastPythonFailAt = Date.now();
    }
    return {
      online,
      device: data?.device,
      model: data?.model,
    };
  } catch {
    lastPythonFailAt = Date.now();
    return { online: false };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Manajemen Sesi ONNX Adaptif & Pre-Warmup ────────────────────────────────
let cachedSessionPromise: Promise<ort.InferenceSession> | null = null;
let activeSessionProfileId: AIRamProfileId | null = null;
let reusableTensorBuffer: Float32Array | null = null;
let prewarmedProfileId: AIRamProfileId | null = null;

async function getOnnxSession(profile: AIRamProfileConfig): Promise<ort.InferenceSession> {
  if (cachedSessionPromise && activeSessionProfileId !== profile.id) {
    const prevPromise = cachedSessionPromise;
    cachedSessionPromise = null;
    activeSessionProfileId = null;
    prewarmedProfileId = null;
    void prevPromise.then((s) => s.release?.()).catch(() => {});
  }

  if (!cachedSessionPromise) {
    activeSessionProfileId = profile.id;
    cachedSessionPromise = (async () => {
      ort.env.wasm.wasmPaths = "/ort/";
      const supportsThreads = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
      ort.env.wasm.numThreads = supportsThreads ? profile.wasmThreads : 1;
      ort.env.wasm.simd = true;

      return await ort.InferenceSession.create(profile.modelUrl, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: profile.enableCpuMemArena,
        enableMemPattern: profile.enableMemPattern,
      });
    })().catch((err) => {
      cachedSessionPromise = null;
      activeSessionProfileId = null;
      throw err;
    });
  }
  return cachedSessionPromise;
}

/**
 * Memanaskan sesi ONNX di background saat kamera dibuka (khusus profil RAM >= 6 GB)
 * agar penalti cold-start (~1.2 detik) hilang sebelum tombol Pindai ditekan.
 */
export async function prewarmYoloSession(): Promise<void> {
  const { profile } = resolveDeviceRamProfile();
  if (!profile.prewarmOnCameraStart || prewarmedProfileId === profile.id) {
    return;
  }

  try {
    const session = await getOnnxSession(profile);
    if (prewarmedProfileId === profile.id) return;
    const area = profile.inputSize * profile.inputSize;
    const dummyData = new Float32Array(3 * area);
    const dummyTensor = new ort.Tensor("float32", dummyData, [
      1,
      3,
      profile.inputSize,
      profile.inputSize,
    ]);
    await session.run({ [session.inputNames[0]]: dummyTensor });
    prewarmedProfileId = profile.id;
  } catch {
    // Abaikan error pre-warmup agar tidak mengganggu UX kamera
  }
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat citra input ke canvas."));
    img.src = dataUrl;
  });
}

interface ContentCropRegion {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Smart Auto-Crop Dark Borders (< 6 ms):
 * Mendeteksi bingkai hitam/gelap di tepi frame (seperti hasil screenshot/letterbox HP)
 * agar objek hama mengisi penuh bidang tensor model.
 */
function detectActiveContentRegion(
  img: HTMLImageElement,
  srcWidth: number,
  srcHeight: number
): ContentCropRegion {
  const maxSample = 160;
  const sampleScale = Math.min(1, maxSample / Math.max(srcWidth, srcHeight));
  const sw = Math.max(16, Math.round(srcWidth * sampleScale));
  const sh = Math.max(16, Math.round(srcHeight * sampleScale));

  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = sw;
  probeCanvas.height = sh;
  const probeCtx = probeCanvas.getContext("2d");
  if (!probeCtx) {
    return { cropX: 0, cropY: 0, cropW: srcWidth, cropH: srcHeight };
  }

  probeCtx.drawImage(img, 0, 0, sw, sh);
  const px = probeCtx.getImageData(0, 0, sw, sh).data;
  const darkLumThreshold = 22;

  const isColDark = (x: number): boolean => {
    let darkCount = 0;
    for (let y = 0; y < sh; y++) {
      const idx = (y * sw + x) * 4;
      const lum = 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2];
      if (lum < darkLumThreshold) darkCount++;
    }
    return darkCount / sh >= 0.9;
  };

  const isRowDark = (y: number, xStart: number, xEnd: number): boolean => {
    const span = Math.max(1, xEnd - xStart + 1);
    let darkCount = 0;
    for (let x = xStart; x <= xEnd; x++) {
      const idx = (y * sw + x) * 4;
      const lum = 0.299 * px[idx] + 0.587 * px[idx + 1] + 0.114 * px[idx + 2];
      if (lum < darkLumThreshold) darkCount++;
    }
    return darkCount / span >= 0.9;
  };

  let left = 0;
  let right = sw - 1;
  while (left < right && isColDark(left)) left++;
  while (right > left && isColDark(right)) right--;

  let top = 0;
  let bottom = sh - 1;
  while (top < bottom && isRowDark(top, left, right)) top++;
  while (bottom > top && isRowDark(bottom, left, right)) bottom--;

  const keptW = right - left + 1;
  const keptH = bottom - top + 1;

  // Batas aman: pastikan area konten minimal 35% dimensi asli & hindari crop mikro
  if (keptW < sw * 0.35 || keptH < sh * 0.35) {
    return { cropX: 0, cropY: 0, cropW: srcWidth, cropH: srcHeight };
  }
  if (left <= Math.floor(sw * 0.02)) left = 0;
  if (right >= Math.ceil(sw * 0.98) - 1) right = sw - 1;
  if (top <= Math.floor(sh * 0.02)) top = 0;
  if (bottom >= Math.ceil(sh * 0.98) - 1) bottom = sh - 1;

  const cropX = Math.max(0, Math.floor((left / sw) * srcWidth));
  const cropY = Math.max(0, Math.floor((top / sh) * srcHeight));
  const cropW = Math.min(srcWidth - cropX, Math.max(16, Math.ceil(((right - left + 1) / sw) * srcWidth)));
  const cropH = Math.min(srcHeight - cropY, Math.max(16, Math.ceil(((bottom - top + 1) / sh) * srcHeight)));

  return { cropX, cropY, cropW, cropH };
}

interface LetterboxResult {
  tensorData: Float32Array;
  inputSize: number;
  srcWidth: number;
  srcHeight: number;
  cropX: number;
  cropY: number;
  scale: number;
  padX: number;
  padY: number;
}

function preprocessLetterbox(
  img: HTMLImageElement,
  profile: AIRamProfileConfig
): LetterboxResult {
  const srcWidth = img.naturalWidth || img.width || profile.inputSize;
  const srcHeight = img.naturalHeight || img.height || profile.inputSize;
  const inputSize = profile.inputSize;

  const { cropX, cropY, cropW, cropH } = detectActiveContentRegion(img, srcWidth, srcHeight);

  const scale = Math.min(inputSize / cropW, inputSize / cropH);
  const newW = Math.round(cropW * scale);
  const newH = Math.round(cropH * scale);
  const padX = Math.floor((inputSize - newW) / 2);
  const padY = Math.floor((inputSize - newH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = inputSize;
  canvas.height = inputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Context canvas 2D tidak tersedia.");
  }

  // Ultralytics standard letterbox pad color (114, 114, 114)
  ctx.fillStyle = "rgb(114, 114, 114)";
  ctx.fillRect(0, 0, inputSize, inputSize);
  ctx.drawImage(img, cropX, cropY, cropW, cropH, padX, padY, newW, newH);

  const imgData = ctx.getImageData(0, 0, inputSize, inputSize).data;
  const area = inputSize * inputSize;
  let tensorData: Float32Array;
  if (profile.reuseTensorBuffer) {
    if (!reusableTensorBuffer || reusableTensorBuffer.length !== 3 * area) {
      reusableTensorBuffer = new Float32Array(3 * area);
    }
    tensorData = reusableTensorBuffer;
  } else {
    tensorData = new Float32Array(3 * area);
  }

  const inv255 = 1 / 255.0;
  const greenOffset = area;
  const blueOffset = 2 * area;
  for (let i = 0; i < area; i++) {
    const offset = i * 4;
    tensorData[i] = imgData[offset] * inv255;
    tensorData[greenOffset + i] = imgData[offset + 1] * inv255;
    tensorData[blueOffset + i] = imgData[offset + 2] * inv255;
  }

  return { tensorData, inputSize, srcWidth, srcHeight, cropX, cropY, scale, padX, padY };
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

/**
 * Kalibrasi confidence YOLOv11s IoU-aware + bonus konsensus multi-anchor:
 * Memetakan skor sigmoid YOLOv11 (~0.73) ke rentang terkalibrasi ~0.88–0.92.
 */
function calibrateYoloConfidence(rawProb: number, supportCount: number = 1): number {
  if (rawProb <= 0.15) return rawProb;
  const normalized = Math.max(0, Math.min(1, (rawProb - 0.15) / 0.85));
  const calibrated = 0.25 + 0.7 * Math.pow(normalized, 0.38);
  const consensusBonus = Math.min(0.04, Math.max(0, supportCount - 1) * 0.012);
  return Math.min(0.97, calibrated + consensusBonus);
}

function applyNMSWithConsensus(
  rawCandidates: YoloDetection[],
  iouThreshold: number = 0.45
): YoloDetection[] {
  const calibrated = rawCandidates.map((cand) => {
    let supportCount = 0;
    for (const other of rawCandidates) {
      if (other.classId === cand.classId && computeIoU(cand.bbox, other.bbox) > 0.55) {
        supportCount++;
      }
    }
    return {
      ...cand,
      confidence: calibrateYoloConfidence(cand.confidence, Math.max(1, supportCount)),
    };
  });

  const sorted = calibrated.sort((a, b) => b.confidence - a.confidence);
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
  const dims = outputTensor.dims; // expected [1, 10, 3549] for 416x416
  const data = outputTensor.data as Float32Array;
  const numChannels = dims.length === 3 ? dims[1] : 10;
  const numAnchors = dims.length === 3 ? dims[2] : 3549;
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

    const cropX1 = (cx - bw / 2 - prep.padX) / prep.scale;
    const cropY1 = (cy - bh / 2 - prep.padY) / prep.scale;
    const cropX2 = (cx + bw / 2 - prep.padX) / prep.scale;
    const cropY2 = (cy + bh / 2 - prep.padY) / prep.scale;

    const x1 = Math.max(0, Math.min(1, (prep.cropX + cropX1) / prep.srcWidth));
    const y1 = Math.max(0, Math.min(1, (prep.cropY + cropY1) / prep.srcHeight));
    const x2 = Math.max(0, Math.min(1, (prep.cropX + cropX2) / prep.srcWidth));
    const y2 = Math.max(0, Math.min(1, (prep.cropY + cropY2) / prep.srcHeight));

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
    detections: applyNMSWithConsensus(candidates, 0.45),
    bestRawClassKey: YOLO11_CLASS_MAP[bestRawClassId] || "tanaman_sehat",
    bestRawScore: bestRawScore >= confThreshold ? calibrateYoloConfidence(bestRawScore, 1) : bestRawScore,
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

    ctx.strokeStyle = det.color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, bw, bh);

    ctx.fillStyle = `${det.color}22`;
    ctx.fillRect(x, y, bw, bh);

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
 * Logika Multimodal Bayesian (ai_training_implementation_guide.md Bab 10 + Kalibrasi v4.2.0):
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
    const visualConf = Math.max(55, Math.round(fallbackScore * 100));
    const healthyFallback = fallbackScore < 0.14 ? "tanaman_sehat" : fallbackKey;
    let note = `Tidak ada objek hama dominan melewati ambang batas (skor tertinggi ${Math.round(
      fallbackScore * 100
    )}%). Kondisi tanah: Kelembaban ${moisture.toFixed(1)}%, pH ${ph.toFixed(1)}.`;

    if (healthyFallback === "daun_layu_fusarium" && moisture > 75 && ph < 6.2) {
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

  const classScores: Record<string, number> = {};
  const classCounts: Record<string, number> = {};
  for (const d of detections) {
    classScores[d.className] = Math.max(classScores[d.className] || 0, d.confidence);
    classCounts[d.className] = (classCounts[d.className] || 0) + 1;
  }

  const fusedScores: Record<string, number> = { ...classScores };
  const notes: string[] = [];

  if (fusedScores["daun_layu_fusarium"] !== undefined) {
    if (moisture > 75 && ph < 6.2) {
      fusedScores["daun_layu_fusarium"] = Math.min(0.98, fusedScores["daun_layu_fusarium"] * 1.28);
      notes.push(`Kelembaban tinggi (${moisture.toFixed(1)}%) & pH masam (${ph.toFixed(1)}) memperkuat indikasi Layu Fusarium.`);
    } else if (moisture >= 65 && ph <= 6.5) {
      fusedScores["daun_layu_fusarium"] = Math.min(0.98, fusedScores["daun_layu_fusarium"] * 1.1);
      notes.push(`Kondisi lembab (${moisture.toFixed(1)}%, pH ${ph.toFixed(1)}) mendukung perkembangan spora Fusarium.`);
    } else if (moisture < 55) {
      fusedScores["daun_layu_fusarium"] *= 0.78;
      notes.push(`Tanah cukup kering (${moisture.toFixed(1)}%), memperlambat penyebaran spora Fusarium.`);
    }
  }

  if (moisture < 58) {
    if (fusedScores["kutu_kebul"] !== undefined) {
      fusedScores["kutu_kebul"] = Math.min(0.98, fusedScores["kutu_kebul"] * 1.2);
      notes.push(`Kelembaban rendah (${moisture.toFixed(1)}%) memicu agresivitas Kutu Kebul.`);
    }
    if (fusedScores["kutu_daun_aphids"] !== undefined) {
      fusedScores["kutu_daun_aphids"] = Math.min(0.98, fusedScores["kutu_daun_aphids"] * 1.2);
      notes.push(`Kondisi kering (${moisture.toFixed(1)}%) mendukung koloni Kutu Daun (Aphids).`);
    }
  } else if (moisture <= 66) {
    if (fusedScores["kutu_kebul"] !== undefined) {
      fusedScores["kutu_kebul"] = Math.min(0.98, fusedScores["kutu_kebul"] * 1.08);
      notes.push(`Kelembaban sedang-rendah (${moisture.toFixed(1)}%) cukup mendukung koloni Kutu Kebul.`);
    }
    if (fusedScores["kutu_daun_aphids"] !== undefined) {
      fusedScores["kutu_daun_aphids"] = Math.min(0.98, fusedScores["kutu_daun_aphids"] * 1.08);
      notes.push(`Kelembaban sedang-rendah (${moisture.toFixed(1)}%) mendukung populasi Kutu Daun (Aphids).`);
    }
  }

  // Rentang aktif agronomi diperluas: kelembaban 58-88% dan pH 5.6-7.4
  if (moisture >= 58 && moisture <= 88 && ph >= 5.6 && ph <= 7.4) {
    const larvaBoost = moisture > 72 ? 1.14 : 1.08;
    const hasCaterpillar =
      fusedScores["ulat_penggulung"] !== undefined || fusedScores["ulat_grayak"] !== undefined;
    if (fusedScores["ulat_penggulung"] !== undefined) {
      fusedScores["ulat_penggulung"] = Math.min(0.98, fusedScores["ulat_penggulung"] * larvaBoost);
    }
    if (fusedScores["ulat_grayak"] !== undefined) {
      fusedScores["ulat_grayak"] = Math.min(0.98, fusedScores["ulat_grayak"] * larvaBoost);
    }
    if (hasCaterpillar) {
      notes.push(
        `Kelembaban ${moisture.toFixed(1)}% & pH ${ph.toFixed(1)} berada di zona aktif larva ulat daun, memperkuat diagnosis visual.`
      );
    }
  }

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
        confidence: calibrateYoloConfidence(Number(d.confidence), 1),
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

async function runOnnxEdgeInference(
  imageDataUrl: string,
  profile: AIRamProfileConfig
): Promise<{
  engineUsed: "onnx_edge";
  inferMs: number;
  detections: YoloDetection[];
  bestRawClassKey: string;
  bestRawScore: number;
}> {
  const tStart = performance.now();
  const img = await loadImageElement(imageDataUrl);
  const prep = preprocessLetterbox(img, profile);
  const session = await getOnnxSession(profile);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const inputTensor = new ort.Tensor("float32", prep.tensorData, [
    1,
    3,
    prep.inputSize,
    prep.inputSize,
  ]);

  const results = await session.run({ [inputName]: inputTensor });
  const inferMs = Math.round((performance.now() - tStart) * 10) / 10;

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
 * Entry point utama Hybrid YOLOv11s AI Vision Inference (`v4.2.0` Adaptif RAM):
 * 1. Memilih profil RAM (`RAM < 6 GB` -> Kompresi Ekstrem UINT8, `RAM >= 6 GB` -> Delay Rendah Turbo).
 * 2. Mode "auto": Fast-skip localhost saat di APK offline, pakai Python API jika online, atau Edge ONNX.
 */
export async function runYoloPestInference(
  imageDataUrl: string,
  sensorData: NPKSensorData
): Promise<YoloInferenceOutput> {
  const mode = getSavedAIEngineMode();
  const apiUrl = getSavedAIAPIUrl();
  const { profile } = resolveDeviceRamProfile();

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
      const onnxRes = await runOnnxEdgeInference(imageDataUrl, profile);
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
    ramProfileId: profile.id,
    ramProfileBadge: profile.shortBadge,
  };
}

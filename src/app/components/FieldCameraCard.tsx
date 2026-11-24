import { useState, useRef, useEffect } from "react";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Droplets,
  Activity,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Bug,
  Leaf,
  Layers,
  ChevronDown,
  ChevronUp,
  Upload,
  Info,
  Smartphone,
  Radio,
  Wifi,
  WifiOff,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NPKSensorData } from "../types/sensor";
import { PEST_DATABASE, PestDetectionResult } from "../utils/pestDatabase";

interface FieldCameraCardProps {
  sensorData: NPKSensorData;
}

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  moisture: number;
  ph: number;
  diagnosis?: PestDetectionResult;
}

export function FieldCameraCard({ sensorData }: FieldCameraCardProps) {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<PestDetectionResult | null>(null);
  const [targetPreset, setTargetPreset] = useState<string>("auto");
  const [expandPrevention, setExpandPrevention] = useState<boolean>(true);

  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(() => {
    const saved = localStorage.getItem("iot_captured_photos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);

  // Camera source selection: device (phone/laptop webcam) or esp32 (IoT MQTT+WS relay)
  const [cameraSource, setCameraSource] = useState<"device" | "esp32">(() => {
    return (localStorage.getItem("iot_camera_source") as "device" | "esp32") || "device";
  });
  const [espRelayHost, setEspRelayHost] = useState<string>(() => {
    const saved = localStorage.getItem("iot_esp_relay_host");
    if (saved) return saved;
    if (typeof window !== "undefined" && window.location.hostname) {
      return `${window.location.hostname}:5000`;
    }
    return "localhost:5000";
  });
  const [showRelaySettings, setShowRelaySettings] = useState<boolean>(false);
  const [customHostInput, setCustomHostInput] = useState<string>(espRelayHost);
  const [espStatus, setEspStatus] = useState<{
    espOnline: boolean;
    isStreaming: boolean;
    activeViewers: number;
  } | null>(null);
  const [espFps, setEspFps] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const espImgRef = useRef<HTMLImageElement | null>(null);
  const espWsRef = useRef<WebSocket | null>(null);
  const espBlobUrlRef = useRef<string | null>(null);
  const fpsCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Poll ESP32 relay status when in esp32 mode
  useEffect(() => {
    if (cameraSource !== "esp32") return;

    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        const res = await fetch(`${protocol}//${espRelayHost}/api/status`, {
          cache: "no-store",
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setEspStatus(data);
        } else {
          if (isMounted) setEspStatus(null);
        }
      } catch {
        if (isMounted) setEspStatus(null);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cameraSource, espRelayHost]);

  // Save captured photos to localStorage
  useEffect(() => {
    localStorage.setItem("iot_captured_photos", JSON.stringify(capturedPhotos));
  }, [capturedPhotos]);

  // Handle starting device webcam/phone camera
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    setErrorMsg(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Perangkat atau browser ini tidak mendukung akses kamera langsung.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Gagal mengakses kamera:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMsg("Izin kamera ditolak. Berikan izin kamera di browser untuk memantau tanaman langsung.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMsg("Tidak ada perangkat kamera yang terdeteksi di perangkat ini.");
      } else {
        setErrorMsg(err.message || "Gagal menghubungkan ke kamera lapangan.");
      }
      setIsCameraActive(false);
    }
  };

  // Stop device webcam stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start ESP32-CAM via WebSocket relay
  const startEspCamera = () => {
    setErrorMsg(null);
    stopEspCamera();

    try {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${espRelayHost}/ws/client`;
      const ws = new WebSocket(wsUrl);
      espWsRef.current = ws;
      ws.binaryType = "blob";

      ws.onopen = () => {
        console.log("WebSocket client terhubung ke relay:", wsUrl);
        ws.send(JSON.stringify({ action: "START" }));
        setIsCameraActive(true);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          if (espBlobUrlRef.current) {
            URL.revokeObjectURL(espBlobUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(event.data);
          espBlobUrlRef.current = blobUrl;
          if (espImgRef.current) {
            espImgRef.current.src = blobUrl;
          }

          fpsCountRef.current++;
          const now = Date.now();
          if (now - fpsTimerRef.current >= 1000) {
            setEspFps(fpsCountRef.current);
            fpsCountRef.current = 0;
            fpsTimerRef.current = now;
          }
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket Relay Error:", err);
        setErrorMsg(`Gagal terhubung ke Relay WebSocket (${espRelayHost}). Pastikan backend Node.js berjalan di port 5000.`);
        setIsCameraActive(false);
      };

      ws.onclose = () => {
        setIsCameraActive(false);
        setEspFps(0);
      };
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghubungkan ke ESP32 Relay");
      setIsCameraActive(false);
    }
  };

  // Stop ESP32 WebSocket relay stream
  const stopEspCamera = () => {
    if (espWsRef.current) {
      try {
        if (espWsRef.current.readyState === WebSocket.OPEN) {
          espWsRef.current.send(JSON.stringify({ action: "STOP" }));
        }
        espWsRef.current.close();
      } catch (e) {
        console.warn("Error closing espWs:", e);
      }
      espWsRef.current = null;
    }
    if (espBlobUrlRef.current) {
      URL.revokeObjectURL(espBlobUrlRef.current);
      espBlobUrlRef.current = null;
    }
    if (espImgRef.current) {
      espImgRef.current.src = "";
    }
    setEspFps(0);
    setIsCameraActive(false);
  };

  // Handle switching camera source
  const handleSwitchSource = (source: "device" | "esp32") => {
    if (source === cameraSource) return;
    setErrorMsg(null);
    if (isCameraActive) {
      if (cameraSource === "device") stopCamera();
      else stopEspCamera();
    }
    setCameraSource(source);
    localStorage.setItem("iot_camera_source", source);
  };

  const handleStartActiveCamera = () => {
    if (cameraSource === "device") {
      startCamera();
    } else {
      startEspCamera();
    }
  };

  const handleStopActiveCamera = () => {
    if (cameraSource === "device") {
      stopCamera();
    } else {
      stopEspCamera();
    }
  };

  // Switch between front & back camera (for device only)
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isCameraActive && cameraSource === "device") {
      startCamera(nextMode);
    }
  };

  // Run AI Vision Scan
  const runAIVisionScan = (customPresetKey?: string, capturedDataUrl?: string) => {
    setIsScanning(true);
    setActiveDiagnosis(null);

    // AI simulation delay with scanning effect
    setTimeout(() => {
      let chosenKey = customPresetKey || targetPreset;
      if (chosenKey === "auto") {
        // If auto, evaluate based on sensor environment & realistic agricultural probabilities
        if (sensorData.moisture > 78 && sensorData.ph < 6.0) {
          chosenKey = "daun_layu_fusarium";
        } else if (sensorData.moisture < 50) {
          chosenKey = "kutu_kebul";
        } else {
          const pestKeys = ["ulat_grayak", "kutu_kebul", "ulat_penggulung", "kutu_daun_aphids", "tanaman_sehat"];
          chosenKey = pestKeys[Math.floor(Math.random() * pestKeys.length)];
        }
      }

      const diagnosisResult = PEST_DATABASE[chosenKey] || PEST_DATABASE["ulat_grayak"];
      setActiveDiagnosis(diagnosisResult);
      setIsScanning(false);

      if (capturedDataUrl) {
        saveCapturedSnapshot(capturedDataUrl, diagnosisResult);
      }
    }, 1500);
  };

  // Save snapshot to history
  const saveCapturedSnapshot = (dataUrl: string, diagnosis?: PestDetectionResult) => {
    const nowStr = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const newPhoto: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: nowStr,
      moisture: sensorData.moisture,
      ph: sensorData.ph,
      diagnosis,
    };

    setCapturedPhotos((prev) => [newPhoto, ...prev.slice(0, 9)]);
  };

  // Capture snapshot from video/image feed (Device or ESP32)
  const takeSnapshotAndScan = () => {
    if (!isCameraActive) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (cameraSource === "device") {
      const video = videoRef.current;
      if (!video) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      const img = espImgRef.current;
      if (!img || !img.src) return;
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    // Watermark with sensor readings, timestamp, and source
    const nowStr = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    const bannerHeight = 44;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, canvas.height - bannerHeight, canvas.width, bannerHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px sans-serif";
    const srcTag = cameraSource === "esp32" ? "ESP32-CAM" : "Kamera HP";
    ctx.fillText(
      `💧 Kelembaban: ${sensorData.moisture.toFixed(1)}% | 🧪 pH: ${sensorData.ph.toFixed(1)} [${srcTag}]`,
      14,
      canvas.height - 18
    );

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#CBD5E1";
    const timeWidth = ctx.measureText(nowStr).width;
    ctx.fillText(nowStr, canvas.width - timeWidth - 14, canvas.height - 18);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    runAIVisionScan(undefined, dataUrl);
  };

  // Handle upload leaf image from device
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          runAIVisionScan(undefined, dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Cleanup camera streams on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopEspCamera();
    };
  }, []);

  const deletePhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCapturedPhotos((prev) => prev.filter((p) => p.id !== id));
    if (previewPhoto?.id === id) {
      setPreviewPhoto(null);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: "22px",
        padding: "20px 18px",
        boxShadow: "var(--glow-card)",
        border: "1px solid var(--border-card)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            className="no-invert"
            style={{
              background: isCameraActive ? "rgba(34, 197, 94, 0.15)" : "var(--bg-hover)",
              color: isCameraActive ? "#16A34A" : "var(--text-muted)",
              borderRadius: "14px",
              padding: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                Kamera AI Lapangan
              </h3>
              <span
                style={{
                  background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
                  color: "white",
                  fontSize: "10px",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "6px",
                }}
              >
                AI VISION
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Deteksi otomatis ulat, serangga, & daun layu
            </p>
          </div>
        </div>

        {/* Live Pill */}
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: isCameraActive ? "rgba(34, 197, 94, 0.15)" : "var(--bg-hover)",
            color: isCameraActive ? "#16A34A" : "var(--text-muted)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: isCameraActive ? "#22C55E" : "var(--text-muted)",
              boxShadow: isCameraActive ? "0 0 8px #22C55E" : "none",
            }}
          />
          {isCameraActive ? "LIVE" : "STANDBY"}
        </span>
      </div>

      {/* Camera Source Selector Tabs */}
      <div
        style={{
          display: "flex",
          background: "var(--bg-app)",
          borderRadius: "14px",
          padding: "4px",
          gap: "6px",
        }}
      >
        <button
          type="button"
          onClick={() => handleSwitchSource("device")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "none",
            fontSize: "12.5px",
            fontWeight: cameraSource === "device" ? 700 : 500,
            background: cameraSource === "device" ? "var(--bg-card)" : "transparent",
            color: cameraSource === "device" ? "#3B82F6" : "var(--text-muted)",
            boxShadow: cameraSource === "device" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Smartphone size={15} />
          <span>Kamera HP / Webcam</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchSource("esp32")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "none",
            fontSize: "12.5px",
            fontWeight: cameraSource === "esp32" ? 700 : 500,
            background: cameraSource === "esp32" ? "var(--bg-card)" : "transparent",
            color: cameraSource === "esp32" ? "#0EA5E9" : "var(--text-muted)",
            boxShadow: cameraSource === "esp32" ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <Radio size={15} />
          <span>ESP32-CAM (IoT)</span>
          {espStatus?.espOnline && (
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22C55E",
                boxShadow: "0 0 6px #22C55E",
              }}
            />
          )}
        </button>
      </div>

      {/* ESP32 Status & Relay Host Settings Bar */}
      {cameraSource === "esp32" && (
        <div
          style={{
            background: "rgba(14, 165, 233, 0.07)",
            border: "1px solid rgba(14, 165, 233, 0.22)",
            borderRadius: "14px",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 8px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  background:
                    espStatus === null
                      ? "rgba(239, 68, 68, 0.15)"
                      : espStatus.espOnline
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(234, 179, 8, 0.15)",
                  color:
                    espStatus === null
                      ? "#EF4444"
                      : espStatus.espOnline
                      ? "#16A34A"
                      : "#CA8A04",
                }}
              >
                {espStatus === null ? (
                  <>
                    <WifiOff size={12} /> Relay Offline
                  </>
                ) : espStatus.espOnline ? (
                  <>
                    <Wifi size={12} /> ESP32 Online
                  </>
                ) : (
                  <>
                    <Radio size={12} /> ESP32 Siaga
                  </>
                )}
              </span>

              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                {isCameraActive
                  ? `${espFps} FPS • ${espStatus?.activeViewers ?? 1} viewer`
                  : `Host: ${espRelayHost}`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowRelaySettings(!showRelaySettings)}
              title="Atur Host Relay Backend"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
              }}
            >
              <Settings size={13} />
              <span>Host</span>
            </button>
          </div>

          {/* Config Input collapsible */}
          {showRelaySettings && (
            <div
              style={{
                display: "flex",
                gap: "6px",
                paddingTop: "6px",
                borderTop: "1px dashed rgba(14, 165, 233, 0.2)",
              }}
            >
              <input
                type="text"
                value={customHostInput}
                onChange={(e) => setCustomHostInput(e.target.value)}
                placeholder="misal: localhost:5000 atau 192.168.1.50:5000"
                style={{
                  flex: 1,
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "8px",
                  padding: "5px 8px",
                  fontSize: "11px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const cleaned = customHostInput.trim() || "localhost:5000";
                  setEspRelayHost(cleaned);
                  localStorage.setItem("iot_esp_relay_host", cleaned);
                  setShowRelaySettings(false);
                }}
                style={{
                  background: "#0EA5E9",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Simpan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Target Simulation Filter / Quick Mode */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-app)",
          borderRadius: "12px",
          padding: "8px 12px",
          gap: "8px",
          fontSize: "12px",
        }}
      >
        <span style={{ color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
          <Scan size={14} color="#3B82F6" />
          Target Deteksi:
        </span>
        <select
          value={targetPreset}
          onChange={(e) => {
            setTargetPreset(e.target.value);
            if (e.target.value !== "auto") {
              runAIVisionScan(e.target.value);
            }
          }}
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-card)",
            borderRadius: "8px",
            padding: "4px 8px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="auto">⚡ Otomatis (Scan AI Pintar)</option>
          <option value="ulat_grayak">🐛 Ulat Grayak (Pengerat)</option>
          <option value="kutu_kebul">🪰 Kutu Kebul (Vektor Kuning)</option>
          <option value="ulat_penggulung">🍃 Ulat Penggulung Daun</option>
          <option value="kutu_daun_aphids">🦗 Kutu Daun (Aphids)</option>
          <option value="daun_layu_fusarium">🍂 Daun Layu (Fusarium/Bakteri)</option>
          <option value="tanaman_sehat">🌱 Tanaman Sehat Bebas Hama</option>
        </select>
      </div>

      {/* Camera Viewport / Stream Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: isCameraActive ? "260px" : "160px",
          background: "#0B1120",
          borderRadius: "18px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "height 0.3s ease",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.6)",
        }}
      >
        {/* Flash Effect on Capture */}
        {flashEffect && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "white",
              zIndex: 35,
              opacity: 0.9,
            }}
          />
        )}

        {/* Video Stream for Device/Webcam */}
        {cameraSource === "device" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: isCameraActive ? "block" : "none",
            }}
          />
        )}

        {/* Image Stream for ESP32-CAM (Binary JPEG over WebSocket) */}
        {cameraSource === "esp32" && (
          <img
            ref={espImgRef}
            alt="ESP32-CAM Live Feed"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: isCameraActive ? "block" : "none",
            }}
          />
        )}

        {/* Real-Time AI Scanner Crosshair & Bounding Box */}
        {isCameraActive && (
          <div
            style={{
              position: "absolute",
              inset: "20px",
              border: `2px dashed ${isScanning ? "#22C55E" : "rgba(96, 165, 250, 0.6)"}`,
              borderRadius: "14px",
              pointerEvents: "none",
              zIndex: 15,
              transition: "border-color 0.3s",
            }}
          >
            {/* Corner brackets */}
            <div style={{ position: "absolute", top: "-2px", left: "-2px", width: "16px", height: "16px", borderTop: "3px solid #3B82F6", borderLeft: "3px solid #3B82F6" }} />
            <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "16px", height: "16px", borderTop: "3px solid #3B82F6", borderRight: "3px solid #3B82F6" }} />
            <div style={{ position: "absolute", bottom: "-2px", left: "-2px", width: "16px", height: "16px", borderBottom: "3px solid #3B82F6", borderLeft: "3px solid #3B82F6" }} />
            <div style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px", borderBottom: "3px solid #3B82F6", borderRight: "3px solid #3B82F6" }} />

            {/* Target Label */}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.75)",
                padding: "3px 10px",
                borderRadius: "10px",
                fontSize: "10.5px",
                fontWeight: 700,
                color: "#60A5FA",
                whiteSpace: "nowrap",
                backdropFilter: "blur(4px)",
              }}
            >
              {isScanning ? "🔎 Memindai Tekstur Daun & Hama..." : "🎯 Arahkan ke Daun / Ulat / Serangga"}
            </div>
          </div>
        )}

        {/* Laser Scan Animation Line */}
        {isScanning && (
          <motion.div
            initial={{ top: "5%" }}
            animate={{ top: ["5%", "90%", "5%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              left: "10%",
              right: "10%",
              height: "3px",
              background: "linear-gradient(90deg, transparent, #22C55E, #4ADE80, transparent)",
              boxShadow: "0 0 14px #22C55E, 0 0 24px #4ADE80",
              zIndex: 25,
            }}
          />
        )}

        {/* Real-time Parameter Overlay during active camera */}
        {isCameraActive && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              background: "rgba(15, 23, 42, 0.78)",
              backdropFilter: "blur(6px)",
              padding: "5px 12px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 20,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Droplets size={13} color="#60A5FA" />
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "white" }}>
                {sensorData.moisture.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Activity size={13} color="#34D399" />
              <span style={{ fontSize: "11.5px", fontWeight: 700, color: "white" }}>
                pH {sensorData.ph.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Control: Front/Back camera toggle for Device, or Live FPS pill for ESP32 */}
        {isCameraActive && cameraSource === "device" && (
          <button
            type="button"
            onClick={toggleFacingMode}
            title="Ganti Kamera Depan/Belakang"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(15, 23, 42, 0.78)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <RefreshCw size={15} />
          </button>
        )}

        {isCameraActive && cameraSource === "esp32" && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(14, 165, 233, 0.3)",
              backdropFilter: "blur(6px)",
              borderRadius: "10px",
              padding: "4px 9px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              zIndex: 20,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#0EA5E9",
                boxShadow: "0 0 6px #0EA5E9",
              }}
            />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>
              ESP32 • {espFps} FPS
            </span>
          </div>
        )}

        {/* Inactive State / Placeholder */}
        {!isCameraActive && (
          <div style={{ textAlign: "center", padding: "16px", color: "#94A3B8" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
              }}
            >
              {cameraSource === "esp32" ? (
                <Radio size={24} color="#38BDF8" strokeWidth={1.8} />
              ) : (
                <Camera size={24} color="#CBD5E1" strokeWidth={1.8} />
              )}
            </div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#E2E8F0", margin: "0 0 3px" }}>
              {cameraSource === "esp32" ? "Kamera ESP32-CAM Siaga" : "Kamera Lapangan Siaga"}
            </p>
            <p style={{ fontSize: "11.5px", color: "#94A3B8", margin: 0 }}>
              {cameraSource === "esp32"
                ? "Klik 'Hubungkan ESP32-CAM' untuk memicu kamera via MQTT & streaming on-demand"
                : "Aktifkan kamera untuk deteksi hama langsung atau unggah foto sampel"}
            </p>
          </div>
        )}
      </div>

      {/* Error message if camera permission blocked or relay error */}
      {errorMsg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            fontSize: "12px",
            color: "#EF4444",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {!isCameraActive ? (
          <>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleStartActiveCamera}
              style={{
                flex: 1.5,
                background: cameraSource === "esp32" ? "#0EA5E9" : "#3B82F6",
                color: "white",
                border: "none",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow:
                  cameraSource === "esp32"
                    ? "0 4px 14px rgba(14, 165, 233, 0.35)"
                    : "var(--glow-primary)",
              }}
            >
              {cameraSource === "esp32" ? (
                <>
                  <Radio size={18} strokeWidth={2.2} />
                  Hubungkan ESP32-CAM
                </>
              ) : (
                <>
                  <Camera size={18} strokeWidth={2.2} />
                  Buka Kamera Lapangan
                </>
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                background: "var(--bg-hover)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-card)",
                borderRadius: "14px",
                padding: "12px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Upload size={16} />
              Unggah Foto
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={takeSnapshotAndScan}
              disabled={isScanning}
              style={{
                flex: 1.8,
                background: isScanning ? "#16A34A" : "#22C55E",
                color: "white",
                border: "none",
                borderRadius: "14px",
                padding: "12px 14px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "var(--glow-success)",
                opacity: isScanning ? 0.75 : 1,
              }}
            >
              <Scan size={17} strokeWidth={2.2} />
              {isScanning ? "Menganalisis..." : "Pindai Hama AI & Ambil Foto"}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStopActiveCamera}
              style={{
                flex: 1,
                background: "var(--bg-hover)",
                color: "var(--text-secondary)",
                border: "none",
                borderRadius: "14px",
                padding: "12px 14px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <CameraOff size={16} />
              Tutup
            </motion.button>
          </>
        )}
      </div>

      {/* Live AI Diagnosis Card (When detection is triggered) */}
      <AnimatePresence>
        {activeDiagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background:
                activeDiagnosis.severity === "Kritis"
                  ? "rgba(239, 68, 68, 0.08)"
                  : activeDiagnosis.severity === "Tinggi"
                  ? "rgba(249, 115, 22, 0.08)"
                  : activeDiagnosis.severity === "Waspada"
                  ? "rgba(234, 179, 8, 0.08)"
                  : "rgba(34, 197, 94, 0.08)",
              border: `1.5px solid ${
                activeDiagnosis.severity === "Kritis"
                  ? "#F87171"
                  : activeDiagnosis.severity === "Tinggi"
                  ? "#FB923C"
                  : activeDiagnosis.severity === "Waspada"
                  ? "#FACC15"
                  : "#4ADE80"
              }`,
              borderRadius: "18px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Header Diagnosis */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <div
                  style={{
                    background:
                      activeDiagnosis.severity === "Aman" ? "#22C55E" : "#EF4444",
                    color: "white",
                    borderRadius: "12px",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeDiagnosis.severity === "Aman" ? (
                    <ShieldCheck size={22} />
                  ) : (
                    <Bug size={22} />
                  )}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: "rgba(15, 23, 42, 0.1)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {activeDiagnosis.category}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background:
                          activeDiagnosis.severity === "Kritis"
                            ? "#DC2626"
                            : activeDiagnosis.severity === "Tinggi"
                            ? "#EA580C"
                            : activeDiagnosis.severity === "Waspada"
                            ? "#D97706"
                            : "#16A34A",
                        color: "white",
                      }}
                    >
                      Tingkat: {activeDiagnosis.severity}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563EB" }}>
                      Akurasi AI: {activeDiagnosis.confidence}%
                    </span>
                  </div>
                  <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0 0" }}>
                    {activeDiagnosis.name}
                  </h4>
                  <p style={{ fontSize: "12px", fontStyle: "italic", color: "var(--text-muted)", margin: "1px 0 0" }}>
                    {activeDiagnosis.scientificName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveDiagnosis(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Gejala Klinis */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "14px",
                padding: "12px 14px",
                border: "1px solid var(--border-card)",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertTriangle size={14} color="#EA580C" />
                Gejala Klinis Teridentifikasi di Lapangan:
              </p>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {activeDiagnosis.symptoms.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* ⚡ TINDAKAN SEGERA (Immediate Action) */}
            <div
              style={{
                background: "#FEF2F2",
                borderRadius: "14px",
                padding: "14px",
                border: "1px solid #FECACA",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ background: "#DC2626", color: "white", borderRadius: "8px", padding: "4px", display: "flex" }}>
                  <ShieldAlert size={14} />
                </div>
                <h5 style={{ fontSize: "13px", fontWeight: 800, color: "#991B1B", margin: 0 }}>
                  Apa yang Harus Dilakukan Sekarang (Tindakan Cepat):
                </h5>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activeDiagnosis.immediateActions.map((action, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span
                      style={{
                        background: "#EF4444",
                        color: "white",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: "12.5px", color: "#7F1D1D", lineHeight: 1.45, fontWeight: 500 }}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 🛡️ SOLUSI PENCEGAHAN JANGKA PANJANG (Prevention Solution) */}
            <div
              style={{
                background: "#F0FDF4",
                borderRadius: "14px",
                padding: "14px",
                border: "1px solid #BBF7D0",
              }}
            >
              <div
                onClick={() => setExpandPrevention(!expandPrevention)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  marginBottom: expandPrevention ? "8px" : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "#16A34A", color: "white", borderRadius: "8px", padding: "4px", display: "flex" }}>
                    <ShieldCheck size={14} />
                  </div>
                  <h5 style={{ fontSize: "13px", fontWeight: 800, color: "#166534", margin: 0 }}>
                    Jalan Keluar & Strategi Pencegahan Kembali:
                  </h5>
                </div>
                {expandPrevention ? <ChevronUp size={16} color="#166534" /> : <ChevronDown size={16} color="#166534" />}
              </div>

              {expandPrevention && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {activeDiagnosis.preventionSolutions.map((prev, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ fontSize: "12.5px", color: "#14532D", lineHeight: 1.45 }}>
                        {prev}
                      </span>
                    </div>
                  ))}

                  {/* Ramuan Organik */}
                  <div
                    style={{
                      marginTop: "8px",
                      background: "rgba(255,255,255,0.8)",
                      borderRadius: "10px",
                      padding: "10px",
                      border: "1px dashed #86EFAC",
                    }}
                  >
                    <p style={{ fontSize: "11.5px", fontWeight: 700, color: "#166534", margin: "0 0 3px" }}>
                      🌿 Rekomendasi Biopestisida Ramah Lingkungan:
                    </p>
                    <p style={{ fontSize: "12px", color: "#15803D", margin: 0 }}>
                      {activeDiagnosis.organicTreatment}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Korelasi dengan Parameter Sensor (Kelembaban & pH) */}
            <div
              style={{
                background: "var(--bg-app)",
                borderRadius: "12px",
                padding: "10px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                border: "1px solid var(--border-card)",
              }}
            >
              <Info size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                <strong>Analisis Sensor IoT:</strong> {activeDiagnosis.sensorCorrelation} (Kondisi saat ini: Kelembaban {sensorData.moisture.toFixed(1)}%, pH {sensorData.ph.toFixed(1)}).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Captured Photos Gallery with Diagnosis Badges */}
      {capturedPhotos.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
              Dokumentasi Foto & Hasil Deteksi ({capturedPhotos.length})
            </span>
            <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>
              Tersimpan Otomatis
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              paddingBottom: "8px",
            }}
          >
            {capturedPhotos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => {
                  setPreviewPhoto(photo);
                  if (photo.diagnosis) {
                    setActiveDiagnosis(photo.diagnosis);
                  }
                }}
                style={{
                  position: "relative",
                  width: "110px",
                  height: "90px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  flexShrink: 0,
                  cursor: "pointer",
                  border: "1.5px solid var(--border-card)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <img
                  src={photo.dataUrl}
                  alt="Sampel Lapangan"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {/* Diagnosis badge on top */}
                {photo.diagnosis && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      right: 4,
                      background:
                        photo.diagnosis.severity === "Kritis"
                          ? "rgba(220, 38, 38, 0.85)"
                          : photo.diagnosis.severity === "Tinggi"
                          ? "rgba(234, 88, 12, 0.85)"
                          : photo.diagnosis.severity === "Waspada"
                          ? "rgba(202, 138, 4, 0.85)"
                          : "rgba(22, 163, 74, 0.85)",
                      color: "white",
                      fontSize: "8.5px",
                      fontWeight: 700,
                      padding: "2px 4px",
                      borderRadius: "6px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: "center",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    {photo.diagnosis.name.split(" ")[0]}
                  </div>
                )}

                {/* Bottom Sensor info */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    insetInline: 0,
                    background: "rgba(15,23,42,0.85)",
                    padding: "2px 6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#34D399" }}>
                    pH {photo.ph.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#60A5FA" }}>
                    {photo.moisture.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewPhoto(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              backdropFilter: "blur(6px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-card)",
                borderRadius: "20px",
                overflow: "hidden",
                width: "100%",
                maxWidth: "400px",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--border-card)",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>
                    Detail Foto Sampel & AI
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-muted)" }}>
                    {previewPhoto.timestamp} • Kelembaban: {previewPhoto.moisture.toFixed(1)}% • pH: {previewPhoto.ph.toFixed(1)}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  style={{
                    background: "var(--bg-hover)",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: "12px", background: "#0F172A" }}>
                <img
                  src={previewPhoto.dataUrl}
                  alt="Detail Sampel"
                  style={{
                    width: "100%",
                    maxHeight: "280px",
                    borderRadius: "12px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>

              {/* Diagnosis info inside preview if exists */}
              {previewPhoto.diagnosis && (
                <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-card)", background: "var(--bg-app)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <Bug size={14} color="#EA580C" />
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>
                      {previewPhoto.diagnosis.name}
                    </span>
                  </div>
                  <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", margin: 0 }}>
                    Tingkat: <strong>{previewPhoto.diagnosis.severity}</strong> • Resep: {previewPhoto.diagnosis.organicTreatment}
                  </p>
                </div>
              )}

              <div style={{ padding: "14px 18px", display: "flex", gap: "10px" }}>
                <a
                  href={previewPhoto.dataUrl}
                  download={`Foto_Sampel_${previewPhoto.id}.jpg`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    background: "#3B82F6",
                    color: "white",
                    padding: "10px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <Download size={15} />
                  Simpan Foto
                </a>

                <button
                  onClick={() => deletePhoto(previewPhoto.id)}
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "#EF4444",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Trash2 size={15} />
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

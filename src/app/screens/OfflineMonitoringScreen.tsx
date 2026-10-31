import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Usb,
  Wifi,
  WifiOff,
  RefreshCw,
  Droplets,
  Thermometer,
  Activity,
  FlaskConical,
  Sprout,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  CloudUpload,
  Layers,
  Sparkles,
  Radio,
  Sliders,
  Trash2,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BottomNav } from "../components/BottomNav";
import {
  ArduinoSerialPacket,
  OfflineSensorRecord,
  SerialConnectionStatus,
  SyncStatus,
} from "../types/sensor";
import {
  webSerialService,
} from "../services/webSerialService";
import {
  openDatabase,
  saveSensorRecord,
  getOfflineRecords,
  getSyncStats,
  generateRecordId,
  clearAllLocalRecords,
} from "../services/indexedDbService";
import {
  syncOfflineDataToFirebase,
  setupAutoSyncListener,
  isBrowserOnline,
} from "../services/syncService";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  hapticWarning,
} from "../services/hapticsService";

export function OfflineMonitoringScreen() {
  const navigate = useNavigate();

  // Koneksi Serial
  const [isSupported, setIsSupported] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<SerialConnectionStatus>("disconnected");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [usbMetadata, setUsbMetadata] = useState<{ vendor?: string; product?: string }>({});

  // Pilihan Hardware Target: "arduino_uno" (sementara) vs "esp32" (permanen)
  const [targetHardware, setTargetHardware] = useState<"arduino_uno" | "esp32">(() => {
    const saved = localStorage.getItem("iot_target_hardware");
    return (saved as "arduino_uno" | "esp32") || "arduino_uno";
  });

  // Status Jaringan
  const [online, setOnline] = useState<boolean>(() => isBrowserOnline());

  // Data Sensor
  const [latestData, setLatestData] = useState<ArduinoSerialPacket | null>(null);
  const [records, setRecords] = useState<OfflineSensorRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, local: 0, pending: 0, synced: 0, failed: 0 });

  // Sinkronisasi
  // Sinkronisasi & Mode Kerja (Kunci Lokal vs Auto-Sync)
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Kebijakan Sinkronisasi:
  // "offline_local" = Mode Offline: Internet laptop tidak perlu dimatikan, data HANYA disimpan di IndexedDB lokal.
  // "auto_sync"     = Mode Online: Data baru otomatis diunggah ke Firebase saat diterima jika internet ada.
  const [syncPolicy, setSyncPolicy] = useState<"offline_local" | "auto_sync">(() => {
    const saved = localStorage.getItem("iot_sync_policy");
    return (saved as "offline_local" | "auto_sync") || "offline_local";
  });

  // Filter Grafik (Kelembaban, Suhu, pH)
  const [selectedMetric, setSelectedMetric] = useState<"moisture" | "temperature" | "ph">("moisture");

  // Load awal & cek dukungan Web Serial
  useEffect(() => {
    const supported = webSerialService.isSupported();
    setIsSupported(supported);
    if (!supported) {
      setConnectionStatus("unsupported");
    }

    // Refresh statistik & data riwayat awal dari IndexedDB
    refreshData();

    // Event listener jaringan online/offline
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Setup listener auto sync saat internet pulih (hanya aktif jika policy === auto_sync)
    const cleanupAutoSync = setupAutoSyncListener((result) => {
      const currentPolicy = localStorage.getItem("iot_sync_policy") || "offline_local";
      if (currentPolicy === "auto_sync") {
        setToastMessage(result.message);
        refreshData();
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      cleanupAutoSync();
    };
  }, []);

  // Simpan preferensi syncPolicy
  useEffect(() => {
    localStorage.setItem("iot_sync_policy", syncPolicy);
  }, [syncPolicy]);

  // Fungsi reload data dari IndexedDB
  const refreshData = useCallback(async () => {
    try {
      await openDatabase();
      const [allRecords, currentStats] = await Promise.all([
        getOfflineRecords({ limit: 50 }),
        getSyncStats(),
      ]);
      setRecords(allRecords);
      setStats(currentStats);
      if (allRecords.length > 0 && !latestData) {
        const top = allRecords[0];
        setLatestData({
          slaveId: top.slaveId,
          moisture: top.moisture,
          temperature: top.temperature,
          ec: top.ec,
          ph: top.ph,
          nitrogen: top.nitrogen,
          phosphorus: top.phosphorus,
          potassium: top.potassium,
          status: top.status,
          timestamp: top.timestamp,
        });
      }
    } catch (e) {
      console.error("Gagal memuat data dari IndexedDB:", e);
    }
  }, [latestData]);

  // Callback penanganan data serial
  useEffect(() => {
    webSerialService.setCallbacks({
      onData: async (packet) => {
        setLatestData(packet);

        // Buat record baru untuk IndexedDB
        const newRecord: OfflineSensorRecord = {
          id: generateRecordId(packet.timestamp || Date.now()),
          timestamp: packet.timestamp || Date.now(),
          slaveId: packet.slaveId || 4,
          moisture: packet.moisture,
          temperature: packet.temperature,
          ec: packet.ec,
          ph: packet.ph,
          nitrogen: packet.nitrogen,
          phosphorus: packet.phosphorus,
          potassium: packet.potassium,
          status: packet.status as any,
          syncStatus: "local",
          syncedAt: null,
        };

        try {
          await saveSensorRecord(newRecord);
          // Tambahkan ke state lokal UI
          setRecords((prev) => [newRecord, ...prev.slice(0, 49)]);
          setStats((prev) => ({
            ...prev,
            total: prev.total + 1,
            local: prev.local + 1,
          }));

          // HANYA auto-sync jika pengguna secara eksplisit memilih mode "auto_sync"
          if (syncPolicy === "auto_sync" && isBrowserOnline()) {
            syncOfflineDataToFirebase().then((res) => {
              if (res.successCount > 0) {
                refreshData();
              }
            });
          }
        } catch (err) {
          console.error("Gagal menyimpan data serial ke IndexedDB:", err);
        }
      },
      onStatusChange: (status, errorMsg) => {
        setConnectionStatus(status);
        if (errorMsg) {
          setStatusMessage(errorMsg);
        }
        if (status === "connected") {
          const meta = webSerialService.getPortMetadata();
          setUsbMetadata({
            vendor: meta.usbVendorId,
            product: meta.usbProductId,
          });
        }
      },
    });
  }, [syncPolicy, refreshData]);

  // Handler Hubungkan Arduino
  const handleConnect = async () => {
    hapticMedium();
    setStatusMessage(null);
    const success = await webSerialService.connect(baudRate);
    if (success) {
      hapticSuccess();
      setToastMessage("Berhasil terhubung ke Arduino via USB Serial.");
    }
  };

  // Handler Putuskan Arduino
  const handleDisconnect = async () => {
    hapticLight();
    await webSerialService.disconnect("Koneksi diputuskan oleh pengguna.");
    setToastMessage("Koneksi USB Serial telah diputuskan.");
  };

  // Handler Sinkronisasi Manual
  const handleManualSync = async () => {
    if (isSyncing) return;
    hapticMedium();

    if (!online) {
      hapticWarning();
      setToastMessage("Internet tidak tersedia. Sambungkan laptop ke internet untuk sinkronisasi.");
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: stats.local + stats.failed });

    try {
      const res = await syncOfflineDataToFirebase((processed, total) => {
        setSyncProgress({ current: processed, total });
      });

      if (res.successCount > 0) {
        hapticSuccess();
      } else if (res.failedCount > 0) {
        hapticWarning();
      }

      setToastMessage(res.message);
      await refreshData();
    } catch (e: any) {
      console.error("Manual sync error:", e);
      setToastMessage(`Gagal sinkronisasi: ${e.message || "Kesalahan jaringan"}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Handler Hapus Data Lokal
  const handleClearLocal = async () => {
    if (window.confirm("Hapus seluruh data riwayat lokal di IndexedDB? (Data yang sudah tersinkron ke Firebase tidak akan terpengaruh)")) {
      hapticWarning();
      await clearAllLocalRecords();
      await refreshData();
      setLatestData(null);
      setToastMessage("Penyimpanan IndexedDB lokal berhasil dikosongkan.");
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Siapkan data untuk Recharts
  const chartData = useMemo(() => {
    // Balik urutan agar kronologis (kiri lama, kanan terbaru)
    return [...records]
      .reverse()
      .slice(-20)
      .map((r) => {
        const d = new Date(r.timestamp);
        const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
        return {
          time: timeStr,
          moisture: r.moisture,
          temperature: r.temperature,
          ph: r.ph,
          ec: r.ec,
          n: r.nitrogen,
          p: r.phosphorus,
          k: r.potassium,
          status: r.status,
        };
      });
  }, [records]);

  // Helper badge status sinkronisasi
  const renderSyncBadge = (status: SyncStatus) => {
    switch (status) {
      case "synced":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "rgba(34, 197, 94, 0.15)",
              color: "#16A34A",
            }}
          >
            <CheckCircle2 size={12} /> Tersinkron
          </span>
        );
      case "pending":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "rgba(234, 179, 8, 0.15)",
              color: "#CA8A04",
            }}
          >
            <Clock size={12} className="animate-spin" /> Mengirim
          </span>
        );
      case "failed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "rgba(239, 68, 68, 0.15)",
              color: "#DC2626",
            }}
          >
            <AlertTriangle size={12} /> Gagal
          </span>
        );
      case "local":
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: 600,
              background: "rgba(59, 130, 246, 0.15)",
              color: "#2563EB",
            }}
          >
            <Database size={12} /> Lokal
          </span>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "90px",
      }}
    >
      {/* Top App Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 20px 16px",
          background: "var(--bg-card)",
          boxShadow: "var(--glow-card)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              hapticLight();
              navigate(-1);
            }}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "var(--bg-hover)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "19px", fontWeight: 700, color: "var(--text-heading)" }}>
                Monitoring Offline
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "6px",
                  background: "#DBEAFE",
                  color: "#1E40AF",
                  letterSpacing: "0.5px",
                }}
              >
                USB SERIAL
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Modbus RTU RS485 • Slave ID 4
            </p>
          </div>
        </div>

        {/* Status Mode Kerja & Jaringan Laptop */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "10px",
              background: syncPolicy === "offline_local" ? "rgba(59, 130, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
              color: syncPolicy === "offline_local" ? "#2563EB" : "#16A34A",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            {syncPolicy === "offline_local" ? "Mode Offline" : "Auto-Sync"}
          </span>

          <div
            title={online ? "Koneksi internet laptop aktif" : "Koneksi internet laptop terputus"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              borderRadius: "10px",
              background: online ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: online ? "#16A34A" : "#EF4444",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{online ? "Net OK" : "No Net"}</span>
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Peringatan Browser jika Web Serial API tidak didukung */}
        {!isSupported && (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "14px",
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
              <strong style={{ display: "block", fontSize: "13px", marginBottom: "2px" }}>
                Browser Tidak Mendukung Web Serial API
              </strong>
              Fitur baca USB Serial membutuhkan Google Chrome, Microsoft Edge, atau Opera di Laptop/Komputer Desktop.
            </div>
          </div>
        )}

        {/* Kartu Koneksi Hardware USB (Arduino Uno R3 / ESP32) */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "18px",
            padding: "16px",
            boxShadow: "var(--glow-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Switcher Perangkat: Arduino Uno R3 vs ESP32 */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-hover)",
              padding: "4px",
              borderRadius: "12px",
              marginBottom: "12px",
              gap: "4px",
            }}
          >
            <button
              onClick={() => {
                hapticLight();
                setTargetHardware("arduino_uno");
                localStorage.setItem("iot_target_hardware", "arduino_uno");
                setToastMessage("Target Hardware: Arduino Uno R3 (SoftwareSerial D2/D3)");
              }}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: "9px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: targetHardware === "arduino_uno" ? "var(--bg-card)" : "transparent",
                color: targetHardware === "arduino_uno" ? "#2563EB" : "var(--text-muted)",
                boxShadow: targetHardware === "arduino_uno" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              <span>🤖 Arduino Uno (Uji Coba)</span>
            </button>

            <button
              onClick={() => {
                hapticLight();
                setTargetHardware("esp32");
                localStorage.setItem("iot_target_hardware", "esp32");
                setBaudRate(115200);
                setToastMessage("Target Hardware: ESP32 Dev Module (Hardware UART2 GPIO 16/17)");
              }}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: "9px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: targetHardware === "esp32" ? "var(--bg-card)" : "transparent",
                color: targetHardware === "esp32" ? "#16A34A" : "var(--text-muted)",
                boxShadow: targetHardware === "esp32" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              <span>🚀 ESP32 Dev (Permanen)</span>
            </button>
          </div>

          {/* Panduan Pinout Cepat sesuai Perangkat Aktif */}
          {targetHardware === "esp32" ? (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(22, 163, 74, 0.08)",
                fontSize: "11px",
                color: "#16A34A",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
                lineHeight: "1.4",
              }}
            >
              <Cpu size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Mode ESP32:</strong> Gunakan baud 115200. MAX485 RO ➔ GPIO16 (RX2), DI ➔ GPIO17 (TX2), DE/RE ➔ GPIO4.
              </span>
            </div>
          ) : (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(37, 99, 235, 0.08)",
                fontSize: "11px",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "12px",
                lineHeight: "1.4",
              }}
            >
              <Usb size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Mode Arduino Uno:</strong> Baud rate 115200. MAX485 RO ➔ D2 (RX), DI ➔ D3 (TX), DE/RE ➔ D4.
              </span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: connectionStatus === "connected" ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)",
                  color: connectionStatus === "connected" ? "#16A34A" : "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {targetHardware === "esp32" ? <Cpu size={18} /> : <Usb size={18} />}
              </div>
              <div>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-heading)" }}>
                  {targetHardware === "esp32" ? "Port USB ESP32 Dev Module" : "Port USB Arduino Uno R3"}
                </span>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "1px 0 0" }}>
                  Baud: {baudRate} bps • {targetHardware === "esp32" ? "UART2 HW Serial" : "SoftwareSerial D2/D3"}
                </p>
              </div>
            </div>

            {/* Status Koneksi Badge */}
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background:
                  connectionStatus === "connected"
                    ? "rgba(34, 197, 94, 0.15)"
                    : connectionStatus === "connecting"
                    ? "rgba(234, 179, 8, 0.15)"
                    : "rgba(100, 116, 139, 0.15)",
                color:
                  connectionStatus === "connected"
                    ? "#16A34A"
                    : connectionStatus === "connecting"
                    ? "#CA8A04"
                    : "var(--text-muted)",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background:
                    connectionStatus === "connected"
                      ? "#22C55E"
                      : connectionStatus === "connecting"
                      ? "#EAB308"
                      : "#94A3B8",
                }}
              />
              {connectionStatus === "connected"
                ? "Terhubung"
                : connectionStatus === "connecting"
                ? "Menghubungkan..."
                : "Terputus"}
            </span>
          </div>

          {/* Opsi Baud Rate & Tombol Aksi */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={baudRate}
              disabled={connectionStatus === "connected"}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                cursor: connectionStatus === "connected" ? "not-allowed" : "pointer",
              }}
            >
              <option value={115200}>115200 Baud (Rekomendasi)</option>
              <option value={9600}>9600 Baud</option>
              <option value={4800}>4800 Baud</option>
            </select>

            {connectionStatus !== "connected" ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                disabled={!isSupported || connectionStatus === "connecting"}
                onClick={handleConnect}
                style={{
                  flex: 1.4,
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: isSupported ? "#2563EB" : "#94A3B8",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: isSupported ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: isSupported ? "0px 4px 12px rgba(37, 99, 235, 0.25)" : "none",
                }}
              >
                {connectionStatus === "connecting" ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Membuka Port...</span>
                  </>
                ) : (
                  <>
                    <Usb size={15} />
                    <span>Hubungkan Arduino</span>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleDisconnect}
                style={{
                  flex: 1.4,
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>Putuskan Koneksi</span>
              </motion.button>
            )}
          </div>

          {statusMessage && (
            <p
              style={{
                fontSize: "11px",
                color: connectionStatus === "error" ? "#EF4444" : "var(--text-muted)",
                margin: "10px 0 0",
                lineHeight: "1.4",
              }}
            >
              {statusMessage}
            </p>
          )}

          {connectionStatus === "connected" && usbMetadata.vendor && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "var(--bg-hover)",
                fontSize: "11px",
                color: "var(--text-muted)",
                display: "flex",
                gap: "12px",
              }}
            >
              <span>Vendor ID: <strong>{usbMetadata.vendor}</strong></span>
              {usbMetadata.product && <span>Product ID: <strong>{usbMetadata.product}</strong></span>}
            </div>
          )}
        </div>

        {/* Realtime 7-in-1 Soil Sensor Card */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "18px",
            padding: "18px",
            boxShadow: "var(--glow-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sprout size={18} color="#16A34A" />
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-heading)" }}>
                Nilai Sensor Tanah (3 Parameter Aktif)
              </span>
            </div>

            {latestData && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: latestData.status === "OK" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: latestData.status === "OK" ? "#16A34A" : "#EF4444",
                  fontWeight: 600,
                }}
              >
                {latestData.status === "OK" ? "Status: Normal" : `Modbus Error (${latestData.status})`}
              </span>
            )}
          </div>

          {/* Alert jika terjadi kegagalan modbus */}
          {latestData?.status === "MODBUS_ERROR" && (
            <div
              style={{
                marginBottom: "14px",
                padding: "10px 12px",
                borderRadius: "10px",
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                fontSize: "12px",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>Komunikasi RS485 Modbus timeout. Periksa kabel D2/D3, power 12V sensor, atau Slave ID 4.</span>
            </div>
          )}

          {/* Grid 3 Parameter Utama: Kelembaban, Suhu, dan pH */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
            {/* Kelembaban */}
            <div
              style={{
                background: "var(--bg-hover)",
                padding: "14px 12px",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3B82F6" }}>
                <Droplets size={17} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Kelembaban</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-heading)" }}>
                {latestData ? `${latestData.moisture.toFixed(1)}%` : "--"}
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Rentang ideal: 60 - 80%</span>
            </div>

            {/* Suhu Tanah */}
            <div
              style={{
                background: "var(--bg-hover)",
                padding: "14px 12px",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F97316" }}>
                <Thermometer size={17} />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>Suhu Tanah</span>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-heading)" }}>
                {latestData ? `${latestData.temperature.toFixed(1)}°C` : "--"}
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Rentang ideal: 22 - 30°C</span>
            </div>

            {/* pH Tanah (Full Width) */}
            <div
              style={{
                gridColumn: "1 / -1",
                background: "var(--bg-hover)",
                padding: "14px 16px",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8B5CF6", marginBottom: "4px" }}>
                  <FlaskConical size={17} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>pH Tanah (Keasaman)</span>
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--text-heading)" }}>
                  {latestData ? latestData.ph.toFixed(2) : "--"}
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {latestData
                    ? latestData.ph < 6.0
                      ? "Masam (Asam)"
                      : latestData.ph > 7.5
                      ? "Basa (Alkalin)"
                      : "Netral (Ideal untuk perakaran)"
                    : "Rentang netral ideal: 6.0 - 7.5"}
                </span>
              </div>

              {/* Status Badge pH */}
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: "10px",
                  background:
                    latestData && latestData.ph >= 6.0 && latestData.ph <= 7.5
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(139, 92, 246, 0.15)",
                  color:
                    latestData && latestData.ph >= 6.0 && latestData.ph <= 7.5
                      ? "#16A34A"
                      : "#8B5CF6",
                  fontSize: "11px",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {latestData
                  ? latestData.ph < 6.0
                    ? "Perlu Pengapuran"
                    : latestData.ph > 7.5
                    ? "Tinggi (Basa)"
                    : "✓ Kondisi Prima"
                  : "pH, Air & Suhu"}
              </div>
            </div>
          </div>

          {/* Status Pembacaan Terakhir */}
          {latestData?.timestamp && (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "10px 0 0", textAlign: "right" }}>
              Terakhir diperbarui: {new Date(latestData.timestamp).toLocaleTimeString("id-ID")} WIB
            </p>
          )}
        </div>

        {/* Panel Kontrol & Statistik Sinkronisasi Firebase */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "18px",
            padding: "16px",
            boxShadow: "var(--glow-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Database size={18} color="#2563EB" />
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-heading)" }}>
                Penyimpanan & Sinkronisasi
              </span>
            </div>
          </div>

          {/* Pemilih Mode Kerja: Mode Offline (Simpan Lokal) vs Mode Online (Auto-Sync) */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-hover)",
              padding: "4px",
              borderRadius: "12px",
              marginBottom: "12px",
              gap: "4px",
            }}
          >
            <button
              onClick={() => {
                hapticLight();
                setSyncPolicy("offline_local");
                localStorage.setItem("iot_sync_policy", "offline_local");
                setToastMessage("Mode Offline Aktif: Data HANYA disimpan di IndexedDB lokal (tanpa perlu mematikan Wi-Fi laptop).");
              }}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: "9px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: syncPolicy === "offline_local" ? "var(--bg-card)" : "transparent",
                color: syncPolicy === "offline_local" ? "#2563EB" : "var(--text-muted)",
                boxShadow: syncPolicy === "offline_local" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              <Database size={13} />
              <span>Mode Offline (Simpan Lokal)</span>
            </button>

            <button
              onClick={() => {
                hapticLight();
                setSyncPolicy("auto_sync");
                localStorage.setItem("iot_sync_policy", "auto_sync");
                setToastMessage("Auto-Sync Cloud Aktif: Data baru otomatis diunggah ke Firebase.");
              }}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: "9px",
                border: "none",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                background: syncPolicy === "auto_sync" ? "var(--bg-card)" : "transparent",
                color: syncPolicy === "auto_sync" ? "#16A34A" : "var(--text-muted)",
                boxShadow: syncPolicy === "auto_sync" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                transition: "all 0.2s ease",
              }}
            >
              <CloudUpload size={13} />
              <span>Auto-Sync Cloud</span>
            </button>
          </div>

          {/* Informasi Khusus: Tanpa perlu mematikan Wi-Fi */}
          {syncPolicy === "offline_local" && (
            <div
              style={{
                marginBottom: "12px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "rgba(59, 130, 246, 0.08)",
                fontSize: "11px",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                lineHeight: "1.4",
              }}
            >
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>
                Wi-Fi laptop tetap aktif normal. Semua data sensor tersimpan di IndexedDB lokal sampai Anda klik tombol "Sinkronkan".
              </span>
            </div>
          )}

          {/* Kartu Ringkasan Status Record */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
            <div style={{ background: "var(--bg-hover)", padding: "8px 6px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Total</span>
              <strong style={{ fontSize: "15px", color: "var(--text-heading)" }}>{stats.total}</strong>
            </div>
            <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "8px 6px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#2563EB", display: "block" }}>Lokal</span>
              <strong style={{ fontSize: "15px", color: "#2563EB" }}>{stats.local}</strong>
            </div>
            <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "8px 6px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#16A34A", display: "block" }}>Synced</span>
              <strong style={{ fontSize: "15px", color: "#16A34A" }}>{stats.synced}</strong>
            </div>
            <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: "8px 6px", borderRadius: "10px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "#DC2626", display: "block" }}>Gagal</span>
              <strong style={{ fontSize: "15px", color: "#DC2626" }}>{stats.failed}</strong>
            </div>
          </div>

          {/* Tombol Sinkronisasi Manual */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={isSyncing || (stats.local === 0 && stats.failed === 0)}
            onClick={handleManualSync}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: stats.local + stats.failed > 0 && online ? "#16A34A" : "var(--bg-hover)",
              color: stats.local + stats.failed > 0 && online ? "#FFFFFF" : "var(--text-muted)",
              border: "none",
              fontWeight: 600,
              fontSize: "13px",
              cursor: stats.local + stats.failed > 0 && online && !isSyncing ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: stats.local + stats.failed > 0 && online ? "0px 4px 12px rgba(22, 163, 74, 0.25)" : "none",
            }}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>
                  Mengirim ke Firebase {syncProgress ? `(${syncProgress.current}/${syncProgress.total})` : "..."}
                </span>
              </>
            ) : (
              <>
                <CloudUpload size={16} />
                <span>
                  {stats.local + stats.failed > 0
                    ? `Sinkronkan ${stats.local + stats.failed} Data ke Firebase`
                    : "Semua Data Sudah Tersinkron"}
                </span>
              </>
            )}
          </motion.button>
        </div>

        {/* Grafik Riwayat Sensor (Recharts) */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "18px",
            padding: "16px",
            boxShadow: "var(--glow-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-heading)" }}>
              Grafik Tren Riwayat
            </span>

            {/* Pemilih Metrik (Kelembaban, Suhu, pH) */}
            <div style={{ display: "flex", gap: "4px" }}>
              {(["moisture", "temperature", "ph"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    hapticLight();
                    setSelectedMetric(m);
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: selectedMetric === m ? "#2563EB" : "var(--bg-hover)",
                    color: selectedMetric === m ? "#FFFFFF" : "var(--text-muted)",
                  }}
                >
                  {m === "moisture" ? "Kelembaban" : m === "temperature" ? "Suhu" : "pH Tanah"}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <div style={{ width: "100%", height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={
                          selectedMetric === "moisture"
                            ? "#3B82F6"
                            : selectedMetric === "temperature"
                            ? "#F97316"
                            : "#8B5CF6"
                        }
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={
                          selectedMetric === "moisture"
                            ? "#3B82F6"
                            : selectedMetric === "temperature"
                            ? "#F97316"
                            : "#8B5CF6"
                        }
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--text-muted)" }} stroke="none" />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} stroke="none" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-card)",
                      borderRadius: "10px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "12px",
                      color: "var(--text-heading)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={
                      selectedMetric === "moisture"
                        ? "#3B82F6"
                        : selectedMetric === "temperature"
                        ? "#F97316"
                        : "#8B5CF6"
                    }
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#metricGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "12px" }}>
              Belum ada data riwayat tersimpan di IndexedDB.
            </div>
          )}
        </div>

        {/* Tabel Riwayat Offline */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "18px",
            padding: "16px",
            boxShadow: "var(--glow-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-heading)" }}>
              Daftar Catatan Lokal
            </span>

            {records.length > 0 && (
              <button
                onClick={handleClearLocal}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: "#EF4444",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                <Trash2 size={13} />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {records.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 6px" }}>Waktu</th>
                    <th style={{ padding: "8px 6px" }}>Kelembaban</th>
                    <th style={{ padding: "8px 6px" }}>Suhu</th>
                    <th style={{ padding: "8px 6px" }}>pH Tanah</th>
                    <th style={{ padding: "8px 6px" }}>Status Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 15).map((r) => {
                    const timeStr = new Date(r.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 6px", color: "var(--text-muted)", fontSize: "11px" }}>{timeStr}</td>
                        <td style={{ padding: "8px 6px", fontWeight: 600, color: "var(--text-heading)" }}>{r.moisture.toFixed(1)}%</td>
                        <td style={{ padding: "8px 6px", color: "var(--text-heading)" }}>{r.temperature.toFixed(1)}°C</td>
                        <td style={{ padding: "8px 6px", color: "var(--text-heading)", fontWeight: 600 }}>{r.ph.toFixed(2)}</td>
                        <td style={{ padding: "8px 6px" }}>{renderSyncBadge(r.syncStatus)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)", fontSize: "12px" }}>
              Hubungkan Arduino Uno untuk mulai menerima dan menyimpan data sensor tanah.
            </div>
          )}
        </div>

      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{
              position: "fixed",
              bottom: "85px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "calc(100% - 40px)",
              maxWidth: "390px",
              padding: "12px 16px",
              borderRadius: "14px",
              background: "#1E293B",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 500,
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              zIndex: 120,
            }}
          >
            <Sparkles size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigasi Bawah */}
      <BottomNav />
    </div>
  );
}

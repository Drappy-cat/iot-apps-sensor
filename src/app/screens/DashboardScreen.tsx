import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Droplets,
  Thermometer,
  Sprout,
  Activity,
  Zap,
  Layers,
  FlaskConical,
  Wifi,
  Sparkles,
  Waves,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { getActiveUser } from "../utils/authHelper";
import { useSensorData } from "../hooks/useSensorData";

export function DashboardScreen() {
  const navigate = useNavigate();
  const activeUser = getActiveUser();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    sensorData,
    analysis,
    connectionStatus,
    setpoint,
    setSetpoint,
    irrigationOn,
    fertilizerOn,
    toggleIrrigation,
    toggleFertilizer,
  } = useSensorData();

  const decrement = () => setSetpoint((p) => Math.max(20, p - 5));
  const increment = () => setSetpoint((p) => Math.min(95, p + 5));

  const handleBlockedAction = () => {
    setToastMessage("Akses Ditolak: Peran Viewer hanya dapat memantau data.");
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Format today's date in Indonesian
  const todayStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "80px",
      }}
    >
      {/* Top App Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 20px 16px",
          background: "var(--bg-card)",
          boxShadow: "var(--glow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
            Beranda
          </span>
          {activeUser.role !== "admin" && (
            <span
              style={{
                background: activeUser.role === "operator" ? "#DCFCE7" : "#FEE2E2",
                color: activeUser.role === "operator" ? "#16A34A" : "#EF4444",
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "6px",
                textTransform: "uppercase",
              }}
            >
              Mode {activeUser.role}
            </span>
          )}

          {/* Connection status pill */}
          <span
            onClick={() => navigate("/settings")}
            title="Klik untuk konfigurasi Firebase"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "10.5px",
              fontWeight: 600,
              cursor: "pointer",
              background:
                connectionStatus === "live"
                  ? "rgba(34, 197, 94, 0.15)"
                  : connectionStatus === "demo"
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
              color:
                connectionStatus === "live"
                  ? "#16A34A"
                  : connectionStatus === "demo"
                  ? "#D97706"
                  : "#DC2626",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background:
                  connectionStatus === "live"
                    ? "#22C55E"
                    : connectionStatus === "demo"
                    ? "#F59E0B"
                    : "#EF4444",
              }}
            />
            {connectionStatus === "live"
              ? "Firebase Live"
              : connectionStatus === "demo"
              ? "Mode Demo"
              : "Offline"}
          </span>
        </div>

        <button
          onClick={() => navigate("/notifications")}
          style={{
            background: "var(--bg-hover)",
            border: "none",
            borderRadius: "12px",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <Bell size={20} color="var(--text-primary)" strokeWidth={1.8} />
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "8px",
              height: "8px",
              background: "#F97316",
              borderRadius: "50%",
              border: "2px solid white",
            }}
          />
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Hero Card - Real-time Soil Moisture & Condition */}
        <div
          className="no-invert"
          style={{
            background: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 60%, #60A5FA 100%)",
            borderRadius: "24px",
            padding: "24px 20px 20px",
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "var(--glow-primary)",
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "130px",
              height: "130px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "-30px",
              width: "160px",
              height: "160px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "50%",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 400, opacity: 0.85, marginBottom: "4px" }}>
                Kelembaban Tanah (Real-time)
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1, letterSpacing: "-2px" }}>
                  {sensorData.moisture.toFixed(1)}
                </span>
                <span style={{ fontSize: "28px", fontWeight: 600, marginTop: "10px", opacity: 0.9 }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <Thermometer size={15} style={{ opacity: 0.85 }} />
                <span style={{ fontSize: "14px", fontWeight: 500, opacity: 0.9 }}>
                  Suhu Tanah {sensorData.temperature.toFixed(1)}°C
                </span>
              </div>
            </div>

            {/* Soil / Plant Health Animated Icon */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  padding: "16px",
                  backdropFilter: "blur(4px)",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={analysis.moistureStatus}
                    initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {analysis.moistureStatus === "OPTIMAL" && (
                      <Sprout size={40} color="white" strokeWidth={1.8} />
                    )}
                    {analysis.moistureStatus === "KERING" && (
                      <Droplets size={40} color="#FDE047" strokeWidth={1.8} />
                    )}
                    {analysis.moistureStatus === "BASAH" && (
                      <Waves size={40} color="#BAE6FD" strokeWidth={1.8} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ marginTop: "18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <span
                style={{
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 400,
                  opacity: 0.85,
                }}
              >
                {todayStr}
              </span>
            </div>
            <span
              style={{
                background: analysis.fertilityScore >= 75 ? "#22C55E" : "#F97316",
                color: "white",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "12px",
                fontWeight: 700,
                boxShadow: analysis.fertilityScore >= 75 ? "var(--glow-success)" : "var(--glow-warning)",
              }}
            >
              {analysis.fertilityScore >= 75 ? "✓ Kondisi Stabil" : "⚠ Perlu Perhatian"}
            </span>
          </div>
        </div>

        {/* AI Soil Intelligence Card (Replaces Fuzzy Logic) */}
        <div
          style={{
            background: "var(--bg-ai-card)",
            borderRadius: "16px",
            padding: "18px",
            border: "1px solid var(--border-ai-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div
              className="no-invert"
              style={{
                background: "#3B82F6",
                borderRadius: "8px",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "white", fontSize: "13px", fontWeight: 800 }}>AI</span>
            </div>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-ai-title)" }}>
              Transparansi AI Kesuburan Tanah
            </span>
          </div>
          <p style={{ fontSize: "13.5px", fontWeight: 400, color: "var(--text-ai-desc)", lineHeight: "1.55" }}>
            Sensor membaca kelembaban{" "}
            <span style={{ fontWeight: 700, background: "var(--bg-ai-badge)", borderRadius: "4px", padding: "1px 5px" }}>
              {analysis.moistureStatus}
            </span>{" "}
            dan pH tanah{" "}
            <span style={{ fontWeight: 700, background: "var(--bg-ai-badge)", borderRadius: "4px", padding: "1px 5px" }}>
              {analysis.phStatus} ({sensorData.ph.toFixed(1)})
            </span>.
            <br />
            Keputusan inferensi: <strong>Irigasi {irrigationOn ? "ON" : "OFF"}</strong>, <strong>Dosis Nutrisi {fertilizerOn ? "ON" : "OFF"}</strong>.
          </p>
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                background: "var(--bg-ai-pill)",
                color: "var(--text-ai-desc)",
                borderRadius: "6px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {analysis.ruleActive}
            </span>
            <span
              style={{
                background: "var(--bg-ai-pill)",
                color: "var(--text-ai-desc)",
                borderRadius: "6px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Skor Kesuburan: {analysis.fertilityScore}%
            </span>
            <span
              style={{
                background: "var(--bg-ai-pill)",
                color: "var(--text-ai-desc)",
                borderRadius: "6px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Confidence: {analysis.confidence}%
            </span>
          </div>
        </div>

        {/* Setpoint Control Card */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "18px",
            boxShadow: "var(--glow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Droplets size={18} color="#3B82F6" strokeWidth={2} />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Atur Target Kelembaban Tanah
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <motion.button
              whileTap={activeUser.role !== "viewer" ? { scale: 0.85 } : {}}
              onClick={activeUser.role !== "viewer" ? decrement : handleBlockedAction}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--bg-hover)",
                border: "none",
                cursor: activeUser.role === "viewer" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 300,
                color: "var(--text-muted)",
                opacity: activeUser.role === "viewer" ? 0.45 : 1,
              }}
            >
              −
            </motion.button>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
                <div style={{ position: "relative", height: "48px", width: "64px" }}>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={setpoint}
                      initial={{ opacity: 0, y: -15, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      style={{
                        position: "absolute",
                        width: "100%",
                        fontSize: "48px",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                        letterSpacing: "-2px",
                        lineHeight: "48px",
                      }}
                    >
                      {setpoint}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-muted)", marginTop: "2px" }}>
                  %
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--icon-muted)", marginTop: "4px" }}>
                Target Ambang Irigasi
              </p>
            </div>
            <motion.button
              whileTap={activeUser.role !== "viewer" ? { scale: 0.85 } : {}}
              onClick={activeUser.role !== "viewer" ? increment : handleBlockedAction}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: activeUser.role === "viewer" ? "var(--bg-hover)" : "#3B82F6",
                border: "none",
                cursor: activeUser.role === "viewer" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 300,
                color: activeUser.role === "viewer" ? "var(--text-muted)" : "white",
                boxShadow: activeUser.role === "viewer" ? "none" : "var(--glow-primary)",
                opacity: activeUser.role === "viewer" ? 0.45 : 1,
              }}
            >
              +
            </motion.button>
          </div>
        </div>

        {/* 7-in-1 Sensor Parameters Grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Parameter Sensor NPK 7-in-1
            </p>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--icon-muted)" }}>
              Data Modbus RS485
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {/* Nitrogen (N) */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Nitrogen (N)
                </span>
                <div
                  style={{
                    background: "#EFF6FF",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#2563EB",
                  }}
                >
                  <Sparkles size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.nitrogen}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>mg/kg</span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: sensorData.nitrogen < 30 ? "#EA580C" : "#16A34A",
                }}
              >
                {sensorData.nitrogen < 30 ? "Rendah" : "Optimal"}
              </span>
            </div>

            {/* Fosfor (P) */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Fosfor (P)
                </span>
                <div
                  style={{
                    background: "#FFF7ED",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#EA580C",
                  }}
                >
                  <FlaskConical size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.phosphorus}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>mg/kg</span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: sensorData.phosphorus < 20 ? "#EA580C" : "#16A34A",
                }}
              >
                {sensorData.phosphorus < 20 ? "Rendah" : "Optimal"}
              </span>
            </div>

            {/* Kalium (K) */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Kalium (K)
                </span>
                <div
                  style={{
                    background: "#F5F3FF",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#7C3AED",
                  }}
                >
                  <Layers size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.potassium}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>mg/kg</span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: sensorData.potassium < 70 ? "#EA580C" : "#16A34A",
                }}
              >
                {sensorData.potassium < 70 ? "Rendah" : "Optimal"}
              </span>
            </div>

            {/* pH Tanah */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  pH Tanah
                </span>
                <div
                  style={{
                    background: "#ECFDF5",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#059669",
                  }}
                >
                  <Activity size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.ph.toFixed(1)}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>pH</span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: sensorData.ph < 6 ? "#EA580C" : sensorData.ph > 7.5 ? "#2563EB" : "#16A34A",
                }}
              >
                {sensorData.ph < 6 ? "Masam" : sensorData.ph > 7.5 ? "Basa" : "Netral (Ideal)"}
              </span>
            </div>

            {/* Konduktivitas EC */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  EC (Salinitas)
                </span>
                <div
                  style={{
                    background: "#F0FDFA",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#0D9488",
                  }}
                >
                  <Zap size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.ec.toLocaleString()}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>µS/cm</span>
              </div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: sensorData.ec > 2000 ? "#DC2626" : "#16A34A",
                }}
              >
                {sensorData.ec > 2000 ? "Salinitas Tinggi" : "Ideal"}
              </span>
            </div>

            {/* Suhu Tanah */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Suhu Tanah
                </span>
                <div
                  style={{
                    background: "#FFF1F2",
                    borderRadius: "8px",
                    padding: "4px",
                    color: "#E11D48",
                  }}
                >
                  <Thermometer size={14} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>
                  {sensorData.temperature.toFixed(1)}
                </span>
                <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>°C</span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#16A34A" }}>
                Normal Perakaran
              </span>
            </div>
          </div>
        </div>

        {/* Actuators Grid */}
        <div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
            Status Aktuator & Irigasi
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Pompa Irigasi Tetes */}
            <div
              onClick={activeUser.role !== "viewer" ? toggleIrrigation : handleBlockedAction}
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "18px 14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                border: `1.5px solid ${irrigationOn ? "#D1FAE5" : "var(--bg-hover)"}`,
                cursor: activeUser.role !== "viewer" ? "pointer" : "default",
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="no-invert"
                style={{
                  background: irrigationOn ? "#F0FDF4" : "var(--bg-app)",
                  borderRadius: "14px",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                <Droplets size={26} color={irrigationOn ? "#22C55E" : "var(--text-muted)"} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
                Irigasi Tetes
              </span>
              <span
                className="no-invert"
                style={{
                  background: irrigationOn ? "#22C55E" : "var(--text-muted)",
                  color: "white",
                  borderRadius: "20px",
                  padding: "4px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: irrigationOn ? "var(--glow-success)" : "none",
                  transition: "all 0.3s",
                }}
              >
                {irrigationOn ? "ON" : "OFF"}
              </span>
            </div>

            {/* Dosing Pupuk NPK */}
            <div
              onClick={activeUser.role !== "viewer" ? toggleFertilizer : handleBlockedAction}
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "18px 14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                border: `1.5px solid ${fertilizerOn ? "#FFEDD5" : "var(--bg-hover)"}`,
                cursor: activeUser.role !== "viewer" ? "pointer" : "default",
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="no-invert"
                style={{
                  background: fertilizerOn ? "#FFF7ED" : "var(--bg-app)",
                  borderRadius: "14px",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                <FlaskConical size={26} color={fertilizerOn ? "#F97316" : "var(--text-muted)"} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
                Katup Nutrisi NPK
              </span>
              <span
                className="no-invert"
                style={{
                  background: fertilizerOn ? "#F97316" : "var(--text-muted)",
                  color: "white",
                  borderRadius: "20px",
                  padding: "4px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: fertilizerOn ? "var(--glow-warning)" : "none",
                  transition: "all 0.3s",
                }}
              >
                {fertilizerOn ? "ON" : "OFF"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="no-invert"
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            style={{
              position: "fixed",
              bottom: "95px",
              left: "50%",
              background: "rgba(254, 226, 226, 0.9)",
              border: "1.5px solid #FCA5A5",
              borderRadius: "14px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0px 8px 24px rgba(239, 68, 68, 0.2)",
              backdropFilter: "blur(8px)",
              zIndex: 999,
              width: "max-content",
              maxWidth: "90%",
            }}
          >
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#991B1B" }}>
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
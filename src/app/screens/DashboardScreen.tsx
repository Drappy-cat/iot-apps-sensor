import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, Wind, Flame, ThermometerSun, Droplets, CloudSun, Sun, CloudRain, CloudLightning } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { getActiveUser } from "../utils/authHelper";

export function DashboardScreen() {
  const navigate = useNavigate();
  const activeUser = getActiveUser();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [setpoint, setSetpoint] = useState(() => {
    const saved = localStorage.getItem("gh_setpoint");
    return saved ? parseInt(saved, 10) : 25;
  });

  useEffect(() => {
    localStorage.setItem("gh_setpoint", setpoint.toString());
  }, [setpoint]);
  const [currentTemp, setCurrentTemp] = useState(28);
  const [currentHumidity, setCurrentHumidity] = useState(65);
  const [weather, setWeather] = useState<"sunny" | "cloudy" | "rainy" | "stormy">("cloudy");

  const diff = currentTemp - setpoint;
  let tempStatus = "NORMAL";
  let fanOn = false;
  let heaterOn = false;
  let ruleActive = "Rule #1 Aktif";

  if (diff >= 1) {
    tempStatus = "PANAS";
    fanOn = true;
    heaterOn = false;
    ruleActive = "Rule #3 Aktif";
  } else if (diff <= -1) {
    tempStatus = "DINGIN";
    fanOn = false;
    heaterOn = true;
    ruleActive = "Rule #2 Aktif";
  }

  const confidence = Math.min(98, Math.max(70, Math.abs(diff) * 8 + 75)).toFixed(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTemp((prev) => {
        if (fanOn) return Math.max(prev - 0.5, 20);
        if (heaterOn) return Math.min(prev + 0.5, 45);
        return prev + (Math.random() - 0.5) * 0.4;
      });
      setCurrentHumidity((prev) => 
        Math.min(100, Math.max(40, prev + ((Math.random() - 0.5) * 2)))
      );
      if (Math.random() > 0.85) {
        const weathers: ("sunny" | "cloudy" | "rainy" | "stormy")[] = ["sunny", "cloudy", "rainy", "stormy"];
        setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [fanOn, heaterOn]);

  const decrement = () => setSetpoint((p) => Math.max(0, p - 1));
  const increment = () => setSetpoint((p) => Math.min(50, p + 1));

  const handleBlockedAction = () => {
    setToastMessage("Akses Ditolak: Peran Viewer hanya dapat memantau data.");
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Beranda</span>
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
        {/* Hero Card - Climate */}
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
              <p style={{ fontSize: "13px", fontWeight: 400, opacity: 0.8, marginBottom: "4px" }}>Suhu Real-time</p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "4px" }}>
                <span style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1, letterSpacing: "-2px" }}>
                  {currentTemp.toFixed(1)}
                </span>
                <span style={{ fontSize: "28px", fontWeight: 600, marginTop: "10px", opacity: 0.9 }}>°C</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <Droplets size={15} style={{ opacity: 0.8 }} />
                <span style={{ fontSize: "14px", fontWeight: 500, opacity: 0.85 }}>Kelembaban {currentHumidity.toFixed(1)}%</span>
              </div>
            </div>

            {/* Weather Icon */}
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
                    key={weather}
                    initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 30 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {weather === "sunny" && <Sun size={40} color="white" strokeWidth={1.5} />}
                    {weather === "cloudy" && <CloudSun size={40} color="white" strokeWidth={1.5} />}
                    {weather === "rainy" && <CloudRain size={40} color="white" strokeWidth={1.5} />}
                    {weather === "stormy" && <CloudLightning size={40} color="white" strokeWidth={1.5} />}
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
                  opacity: 0.8,
                }}
              >
                Senin, 13 Apr 2026
              </span>
            </div>
            <span
              style={{
                background: "#22C55E",
                color: "white",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "12px",
                fontWeight: 700,
                boxShadow: "var(--glow-success)",
              }}
            >
              ✓ Kondisi Stabil
            </span>
          </div>
        </div>

        {/* Fuzzy Logic Card */}
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
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-ai-title)" }}>Transparansi Fuzzy Logic</span>
          </div>
          <p style={{ fontSize: "13.5px", fontWeight: 400, color: "var(--text-ai-desc)", lineHeight: "1.55", transition: "all 0.3s" }}>
            Sensor membaca suhu{" "}
            <span style={{ fontWeight: 700, background: "var(--bg-ai-badge)", borderRadius: "4px", padding: "1px 5px" }}>
              {tempStatus}
            </span>{" "}
            dan kelembaban{" "}
            <span style={{ fontWeight: 700, background: "var(--bg-ai-badge)", borderRadius: "4px", padding: "1px 5px" }}>
              NORMAL
            </span>.
            <br />
            Keputusan inferensi: <strong>Kipas {fanOn ? "ON" : "OFF"}</strong>, <strong>Pemanas {heaterOn ? "ON" : "OFF"}</strong>.
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
              {ruleActive}
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
              Confidence: {confidence}%
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
            <ThermometerSun size={18} color="#3B82F6" strokeWidth={2} />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Atur Target Suhu</span>
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
                <span style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-muted)", marginTop: "2px" }}>°C</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--icon-muted)", marginTop: "4px" }}>Target Setpoint</p>
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

        {/* Actuators Grid */}
        <div>
          <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>Status Aktuator</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Fan Card */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "18px 14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                border: `1.5px solid ${fanOn ? "#D1FAE5" : "var(--bg-hover)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="no-invert"
                style={{
                  background: fanOn ? "#F0FDF4" : "var(--bg-app)",
                  borderRadius: "14px",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                <Wind size={26} color={fanOn ? "#22C55E" : "var(--text-muted)"} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
                Kipas Sirkulasi
              </span>
              <span
                className="no-invert"
                style={{
                  background: fanOn ? "#22C55E" : "var(--text-muted)",
                  color: "white",
                  borderRadius: "20px",
                  padding: "4px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: fanOn ? "var(--glow-success)" : "none",
                  transition: "all 0.3s",
                }}
              >
                {fanOn ? "ON" : "OFF"}
              </span>
            </div>

            {/* Heater Card */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "18px 14px",
                boxShadow: "var(--glow-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                border: `1.5px solid ${heaterOn ? "#FFEDD5" : "var(--bg-hover)"}`,
                transition: "border-color 0.3s",
              }}
            >
              <div
                className="no-invert"
                style={{
                  background: heaterOn ? "#FFF7ED" : "var(--bg-app)",
                  borderRadius: "14px",
                  width: "52px",
                  height: "52px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                <Flame size={26} color={heaterOn ? "#F97316" : "var(--text-muted)"} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)", textAlign: "center" }}>
                Pemanas
              </span>
              <span
                className="no-invert"
                style={{
                  background: heaterOn ? "#F97316" : "var(--text-muted)",
                  color: "white",
                  borderRadius: "20px",
                  padding: "4px 16px",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: heaterOn ? "var(--glow-warning)" : "none",
                  transition: "all 0.3s",
                }}
              >
                {heaterOn ? "ON" : "OFF"}
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
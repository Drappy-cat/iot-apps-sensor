import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useThemeTransition } from "../hooks/useThemeTransition";
import {
  User,
  Moon,
  Cpu,
  Thermometer,
  Droplets,
  LogOut,
  ChevronRight,
  Wifi,
  Shield,
  Database,
  Activity,
  Zap,
  Layers,
  Sparkles,
  FlaskConical,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import PuteraPic from "../../Picture/FotoProfile/Putera.png";
import RizmaPic from "../../Picture/FotoProfile/Rizmaindra.png";
import { getActiveUser, logoutUser } from "../utils/authHelper";
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  STORAGE_KEY_SIM_ENABLED,
  INITIAL_SENSOR_DATA,
} from "../services/firebaseService";

export function SettingsScreen() {
  const navigate = useNavigate();
  const activeUser = getActiveUser();
  const { theme, toggleTheme } = useThemeTransition();
  const darkMode = theme === "dark";

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firebase Config State
  const [fbConfig, setFbConfig] = useState(getSavedFirebaseConfig);
  const [fbSaved, setFbSaved] = useState(false);

  // Simulation mode
  const [simEnabled, setSimEnabled] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIM_ENABLED);
    return saved !== null ? saved === "true" : true;
  });

  // NPK 7-in-1 Simulation parameters
  const [simMoisture, setSimMoisture] = useState(65);
  const [simTemp, setSimTemp] = useState(27);
  const [simPH, setSimPH] = useState(6.7);
  const [simEC, setSimEC] = useState(1350);
  const [simN, setSimN] = useState(48);
  const [simP, setSimP] = useState(35);
  const [simK, setSimK] = useState(115);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIM_ENABLED, simEnabled.toString());
  }, [simEnabled]);

  useEffect(() => {
    const dataToSave = {
      moisture: simMoisture,
      temperature: simTemp,
      ph: simPH,
      ec: simEC,
      nitrogen: simN,
      phosphorus: simP,
      potassium: simK,
      timestamp: Date.now(),
    };
    localStorage.setItem("iot_sim_base_data", JSON.stringify(dataToSave));
  }, [simMoisture, simTemp, simPH, simEC, simN, simP, simK]);

  const handleSaveFirebase = () => {
    saveFirebaseConfig(fbConfig);
    setFbSaved(true);
    setToastMessage("Konfigurasi Firebase berhasil disimpan!");
    setTimeout(() => setFbSaved(false), 3000);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const Toggle = ({
    value,
    onChange,
  }: {
    value: boolean;
    onChange: (e: React.MouseEvent) => void;
  }) => (
    <motion.div
      onClick={(e) => onChange(e as any)}
      animate={{
        background: value ? "#22C55E" : "var(--border-strong)",
        boxShadow: value ? "0px 2px 8px rgba(34,197,94,0.35)" : "none",
      }}
      initial={false}
      transition={{ duration: 0.2 }}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "14px",
        cursor: "pointer",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 0 }}
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          position: "absolute",
          top: "3px",
          left: "3px",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: "white",
          boxShadow: "0px 2px 4px rgba(0,0,0,0.2)",
        }}
      />
    </motion.div>
  );

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
          padding: "56px 20px 16px",
          background: "var(--bg-card)",
          boxShadow: "var(--glow-card)",
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
          Profil & Pengaturan
        </span>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Profile Header */}
        <motion.div
          whileHover={{
            scale: 1.02,
            boxShadow: "0px 12px 36px rgba(59, 130, 246, 0.4)",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          style={{
            background: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
            borderRadius: "20px",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0px 6px 20px rgba(59,130,246,0.3)",
            cursor: "pointer",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid rgba(255,255,255,0.4)",
                overflow: "hidden",
              }}
            >
              <img
                src={RizmaPic}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as any).style.display = "none";
                }}
              />
            </div>
            {/* Online Dot */}
            <div
              style={{
                position: "absolute",
                bottom: "3px",
                right: "3px",
                width: "16px",
                height: "16px",
                background: "#22C55E",
                borderRadius: "50%",
                border: "2.5px solid white",
              }}
            />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "3px" }}>
              {activeUser.namaLengkap}
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)" }}>
              ID: {activeUser.idOperator}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                borderRadius: "8px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Wifi size={12} />
              Terhubung
            </span>
            <span
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "white",
                borderRadius: "8px",
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Shield size={12} />
              {activeUser.role === "admin"
                ? "Admin"
                : activeUser.role === "operator"
                ? "Operator"
                : "Viewer"}
            </span>
          </div>
        </motion.div>

        {/* Preferensi Group */}
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--icon-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Preferensi
          </p>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* Dark Mode */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderBottom: "1px solid var(--bg-hover)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    background: "var(--bg-hover)",
                    borderRadius: "10px",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Moon size={18} color="#6366F1" strokeWidth={2} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Mode Gelap
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--icon-muted)" }}>
                    Tampilan gelap untuk mata
                  </p>
                </div>
              </div>
              <Toggle value={darkMode} onChange={(e) => toggleTheme(e)} />
            </div>

            {/* Notifications */}
            <div
              onClick={() => navigate("/notifications")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    background: "#FFF7ED",
                    borderRadius: "10px",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>🔔</span>
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    Notifikasi Peringatan
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--icon-muted)" }}>
                    Alert ambang batas sensor
                  </p>
                </div>
              </div>
              <ChevronRight size={16} color="var(--border-strong)" />
            </div>
          </div>
        </div>

        {/* Konfigurasi Firebase Realtime Database */}
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--icon-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Integrasi Cloud Firebase
          </p>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  background: "#FFFBEB",
                  borderRadius: "10px",
                  padding: "8px",
                  color: "#D97706",
                }}
              >
                <Database size={20} />
              </div>
              <div>
                <p style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Firebase Realtime Database
                </p>
                <p style={{ fontSize: "12px", color: "var(--icon-muted)", margin: 0 }}>
                  Sambungkan ke database IoT Anda
                </p>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Database URL
              </label>
              <input
                type="text"
                placeholder="https://proyek-anda-default-rtdb.firebaseio.com"
                value={fbConfig.databaseURL}
                onChange={(e) => setFbConfig({ ...fbConfig, databaseURL: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                Path Node Sensor
              </label>
              <input
                type="text"
                placeholder="sensor_npk"
                value={fbConfig.sensorPath}
                onChange={(e) => setFbConfig({ ...fbConfig, sensorPath: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleSaveFirebase}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                background: fbSaved ? "#22C55E" : "#3B82F6",
                border: "none",
                color: "white",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "background 0.3s",
              }}
            >
              {fbSaved ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
              {fbSaved ? "Tersimpan!" : "Simpan & Hubungkan"}
            </button>
          </div>
        </div>

        {/* Developer Mode Group */}
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--icon-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Mode Pengembang
          </p>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {activeUser.role !== "admin" ? (
              <div
                style={{
                  padding: "16px 8px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "32px" }}>🔒</span>
                <p style={{ fontSize: "14.5px", fontWeight: 700, color: "var(--text-heading)", margin: "0 0 2px" }}>
                  Mode Pengembang Terkunci
                </p>
                <p style={{ fontSize: "12px", color: "var(--icon-muted)", margin: 0, lineHeight: 1.5 }}>
                  Manipulasi sensor simulasi hanya dapat diakses oleh akun Administrator.
                </p>
              </div>
            ) : (
              <>
                {/* Enable Simulation */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        background: simEnabled ? "var(--bg-primary-light)" : "var(--bg-hover)",
                        borderRadius: "10px",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.3s",
                      }}
                    >
                      <Cpu size={18} color={simEnabled ? "#3B82F6" : "var(--icon-muted)"} strokeWidth={2} />
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                        Aktifkan Simulasi Sensor
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--icon-muted)" }}>
                        Gunakan data uji virtual (Offline/Demo)
                      </p>
                    </div>
                  </div>
                  <Toggle value={simEnabled} onChange={() => setSimEnabled(!simEnabled)} />
                </div>

                <AnimatePresence initial={false}>
                  {simEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: "16px" }}
                    >
                      <div style={{ height: "1px", background: "var(--bg-hover)", margin: "0 -4px" }} />

                      {/* Kelembaban Tanah */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                            Kelembaban Tanah
                          </span>
                          <span style={{ background: "var(--bg-primary-light)", color: "#3B82F6", borderRadius: "8px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>
                            {simMoisture}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          value={simMoisture}
                          onChange={(e) => setSimMoisture(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#3B82F6", height: "6px", cursor: "pointer" }}
                        />
                      </div>

                      {/* Suhu Tanah */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                            Suhu Tanah
                          </span>
                          <span style={{ background: "#FFF7ED", color: "#F97316", borderRadius: "8px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>
                            {simTemp}°C
                          </span>
                        </div>
                        <input
                          type="range"
                          min={15}
                          max={45}
                          value={simTemp}
                          onChange={(e) => setSimTemp(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#F97316", height: "6px", cursor: "pointer" }}
                        />
                      </div>

                      {/* pH Tanah */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                            pH Tanah
                          </span>
                          <span style={{ background: "#ECFDF5", color: "#059669", borderRadius: "8px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>
                            {simPH}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={4.0}
                          max={9.0}
                          step={0.1}
                          value={simPH}
                          onChange={(e) => setSimPH(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#059669", height: "6px", cursor: "pointer" }}
                        />
                      </div>

                      {/* Nitrogen N */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                            Nitrogen (N)
                          </span>
                          <span style={{ background: "#EFF6FF", color: "#2563EB", borderRadius: "8px", padding: "2px 8px", fontSize: "12px", fontWeight: 700 }}>
                            {simN} mg/kg
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={150}
                          value={simN}
                          onChange={(e) => setSimN(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#2563EB", height: "6px", cursor: "pointer" }}
                        />
                      </div>

                      {/* Preview Box */}
                      <div
                        style={{
                          background: "var(--bg-app)",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          border: "1px dashed var(--border-strong)",
                          display: "flex",
                          justifyContent: "space-around",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "var(--icon-muted)", marginBottom: "2px" }}>Kelembaban</p>
                          <p style={{ fontSize: "16px", fontWeight: 800, color: "#3B82F6" }}>{simMoisture}%</p>
                        </div>
                        <div style={{ width: "1px", background: "var(--border-subtle)" }} />
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "var(--icon-muted)", marginBottom: "2px" }}>pH</p>
                          <p style={{ fontSize: "16px", fontWeight: 800, color: "#059669" }}>{simPH}</p>
                        </div>
                        <div style={{ width: "1px", background: "var(--border-subtle)" }} />
                        <div style={{ textAlign: "center" }}>
                          <p style={{ fontSize: "10px", color: "var(--icon-muted)", marginBottom: "2px" }}>Irigasi</p>
                          <p style={{ fontSize: "13px", fontWeight: 800, color: simMoisture < 60 ? "#22C55E" : "var(--text-muted)" }}>
                            {simMoisture < 60 ? "ON" : "OFF"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Tim Pengembang Group */}
        <div>
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--icon-muted)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Tim Pengembang
          </p>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {[
              {
                name: "Rizma Indra Pramuda",
                id: "25051204370",
                role: "Fullstack Developer",
                pic: RizmaPic,
              },
              {
                name: "Putera Al Khalidi",
                id: "25051204362",
                role: "Front End Developer",
                pic: PuteraPic,
              },
              {
                name: "Leony Andika Triwicaksono",
                id: "25051204324",
                role: "Penulis",
                pic: null,
              },
            ].map((dev, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--bg-hover)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    border: "2px solid var(--border-subtle)",
                    flexShrink: 0,
                  }}
                >
                  {dev.pic ? (
                    <img
                      src={dev.pic}
                      alt={dev.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <User size={24} color="var(--icon-muted)" />
                  )}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: "1.2",
                      marginBottom: "4px",
                    }}
                  >
                    {dev.name}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--icon-muted)", marginBottom: "4px" }}>
                    {dev.id}
                  </p>
                  <span
                    style={{
                      background: "var(--bg-primary-light)",
                      color: "#3B82F6",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      display: "inline-block",
                    }}
                  >
                    {dev.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Info */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "14px",
            padding: "14px 18px",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Versi Aplikasi</span>
          <span
            style={{
              background: "var(--bg-hover)",
              borderRadius: "8px",
              padding: "3px 10px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            v1.0.0 IoT NPK 7-in-1
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            background: "transparent",
            border: "2px solid #FCA5A5",
            cursor: "pointer",
            color: "#EF4444",
            fontSize: "15px",
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={18} strokeWidth={2} />
          Keluar (Logout)
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
import { useState, useEffect } from "react";
import { Plus, Sun, Clock, X, Droplets, Sprout } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { getActiveUser } from "../utils/authHelper";
import { hapticSuccess, hapticWarning } from "../services/hapticsService";

interface Schedule {
  id: number;
  title: string;
  time: string;
  targetMoisture: number;
  iconType: "droplets" | "sprout" | "sun";
  iconColor: string;
  iconBg: string;
  active: boolean;
}

export function ScheduleScreen() {
  const activeUser = getActiveUser();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const saved = localStorage.getItem("iot_schedules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 1,
        title: "Irigasi Pagi Hari",
        time: "06:00 – 07:30",
        targetMoisture: 70,
        iconType: "droplets",
        iconColor: "#3B82F6",
        iconBg: "#EFF6FF",
        active: true,
      },
      {
        id: 2,
        title: "Penyiraman Sore Hari",
        time: "16:00 – 17:30",
        targetMoisture: 65,
        iconType: "sun",
        iconColor: "#F97316",
        iconBg: "#FFF7ED",
        active: false,
      },
      {
        id: 3,
        title: "Dosing Nutrisi NPK",
        time: "08:00 – 09:00",
        targetMoisture: 68,
        iconType: "sprout",
        iconColor: "#10B981",
        iconBg: "#ECFDF5",
        active: true,
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem("iot_schedules", JSON.stringify(schedules));
  }, [schedules]);

  const toggleSchedule = (id: number) => {
    if (activeUser.role === "viewer") {
      hapticWarning();
      setToastMessage("Akses Ditolak: Peran Viewer tidak diizinkan mengubah jadwal.");
      return;
    }
    hapticSuccess();
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("09:00");
  const [newMoisture, setNewMoisture] = useState(65);

  const handleAddSchedule = () => {
    if (!newTitle.trim()) return;
    hapticSuccess();
    const newSchedule: Schedule = {
      id: Date.now(),
      title: newTitle,
      time: `${newStartTime} – ${newEndTime}`,
      targetMoisture: newMoisture,
      iconType: "droplets",
      iconColor: "#3B82F6",
      iconBg: "#EFF6FF",
      active: true,
    };
    setSchedules([...schedules, newSchedule]);
    setIsModalOpen(false);
    setNewTitle("");
    setNewStartTime("08:00");
    setNewEndTime("09:00");
    setNewMoisture(65);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "80px",
        position: "relative",
      }}
    >
      {/* Top App Bar */}
      <div
        style={{
          padding: "56px 20px 16px",
          background: "var(--bg-card)",
          boxShadow: "var(--glow-card)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
          Jadwal Otomasi
        </span>

        <button
          onClick={() => {
            if (activeUser.role === "viewer") {
              setToastMessage("Akses Ditolak: Peran Viewer tidak dapat menambahkan jadwal.");
            } else {
              setIsModalOpen(true);
            }
          }}
          style={{
            background: "#3B82F6",
            border: "none",
            borderRadius: "12px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            boxShadow: "0px 4px 12px rgba(59,130,246,0.3)",
          }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {schedules.map((item) => (
          <div
            key={item.id}
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "var(--glow-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: item.active ? "1.5px solid #BFDBFE" : "1.5px solid transparent",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: item.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.iconColor,
                  flexShrink: 0,
                }}
              >
                {item.iconType === "droplets" ? (
                  <Droplets size={22} strokeWidth={2} />
                ) : item.iconType === "sprout" ? (
                  <Sprout size={22} strokeWidth={2} />
                ) : (
                  <Sun size={22} strokeWidth={2} />
                )}
              </div>
              <div>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>
                  {item.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={12} color="var(--icon-muted)" />
                  <span style={{ fontSize: "12px", color: "var(--icon-muted)" }}>{item.time}</span>
                  <span style={{ fontSize: "12px", color: "var(--icon-muted)" }}>•</span>
                  <span style={{ fontSize: "12px", color: "#3B82F6", fontWeight: 600 }}>
                    Target {item.targetMoisture}%
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <motion.div
              onClick={() => toggleSchedule(item.id)}
              animate={{
                background: item.active ? "#22C55E" : "var(--border-strong)",
                boxShadow: item.active ? "0px 2px 8px rgba(34,197,94,0.35)" : "none",
              }}
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
                animate={{ x: item.active ? 20 : 0 }}
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
          </div>
        ))}
      </div>

      {/* Modal Add Schedule */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: "var(--bg-card)",
                borderRadius: "20px",
                padding: "24px",
                width: "100%",
                maxWidth: "360px",
                boxShadow: "0px 10px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                  Tambah Jadwal Baru
                </span>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Nama Jadwal
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Irigasi Tetes Sore"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-input)",
                      color: "var(--text-primary)",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      Waktu Mulai
                    </label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      Waktu Selesai
                    </label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--bg-input)",
                        color: "var(--text-primary)",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Target Kelembaban ({newMoisture}%)
                  </label>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    value={newMoisture}
                    onChange={(e) => setNewMoisture(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#3B82F6", height: "6px", cursor: "pointer" }}
                  />
                </div>
              </div>

              <button
                onClick={handleAddSchedule}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#3B82F6",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Simpan Jadwal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

import { useState, useEffect } from "react";
import { Plus, Sun, Moon, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { getActiveUser } from "../utils/authHelper";

interface Schedule {
  id: number;
  title: string;
  time: string;
  targetTemp: number;
  iconType: "sun" | "moon";
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
    const saved = localStorage.getItem("gh_schedules");
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
        title: "Jadwal Siang",
        time: "06:00 – 18:00",
        targetTemp: 24,
        iconType: "sun",
        iconColor: "#F97316",
        iconBg: "#FFF7ED",
        active: true,
      },
      {
        id: 2,
        title: "Jadwal Malam",
        time: "18:00 – 06:00",
        targetTemp: 27,
        iconType: "moon",
        iconColor: "#6366F1",
        iconBg: "#EEF2FF",
        active: false,
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem("gh_schedules", JSON.stringify(schedules));
  }, [schedules]);

  const toggleSchedule = (id: number) => {
    if (activeUser.role === "viewer") {
      setToastMessage("Akses Ditolak: Peran Viewer tidak diizinkan mengubah jadwal.");
      return;
    }
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("08:00");
  const [newEndTime, setNewEndTime] = useState("16:00");
  const [newTemp, setNewTemp] = useState(25);

  const handleAddSchedule = () => {
    if (!newTitle.trim()) return;
    const newSchedule: Schedule = {
      id: Date.now(),
      title: newTitle,
      time: `${newStartTime} – ${newEndTime}`,
      targetTemp: newTemp,
      iconType: "sun",
      iconColor: "#10B981",
      iconBg: "var(--bg-success-light)",
      active: true,
    };
    setSchedules([...schedules, newSchedule]);
    setIsModalOpen(false);
    // Reset Form
    setNewTitle("");
    setNewStartTime("08:00");
    setNewEndTime("16:00");
    setNewTemp(25);
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
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Jadwal Operasional</span>
        <p style={{ fontSize: "13px", color: "var(--icon-muted)", marginTop: "3px" }}>
          Kelola jadwal otomasi greenhouse
        </p>
      </div>

      {/* Summary Row */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "4px" }}>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "12px",
              padding: "12px 14px",
              boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Clock size={18} color="#3B82F6" />
            <div>
              <p style={{ fontSize: "11px", color: "var(--icon-muted)" }}>Jadwal Aktif</p>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>
                {schedules.filter((s) => s.active).length} / {schedules.length}
              </p>
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "12px",
              padding: "12px 14px",
              boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div style={{ width: "8px", height: "8px", background: "#22C55E", borderRadius: "50%" }} />
            <div>
              <p style={{ fontSize: "11px", color: "var(--icon-muted)" }}>Status</p>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#22C55E" }}>Berjalan</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Daftar Jadwal</p>

        {schedules.map((schedule) => {
          const Icon = schedule.iconType === "moon" ? Moon : Sun;
          return (
            <div
              key={schedule.id}
              style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                padding: "20px",
                boxShadow: "var(--glow-card)",
                border: schedule.active ? "1.5px solid #D1FAE5" : "1.5px solid var(--bg-hover)",
                transition: "border 0.3s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: "14px", flex: 1 }}>
                  {/* Icon */}
                  <div
                    className="no-invert"
                    style={{
                      background: schedule.iconBg,
                      borderRadius: "14px",
                      width: "50px",
                      height: "50px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} color={schedule.iconColor} strokeWidth={2} />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
                      {schedule.title}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={13} color="var(--icon-muted)" />
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Waktu: {schedule.time}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          🌡 Suhu Target: <strong>{schedule.targetTemp}°C</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="no-invert" style={{ marginTop: "10px" }}>
                      <span
                        style={{
                          background: schedule.active ? "#DCFCE7" : "var(--bg-hover)",
                          color: schedule.active ? "#16A34A" : "var(--text-muted)",
                          borderRadius: "8px",
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {schedule.active ? "● Aktif" : "○ Nonaktif"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* iOS-style Toggle */}
                <div
                  className="no-invert"
                  onClick={() => toggleSchedule(schedule.id)}
                  style={{
                    width: "48px",
                    height: "28px",
                    borderRadius: "14px",
                    background: schedule.active ? "#22C55E" : "var(--border-strong)",
                    cursor: activeUser.role === "viewer" ? "not-allowed" : "pointer",
                    position: "relative",
                    transition: "background 0.3s ease",
                    flexShrink: 0,
                    boxShadow: schedule.active ? "0px 2px 8px rgba(34,197,94,0.4)" : "none",
                    opacity: activeUser.role === "viewer" ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "3px",
                      left: schedule.active ? "23px" : "3px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "white",
                      boxShadow: "0px 2px 4px rgba(0,0,0,0.2)",
                      transition: "left 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Info Card */}
        <div
          style={{
            background: "var(--bg-primary-light)",
            borderRadius: "14px",
            padding: "14px 16px",
            border: "1px solid #DBEAFE",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: "16px" }}>💡</span>
          <p style={{ fontSize: "12px", color: "var(--text-ai-desc)", lineHeight: "1.5" }}>
            Jadwal operasional menggunakan modul RTC DS3231 untuk akurasi waktu yang presisi meskipun tanpa koneksi internet.
          </p>
        </div>
      </div>

      {/* FAB - Add */}
      {activeUser.role === "admin" && (
        <motion.button
          className="no-invert"
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsModalOpen(true)}
          style={{
            position: "fixed",
            bottom: "90px",
            right: "20px",
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "#3B82F6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0px 6px 16px rgba(59,130,246,0.45)",
            zIndex: 50,
          }}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Add Schedule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "fixed",
                top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(15,23,42,0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 100,
              }}
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                position: "fixed",
                bottom: 0, left: 0, right: 0,
                background: "var(--bg-card)",
                borderTopLeftRadius: "28px",
                borderTopRightRadius: "28px",
                padding: "24px 24px 32px",
                zIndex: 101,
                boxShadow: "0px -4px 24px rgba(0,0,0,0.1)",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>Tambah Jadwal Baru</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
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
                    color: "var(--text-muted)",
                  }}
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Nama Jadwal</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Perawatan Pagi"
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: "12px",
                      border: "1.5px solid var(--border-subtle)", background: "var(--bg-input)", outline: "none",
                      fontFamily: "'Inter', sans-serif", fontSize: "14px", boxSizing: "border-box"
                    }}
                  />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Jam Mulai</label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: "12px",
                        border: "1.5px solid var(--border-subtle)", background: "var(--bg-input)", outline: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: "14px", boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Jam Selesai</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      style={{
                        width: "100%", padding: "13px 16px", borderRadius: "12px",
                        border: "1.5px solid var(--border-subtle)", background: "var(--bg-input)", outline: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: "14px", boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Target Suhu</label>
                    <span style={{ background: "var(--bg-primary-light)", color: "#3B82F6", padding: "3px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>{newTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={newTemp}
                    onChange={(e) => setNewTemp(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#3B82F6", height: "6px", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>15°C</span>
                    <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>45°C</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddSchedule}
                  style={{
                    width: "100%", padding: "16px", background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
                    color: "white", borderRadius: "14px", border: "none", fontSize: "15px", fontWeight: 700,
                    cursor: "pointer", marginTop: "10px", boxShadow: "0px 4px 14px rgba(59,130,246,0.35)",
                    fontFamily: "'Inter', sans-serif"
                  }}
                >
                  Simpan Jadwal
                </motion.button>
              </div>
            </motion.div>
          </>
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

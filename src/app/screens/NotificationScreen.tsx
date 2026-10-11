import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Trash2,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Info,
  BellOff,
  Sparkles,
  FlaskConical,
  Activity,
  Zap,
} from "lucide-react";

type NotifType = "warning" | "success" | "error" | "info";

interface Notif {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  iconName: "Droplets" | "CheckCircle2" | "AlertTriangle" | "Sparkles" | "FlaskConical" | "Activity" | "Zap" | "Info";
}

const initialNotifications: Notif[] = [
  {
    id: 1,
    type: "warning",
    title: "Kelembaban Tanah Kritis",
    message: "Kelembaban tanah turun ke 48%, di bawah target setpoint 65%. Pompa irigasi tetes diaktifkan otomatis.",
    time: "14:05",
    read: false,
    iconName: "Droplets",
  },
  {
    id: 2,
    type: "warning",
    title: "Defisiensi Unsur Nitrogen",
    message: "Kadar Nitrogen tercatat 24 mg/kg (kategori rendah). Disarankan penambahan pupuk NPK berimbang.",
    time: "11:30",
    read: false,
    iconName: "Sparkles",
  },
  {
    id: 3,
    type: "success",
    title: "pH Tanah Optimal & Stabil",
    message: "Nilai pH tanah berada pada 6.7 (netral ideal). Penyerapan unsur hara oleh perakaran berjalan prima.",
    time: "08:00",
    read: true,
    iconName: "Activity",
  },
  {
    id: 4,
    type: "info",
    title: "Sinkronisasi Cloud Firebase",
    message: "Modul telemetri Modbus RS485 berhasil streaming data 7 parameter sensor ke Firebase Realtime Database.",
    time: "Kemarin 22:15",
    read: true,
    iconName: "Zap",
  },
  {
    id: 5,
    type: "success",
    title: "Irigasi Nutrisi Selesai",
    message: "Penyiraman nutrisi cair zona perakaran berhasil disalurkan sesuai jadwal pukul 06:00 WIB.",
    time: "Kemarin 06:02",
    read: true,
    iconName: "CheckCircle2",
  },
  {
    id: 6,
    type: "info",
    title: "Pembaruan Kalibrasi Sensor",
    message: "Kalibrasi sensor NPK Soil 7-in-1 versi firmware v1.0 berhasil dimutakhirkan.",
    time: "2 hari lalu",
    read: true,
    iconName: "Info",
  },
];

const typeStyles: Record<NotifType, { bg: string; iconBg: string; iconColor: string; border: string }> = {
  warning: { bg: "#FFFBEB", iconBg: "#FEF3C7", iconColor: "#D97706", border: "#FDE68A" },
  success: { bg: "#F0FDF4", iconBg: "#DCFCE7", iconColor: "#16A34A", border: "#BBF7D0" },
  error:   { bg: "#FFF1F2", iconBg: "#FFE4E6", iconColor: "#E11D48", border: "#FECDD3" },
  info:    { bg: "var(--bg-primary-light)", iconBg: "var(--bg-ai-pill)", iconColor: "#2563EB", border: "var(--bg-ai-badge)" },
};

export function NotificationScreen() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notif[]>(() => {
    const saved = localStorage.getItem("iot_notifications");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return initialNotifications;
  });

  const [filter, setFilter] = useState<"semua" | "belum_dibaca">("semua");

  useEffect(() => {
    localStorage.setItem("iot_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  const deleteOne = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = filter === "belum_dibaca"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderIcon = (name: Notif["iconName"], color: string) => {
    switch (name) {
      case "Droplets":     return <Droplets size={20} color={color} strokeWidth={2} />;
      case "Sparkles":     return <Sparkles size={20} color={color} strokeWidth={2} />;
      case "FlaskConical": return <FlaskConical size={20} color={color} strokeWidth={2} />;
      case "Activity":     return <Activity size={20} color={color} strokeWidth={2} />;
      case "Zap":          return <Zap size={20} color={color} strokeWidth={2} />;
      case "CheckCircle2": return <CheckCircle2 size={20} color={color} strokeWidth={2} />;
      case "AlertTriangle":return <AlertTriangle size={20} color={color} strokeWidth={2} />;
      default:             return <Info size={20} color={color} strokeWidth={2} />;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        fontFamily: "'Inter', sans-serif",
        paddingBottom: "40px",
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
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate(-1)}
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
            }}
          >
            <ArrowLeft size={20} color="var(--text-primary)" strokeWidth={2} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#EF4444",
                    color: "white",
                    borderRadius: "10px",
                    padding: "2px 7px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <p style={{ fontSize: "12px", color: "var(--icon-muted)", margin: 0 }}>
              Peringatan dan log kejadian sensor
            </p>
          </div>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            title="Hapus Semua"
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
              color: "var(--icon-muted)",
            }}
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Filter Tab & Tandai Semua */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setFilter("semua")}
              style={{
                background: filter === "semua" ? "#3B82F6" : "var(--bg-card)",
                color: filter === "semua" ? "white" : "var(--text-muted)",
                border: filter === "semua" ? "none" : "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("belum_dibaca")}
              style={{
                background: filter === "belum_dibaca" ? "#3B82F6" : "var(--bg-card)",
                color: filter === "belum_dibaca" ? "white" : "var(--text-muted)",
                border: filter === "belum_dibaca" ? "none" : "1px solid var(--border-subtle)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Belum Dibaca ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: "none",
                border: "none",
                color: "#3B82F6",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* Notif List */}
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "var(--bg-card)",
                borderRadius: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--icon-muted)",
                }}
              >
                <BellOff size={28} />
              </div>
              <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Tidak Ada Notifikasi
              </p>
              <p style={{ fontSize: "13px", color: "var(--icon-muted)", margin: 0, maxWidth: "240px" }}>
                Semua parameter sensor dalam batas aman. Tidak ada alert aktif saat ini.
              </p>
            </motion.div>
          ) : (
            filtered.map((item) => {
              const styles = typeStyles[item.type];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  style={{
                    background: item.read ? "var(--bg-card)" : styles.bg,
                    border: `1.5px solid ${item.read ? "var(--border-subtle)" : styles.border}`,
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    boxShadow: item.read ? "0px 2px 6px rgba(0,0,0,0.03)" : "0px 4px 14px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => toggleRead(item.id)}
                >
                  {/* Dot unread */}
                  {!item.read && (
                    <span
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#3B82F6",
                      }}
                    />
                  )}

                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: styles.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {renderIcon(item.iconName, styles.iconColor)}
                  </div>

                  <div style={{ flex: 1, paddingRight: item.read ? "0" : "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: item.read ? 600 : 700,
                          color: "var(--text-heading)",
                          margin: 0,
                        }}
                      >
                        {item.title}
                      </p>
                      <span style={{ fontSize: "11px", color: "var(--icon-muted)" }}>
                        {item.time}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: "1.45",
                      }}
                    >
                      {item.message}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

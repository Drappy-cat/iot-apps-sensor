/**
 * ============================================================================
 * DEV PAGE SWITCHER & QUICK ROUTE NAVIGATOR (HANYA UNTUK MODE DEVELOPMENT)
 * ============================================================================
 * 
 * 💡 CARA KERJA & PENGHAPUSAN:
 * 1. OTOMATIS HILANG DI PRODUKSI / KOMERSIAL:
 *    Komponen ini dilindungi oleh pengecekan `import.meta.env.DEV`.
 *    Ketika aplikasi di-build untuk komersial (`npm run build`), tombol ini
 *    secara otomatis 100% TIDAK AKAN DIRENDER dan dibersihkan oleh bundler.
 * 
 * 2. CARA MENGHAPUS MANUAL SEWAKTU-WAKTU:
 *    - Hapus file ini: `src/app/components/DevPageSwitcher.tsx`
 *    - Di `src/app/App.tsx`, hapus baris `<DevPageSwitcher />` dan import-nya.
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Compass,
  Search,
  Check,
  ChevronRight,
  Shield,
  UserCheck,
  Eye,
  Sun,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Home,
  BarChart2,
  Clock,
  Settings,
  Bell,
  LogIn,
  UserPlus,
  KeyRound,
  RotateCcw,
} from "lucide-react";
import { router } from "../routes";
import { getActiveUser, type User as AuthUser } from "../utils/authHelper";

// Daftar detail lengkap seluruh halaman di aplikasi
interface DevRouteItem {
  id: string;
  name: string;
  path: string;
  category: "auth" | "iot" | "config";
  categoryLabel: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  description: string;
  testChecklist: string[];
}

const DEV_ROUTES: DevRouteItem[] = [
  {
    id: "splash",
    name: "Splash Screen",
    path: "/",
    category: "auth",
    categoryLabel: "Autentikasi & Akun",
    icon: Sparkles,
    color: "#6366F1",
    badge: "Intro / Boot",
    description: "Animasi pembuka, branding, loading sequence sistem sensor, dan auto-redirect ke halaman login.",
    testChecklist: [
      "Animasi logo & teks branding",
      "Progress bar loading 100%",
      "Auto-navigate ke /login",
    ],
  },
  {
    id: "login",
    name: "Masuk / Login",
    path: "/login",
    category: "auth",
    categoryLabel: "Autentikasi & Akun",
    icon: LogIn,
    color: "#3B82F6",
    badge: "Autentikasi",
    description: "Form login operator/admin dengan validasi kredensial, demo auto-fill role, dan tautan reset password.",
    testChecklist: [
      "Login tombol cepat: Admin, Operator, Viewer",
      "Validasi form & toggle lihat sandi",
      "Simpan sesi pengguna di LocalStorage",
    ],
  },
  {
    id: "register",
    name: "Registrasi Akun",
    path: "/register",
    category: "auth",
    categoryLabel: "Autentikasi & Akun",
    icon: UserPlus,
    color: "#10B981",
    badge: "Pendaftaran",
    description: "Form pembuatan akun baru dengan indikator kekuatan sandi real-time dan pemilihan hak akses peran.",
    testChecklist: [
      "Meteran kekuatan sandi (Lemah / Cukup / Kuat)",
      "Pilihan dropdown peran (Admin / Operator / Viewer)",
      "Konfirmasi kecocokan password & syarat ketentuan",
    ],
  },
  {
    id: "forgot-password",
    name: "Lupa Kata Sandi",
    path: "/forgot-password",
    category: "auth",
    categoryLabel: "Autentikasi & Akun",
    icon: KeyRound,
    color: "#F59E0B",
    badge: "Pemulihan Akun",
    description: "Alur pemulihan akun 3 langkah: Verifikasi Email -> Masukkan Kode OTP 6-Digit -> Buat Password Baru.",
    testChecklist: [
      "Wizard multi-step 1, 2, dan 3",
      "Input OTP dengan animasi timer hitung mundur",
      "Update kata sandi baru ke penyimpanan lokal",
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard IoT & Sensor",
    path: "/dashboard",
    category: "iot",
    categoryLabel: "Monitoring & IoT",
    icon: Home,
    color: "#06B6D4",
    badge: "Core App",
    description: "Monitoring realtime 6 sensor tanah/lingkungan, saklar pompa irigasi & pupuk, target setpoint, dan status ESP32.",
    testChecklist: [
      "Nilai sensor Kelembaban, Suhu, N, P, K, pH",
      "Saklar relay manual: Pompa Air & Pupuk Cair",
      "Uji proteksi peran: Viewer dilarang toggle pompa",
    ],
  },
  {
    id: "analytics",
    name: "Riwayat & Analitik Data",
    path: "/analytics",
    category: "iot",
    categoryLabel: "Monitoring & IoT",
    icon: BarChart2,
    color: "#8B5CF6",
    badge: "Grafik & Ekspor",
    description: "Visualisasi grafik tren sensor interaktif, filter rentang waktu (1H/7H/30H), ringkasan metrik, dan ekspor PDF/CSV.",
    testChecklist: [
      "Grafik interaktif area/garis sensor",
      "Filter rentang waktu dan tab sensor",
      "Generator & download laporan PDF otomatis",
    ],
  },
  {
    id: "schedule",
    name: "Jadwal Otomasi Pompa",
    path: "/schedule",
    category: "config",
    categoryLabel: "Kontrol & Konfigurasi",
    icon: Clock,
    color: "#EC4899",
    badge: "Otomasi",
    description: "Pengaturan timer penyiraman berkala, durasi aktif pompa, jadwal waktu harian/spesifik, dan status aktif/nonaktif.",
    testChecklist: [
      "Daftar jadwal penyiraman pagi & sore",
      "Toggle on/off saklar jadwal otomatis",
      "Pengaturan durasi semprot (menit/detik)",
    ],
  },
  {
    id: "settings",
    name: "Pengaturan & Kalibrasi",
    path: "/settings",
    category: "config",
    categoryLabel: "Kontrol & Konfigurasi",
    icon: Settings,
    color: "#64748B",
    badge: "Sistem & Akun",
    description: "Konfigurasi tema gelap/terang, kalibrasi batas sensor, manajemen akun aktif, dan informasi perangkat keras.",
    testChecklist: [
      "Ganti mode Dark / Light theme",
      "Pengaturan ambang batas aman sensor",
      "Ganti sandi akun & logout pengguna",
    ],
  },
  {
    id: "notifications",
    name: "Notifikasi & Peringatan",
    path: "/notifications",
    category: "config",
    categoryLabel: "Kontrol & Konfigurasi",
    icon: Bell,
    color: "#EF4444",
    badge: "Alerts",
    description: "Daftar log peringatan ambang batas sensor tanah, status belum dibaca, dan pembersihan riwayat notifikasi.",
    testChecklist: [
      "Daftar alert bahaya kelembaban rendah/tinggi",
      "Filter tab: Semua vs Belum Dibaca",
      "Tombol tandai telah dibaca & bersihkan",
    ],
  },
];

export function DevPageSwitcher() {
  // 1. OTOMATIS RETURN NULL DI MODE PRODUCTION (TIDAK AKAN DI-RENDER SAMA SEKALI)
  if (!import.meta.env.DEV) {
    return null;
  }

  return <DevPageSwitcherContent />;
}

function DevPageSwitcherContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => router.state.location.pathname);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "auth" | "iot" | "config">("all");
  const [activeUser, setActiveUserState] = useState<AuthUser>(() => getActiveUser());
  const [position, setPosition] = useState<"bottom-right" | "top-right">("bottom-right");
  const [isMinimized, setIsMinimized] = useState(false);
  const { theme, setTheme } = useTheme();

  // Sinkronisasi rute aktif saat berpindah halaman
  useEffect(() => {
    const unsubscribe = router.subscribe((state) => {
      setCurrentPath(state.location.pathname);
      // Sinkronkan juga active user jika ada perubahan
      setActiveUserState(getActiveUser());
    });
    return () => unsubscribe();
  }, []);

  // Filter routes berdasarkan kategori dan query pencarian
  const filteredRoutes = useMemo(() => {
    return DEV_ROUTES.filter((r) => {
      const matchCat = activeCategory === "all" || r.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.badge.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [activeCategory, searchQuery]);

  // Navigasi instan ke halaman yang dipilih
  const handleNavigate = (path: string) => {
    router.navigate(path);
    setIsOpen(false);
  };

  // Switch role instan untuk testing role-based security
  const handleSwitchRole = (role: "admin" | "operator" | "viewer") => {
    const rawUsers = localStorage.getItem("gh_users");
    let users: AuthUser[] = [];
    if (rawUsers) {
      try {
        users = JSON.parse(rawUsers);
      } catch (e) {
        users = [];
      }
    }
    const targetUser = users.find((u) => u.role === role) || {
      namaLengkap:
        role === "admin"
          ? "Administrator Utama"
          : role === "operator"
          ? "Operator Greenhouse"
          : "Tamu Viewer",
      idOperator: role,
      email: `${role}@greenhouse.com`,
      role,
    };

    localStorage.setItem("gh_active_user", JSON.stringify(targetUser));
    setActiveUserState(targetUser);
    // Trigger reload kecil pada screen saat ini agar role update terlihat seketika
    router.navigate(currentPath);
  };

  // Toggle tema instan
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Cari nama route aktif saat ini
  const activeRouteObj = DEV_ROUTES.find((r) => r.path === currentPath);

  return (
    <>
      {/* -------------------------------------------------------------
          TOMBOL FLOATING TRIGGER (DEV BUTTON)
          ------------------------------------------------------------- */}
      <div
        style={{
          position: "fixed",
          zIndex: 99999,
          ...(position === "bottom-right"
            ? { bottom: "82px", right: "12px" }
            : { top: "16px", right: "12px" }),
          pointerEvents: "auto",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}
      >
        <AnimatePresence mode="wait">
          {isMinimized ? (
            /* Tombol kecil saat diminimalkan */
            <motion.button
              key="mini-btn"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsMinimized(false)}
              title="Perluas Menu Dev"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4F46E5, #9333EA)",
                color: "#FFFFFF",
                border: "2px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Compass size={18} />
            </motion.button>
          ) : (
            /* Tombol Badge DEV Utama */
            <motion.div
              key="full-badge"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "28px",
                padding: "4px 8px 4px 10px",
                boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.3)",
              }}
            >
              <button
                onClick={() => setIsOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#FFFFFF",
                  padding: "4px 6px",
                }}
              >
                {/* Glowing status dot */}
                <span
                  style={{
                    position: "relative",
                    display: "flex",
                    height: "8px",
                    width: "8px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#10B981",
                      opacity: 0.75,
                      animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
                    }}
                  />
                  <span
                    style={{
                      position: "relative",
                      borderRadius: "50%",
                      height: "8px",
                      width: "8px",
                      backgroundColor: "#10B981",
                    }}
                  />
                </span>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: "linear-gradient(90deg, #818CF8, #C084FC)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      ⚡ DEV ROUTES
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.12)",
                        color: "#E2E8F0",
                        fontWeight: 600,
                      }}
                    >
                      {DEV_ROUTES.findIndex((r) => r.path === currentPath) + 1}/9
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#94A3B8",
                      maxWidth: "110px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                    }}
                  >
                    {activeRouteObj?.name || currentPath}
                  </span>
                </div>
              </button>

              {/* Tombol sembunyikan kecil */}
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimalkan ke ikon"
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "22px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                  cursor: "pointer",
                  marginLeft: "2px",
                }}
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* -------------------------------------------------------------
          MODAL DRAWER PANEL: DETAIL SEMUA HALAMAN (NAVIGASI INSTAN)
          ------------------------------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100000,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              fontFamily: "'Inter', -apple-system, sans-serif",
            }}
          >
            {/* Backdrop dengan blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(10, 15, 29, 0.7)",
                backdropFilter: "blur(6px)",
              }}
            />

            {/* Kontainer Modal Sheet */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "460px",
                maxHeight: "88vh",
                background: "#0F172A",
                color: "#F8FAFC",
                borderTopLeftRadius: "24px",
                borderTopRightRadius: "24px",
                boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {/* Header Drawer */}
              <div
                style={{
                  padding: "16px 20px 12px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                }}
              >
                {/* Drag bar indicator */}
                <div
                  style={{
                    width: "40px",
                    height: "4px",
                    borderRadius: "4px",
                    background: "rgba(255, 255, 255, 0.2)",
                    margin: "0 auto 12px",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #6366F1, #A855F7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.35)",
                      }}
                    >
                      <Compass size={20} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#FFFFFF" }}>
                          Dev Route Switcher
                        </h2>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "#34D399",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            fontWeight: 700,
                          }}
                        >
                          LOCAL DEV
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94A3B8" }}>
                        Pindah halaman instan untuk pengujian & verifikasi UI
                      </p>
                    </div>
                  </div>

                  {/* Tombol Tutup */}
                  <button
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "none",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94A3B8",
                      cursor: "pointer",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick Info & Role Switcher Bar */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginTop: "12px",
                    padding: "8px 12px",
                    borderRadius: "12px",
                    background: "rgba(0, 0, 0, 0.35)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {/* Current Active Path */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                    <span style={{ color: "#64748B" }}>Posisi:</span>
                    <code
                      style={{
                        color: "#38BDF8",
                        background: "rgba(56, 189, 248, 0.12)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    >
                      {currentPath}
                    </code>
                  </div>

                  {/* Switch Role Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748B", marginRight: "2px" }}>Role:</span>
                    {(["admin", "operator", "viewer"] as const).map((r) => {
                      const isActive = activeUser?.role === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleSwitchRole(r)}
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 7px",
                            borderRadius: "6px",
                            border: isActive ? "1px solid #818CF8" : "1px solid rgba(255,255,255,0.1)",
                            background: isActive ? "rgba(99, 102, 241, 0.3)" : "rgba(255,255,255,0.04)",
                            color: isActive ? "#C7D2FE" : "#94A3B8",
                            cursor: "pointer",
                            textTransform: "capitalize",
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Action Buttons: Theme & Position */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                    <button
                      onClick={toggleTheme}
                      title="Toggle Tema Gelap/Terang"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "#FCD34D",
                        background: "rgba(252, 211, 77, 0.1)",
                        border: "1px solid rgba(252, 211, 77, 0.2)",
                        borderRadius: "6px",
                        padding: "3px 8px",
                        cursor: "pointer",
                      }}
                    >
                      {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
                      <span>{theme === "dark" ? "Light" : "Dark"}</span>
                    </button>

                    <button
                      onClick={() => setPosition(position === "bottom-right" ? "top-right" : "bottom-right")}
                      title="Ubah Posisi Tombol DEV (Atas/Bawah)"
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        padding: "3px 7px",
                        cursor: "pointer",
                      }}
                    >
                      {position === "bottom-right" ? "📌 Top" : "📌 Btm"}
                    </button>
                  </div>
                </div>

                {/* Search Bar & Category Pills */}
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(0, 0, 0, 0.4)",
                      borderRadius: "10px",
                      padding: "7px 12px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <Search size={15} color="#64748B" />
                    <input
                      type="text"
                      placeholder="Cari nama halaman, rute (/dashboard), atau fitur..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#F8FAFC",
                        fontSize: "12px",
                        width: "100%",
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94A3B8",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
                    {[
                      { id: "all", label: "Semua (9)" },
                      { id: "auth", label: "🔐 Auth (4)" },
                      { id: "iot", label: "📊 IoT Monitor (2)" },
                      { id: "config", label: "⚙️ Konfigurasi (3)" },
                    ].map((tab) => {
                      const isActive = activeCategory === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveCategory(tab.id as any)}
                          style={{
                            fontSize: "11px",
                            fontWeight: isActive ? 600 : 400,
                            padding: "4px 10px",
                            borderRadius: "16px",
                            border: isActive ? "1px solid #6366F1" : "1px solid rgba(255, 255, 255, 0.06)",
                            background: isActive ? "#4F46E5" : "rgba(255, 255, 255, 0.04)",
                            color: isActive ? "#FFFFFF" : "#94A3B8",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* List Halaman / Cards (Scrollable) */}
              <div
                style={{
                  padding: "12px 16px 24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {filteredRoutes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "#64748B" }}>
                    <Compass size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "13px" }}>Tidak ada halaman yang cocok dengan pencarian.</p>
                  </div>
                ) : (
                  filteredRoutes.map((item) => {
                    const isCurrent = currentPath === item.path;
                    const IconComponent = item.icon;

                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleNavigate(item.path)}
                        style={{
                          background: isCurrent
                            ? "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.7) 100%)"
                            : "rgba(30, 41, 59, 0.5)",
                          border: isCurrent
                            ? `1.5px solid ${item.color}`
                            : "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "14px",
                          padding: "12px 14px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          position: "relative",
                          transition: "border-color 0.2s ease, background 0.2s ease",
                          boxShadow: isCurrent ? `0 4px 16px -2px ${item.color}33` : "none",
                        }}
                      >
                        {/* Baris Atas: Icon, Judul, Path, Badge Aktif */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                background: `${item.color}22`,
                                border: `1px solid ${item.color}55`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: item.color,
                              }}
                            >
                              <IconComponent size={18} />
                            </div>

                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "13px", fontWeight: 700, color: "#F8FAFC" }}>
                                  {item.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: "9px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.08)",
                                    color: "#94A3B8",
                                    fontWeight: 500,
                                  }}
                                >
                                  {item.badge}
                                </span>
                              </div>
                              <code
                                style={{
                                  fontSize: "11px",
                                  color: item.color,
                                  fontFamily: "monospace",
                                  fontWeight: 600,
                                }}
                              >
                                {item.path}
                              </code>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isCurrent ? (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#34D399",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                }}
                              >
                                <Check size={11} /> Aktif
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "2px",
                                  fontSize: "11px",
                                  color: "#64748B",
                                  padding: "3px 6px",
                                }}
                              >
                                Buka <ChevronRight size={13} />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Deskripsi Singkat Halaman */}
                        <p style={{ margin: 0, fontSize: "11.5px", color: "#94A3B8", lineHeight: 1.4 }}>
                          {item.description}
                        </p>

                        {/* Checklist Apa yang Bisa Di-test */}
                        <div
                          style={{
                            background: "rgba(15, 23, 42, 0.6)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "3px",
                            border: "1px solid rgba(255, 255, 255, 0.04)",
                          }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                            Fitur Pengujian:
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {item.testChecklist.map((tc, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "10.5px",
                                  color: "#CBD5E1",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                • {tc}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Footer Modal: Petunjuk Pembersihan */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(10, 15, 29, 0.95)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#64748B",
                }}
              >
                <span>
                  🛡️ Mode Produksi: <b>Otomatis nonaktif saat build</b>
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem("gh_active_user");
                    localStorage.removeItem("gh_users");
                    alert("Data LocalStorage berhasil di-reset ke nilai bawaan pabrik!");
                    window.location.reload();
                  }}
                  title="Reset seluruh data lokal aplikasi"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F87171",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                  }}
                >
                  <RotateCcw size={12} /> Reset Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

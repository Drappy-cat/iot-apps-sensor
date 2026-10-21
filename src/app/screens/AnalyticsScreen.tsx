import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Droplets,
  AlertTriangle,
  Calendar,
  X,
  CheckCircle2,
  Sprout,
  Activity,
  Zap,
  Layers,
  FileText,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";
import { generateNPKSoilPDFReport } from "../services/pdfReportService";
import { hapticLight, hapticSuccess } from "../services/hapticsService";
import { getActiveUser } from "../utils/authHelper";

export interface SoilDataPoint {
  time: string;
  moisture: number;
  suhu: number;
  ph: number;
  ec: number;
  n: number;
  p: number;
  k: number;
}

const dataHariIni: SoilDataPoint[] = [
  { time: "06:00", moisture: 72.0, suhu: 23.1, ph: 6.6, ec: 1250, n: 45, p: 32, k: 110 },
  { time: "08:00", moisture: 68.5, suhu: 24.5, ph: 6.7, ec: 1300, n: 46, p: 34, k: 112 },
  { time: "10:00", moisture: 64.2, suhu: 27.2, ph: 6.7, ec: 1350, n: 48, p: 35, k: 115 },
  { time: "12:00", moisture: 58.0, suhu: 29.8, ph: 6.8, ec: 1420, n: 47, p: 35, k: 116 },
  { time: "14:00", moisture: 63.4, suhu: 29.1, ph: 6.8, ec: 1390, n: 49, p: 36, k: 118 },
  { time: "16:00", moisture: 66.8, suhu: 26.5, ph: 6.7, ec: 1340, n: 48, p: 35, k: 115 },
  { time: "18:00", moisture: 69.1, suhu: 24.8, ph: 6.6, ec: 1310, n: 47, p: 34, k: 114 },
  { time: "20:00", moisture: 71.0, suhu: 23.9, ph: 6.6, ec: 1280, n: 46, p: 33, k: 112 },
  { time: "22:00", moisture: 71.8, suhu: 23.2, ph: 6.6, ec: 1260, n: 45, p: 33, k: 111 },
];

const data7Hari: SoilDataPoint[] = [
  { time: "Senin", moisture: 67.2, suhu: 25.4, ph: 6.6, ec: 1320, n: 46, p: 33, k: 112 },
  { time: "Selasa", moisture: 65.8, suhu: 26.1, ph: 6.7, ec: 1350, n: 48, p: 35, k: 115 },
  { time: "Rabu", moisture: 69.0, suhu: 24.8, ph: 6.6, ec: 1290, n: 47, p: 34, k: 114 },
  { time: "Kamis", moisture: 64.5, suhu: 25.9, ph: 6.7, ec: 1380, n: 49, p: 36, k: 118 },
  { time: "Jumat", moisture: 66.1, suhu: 26.5, ph: 6.8, ec: 1360, n: 48, p: 35, k: 115 },
  { time: "Sabtu", moisture: 63.8, suhu: 27.2, ph: 6.7, ec: 1410, n: 50, p: 37, k: 120 },
  { time: "Minggu", moisture: 68.4, suhu: 25.7, ph: 6.6, ec: 1330, n: 47, p: 34, k: 113 },
];

const data30Hari: SoilDataPoint[] = [
  { time: "01 Mei", moisture: 66.4, suhu: 25.1, ph: 6.6, ec: 1310, n: 45, p: 32, k: 110 },
  { time: "05 Mei", moisture: 65.1, suhu: 25.4, ph: 6.7, ec: 1340, n: 47, p: 34, k: 114 },
  { time: "10 Mei", moisture: 63.8, suhu: 26.2, ph: 6.7, ec: 1380, n: 49, p: 36, k: 118 },
  { time: "15 Mei", moisture: 67.0, suhu: 25.8, ph: 6.6, ec: 1320, n: 46, p: 33, k: 112 },
  { time: "20 Mei", moisture: 68.5, suhu: 24.9, ph: 6.6, ec: 1300, n: 48, p: 35, k: 115 },
  { time: "25 Mei", moisture: 64.2, suhu: 26.7, ph: 6.8, ec: 1400, n: 51, p: 38, k: 122 },
  { time: "30 Mei", moisture: 66.0, suhu: 26.0, ph: 6.7, ec: 1350, n: 48, p: 35, k: 115 },
];

export function getFilteredData(filter: string): SoilDataPoint[] {
  if (filter === "Hari Ini") return dataHariIni;
  if (filter === "7 Hari") return data7Hari;
  if (filter === "30 Hari") return data30Hari;
  return dataHariIni;
}

const activityLog = [
  {
    id: 1,
    icon: Droplets,
    iconColor: "#22C55E",
    iconBg: "#F0FDF4",
    time: "14:05 WIB",
    desc: "Kelembaban tanah turun ke 58%. Pompa irigasi tetes diaktifkan selama 10 menit.",
    type: "success",
  },
  {
    id: 2,
    icon: AlertTriangle,
    iconColor: "#F97316",
    iconBg: "#FFF7ED",
    time: "11:30 WIB",
    desc: "Unsur Nitrogen terdeteksi 28 mg/kg (sedikit di bawah target ideal).",
    type: "warning",
  },
  {
    id: 3,
    icon: Sprout,
    iconColor: "var(--text-muted)",
    iconBg: "var(--bg-app)",
    time: "06:15 WIB",
    desc: "Penyiraman nutrisi otomatis selesai. pH tanah stabil di angka 6.7.",
    type: "info",
  },
];

const filters = ["Hari Ini", "7 Hari", "30 Hari", "Lainnya"];
const activityFilters = ["Semua", "Peringatan", "Sukses", "Info"];
const chartModes = [
  { id: "moisture_temp", label: "Kelembaban & Suhu" },
  { id: "npk", label: "Unsur NPK" },
  { id: "ph_ec", label: "pH & EC" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "10px 14px",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.12)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: p.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {p.name.toUpperCase()}: {p.value}
              {p.name === "suhu" ? "°C" : p.name === "moisture" ? "%" : p.name === "ec" ? " µS" : p.name === "ph" ? "" : " mg/kg"}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsScreen() {
  const [activeFilter, setActiveFilter] = useState(() => localStorage.getItem("iot_analytics_filter") || "Hari Ini");
  const [activeChartMode, setActiveChartMode] = useState<"moisture_temp" | "npk" | "ph_ec">("moisture_temp");
  const [activeActivityFilter, setActiveActivityFilter] = useState(() => localStorage.getItem("iot_analytics_activity_filter") || "Semua");
  const [isDateModalOpen, setDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const currentData = getFilteredData(activeFilter);
  const avgMoisture = (currentData.reduce((acc, curr) => acc + curr.moisture, 0) / currentData.length).toFixed(1);
  const avgTemp = (currentData.reduce((acc, curr) => acc + curr.suhu, 0) / currentData.length).toFixed(1);

  let totalActivations = 12;
  if (activeFilter === "Hari Ini") totalActivations = 4;
  else if (activeFilter === "7 Hari") totalActivations = 28;
  else if (activeFilter === "30 Hari") totalActivations = 112;

  useEffect(() => { localStorage.setItem("iot_analytics_filter", activeFilter); }, [activeFilter]);
  useEffect(() => { localStorage.setItem("iot_analytics_activity_filter", activeActivityFilter); }, [activeActivityFilter]);

  const handleExportCSV = () => {
    hapticSuccess();
    let csvContent = "Waktu,Kelembaban (%),Suhu Tanah (°C),pH Tanah,EC (uS/cm),Nitrogen (mg/kg),Fosfor (mg/kg),Kalium (mg/kg)\n";
    currentData.forEach(row => {
      csvContent += `${row.time},${row.moisture},${row.suhu},${row.ph},${row.ec},${row.n},${row.p},${row.k}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Riwayat_NPK_${activeFilter.replace(/\s+/g, "_")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportSuccess(true);
    setToastMessage("Data riwayat CSV berhasil diunduh!");
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleExportPDF = () => {
    hapticSuccess();
    setIsExportingPDF(true);
    try {
      const activeUser = getActiveUser();
      const operatorName = activeUser.namaLengkap || activeUser.name || "Operator Lapangan";
      generateNPKSoilPDFReport(currentData, activeFilter, operatorName);
      setToastMessage("Laporan PDF resmi berhasil dicetak & diunduh!");
    } catch (err) {
      console.error("Gagal mencetak PDF:", err);
      setToastMessage("Gagal membuat laporan PDF.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleFilterClick = (filter: string) => {
    hapticLight();
    if (filter === "Lainnya") {
      setDateModalOpen(true);
    } else {
      setActiveFilter(filter);
    }
  };

  const filteredActivityLog = activityLog.filter(item => {
    if (activeActivityFilter === "Semua") return true;
    if (activeActivityFilter === "Peringatan") return item.type === "warning";
    if (activeActivityFilter === "Sukses") return item.type === "success";
    if (activeActivityFilter === "Info") return item.type === "info";
    return false;
  });

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
        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>
          Riwayat & Analitik NPK
        </span>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Filter Chips */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {filters.map((f) => (
            <button
              key={f}
              className="no-invert"
              onClick={() => handleFilterClick(f)}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: activeFilter === f ? "none" : "1.5px solid var(--border-subtle)",
                background: activeFilter === f ? "#3B82F6" : "var(--bg-card)",
                color: activeFilter === f ? "white" : "var(--text-muted)",
                fontSize: "13px",
                fontWeight: activeFilter === f ? 700 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.2s",
                boxShadow: activeFilter === f ? "0px 4px 10px rgba(59,130,246,0.3)" : "none",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Chart Card */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: "18px 16px 12px",
            boxShadow: "var(--glow-card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Grafik Parameter
            </span>

            {/* Mode switch pills */}
            <div style={{ display: "flex", gap: "4px", background: "var(--bg-hover)", borderRadius: "10px", padding: "2px" }}>
              {chartModes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    hapticLight();
                    setActiveChartMode(m.id as any);
                  }}
                  style={{
                    background: activeChartMode === m.id ? "var(--bg-card)" : "transparent",
                    color: activeChartMode === m.id ? "#3B82F6" : "var(--text-muted)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: activeChartMode === m.id ? 700 : 500,
                    cursor: "pointer",
                    boxShadow: activeChartMode === m.id ? "0px 2px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorK" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />

                {activeChartMode === "moisture_temp" && (
                  <>
                    <Area type="monotone" dataKey="moisture" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMoisture)" />
                    <Area type="monotone" dataKey="suhu" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTemp)" />
                  </>
                )}

                {activeChartMode === "npk" && (
                  <>
                    <Area type="monotone" dataKey="n" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorN)" />
                    <Area type="monotone" dataKey="p" stroke="#EA580C" strokeWidth={2.5} fillOpacity={1} fill="url(#colorP)" />
                    <Area type="monotone" dataKey="k" stroke="#7C3AED" strokeWidth={2.5} fillOpacity={1} fill="url(#colorK)" />
                  </>
                )}

                {activeChartMode === "ph_ec" && (
                  <>
                    <Area type="monotone" dataKey="ph" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPH)" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "var(--glow-card)",
            }}
          >
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Rata-rata Kelembaban</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)" }}>{avgMoisture}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>%</span>
            </div>
            <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 600 }}>Tercatat Stabil</span>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "16px",
              padding: "16px",
              boxShadow: "var(--glow-card)",
            }}
          >
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Rata-rata Suhu</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)" }}>{avgTemp}</span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>°C</span>
            </div>
            <span style={{ fontSize: "11px", color: "#16A34A", fontWeight: 600 }}>Zona Ideal Perakaran</span>
          </div>
        </div>

        {/* Activity Log Section */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Log Kejadian Tanah</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                onClick={handleExportCSV}
                title="Ekspor data tabel ke format CSV / Excel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <Download size={13} color="#3B82F6" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                title="Cetak & Unduh Laporan PDF Resmi Lengkap (A4)"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  background: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "white",
                  cursor: isExportingPDF ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.35)",
                  transition: "all 0.2s",
                }}
              >
                {isExportingPDF ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <FileText size={13} />
                )}
                {isExportingPDF ? "Mencetak..." : "Cetak PDF"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredActivityLog.map((log) => {
              const IconComp = log.icon;
              return (
                <div
                  key={log.id}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    boxShadow: "var(--glow-card)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      background: log.iconBg,
                      borderRadius: "10px",
                      padding: "8px",
                      color: log.iconColor,
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{log.time}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.4 }}>
                      {log.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Range Modal */}
      <AnimatePresence>
        {isDateModalOpen && (
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
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Pilih Rentang Tanggal</span>
                <button
                  onClick={() => setDateModalOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    Tanggal Akhir
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

              <button
                onClick={() => {
                  if (startDate && endDate) {
                    setActiveFilter(`${startDate} - ${endDate}`);
                  }
                  setDateModalOpen(false);
                }}
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
                Terapkan Filter
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              background: "#1E293B",
              color: "white",
              padding: "12px 20px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.1)",
              maxWidth: "90%",
            }}
          >
            <CheckCircle2 size={18} color="#22C55E" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
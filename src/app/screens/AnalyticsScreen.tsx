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
import { Download, Wind, Flame, AlertTriangle, Calendar, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BottomNav } from "../components/BottomNav";

export interface DataPoint {
  time: string;
  suhu: number;
  kelembaban: number;
}

const dataHariIni: DataPoint[] = [
  { time: "06:00", suhu: 22.1, kelembaban: 75 },
  { time: "08:00", suhu: 24.3, kelembaban: 70 },
  { time: "10:00", suhu: 27.5, kelembaban: 62 },
  { time: "12:00", suhu: 30.2, kelembaban: 53 },
  { time: "14:00", suhu: 29.4, kelembaban: 58 },
  { time: "16:00", suhu: 26.8, kelembaban: 64 },
  { time: "18:00", suhu: 24.1, kelembaban: 71 },
  { time: "20:00", suhu: 23.0, kelembaban: 74 },
  { time: "22:00", suhu: 22.5, kelembaban: 76 },
];

const data7Hari: DataPoint[] = [
  { time: "Senin", suhu: 25.4, kelembaban: 65 },
  { time: "Selasa", suhu: 26.1, kelembaban: 63 },
  { time: "Rabu", suhu: 24.8, kelembaban: 68 },
  { time: "Kamis", suhu: 25.9, kelembaban: 64 },
  { time: "Jumat", suhu: 26.5, kelembaban: 61 },
  { time: "Sabtu", suhu: 27.2, kelembaban: 59 },
  { time: "Minggu", suhu: 25.7, kelembaban: 66 },
];

const data30Hari: DataPoint[] = [
  { time: "01 Mei", suhu: 25.1, kelembaban: 66 },
  { time: "04 Mei", suhu: 25.4, kelembaban: 64 },
  { time: "07 Mei", suhu: 26.2, kelembaban: 62 },
  { time: "10 Mei", suhu: 25.8, kelembaban: 65 },
  { time: "13 Mei", suhu: 24.9, kelembaban: 67 },
  { time: "16 Mei", suhu: 26.7, kelembaban: 61 },
  { time: "19 Mei", suhu: 27.1, kelembaban: 59 },
  { time: "22 Mei", suhu: 25.5, kelembaban: 64 },
  { time: "25 Mei", suhu: 26.3, kelembaban: 63 },
  { time: "28 Mei", suhu: 25.9, kelembaban: 65 },
  { time: "31 Mei", suhu: 26.0, kelembaban: 64 },
];

export function getFilteredData(filter: string): DataPoint[] {
  if (filter === "Hari Ini") return dataHariIni;
  if (filter === "7 Hari") return data7Hari;
  if (filter === "30 Hari") return data30Hari;
  
  // Deterministic custom range fallback
  return [
    { time: "Tgl 1", suhu: 25.3, kelembaban: 64 },
    { time: "Tgl 5", suhu: 26.0, kelembaban: 62 },
    { time: "Tgl 10", suhu: 25.8, kelembaban: 65 },
    { time: "Tgl 15", suhu: 26.5, kelembaban: 61 },
    { time: "Tgl 20", suhu: 27.1, kelembaban: 59 },
    { time: "Tgl 25", suhu: 25.4, kelembaban: 66 },
    { time: "Tgl 28", suhu: 26.2, kelembaban: 63 },
    { time: "Tgl 30", suhu: 25.9, kelembaban: 65 },
  ];
}

const activityLog = [
  {
    id: 1,
    icon: Wind,
    iconColor: "#22C55E",
    iconBg: "#F0FDF4",
    time: "14:05 WIB",
    desc: "Suhu ruangan mencapai 30°C. Kipas sirkulasi otomatis diaktifkan.",
    type: "success",
  },
  {
    id: 2,
    icon: AlertTriangle,
    iconColor: "#F97316",
    iconBg: "#FFF7ED",
    time: "11:30 WIB",
    desc: "Kelembaban turun ke 55%. Sistem mencatat kondisi di luar batas optimal.",
    type: "warning",
  },
  {
    id: 3,
    icon: Flame,
    iconColor: "var(--text-muted)",
    iconBg: "var(--bg-app)",
    time: "06:15 WIB",
    desc: "Pemanas dinonaktifkan. Suhu pagi mencapai target 24°C.",
    type: "info",
  },
];

const filters = ["Hari Ini", "7 Hari", "30 Hari", "Lainnya"];
const activityFilters = ["Semua", "Peringatan", "Sukses", "Info"];
const activityFilterColors: { [key: string]: { border: string, bg: string, text: string } } = {
  "Semua": { border: "var(--border-subtle)", bg: "var(--bg-card)", text: "var(--text-muted)" },
  "Peringatan": { border: "#F97316", bg: "#FFF7ED", text: "#F97316" },
  "Sukses": { border: "#22C55E", bg: "#F0FDF4", text: "#22C55E" },
  "Info": { border: "var(--text-muted)", bg: "var(--bg-app)", text: "var(--text-muted)" },
};

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
              {p.value}
              {p.name === "suhu" ? "°C" : "%"}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsScreen() {
  const [activeFilter, setActiveFilter] = useState(() => localStorage.getItem("gh_analytics_filter") || "Hari Ini");
  const [activeActivityFilter, setActiveActivityFilter] = useState(() => localStorage.getItem("gh_analytics_activity_filter") || "Semua");
  const [isDateModalOpen, setDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showSuhu, setShowSuhu] = useState(() => {
    const saved = localStorage.getItem("gh_analytics_show_suhu");
    return saved !== null ? saved === "true" : true;
  });
  const [showKelembaban, setShowKelembaban] = useState(() => {
    const saved = localStorage.getItem("gh_analytics_show_kelembaban");
    return saved !== null ? saved === "true" : true;
  });
  const [exportSuccess, setExportSuccess] = useState(false);
  const currentData = getFilteredData(activeFilter);
  const avgTemp = (currentData.reduce((acc, curr) => acc + curr.suhu, 0) / currentData.length).toFixed(1);
  const avgRH = (currentData.reduce((acc, curr) => acc + curr.kelembaban, 0) / currentData.length).toFixed(1);

  let totalActivations = 12;
  if (activeFilter === "Hari Ini") totalActivations = 8;
  else if (activeFilter === "7 Hari") totalActivations = 54;
  else if (activeFilter === "30 Hari") totalActivations = 216;
  else totalActivations = 32;

  useEffect(() => { localStorage.setItem("gh_analytics_filter", activeFilter); }, [activeFilter]);
  useEffect(() => { localStorage.setItem("gh_analytics_activity_filter", activeActivityFilter); }, [activeActivityFilter]);
  useEffect(() => { localStorage.setItem("gh_analytics_show_suhu", showSuhu.toString()); }, [showSuhu]);
  useEffect(() => { localStorage.setItem("gh_analytics_show_kelembaban", showKelembaban.toString()); }, [showKelembaban]);

  const handleExportCSV = () => {
    let csvContent = "Waktu,Suhu (°C),Kelembaban (%)\n";
    currentData.forEach(row => {
      csvContent += `${row.time},${row.suhu},${row.kelembaban}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Riwayat_Sensor_${activeFilter.replace(/\s+/g, "_")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleFilterClick = (filter: string) => {
    if (filter === "Lainnya") {
      setDateModalOpen(true);
    } else {
      setActiveFilter(filter);
    }
  };

  const handleApplyDateRange = () => {
    console.log("Date range applied:", { startDate, endDate });
    setActiveFilter(`Dari ${startDate} ke ${endDate}`);
    setDateModalOpen(false);
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
        <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Riwayat Data</span>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>Grafik Sensor</span>
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                onClick={() => setShowSuhu(!showSuhu)}
              >
                <span
                  style={{
                    width: "10px",
                    height: "3px",
                    background: showSuhu ? "#F97316" : "var(--border-subtle)",
                    borderRadius: "2px",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Suhu</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                onClick={() => setShowKelembaban(!showKelembaban)}
              >
                <span
                  style={{
                    width: "10px",
                    height: "3px",
                    background: showKelembaban ? "#3B82F6" : "var(--border-subtle)",
                    borderRadius: "2px",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>Kelembaban</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={currentData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSuhu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorKelembaban" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-hover)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "var(--icon-muted)", fontFamily: "'Inter', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--icon-muted)", fontFamily: "'Inter', sans-serif" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {showSuhu && (
                <Area
                  type="monotone"
                  dataKey="suhu"
                  name="suhu"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  fill="url(#colorSuhu)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              )}
              {showKelembaban && (
                <Area
                  type="monotone"
                  dataKey="kelembaban"
                  name="kelembaban"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#colorKelembaban)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {[
            { label: "Rata-rata Suhu", value: `${avgTemp}°C`, color: "#F97316" },
            { label: "Rata-rata RH", value: `${avgRH}%`, color: "#3B82F6" },
            { label: "Total Aktivasi", value: `${totalActivations}x`, color: "#22C55E" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "var(--bg-card)",
                borderRadius: "12px",
                padding: "12px 10px",
                boxShadow: "0px 2px 6px rgba(0,0,0,0.04)",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "18px", fontWeight: 800, color: stat.color, marginBottom: "2px" }}>{stat.value}</p>
              <p style={{ fontSize: "10px", color: "var(--icon-muted)", fontWeight: 400, lineHeight: "1.3" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Activity Log */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
              Aktivitas Terakhir
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {activityFilters.map((f) => (
                <button
                  key={f}
                  className="no-invert"
                  onClick={() => setActiveActivityFilter(f)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    border: `1.5px solid ${activeActivityFilter === f ? activityFilterColors[f].border : 'var(--border-subtle)'}`,
                    background: activeActivityFilter === f ? activityFilterColors[f].bg : 'var(--bg-card)',
                    color: activeActivityFilter === f ? activityFilterColors[f].text : 'var(--text-muted)',
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredActivityLog.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    padding: "14px",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.04)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    className="no-invert"
                    style={{
                      background: item.iconBg,
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={item.iconColor} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--icon-muted)", marginBottom: "3px" }}>
                      {item.time}
                    </p>
                    <p style={{ fontSize: "13px", fontWeight: 400, color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Range Modal */}
      {isDateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '16px',
            padding: '24px',
            width: 'calc(100% - 40px)',
            maxWidth: '340px',
            fontFamily: "'Inter', sans-serif",
            boxShadow: "var(--glow-card)",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Pilih Rentang Tanggal</h3>
              <button onClick={() => setDateModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif",
                }}/>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: "'Inter', sans-serif",
                }}/>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setDateModalOpen(false)} style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1.5px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Batal
              </button>
              <button onClick={handleApplyDateRange} style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: '#3B82F6',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Success Toast */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div
            className="no-invert"
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            style={{
              position: "fixed",
              bottom: "160px",
              left: "50%",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: "12px",
              padding: "12px 20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0px 8px 24px rgba(34, 197, 94, 0.2)",
              zIndex: 100,
              width: "max-content",
            }}
          >
            <CheckCircle2 size={20} color="#16A34A" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#15803D" }}>Berhasil mengunduh CSV!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB - Download */}
      <motion.button
        className="no-invert"
        whileTap={{ scale: 0.9 }}
        onClick={handleExportCSV}
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
        <Download size={22} color="white" strokeWidth={2} />
      </motion.button>

      <BottomNav />
    </div>
  );
}
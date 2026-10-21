/**
 * PDF Report Service – Comprehensive NPK 7-in-1 Soil Report Generator
 *
 * Generates a professionally formatted A4 PDF report containing:
 * - Official header with document info
 * - Executive summary KPI cards (averages, min/max)
 * - Detailed sensor data table (jspdf-autotable)
 * - Agronomic recommendations & operator notes
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SoilDataPoint } from "../screens/AnalyticsScreen";

// ─── Helper Utilities ────────────────────────────────────────────────
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function avg(arr: number[]): string {
  if (arr.length === 0) return "0";
  return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
}

function minVal(arr: number[]): string {
  return Math.min(...arr).toFixed(1);
}

function maxVal(arr: number[]): string {
  return Math.max(...arr).toFixed(1);
}

function getMoistureStatus(val: number): string {
  if (val < 50) return "Kering";
  if (val > 80) return "Basah";
  return "Optimal";
}

function getPhStatus(val: number): string {
  if (val < 6.0) return "Asam";
  if (val > 7.5) return "Basa";
  return "Netral";
}

function getNPKStatus(n: number, p: number, k: number): string {
  const issues: string[] = [];
  if (n < 30) issues.push("N Rendah");
  if (p < 20) issues.push("P Rendah");
  if (k < 70) issues.push("K Rendah");
  return issues.length > 0 ? issues.join(", ") : "Optimal";
}

// ─── Color Palette ───────────────────────────────────────────────────
const COLORS = {
  primary: [29, 78, 216] as [number, number, number],       // #1D4ED8
  primaryLight: [219, 234, 254] as [number, number, number], // #DBEAFE
  success: [34, 197, 94] as [number, number, number],       // #22C55E
  warning: [249, 115, 22] as [number, number, number],      // #F97316
  danger: [239, 68, 68] as [number, number, number],        // #EF4444
  dark: [30, 41, 59] as [number, number, number],           // #1E293B
  muted: [100, 116, 139] as [number, number, number],       // #64748B
  white: [255, 255, 255] as [number, number, number],
  bgLight: [248, 250, 252] as [number, number, number],     // #F8FAFC
  tableBorder: [226, 232, 240] as [number, number, number], // #E2E8F0
};

// ─── Main Export Function ────────────────────────────────────────────
export function generateNPKSoilPDFReport(
  data: SoilDataPoint[],
  filterLabel: string,
  operatorName: string = "Operator Lapangan"
): void {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // ─── PAGE HEADER: Blue Banner ────────────────────────────────────
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 42, "F");

  // Decorative circle (subtle)
  doc.setFillColor(59, 130, 246);
  doc.circle(pageWidth - 25, 20, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text("LAPORAN MONITORING & KONTROL", margin, 16);
  doc.text("KESUBURAN TANAH (NPK 7-IN-1)", margin, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(186, 230, 253); // light blue
  doc.text("IoT Smart Agriculture — Sensor RS485 Modbus", margin, 32);
  doc.text(`Sistem Monitoring Real-Time`, margin, 37);

  y = 50;

  // ─── DOCUMENT INFO ROW ───────────────────────────────────────────
  doc.setFillColor(...COLORS.bgLight);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "F");
  doc.setDrawColor(...COLORS.tableBorder);
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);

  const col1X = margin + 4;
  const col2X = margin + contentWidth / 3;
  const col3X = margin + (contentWidth * 2) / 3;

  doc.text("Tanggal Cetak:", col1X, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(formatDate(new Date()), col1X, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Periode Data:", col2X, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(filterLabel, col2X, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Operator / Petugas:", col3X, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(operatorName, col3X, y + 12);

  y += 30;

  // ─── SECTION 1: EXECUTIVE SUMMARY KPI CARDS ─────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("📊  Ringkasan Eksekutif Parameter Tanah", margin, y);
  y += 8;

  // Compute stats
  const moistures = data.map((d) => d.moisture);
  const temps = data.map((d) => d.suhu);
  const phs = data.map((d) => d.ph);
  const ecs = data.map((d) => d.ec);
  const ns = data.map((d) => d.n);
  const ps = data.map((d) => d.p);
  const ks = data.map((d) => d.k);

  const kpiItems = [
    { label: "Kelembaban", value: `${avg(moistures)}%`, sub: `Min ${minVal(moistures)}% · Max ${maxVal(moistures)}%`, color: COLORS.primary },
    { label: "Suhu Tanah", value: `${avg(temps)}°C`, sub: `Min ${minVal(temps)}°C · Max ${maxVal(temps)}°C`, color: [14, 165, 233] as [number, number, number] },
    { label: "pH Tanah", value: avg(phs), sub: `Min ${minVal(phs)} · Max ${maxVal(phs)}`, color: COLORS.success },
    { label: "EC (µS/cm)", value: avg(ecs), sub: `Min ${minVal(ecs)} · Max ${maxVal(ecs)}`, color: [13, 148, 136] as [number, number, number] },
  ];

  const cardW = (contentWidth - 9) / 4;
  kpiItems.forEach((kpi, i) => {
    const cardX = margin + i * (cardW + 3);

    // Card background
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(cardX, y, cardW, 28, 2, 2, "FD");

    // Color accent bar at top
    doc.setFillColor(...kpi.color);
    doc.rect(cardX, y, cardW, 3, "F");
    // Round top corners by re-drawing the rounded rect border
    doc.roundedRect(cardX, y, cardW, 28, 2, 2, "S");

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.label, cardX + cardW / 2, y + 10, { align: "center" });

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.dark);
    doc.text(kpi.value, cardX + cardW / 2, y + 18, { align: "center" });

    // Subtext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.sub, cardX + cardW / 2, y + 23, { align: "center" });
  });

  y += 34;

  // NPK Summary row
  const npkItems = [
    { label: "Nitrogen (N)", value: `${avg(ns)} mg/kg`, status: Number(avg(ns)) >= 30 ? "Optimal" : "Rendah" },
    { label: "Fosfor (P)", value: `${avg(ps)} mg/kg`, status: Number(avg(ps)) >= 20 ? "Optimal" : "Rendah" },
    { label: "Kalium (K)", value: `${avg(ks)} mg/kg`, status: Number(avg(ks)) >= 70 ? "Optimal" : "Rendah" },
  ];

  const npkCardW = (contentWidth - 6) / 3;
  npkItems.forEach((item, i) => {
    const cardX = margin + i * (npkCardW + 3);

    doc.setFillColor(...COLORS.bgLight);
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(cardX, y, npkCardW, 18, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(item.label, cardX + 4, y + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text(item.value, cardX + 4, y + 13);

    // Status badge
    const isOptimal = item.status === "Optimal";
    doc.setFillColor(...(isOptimal ? COLORS.success : COLORS.warning));
    doc.roundedRect(cardX + npkCardW - 22, y + 5, 18, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...COLORS.white);
    doc.text(item.status, cardX + npkCardW - 13, y + 10.5, { align: "center" });
  });

  y += 26;

  // ─── SECTION 2: DATA TABLE ──────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("📋  Tabel Data Sensor Lengkap", margin, y);
  y += 6;

  const tableHead = [
    ["No", "Waktu", "Kelembaban (%)", "Suhu (°C)", "pH", "EC (µS/cm)", "N (mg/kg)", "P (mg/kg)", "K (mg/kg)", "Status"],
  ];

  const tableBody = data.map((row, idx) => [
    String(idx + 1),
    row.time,
    String(row.moisture),
    String(row.suhu),
    String(row.ph),
    String(row.ec),
    String(row.n),
    String(row.p),
    String(row.k),
    getNPKStatus(row.n, row.p, row.k),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: COLORS.dark,
      cellPadding: 2,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249], // slate-100
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      9: { cellWidth: 20, fontSize: 6 },
    },
    didParseCell: (data) => {
      // Color the "Status" column based on value
      if (data.section === "body" && data.column.index === 9) {
        const val = data.cell.raw as string;
        if (val !== "Optimal") {
          data.cell.styles.textColor = COLORS.warning;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = COLORS.success;
        }
      }
    },
  });

  // Get final Y position after table
  y = (doc as any).lastAutoTable?.finalY ?? y + 20;
  y += 10;

  // Check if we need a new page for recommendations
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // ─── SECTION 3: AGRONOMIC RECOMMENDATIONS ──────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text("🌱  Rekomendasi Agronomi & Tindakan", margin, y);
  y += 8;

  // Generate recommendations based on data averages
  const recommendations: string[] = [];
  const avgMoisture = Number(avg(moistures));
  const avgPh = Number(avg(phs));
  const avgN = Number(avg(ns));
  const avgP = Number(avg(ps));
  const avgK = Number(avg(ks));
  const avgEC = Number(avg(ecs));

  if (avgMoisture < 50) {
    recommendations.push(
      `Kelembaban tanah rata-rata rendah (${avgMoisture}%). Disarankan penyiraman irigasi tetes dengan interval 2x sehari.`
    );
  } else if (avgMoisture > 80) {
    recommendations.push(
      `Kelembaban tanah rata-rata tinggi (${avgMoisture}%). Kurangi frekuensi irigasi dan periksa sistem drainase.`
    );
  } else {
    recommendations.push(
      `Kelembaban tanah rata-rata stabil di ${avgMoisture}%. Pertahankan pola irigasi saat ini.`
    );
  }

  if (avgPh < 6.0) {
    recommendations.push(
      `pH tanah masam (${avgPh}). Rekomendasikan penaburan kapur dolomit 1–2 ton/ha untuk menetralkan tanah.`
    );
  } else if (avgPh > 7.5) {
    recommendations.push(
      `pH tanah basa (${avgPh}). Rekomendasikan penambahan bahan organik (kompos/bokashi) untuk menurunkan pH.`
    );
  }

  if (avgN < 30) {
    recommendations.push(
      `Kadar Nitrogen rendah (${avgN} mg/kg). Rekomendasikan pemupukan urea atau ZA dengan dosis 100–150 kg/ha.`
    );
  }
  if (avgP < 20) {
    recommendations.push(
      `Kadar Fosfor rendah (${avgP} mg/kg). Rekomendasikan pemupukan SP-36 atau TSP dengan dosis 50–100 kg/ha.`
    );
  }
  if (avgK < 70) {
    recommendations.push(
      `Kadar Kalium rendah (${avgK} mg/kg). Rekomendasikan pemupukan KCl (Muriate of Potash) 50–100 kg/ha.`
    );
  }
  if (avgEC > 2000) {
    recommendations.push(
      `EC (Salinitas) tinggi (${avgEC} µS/cm). Lakukan pencucian tanah (leaching) dengan irigasi bersih untuk mengurangi akumulasi garam.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Seluruh parameter tanah berada pada rentang optimal. Tidak ada tindakan korektif yang dibutuhkan saat ini."
    );
  }

  // Recommendation box
  doc.setFillColor(...COLORS.bgLight);
  doc.setDrawColor(...COLORS.tableBorder);
  const recBoxH = Math.max(30, recommendations.length * 10 + 10);
  doc.roundedRect(margin, y, contentWidth, recBoxH, 3, 3, "FD");

  // Green left accent bar
  doc.setFillColor(...COLORS.success);
  doc.rect(margin, y, 3, recBoxH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.dark);

  recommendations.forEach((rec, i) => {
    const bulletY = y + 8 + i * 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.success);
    doc.text(`${i + 1}.`, margin + 6, bulletY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    const lines = doc.splitTextToSize(rec, contentWidth - 18);
    doc.text(lines, margin + 12, bulletY);
  });

  y += recBoxH + 12;

  // Check page
  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  // ─── SECTION 4: VERIFICATION / OPERATOR SIGNATURE ──────────────
  doc.setDrawColor(...COLORS.tableBorder);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("Diverifikasi oleh Operator:", margin, y);
  doc.text("Tanggal & Tanda Tangan:", pageWidth / 2 + 10, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.text(operatorName, margin, y + 6);

  // Signature line
  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 + 10, y + 18, pageWidth - margin, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("(                                         )", pageWidth / 2 + 10, y + 22);

  // ─── FOOTER ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFillColor(...COLORS.bgLight);
    doc.rect(0, pageH - 12, pageWidth, 12, "F");
    doc.setDrawColor(...COLORS.tableBorder);
    doc.line(margin, pageH - 12, pageWidth - margin, pageH - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      "IoT Smart NPK Soil Moisture 7-in-1 Monitoring & Control System",
      margin,
      pageH - 5
    );
    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin,
      pageH - 5,
      { align: "right" }
    );
  }

  // ─── SAVE ──────────────────────────────────────────────────────
  const fileName = `Laporan_NPK_${filterLabel.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

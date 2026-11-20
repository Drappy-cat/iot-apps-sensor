/**
 * PDF Report Service – Smart Soil Moisture & pH Report Generator (with NPK 7-in-1 Backward Compatibility)
 *
 * Generates a professionally formatted A4 PDF report containing:
 * - Official header with document info & active operator
 * - Executive summary KPI cards (real averages, min/max, and status evaluations)
 * - Detailed sensor data table (jspdf-autotable) adapted to active sensor fields
 * - Agronomic recommendations & operator verification signature
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

function avg(arr: number[], decimals: number = 1): string {
  if (arr.length === 0) return "0";
  return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(decimals);
}

function minVal(arr: number[], decimals: number = 1): string {
  if (arr.length === 0) return "0";
  return Math.min(...arr).toFixed(decimals);
}

function maxVal(arr: number[], decimals: number = 1): string {
  if (arr.length === 0) return "0";
  return Math.max(...arr).toFixed(decimals);
}

export function getMoistureStatus(val: number): string {
  if (val < 50) return "Kering";
  if (val > 80) return "Basah";
  return "Optimal";
}

export function getPhStatus(val: number): string {
  if (val < 6.0) return "Asam";
  if (val > 7.5) return "Basa";
  return "Netral";
}

export function getCombinedSoilStatus(moisture: number, ph: number): string {
  const issues: string[] = [];
  if (moisture < 50) issues.push("Kering");
  else if (moisture > 80) issues.push("Terlalu Basah");

  if (ph < 6.0) issues.push("pH Asam");
  else if (ph > 7.5) issues.push("pH Basa");

  return issues.length > 0 ? issues.join(", ") : "Optimal";
}

function getNPKStatus(moisture: number, ph: number, n?: number, p?: number, k?: number): string {
  const issues: string[] = [];
  const baseStatus = getCombinedSoilStatus(moisture, ph);
  if (baseStatus !== "Optimal") issues.push(baseStatus);
  if (n !== undefined && n < 30) issues.push("N Rendah");
  if (p !== undefined && p < 20) issues.push("P Rendah");
  if (k !== undefined && k < 70) issues.push("K Rendah");
  return issues.length > 0 ? issues.join(", ") : "Optimal";
}

// ─── Color Palette ───────────────────────────────────────────────────
const COLORS = {
  primary: [29, 78, 216] as [number, number, number],       // #1D4ED8
  primaryLight: [219, 234, 254] as [number, number, number], // #DBEAFE
  success: [34, 197, 94] as [number, number, number],       // #22C55E
  warning: [249, 115, 22] as [number, number, number],      // #F97316
  danger: [239, 68, 68] as [number, number, number],        // #EF4444
  teal: [13, 148, 136] as [number, number, number],         // #0D9488
  sky: [14, 165, 233] as [number, number, number],          // #0EA5E9
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

  // Detect whether dataset includes extended 7-in-1 parameters or focused Moisture + pH
  const hasExtendedNPK = data.some(
    (d) =>
      d.suhu !== undefined ||
      d.ec !== undefined ||
      d.n !== undefined ||
      d.p !== undefined ||
      d.k !== undefined
  );

  // ─── PAGE HEADER: Blue Banner ────────────────────────────────────
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 42, "F");

  // Decorative circle (subtle)
  doc.setFillColor(59, 130, 246);
  doc.circle(pageWidth - 25, 20, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.white);
  doc.text("LAPORAN MONITORING & KONTROL", margin, 16);
  doc.text(
    hasExtendedNPK
      ? "KESUBURAN TANAH (NPK 7-IN-1)"
      : "KELEMBABAN & pH TANAH (SMART AGRICULTURE)",
    margin,
    24
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(186, 230, 253);
  doc.text("IoT Smart Agriculture — Sensor Tanah RS485 Modbus", margin, 32);
  doc.text("Sistem Pemantauan & Otomasi Irigasi Real-Time", margin, 37);

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
  doc.text(formatDate(new Date()), col1X, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Periode Data:", col2X, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(filterLabel, col2X, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Operator / Petugas:", col3X, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(operatorName, col3X, y + 13);

  y += 30;

  // ─── SECTION 1: EXECUTIVE SUMMARY KPI CARDS ─────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COLORS.dark);
  doc.text("1. Ringkasan Eksekutif Parameter Tanah", margin, y);
  y += 7;

  const moistures = data.map((d) => d.moisture);
  const phs = data.map((d) => d.ph);
  const avgMoistNum = Number(avg(moistures, 1));
  const avgPhNum = Number(avg(phs, 2));
  const moistStatus = getMoistureStatus(avgMoistNum);
  const phStatus = getPhStatus(avgPhNum);

  const kpiItems = hasExtendedNPK
    ? (() => {
        const temps = data.map((d) => d.suhu ?? 26.5);
        const ecs = data.map((d) => d.ec ?? 1250);
        return [
          {
            label: "Kelembaban Tanah",
            value: `${avg(moistures, 1)}%`,
            sub: `Min ${minVal(moistures, 1)}% | Max ${maxVal(moistures, 1)}%`,
            color: COLORS.primary,
          },
          {
            label: "Suhu Tanah",
            value: `${avg(temps, 1)} C`,
            sub: `Min ${minVal(temps, 1)} C | Max ${maxVal(temps, 1)} C`,
            color: COLORS.sky,
          },
          {
            label: "pH Tanah",
            value: avg(phs, 2),
            sub: `Min ${minVal(phs, 2)} | Max ${maxVal(phs, 2)}`,
            color: COLORS.success,
          },
          {
            label: "EC (uS/cm)",
            value: avg(ecs, 0),
            sub: `Min ${minVal(ecs, 0)} | Max ${maxVal(ecs, 0)}`,
            color: COLORS.teal,
          },
        ];
      })()
    : [
        {
          label: "Rata-rata Kelembaban",
          value: `${avg(moistures, 1)}%`,
          sub: `Min ${minVal(moistures, 1)}% | Max ${maxVal(moistures, 1)}%`,
          color: COLORS.primary,
        },
        {
          label: "Status Kelembaban",
          value: moistStatus,
          sub: "Rentang Ideal: 50% - 80%",
          color: moistStatus === "Optimal" ? COLORS.success : COLORS.warning,
        },
        {
          label: "Rata-rata pH Tanah",
          value: `${avg(phs, 2)} pH`,
          sub: `Min ${minVal(phs, 2)} | Max ${maxVal(phs, 2)}`,
          color: COLORS.teal,
        },
        {
          label: "Status Keasaman pH",
          value: phStatus,
          sub: "Rentang Ideal: 6.0 - 7.5",
          color: phStatus === "Netral" ? COLORS.success : COLORS.warning,
        },
      ];

  const cardW = (contentWidth - 9) / 4;
  kpiItems.forEach((kpi, i) => {
    const cardX = margin + i * (cardW + 3);

    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.tableBorder);
    doc.roundedRect(cardX, y, cardW, 28, 2, 2, "FD");

    doc.setFillColor(...kpi.color);
    doc.rect(cardX, y, cardW, 3, "F");
    doc.roundedRect(cardX, y, cardW, 28, 2, 2, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.label, cardX + cardW / 2, y + 10, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...COLORS.dark);
    doc.text(kpi.value, cardX + cardW / 2, y + 18, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(...COLORS.muted);
    doc.text(kpi.sub, cardX + cardW / 2, y + 23.5, { align: "center" });
  });

  y += 34;

  // Render NPK Secondary Summary Row ONLY if dataset actually contains NPK values
  if (hasExtendedNPK) {
    const ns = data.map((d) => d.n ?? 45);
    const ps = data.map((d) => d.p ?? 30);
    const ks = data.map((d) => d.k ?? 120);

    const npkItems = [
      { label: "Nitrogen (N)", value: `${avg(ns, 0)} mg/kg`, status: Number(avg(ns, 0)) >= 30 ? "Optimal" : "Rendah" },
      { label: "Fosfor (P)", value: `${avg(ps, 0)} mg/kg`, status: Number(avg(ps, 0)) >= 20 ? "Optimal" : "Rendah" },
      { label: "Kalium (K)", value: `${avg(ks, 0)} mg/kg`, status: Number(avg(ks, 0)) >= 70 ? "Optimal" : "Rendah" },
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

      const isOptimal = item.status === "Optimal";
      doc.setFillColor(...(isOptimal ? COLORS.success : COLORS.warning));
      doc.roundedRect(cardX + npkCardW - 22, y + 5, 18, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...COLORS.white);
      doc.text(item.status, cardX + npkCardW - 13, y + 10.5, { align: "center" });
    });

    y += 25;
  }

  // ─── SECTION 2: DATA TABLE ──────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COLORS.dark);
  doc.text("2. Tabel Riwayat Pembacaan Sensor", margin, y);
  y += 5;

  const tableHead = hasExtendedNPK
    ? [["No", "Waktu", "Kelembaban (%)", "Suhu (C)", "pH", "EC (uS/cm)", "N", "P", "K", "Status Evaluasi"]]
    : [["No", "Waktu Pembacaan", "Kelembaban (%)", "Kategori Kelembaban", "pH Tanah", "Kategori pH", "Status Evaluasi"]];

  const tableBody = hasExtendedNPK
    ? data.map((row, idx) => [
        String(idx + 1),
        row.time,
        `${row.moisture.toFixed(1)}%`,
        row.suhu !== undefined ? `${row.suhu.toFixed(1)}` : "-",
        row.ph.toFixed(2),
        row.ec !== undefined ? String(row.ec) : "-",
        row.n !== undefined ? String(row.n) : "-",
        row.p !== undefined ? String(row.p) : "-",
        row.k !== undefined ? String(row.k) : "-",
        getNPKStatus(row.moisture, row.ph, row.n, row.p, row.k),
      ])
    : data.map((row, idx) => [
        String(idx + 1),
        row.time,
        `${row.moisture.toFixed(1)}%`,
        getMoistureStatus(row.moisture),
        row.ph.toFixed(2),
        getPhStatus(row.ph),
        getCombinedSoilStatus(row.moisture, row.ph),
      ]);

  const statusColIndex = hasExtendedNPK ? 9 : 6;

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
      fontSize: 7.5,
      halign: "center",
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: COLORS.dark,
      cellPadding: 2.2,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
    columnStyles: hasExtendedNPK
      ? {
          0: { cellWidth: 10 },
          1: { cellWidth: 20 },
          9: { cellWidth: 26, fontSize: 6.5 },
        }
      : {
          0: { cellWidth: 12 },
          1: { cellWidth: 32 },
          2: { cellWidth: 28 },
          3: { cellWidth: 30 },
          4: { cellWidth: 22 },
          5: { cellWidth: 24 },
          6: { cellWidth: 30 },
        },
    didParseCell: (cellData) => {
      if (cellData.section === "body" && cellData.column.index === statusColIndex) {
        const val = String(cellData.cell.raw);
        if (val !== "Optimal") {
          cellData.cell.styles.textColor = COLORS.warning;
          cellData.cell.styles.fontStyle = "bold";
        } else {
          cellData.cell.styles.textColor = COLORS.success;
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 20;
  y += 10;

  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  // ─── SECTION 3: AGRONOMIC RECOMMENDATIONS ──────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COLORS.dark);
  doc.text("3. Rekomendasi Agronomi & Tindakan Otomasi", margin, y);
  y += 7;

  const recommendations: string[] = [];

  if (avgMoistNum < 50) {
    recommendations.push(
      `Kelembaban tanah rata-rata rendah (${avgMoistNum}%). Disarankan mengaktifkan pompa irigasi tetes hingga mencapai target setpoint (60% - 75%).`
    );
  } else if (avgMoistNum > 80) {
    recommendations.push(
      `Kelembaban tanah rata-rata tinggi (${avgMoistNum}%). Tunda jadwal penyiraman dan periksa kelancaran drainase bedengan untuk mencegah busuk akar.`
    );
  } else {
    recommendations.push(
      `Kelembaban tanah rata-rata berada pada kategori Optimal (${avgMoistNum}%). Pertahankan jadwal irigasi tetes saat ini.`
    );
  }

  if (avgPhNum < 6.0) {
    recommendations.push(
      `pH tanah tergolong masam (${avgPhNum}). Disarankan aplikasi kapur pertanian (dolomit) sekitar 1 - 2 ton/ha untuk menaikkan pH ke zona netral.`
    );
  } else if (avgPhNum > 7.5) {
    recommendations.push(
      `pH tanah tergolong basa (${avgPhNum}). Disarankan penambahan bahan organik / kompos matang untuk menyeimbangkan keasaman tanah.`
    );
  } else {
    recommendations.push(
      `pH tanah rata-rata berada pada rentang Netral Ideal (${avgPhNum}), mendukung penyerapan unsur hara oleh akar secara maksimal.`
    );
  }

  if (hasExtendedNPK) {
    const ns = data.map((d) => d.n).filter((v): v is number => v !== undefined);
    const ps = data.map((d) => d.p).filter((v): v is number => v !== undefined);
    const ks = data.map((d) => d.k).filter((v): v is number => v !== undefined);
    const ecs = data.map((d) => d.ec).filter((v): v is number => v !== undefined);

    if (ns.length > 0 && Number(avg(ns, 0)) < 30) {
      recommendations.push(
        `Kadar Nitrogen rata-rata rendah (${avg(ns, 0)} mg/kg). Disarankan penambahan pupuk sumber N (Urea/ZA) terukur.`
      );
    }
    if (ps.length > 0 && Number(avg(ps, 0)) < 20) {
      recommendations.push(
        `Kadar Fosfor rata-rata rendah (${avg(ps, 0)} mg/kg). Disarankan aplikasi pupuk SP-36 atau TSP.`
      );
    }
    if (ks.length > 0 && Number(avg(ks, 0)) < 70) {
      recommendations.push(
        `Kadar Kalium rata-rata rendah (${avg(ks, 0)} mg/kg). Disarankan aplikasi pupuk KCl.`
      );
    }
    if (ecs.length > 0 && Number(avg(ecs, 0)) > 2000) {
      recommendations.push(
        `Konduktivitas listrik (EC) tinggi (${avg(ecs, 0)} uS/cm). Lakukan pembilasan air bersih (leaching) untuk menurunkan salinitas.`
      );
    }
  }

  // Recommendation box
  doc.setFillColor(...COLORS.bgLight);
  doc.setDrawColor(...COLORS.tableBorder);
  const recBoxH = Math.max(26, recommendations.length * 11 + 8);
  doc.roundedRect(margin, y, contentWidth, recBoxH, 3, 3, "FD");

  doc.setFillColor(...COLORS.success);
  doc.rect(margin, y, 3, recBoxH, "F");

  recommendations.forEach((rec, i) => {
    const bulletY = y + 8 + i * 11;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.success);
    doc.text(`${i + 1}.`, margin + 6, bulletY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);
    const lines = doc.splitTextToSize(rec, contentWidth - 18);
    doc.text(lines, margin + 12, bulletY);
  });

  y += recBoxH + 12;

  if (y > 250) {
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

  doc.setDrawColor(...COLORS.dark);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 + 10, y + 18, pageWidth - margin, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(`( ${operatorName} )`, pageWidth / 2 + 10, y + 22);

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
      "IoT Smart Soil Moisture & pH Monitoring & Control System",
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
  const fileName = `Laporan_Sensor_Tanah_${filterLabel.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

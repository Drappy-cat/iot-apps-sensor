# 🌿 IoT Smart Soil Moisture & pH Monitoring & Control System with Live Field Camera

[![React](https://img.shields.io/badge/React-18/19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFA611?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8.x-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)

Aplikasi multi-platform (**Web & Android APK**) untuk memantau (*monitoring*) dan mengendalikan (*controlling*) kualitas tanah secara cerdas dan *real-time* berbasis **Kelembaban Tanah (*Soil Moisture*)** dan **pH Tanah**, dilengkapi fitur **Akses Kamera Langsung di Lapangan** serta integrasi **Firebase Realtime Database**.

---

## 🌾 Parameter Sensor yang Dipantau

Aplikasi ini berfokus pada 2 parameter tanah paling esensial dalam pertanian presisi (*smart agriculture*):

| No | Parameter | Satuan | Rentang Normal | Fungsi |
|:---:|:---|:---:|:---:|:---|
| 1 | **Kelembaban Tanah (*Soil Moisture*)** | `%` | 50% – 80% | Menentukan kebutuhan penyiraman irigasi tetes |
| 2 | **pH Tanah** | `pH` | 6.0 – 7.0 (Netral) | Keseimbangan keasaman / kebasaan tanah untuk penyerapan air |

---

## ✨ Fitur Utama Aplikasi

1. **Dashboard Real-Time**:
   - Hero card kelembaban & status pH tanah dengan animasi interaktif.
   - Status koneksi Firebase Live vs Mode Simulasi.
   - Kartu parameter terfokus: Kelembaban (%) dan pH Tanah dengan indikator status otomatis.
   - Kontrol setpoint ambang batas kelembaban tanah.
2. **Kamera Lapangan Langsung (*Live Field Camera*)**:
   - Akses kamera perangkat/webcam langsung di lapangan (`facingMode: environment`).
   - Switch kamera depan / belakang.
   - Ambil foto sampel lapangan (*snapshot capture*) dengan cap watermark waktu dan parameter sensor real-time.
   - Galeri dokumentasi foto lapangan dengan preview dan opsi unduh (*download*).
3. **AI Transparansi Kesuburan Tanah**:
   - Inferensi otomasi pompa irigasi tetes dan pengkondisi pH tanah.
   - Rekomendasi tindakan agronomi otomatis (kapur dolomit untuk tanah asam, bahan organik untuk tanah basa).
4. **Riwayat & Analitik Data (Recharts)**:
   - Grafik area interaktif dengan pilihan mode: *Kelembaban & pH*, *Kelembaban Saja*, atau *pH Tanah Saja*.
   - Filter rentang waktu: *Hari Ini*, *7 Hari*, *30 Hari*, dan *Rentang Kustom*.
   - Ekspor data riwayat sensor ke format **CSV**.
5. **Jadwal Otomasi**:
   - Penjadwalan penyiraman dan pemberian pengkondisi pH tanah otomatis.
6. **Akses Berbasis Peran (RBAC)**:
   - `Admin`: Akses penuh konfigurasi sistem, Firebase, dan mode simulasi.
   - `Operator`: Dapat mengubah setpoint dan melihat data analitik.
   - `Viewer`: Mode pantau saja (*read-only*).
7. **Integrasi Firebase Fleksibel**:
   - Konfigurasi langsung via menu **Pengaturan** di aplikasi atau file `.env`.
   - Otomatis beralih ke Mode Simulasi Realistis jika kredensial belum diisi, sehingga aplikasi selalu siap didemonstrasikan.
7. **Mobile Ready (Capacitor)**:
   - Tampilan frame mobile responsif, siap dikompilasi langsung menjadi aplikasi Android `.apk`.

---

## 🚀 Menjalankan Aplikasi Secara Lokal

### 1. Instal Dependensi
```bash
npm install
```

### 2. Jalankan Mode Pengembangan
```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

### 3. Build untuk Produksi
```bash
npm run build
```

---

## ☁️ Menghubungkan ke Firebase Realtime Database

Sensor (ESP32 / NodeMCU) mengirimkan data dalam format JSON ke Firebase Realtime Database:
```json
{
  "sensor_npk": {
    "moisture": 65.4,
    "temperature": 26.8,
    "ph": 6.7,
    "ec": 1350,
    "nitrogen": 48,
    "phosphorus": 35,
    "potassium": 115,
    "timestamp": 1773302400000
  }
}
```

Di aplikasi, buka menu **Pengaturan** $\rightarrow$ **Integrasi Cloud Firebase**, masukkan `Database URL` dan `API Key` Firebase Anda, lalu klik **Simpan & Hubungkan**. Aplikasi akan otomatis mendengarkan data secara live!

---

## 👥 Tim Pengembang

- **Rizma Indra Pramuda** (25051204370) – Fullstack Developer
- **Putera Al Khalidi** (25051204362) – Front End Developer
- **Leony Andika Triwicaksono** (25051204324) – Penulis

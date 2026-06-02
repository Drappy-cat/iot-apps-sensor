# 🌿 Greenhouse Magetan - IoT Smart Control & Monitoring System

[![React](https://img.shields.io/badge/React-18/19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8.x-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)](https://greenhouse-magetan.vercel.app)

**Greenhouse Magetan** adalah aplikasi *multi-platform* (Web & Android) yang dirancang untuk memantau (*monitoring*) dan mengendalikan (*controlling*) iklim mikro di dalam rumah kaca (*greenhouse*) secara cerdas. Aplikasi ini terintegrasi dengan teknologi Internet of Things (IoT) dan menerapkan sistem pengambilan keputusan cerdas berbasis **Fuzzy Logic**.

Proyek ini dikembangkan sebagai bagian dari program **LPPM (Lembaga Penelitian dan Pengabdian kepada Masyarakat)** untuk digitalisasi dan modernisasi pertanian di Magetan.

---

## Fitur Utama

Aplikasi ini dilengkapi dengan fitur premium untuk manajemen greenhouse modern:

*   **Dasbor Real-time**: Memantau suhu udara, kelembaban, dan prakiraan kondisi cuaca di dalam greenhouse secara instan dan responsif.
*   **Transparansi Fuzzy Logic**: Menampilkan inferensi keputusan AI (Fuzzy Logic) secara langsung, termasuk aturan yang sedang aktif (*rule activation*) dan tingkat keyakinan (*confidence level*) keputusan sistem terhadap aktuator.
*   **Kontrol Setpoint**: Memungkinkan pengguna untuk menyesuaikan target suhu ideal secara manual dengan antarmuka yang dinamis.
*   **Akses Berbasis Peran (RBAC)**: Keamanan ekstra dengan pembatasan hak akses untuk 3 peran pengguna:
    *   `Admin`: Hak akses penuh untuk seluruh konfigurasi dan kontrol sistem.
    *   `Operator`: Dapat mengubah setpoint suhu dan melihat data analitik.
    *   `Viewer`: Hanya memiliki akses memantau data (*read-only*) tanpa bisa mengubah kontrol.
*   **Analisis Grafik Interaktif**: Menyajikan riwayat data lingkungan dalam bentuk chart interaktif menggunakan *Recharts* untuk analisis jangka panjang.
*   **Penjadwalan Otomatis**: Fitur manajemen jadwal aktifnya aktuator (seperti pompa siram atau lampu pemanas) berdasarkan waktu tertentu.
*   **Sistem Notifikasi**: Peringatan waktu nyata (*real-time alerts*) jika parameter lingkungan melebihi batas aman yang ditentukan.
*   **Multiplatform**: Dibangun dengan Capacitor sehingga siap dikompilasi langsung menjadi aplikasi Android (.apk).

---

## 🛠️ Tech Stack & Arsitektur

Aplikasi ini menggunakan teknologi modern guna menjamin performa tinggi, stabilitas, dan tampilan yang memukau:

| Teknologi | Deskripsi |
| :--- | :--- |
| **React & TypeScript** | Fondasi aplikasi untuk logika yang aman, cepat, dan modular. |
| **Tailwind CSS v4** | Manajemen gaya visual modern dengan performa tinggi. |
| **Framer Motion** | Animasi transisi antar-layar dan mikro-interaksi yang mulus (*premium feel*). |
| **Recharts** | Visualisasi data lingkungan greenhouse secara interaktif. |
| **Capacitor** | *Wrapper* native untuk merilis aplikasi web ke platform Android secara instan. |

---

## 📂 Struktur Folder Proyek

Kode sumber diorganisasikan secara rapi mengikuti standar pengembangan React modern:

```bash
src/
├── app/
│   ├── components/  # Komponen UI global (BottomNav, dll)
│   ├── hooks/       # Custom hooks untuk logika state & API
│   ├── screens/     # Layar utama (Dashboard, Analytics, Settings, dll)
│   ├── utils/       # Helper utilitas (autentikasi, format tanggal, dll)
│   ├── App.tsx      # Inisialisasi tema dan routing dasar
│   └── routes.tsx   # Konfigurasi rute navigasi aplikasi
├── assets/          # Aset gambar statis
├── styles/          # File konfigurasi style & CSS global
├── main.tsx         # Main entry point React
└── vite-env.d.ts    # TypeScript environmental declarations
```

---

## 🚀 Memulai Pengembangan (Instalasi Lokal)

Untuk menjalankan proyek ini di perangkat lokal Anda, ikuti langkah-langkah di bawah ini:

### 1. Klon Repositori
```bash
git clone https://github.com/Drappy-cat/greenhouse-magetan.git
cd greenhouse-magetan
```

### 2. Instal Dependensi
Gunakan package manager pilihan Anda (rekomendasi `npm`):
```bash
npm install
```

### 3. Jalankan Server Dev
Jalankan aplikasi pada mode pengembangan:
```bash
npm run dev
```
Buka browser Anda di `http://localhost:5173`.

### 4. Build untuk Produksi
```bash
npm run build
```

---

## 🤖 Integrasi Android (Capacitor)

Untuk memaketkan aplikasi web ini menjadi aplikasi Android, ikuti langkah berikut:

1. Pastikan build web siap:
   ```bash
   npm run build
   ```
2. Singkronisasikan aset ke platform Android:
   ```bash
   npx cap sync
   ```
3. Buka Android Studio untuk menjalankan emulator atau memproduksi file APK:
   ```bash
   npx cap open android
   ```

---

## 👥 Tim Pengembang

Proyek ini dibangun dan dikembangkan oleh:
*   **Rizma Indra** - *Lead IoT & Frontend Developer* - [@Drappy-cat](https://github.com/Drappy-cat)
*   **LPPM Universitas Negeri Surabaya (UNESA)** - *Lembaga Pendukung & Riset Lapangan*

---

> [!NOTE]
> Proyek ini dideploy secara otomatis menggunakan **Vercel** untuk versi web. Kunjungi tautan live demo di **[greenhouse-magetan.vercel.app](https://greenhouse-magetan.vercel.app)**.

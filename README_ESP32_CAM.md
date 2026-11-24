# 🌿 ESP32-CAM AI Thinker: Hybrid MQTT + WebSocket Video Relay (On-Demand)

Sistem pemantauan tanaman jarak jauh cerdas menggunakan modul **AI Thinker ESP32-CAM** dengan arsitektur **Hybrid MQTT & WebSocket Relay**.

Solusi ini dirancang khusus untuk mengatasi masalah utama pada ESP32-CAM: **overheating (panas berlebih), boros daya, dan boros kuota**, dengan cara memisahkan jalur kontrol standby dan transmisi video secara on-demand. **100% Bebas Firebase.**

---

## 🏗️ Arsitektur Sistem

```text
[ Browser / Viewer ] 
       │ 
       │ 1. Klik "Aktifkan Kamera" -> Kirim {"action":"START"} via WebSocket
       ▼
[ Node.js Backend Relay ] (:5000)
       │
       │ 2. Publish "START" ke topik MQTT: tanaman/cam/cmd
       ▼
[ MQTT Broker ] (HiveMQ Cloud / EMQX)
       │
       │ 3. ESP32-CAM menerima "START" dari mode Standby
       ▼
[ ESP32-CAM (AI Thinker) ]
       │
       │ 4. Buka WebSocket ke /ws/esp & kirim frame binary JPEG VGA (8-10 FPS)
       ▼
[ Node.js Backend Relay ]
       │
       │ 5. Broadcast binary JPEG langsung ke semua viewer di /ws/client
       ▼
[ Browser / Viewer ] (Render frame via Blob Object URL tanpa memory leak)
```

### ❄️ Mekanisme Hemat Daya (Auto-Stop):
- **Saat Standby (Penonton = 0)**: Kamera tidak melakukan capture, WebSocket tertutup, hanya mendengarkan MQTT. Suhu chip dingin (~35°C - 40°C).
- **Saat Ada Penonton**: Kamera aktif dan mengirim stream video.
- **Saat Semua Penonton Menutup Tab**: Backend otomatis mendeteksi viewer = 0, lalu mengirimkan perintah `"STOP"` via MQTT. ESP32-CAM langsung memutus WebSocket dan kembali ke mode standby.
- **MQTT LWT (Last Will and Testament)**: Jika ESP32 mati mendadak, broker MQTT otomatis mempublikasikan status `"OFFLINE"` ke topik `tanaman/cam/status`.

---

## 📁 Struktur Folder

```text
├── backend/
│   ├── .env.example        # Template konfigurasi environment
│   ├── .env                # Konfigurasi aktif (PORT, MQTT Broker)
│   ├── package.json        # Dependensi Express, ws, mqtt, dotenv, cors
│   └── server.js           # Server Express + WebSocket Server (/ws/esp & /ws/client)
│
├── firmware/
│   └── esp32_cam_mqtt_ws.ino # Kode firmware Arduino untuk AI Thinker ESP32-CAM
│
├── frontend/
│   ├── index.html          # Antarmuka web viewer responsif
│   ├── style.css           # Desain modern dark glassmorphism
│   └── app.js              # Logika WebSocket on-demand & Blob URL render
│
└── README_ESP32_CAM.md     # Panduan lengkap instalasi & setup
```

---

## 🛠️ 1. Setup Firmware ESP32-CAM (Arduino IDE)

### A. Library Arduino yang Wajib Diinstal
Buka **Arduino IDE** $\rightarrow$ Masuk ke menu **Tools** $\rightarrow$ **Manage Libraries...** (atau `Ctrl + Shift + I`), lalu cari dan instal:

1. **`PubSubClient`** (oleh *Nick O'Leary*)
   - Digunakan untuk komunikasi kontrol MQTT dan LWT.
2. **`WebSockets`** (oleh *Markus Sattler*)
   - Digunakan untuk mengirim data binary JPEG stream melalui WebSocket client.
3. **Board Package ESP32**:
   - Jika belum ada, buka **File** $\rightarrow$ **Preferences**, tambahkan URL berikut pada *Additional Board Manager URLs*:
     ```text
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Lalu buka **Tools** $\rightarrow$ **Board** $\rightarrow$ **Boards Manager**, cari **esp32** oleh *Espressif Systems* dan klik **Install** (versi 2.0.x disarankan).

### B. Pengaturan Board di Arduino IDE
Sebelum melakukan upload (`Compile & Flash`), pastikan pengaturan pada menu **Tools** sesuai:
- **Board**: `AI Thinker ESP32-CAM`
- **CPU Frequency**: `240MHz (WiFi/BT)`
- **Flash Frequency**: `40MHz`
- **Flash Mode**: `QIO` (atau `DIO` jika gagal boot)
- **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)` *(Wajib agar sketch muat!)*
- **Upload Speed**: `115200` atau `921600`
- **Port**: Sesuaikan dengan port USB-to-TTL / FTDI Anda (misal `COM3` di Windows).

> ⚠️ **Catatan Khusus Upload ESP32-CAM**:
> Hubungkan pin **GPIO 0 ke GND** saat menekan tombol tombol **Reset (RST)** sebelum proses upload dimulai. Setelah upload selesai, **cabut pin GPIO 0 dari GND**, lalu tekan kembali tombol **Reset (RST)** sekali lagi.

### C. Konfigurasi Kredensial di Sketch (`firmware/esp32_cam_mqtt_ws.ino`)
Buka file [esp32_cam_mqtt_ws.ino](file:///e:/Codingan%20BARU/iot-apps-sensor/firmware/esp32_cam_mqtt_ws.ino), sesuaikan parameter berikut:
```cpp
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";

const char* MQTT_BROKER   = "broker.emqx.io"; // Atau broker HiveMQ Anda
const int   MQTT_PORT     = 1883;

// Ganti dengan alamat IP Lokal laptop Anda di jaringan Wi-Fi yang sama
const char* WS_SERVER_HOST = "192.168.1.50"; 
const int   WS_SERVER_PORT = 5000;
```

---

## ☁️ 2. Cara Setup Broker MQTT Gratis

### Opsi 1: EMQX Public Broker (Paling Cepat / Tanpa Daftar)
Sistem sudah disiapkan langsung menggunakan EMQX Public Broker secara *out-of-the-box*:
- **Broker Host**: `broker.emqx.io`
- **Port TCP**: `1883`
- **Username / Password**: Kosongkan (bebas digunakan untuk pengujian).

### Opsi 2: HiveMQ Cloud Free (Private Broker dengan Kredensial)
Jika ingin broker privat yang aman dengan TLS:
1. Buka [https://www.hivemq.com/cloud/](https://www.hivemq.com/cloud/) dan daftar akun gratis.
2. Buat cluster **"Serverless Free"** (Gratis 100 koneksi selamanya).
3. Buat **Credentials** (Username & Password) di tab *Access Management*.
4. Salin **Cluster URL** (contoh: `abc123xyz.s1.eu.hivemq.cloud`).
5. Pada file [backend/.env](file:///e:/Codingan%20BARU/iot-apps-sensor/backend/.env):
   ```env
   MQTT_BROKER_URL=mqtts://abc123xyz.s1.eu.hivemq.cloud:8883
   MQTT_USERNAME=username_anda
   MQTT_PASSWORD=password_anda
   ```

---

## 🚀 3. Menjalankan Backend Relay Server

1. Buka terminal baru dan masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
   Server akan aktif di port `http://localhost:5000`:
   - `ws://localhost:5000/ws/esp` $\rightarrow$ Jalur streaming masuk dari kamera ESP32.
   - `ws://localhost:5000/ws/client` $\rightarrow$ Jalur streaming keluar ke browser viewer.
   - `http://localhost:5000/api/status` $\rightarrow$ REST API status hardware & viewer.

---

## 🖥️ 4. Menjalankan Web Client Frontend

Frontend dapat dibuka dengan salah satu cara berikut:
1. **Langsung via Backend**:
   Buka browser dan akses [http://localhost:5000](http://localhost:5000). Backend Express secara otomatis menyajikan folder `frontend`.
2. **Sebagai File Statis**:
   Buka file [frontend/index.html](file:///e:/Codingan%20BARU/iot-apps-sensor/frontend/index.html) di browser Anda. Jika dibuka terpisah, Anda dapat menyesuaikan alamat IP backend via tombol ikon **Pengaturan (Gear)** di web client.

---

## 📋 Verifikasi Protokol & Endpoint Port

| Protokol | Port | Endpoint / Topik | Arah Aliran Data |
| :--- | :--- | :--- | :--- |
| **MQTT** | `1883` / `8883` | `tanaman/cam/cmd` | Backend $\rightarrow$ ESP32-CAM (`START` / `STOP`) |
| **MQTT** | `1883` / `8883` | `tanaman/cam/status` | ESP32-CAM $\rightarrow$ Backend (`ONLINE` / `OFFLINE` + LWT) |
| **WebSocket** | `5000` | `/ws/esp` | ESP32-CAM $\rightarrow$ Backend (Binary JPEG Buffer) |
| **WebSocket** | `5000` | `/ws/client` | Backend $\rightarrow$ Web Browser (Binary JPEG Broadcast) |
| **HTTP REST** | `5000` | `GET /api/status` | Web Browser $\rightarrow$ Backend (Telemetry Status) |

---

## 🛡️ Pencegahan Memory Leak di Frontend
Di sisi browser ([frontend/app.js](file:///e:/Codingan%20BARU/iot-apps-sensor/frontend/app.js)), setiap frame binary yang masuk diolah menggunakan `URL.createObjectURL(blob)`. Kode telah dilengkapi pembersihan otomatis:
```javascript
if (currentObjectUrl) {
  URL.revokeObjectURL(currentObjectUrl); // Membebaskan memori RAM browser
}
currentObjectUrl = URL.createObjectURL(event.data);
liveStreamImg.src = currentObjectUrl;
```
Hal ini memastikan browser dapat berjalan streaming berjam-jam tanpa mengalami lag atau *crash* kehabisan RAM.


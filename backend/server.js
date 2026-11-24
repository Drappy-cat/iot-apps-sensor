/**
 * ============================================================================
 * ESP32-CAM HYBRID MQTT + WEBSOCKET RELAY SERVER (ON-DEMAND STREAMING)
 * ============================================================================
 * Arsitektur:
 * 1. MQTT   : Jalur kontrol hemat daya (ESP32 standby hanya memantau topik MQTT).
 * 2. WS     : Jalur transmisi video binary JPEG on-demand (hanya aktif saat ada penonton).
 *
 * Jalur WebSocket:
 * - /ws/esp    : Jalur masuk binary JPEG dari ESP32-CAM.
 * - /ws/client : Jalur keluar binary JPEG ke penonton (viewer web client).
 * ============================================================================
 */

const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Muat variabel lingkungan di baris paling awal dari folder backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const { WebSocketServer, WebSocket } = require("ws");
const supabaseService = require("./services/supabaseService");

const PORT = parseInt(process.env.PORT, 10) || 5000;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://broker.emqx.io:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";
const TOPIC_CMD = process.env.MQTT_TOPIC_CMD || "tanaman/cam/cmd";
const TOPIC_STATUS = process.env.MQTT_TOPIC_STATUS || "tanaman/cam/status";

// Inisialisasi Express & HTTP Server
const app = express();
app.use(cors());
app.use(express.json());
// Middleware raw binary untuk menerima foto snapshot langsung dari ESP32
app.use(express.raw({ type: ["image/jpeg", "application/octet-stream"], limit: "15mb" }));

// Folder penyimpanan foto timelapse terpisah (tidak mencampuri database Firebase)
const uploadsDir = path.join(__dirname, "uploads/timelapse");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Sajikan web client statis dari folder /frontend jika dibuka langsung di port server
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

const server = http.createServer(app);

// 2. Status Global Sistem
let espOnline = false;
let espSocket = null;
const activeViewers = new Set();

// Statistik Stream
let totalFramesReceived = 0;
let lastFpsCalculationTime = Date.now();
let framesInSecond = 0;
let currentFps = 0;

// 3. Konfigurasi Klien MQTT
console.log(`[MQTT] Menghubungkan ke broker: ${MQTT_BROKER_URL}...`);
const mqttOptions = {
  clientId: `Backend_Relay_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
  connectTimeout: 8000,
  reconnectPeriod: 3000,
};

if (MQTT_USERNAME) {
  mqttOptions.username = MQTT_USERNAME;
  mqttOptions.password = MQTT_PASSWORD;
}

const mqttClient = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

mqttClient.on("connect", () => {
  console.log(`[MQTT] ✅ Terhubung ke broker MQTT (${MQTT_BROKER_URL})`);
  // Subscribe ke status ESP32-CAM
  mqttClient.subscribe(TOPIC_STATUS, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] ❌ Gagal subscribe ke ${TOPIC_STATUS}:`, err.message);
    } else {
      console.log(`[MQTT] 📡 Berlangganan topik status: ${TOPIC_STATUS}`);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  const payload = message.toString().trim().toUpperCase();
  console.log(`[MQTT] 📩 Pesan masuk [${topic}]: ${payload}`);

  if (topic === TOPIC_STATUS) {
    if (payload === "ONLINE") {
      espOnline = true;
      console.log("[STATUS] 🟢 ESP32-CAM terdeteksi ONLINE!");
    } else if (payload === "OFFLINE") {
      espOnline = false;
      console.log("[STATUS] 🔴 ESP32-CAM terdeteksi OFFLINE!");
      // Jika ESP32 mati mendadak, tutup socket esp jika masih menggantung
      if (espSocket) {
        espSocket.terminate();
        espSocket = null;
      }
    }
    broadcastSystemStatus();
  }
});

mqttClient.on("error", (err) => {
  console.error("[MQTT] ❌ Error koneksi MQTT:", err.message);
});

mqttClient.on("reconnect", () => {
  console.log("[MQTT] 🔄 Mencoba menyambung kembali ke broker...");
});

// Fungsi pembantu untuk mem-publish perintah ke ESP32-CAM
function publishCommand(cmd) {
  if (!mqttClient.connected) {
    console.warn(`[MQTT] ⚠️ Tidak dapat mengirim perintah "${cmd}" (MQTT belum terhubung)`);
    return;
  }
  mqttClient.publish(TOPIC_CMD, cmd, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.error(`[MQTT] ❌ Gagal mem-publish "${cmd}" ke ${TOPIC_CMD}:`, err.message);
    } else {
      console.log(`[MQTT] 🚀 Perintah terkirim -> [${TOPIC_CMD}]: "${cmd}"`);
    }
  });
}

// 4. Inisialisasi WebSocket Server Terpisah untuk ESP dan Client
const wssEsp = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 50 * 1024 * 1024,
});
const wssClient = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 50 * 1024 * 1024,
});

// Routing upgrade HTTP request ke WebSocket yang sesuai
server.on("upgrade", (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === "/ws/esp") {
    wssEsp.handleUpgrade(request, socket, head, (ws) => {
      wssEsp.emit("connection", ws, request);
    });
  } else if (pathname === "/ws/client") {
    wssClient.handleUpgrade(request, socket, head, (ws) => {
      wssClient.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// --- Jalur ESP32-CAM: /ws/esp ---
wssEsp.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS-ESP] 📹 ESP32-CAM terhubung ke /ws/esp dari ${clientIp}`);

  // Catat koneksi ESP32
  espSocket = ws;
  broadcastSystemStatus();

  ws.on("message", (data, isBinary) => {
    if (isBinary) {
      totalFramesReceived++;
      framesInSecond++;

      // Hitung FPS setiap 1 detik
      const now = Date.now();
      if (now - lastFpsCalculationTime >= 1000) {
        currentFps = framesInSecond;
        framesInSecond = 0;
        lastFpsCalculationTime = now;
      }

      // Broadcast frame JPEG ke semua viewer yang aktif
      for (const client of activeViewers) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data, { binary: true });
        }
      }
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[WS-ESP] ⏹️ ESP32-CAM memutuskan WebSocket /ws/esp (Code: ${code})`);
    if (espSocket === ws) {
      espSocket = null;
    }
    currentFps = 0;
    broadcastSystemStatus();
  });

  ws.on("error", (err) => {
    console.error("[WS-ESP] ❌ Error pada socket ESP32-CAM:", err.message);
    if (espSocket === ws) {
      espSocket = null;
    }
    broadcastSystemStatus();
  });
});

// --- Jalur Web Client Viewer: /ws/client ---
wssClient.on("connection", (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WS-CLIENT] 👁️ Viewer baru terhubung dari ${clientIp}`);

  // Kirim status awal ke client saat baru tersambung
  sendClientJson(ws, {
    type: "STATUS",
    espOnline,
    isStreaming: activeViewers.size > 0 && espSocket !== null,
    activeViewers: activeViewers.size,
    fps: currentFps,
  });

  ws.on("message", (msg) => {
    try {
      const payload = JSON.parse(msg.toString());
      const action = (payload.action || "").toUpperCase();

      if (action === "START") {
        const wasEmpty = activeViewers.size === 0;
        activeViewers.add(ws);
        console.log(`[WS-CLIENT] ▶ Client meminta START. Viewer aktif: ${activeViewers.size}`);

        // Jika ini viewer pertama yang meminta stream, picu perintah START ke ESP32 via MQTT
        if (wasEmpty) {
          console.log("[RELAY] ⚡ Viewer pertama aktif! Memicu START ke ESP32-CAM via MQTT...");
          publishCommand("START");
        }

        broadcastSystemStatus();
      } else if (action === "STOP") {
        if (activeViewers.has(ws)) {
          activeViewers.delete(ws);
          console.log(`[WS-CLIENT] ⏹ Client meminta STOP. Viewer aktif tersisa: ${activeViewers.size}`);

          // Jika tidak ada viewer tersisa, otomatis STOP ESP32-CAM (Auto-Stop Power Saving)
          if (activeViewers.size === 0) {
            console.log("[AUTO-STOP] ❄️ Tidak ada viewer tersisa! Mengirim STOP ke ESP32-CAM via MQTT...");
            publishCommand("STOP");
          }

          broadcastSystemStatus();
        }
      }
    } catch (e) {
      console.warn("[WS-CLIENT] ⚠️ Format pesan client tidak valid:", e.message);
    }
  });

  ws.on("close", () => {
    if (activeViewers.has(ws)) {
      activeViewers.delete(ws);
      console.log(`[WS-CLIENT] 🚪 Viewer disconnect. Viewer aktif tersisa: ${activeViewers.size}`);

      // Auto-Stop jika semua viewer keluar/disconnect
      if (activeViewers.size === 0) {
        console.log("[AUTO-STOP] ❄️ Semua viewer disconnect. Mengirim STOP ke ESP32-CAM via MQTT...");
        publishCommand("STOP");
      }

      broadcastSystemStatus();
    }
  });

  ws.on("error", (err) => {
    console.warn("[WS-CLIENT] ⚠️ Error socket viewer:", err.message);
    activeViewers.delete(ws);
  });
});

// Broadcast status JSON ke semua viewer terhubung
function broadcastSystemStatus() {
  const isStreaming = activeViewers.size > 0 && espSocket !== null;
  const statusPayload = JSON.stringify({
    type: "STATUS",
    espOnline,
    isStreaming,
    activeViewers: activeViewers.size,
    fps: currentFps,
    timestamp: Date.now(),
  });

  wssClient.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statusPayload);
    }
  });
}

function sendClientJson(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// 5. REST API Endpoints
app.get("/api/status", (req, res) => {
  res.json({
    espOnline,
    isStreaming: activeViewers.size > 0 && espSocket !== null,
    activeViewers: activeViewers.size,
    espSocketConnected: espSocket !== null,
    fps: currentFps,
    totalFramesReceived,
    mqttConnected: mqttClient.connected,
    topics: {
      cmd: TOPIC_CMD,
      status: TOPIC_STATUS,
    },
    timestamp: Date.now(),
  });
});

// Endpoint untuk trigger manual dari REST (Opsional untuk pengujian)
app.post("/api/cmd", (req, res) => {
  const action = (req.body?.action || "").toUpperCase();
  if (action !== "START" && action !== "STOP" && action !== "CAPTURE") {
    return res.status(400).json({ error: "Action harus 'START', 'STOP', atau 'CAPTURE'" });
  }

  publishCommand(action);
  res.json({
    success: true,
    actionSent: action,
    topic: TOPIC_CMD,
  });
});

// Endpoint untuk menerima foto Snapshot/Timelapse berkala (per 1 jam) dari ESP32-CAM
app.post("/api/camera/snapshot", (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: "Buffer gambar kosong" });
  }

  const triggerSource = (req.headers["x-trigger-source"] || "HOURLY_TIMELAPSE").toUpperCase();
  const clientHour = req.headers["x-capture-hour"];

  // Dapatkan waktu saat ini dalam format waktu lokal Indonesia (WIB)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = clientHour !== undefined ? pad(clientHour) : pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}:${ss} WIB`;
  const hourNum = parseInt(hh, 10);
  const formattedTimeWib = `${dd}-${mm}-${yyyy} Pukul ${hh}:${min}:${ss} WIB`;

  // Format penamaan file yang rapi & memuat tanggal serta jam:
  // Contoh: timelapse_tanaman_2026-11-25_pukul_00-00-00_WIB.jpg
  // Atau jika manual: manual_tanaman_2026-11-24_pukul_22-30-15_WIB.jpg
  const prefix = triggerSource.includes("MANUAL") || triggerSource.includes("MQTT")
    ? "manual_tanaman"
    : "timelapse_tanaman";
  const filename = `${prefix}_${dateStr}_pukul_${hh}-${min}-${ss}_WIB.jpg`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFile(filePath, req.body, (err) => {
    if (err) {
      console.error("[TIMELAPSE] ❌ Gagal menyimpan foto:", err.message);
      return res.status(500).json({ error: "Gagal menyimpan foto ke disk" });
    }

    const fileUrl = `/uploads/timelapse/${filename}`;
    console.log(`[TIMELAPSE] 📸 Foto 1 Jam Tersimpan: ${filename} (${(req.body.length / 1024).toFixed(1)} KB, Jam: ${hh}:00 WIB)`);

    // Catat riwayat foto lengkap dengan tanggal & jam ke JSON arsip lokal
    const indexFile = path.join(__dirname, "uploads/timelapse_index.json");
    let history = [];
    try {
      if (fs.existsSync(indexFile)) {
        history = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
      }
    } catch (e) {
      history = [];
    }

    const record = {
      filename,
      url: fileUrl,
      date: dateStr,
      time: timeStr,
      hour: hourNum,
      trigger_source: triggerSource,
      sizeBytes: req.body.length,
      sizeKb: parseFloat((req.body.length / 1024).toFixed(1)),
      timestamp: now.toISOString(),
      formattedTime: formattedTimeWib,
    };

    history.unshift(record);
    // Simpan maksimal 500 foto riwayat terakhir
    if (history.length > 500) history = history.slice(0, 500);
    fs.writeFileSync(indexFile, JSON.stringify(history, null, 2));

    // Jika Supabase sudah dikonfigurasi, unggah ke Supabase Cloud Storage & Database
    if (supabaseService.isConfigured()) {
      supabaseService.uploadToSupabase(req.body, filename, {
        date: dateStr,
        time: timeStr,
        hour: hourNum,
        triggerSource,
        formattedTimeWib,
      }).then((sbRes) => {
        if (sbRes.success) {
          console.log(`[TIMELAPSE] 🚀 Tersinkronisasi ke Supabase: ${sbRes.publicUrl}`);
        }
      });
    }

    res.json({
      success: true,
      filename,
      url: fileUrl,
      date: dateStr,
      time: timeStr,
      hour: hourNum,
      sizeBytes: req.body.length,
      timestamp: now.toISOString(),
      formattedTime: formattedTimeWib,
      supabaseActive: supabaseService.isConfigured(),
    });
  });
});

// Endpoint untuk melihat riwayat galeri foto timelapse tanaman (dari Supabase atau Lokal)
app.get("/api/camera/timelapse", async (req, res) => {
  if (supabaseService.isConfigured()) {
    const sbData = await supabaseService.getSupabaseTimelapsePhotos();
    if (sbData.count > 0) {
      return res.json({ source: "supabase", ...sbData });
    }
  }

  const indexFile = path.join(__dirname, "uploads/timelapse_index.json");
  try {
    if (fs.existsSync(indexFile)) {
      const data = JSON.parse(fs.readFileSync(indexFile, "utf-8"));
      return res.json({ source: "local", count: data.length, photos: data });
    }
  } catch (e) {}
  res.json({ source: "empty", count: 0, photos: [] });
});

// Proxy MJPEG Live Stream dari ESP32-CAM (Direct IP /stream)
// Mengalirkan video ~18-20 FPS mulus ke browser tanpa masalah CORS
app.get("/api/camera/stream", (req, res) => {
  const targetIp = req.query.ip || process.env.ESP32_CAM_IP || "192.168.1.6";
  const espUrl = `http://${targetIp}/stream`;

  const proxyReq = http.get(espUrl, { timeout: 8000 }, (espRes) => {
    res.writeHead(espRes.statusCode, {
      ...espRes.headers,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, private",
    });
    espRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Gagal terhubung ke stream lokal ESP32-CAM",
        target: espUrl,
        message: err.message,
      });
    }
  });

  req.on("close", () => {
    proxyReq.destroy();
  });
});

// Proxy Foto Langsung dari ESP32-CAM (Direct IP /capture)
app.get("/api/camera/direct-capture", (req, res) => {
  const targetIp = req.query.ip || process.env.ESP32_CAM_IP || "192.168.1.6";
  const espUrl = `http://${targetIp}/capture`;

  const proxyReq = http.get(espUrl, { timeout: 8000 }, (espRes) => {
    res.writeHead(espRes.statusCode, {
      ...espRes.headers,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
    espRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Gagal mengambil foto langsung dari ESP32-CAM",
        target: espUrl,
        message: err.message,
      });
    }
  });
});

// 6. Mulai Server HTTP & WebSocket
server.listen(PORT, () => {
  console.log("==================================================================");
  console.log(`🌱 ESP32-CAM Relay Server berjalan di port http://localhost:${PORT}`);
  console.log(`📹 Jalur ESP32-CAM WebSocket : ws://localhost:${PORT}/ws/esp`);
  console.log(`👁️ Jalur Viewer Web Client   : ws://localhost:${PORT}/ws/client`);
  console.log(`📊 REST API Status           : http://localhost:${PORT}/api/status`);
  console.log("==================================================================");
});


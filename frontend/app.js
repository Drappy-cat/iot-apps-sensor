/**
 * ============================================================================
 * CLIENT WEB VIEWER (ESP32-CAM ON-DEMAND STREAM)
 * ============================================================================
 * Fitur Utama:
 * 1. Menampilkan status online/offline ESP32-CAM via polling REST /api/status.
 * 2. On-Demand Stream: Mengirim {"action": "START"} saat tombol ditekan.
 * 3. Render binary frame JPEG via Blob & URL.createObjectURL().
 * 4. PENTING: Wajib melakukan URL.revokeObjectURL() pada frame lama untuk
 *    menghindari memory leak di browser (RAM leak).
 * 5. Auto-Stop: Mengirim {"action": "STOP"} dan menutup WebSocket saat dimatikan.
 * ============================================================================
 */

// 1. Konfigurasi Host Server
const DEFAULT_HOST = (window.location.protocol.startsWith("http") && window.location.host)
  ? window.location.host
  : "localhost:5000";

let serverHost = localStorage.getItem("cam_server_host") || DEFAULT_HOST;

function getApiBaseUrl() {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${serverHost}`;
}

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${serverHost}/ws/client`;
}

// 2. Elemen DOM
const espStatusPill = document.getElementById("esp-status-pill");
const espDot = document.getElementById("esp-dot");
const espStatusText = document.getElementById("esp-status-text");
const activeViewersCount = document.getElementById("active-viewers-count");

const screenWrapper = document.getElementById("screen-wrapper");
const liveStreamImg = document.getElementById("live-stream-img");
const standbyOverlay = document.getElementById("standby-overlay");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const streamHud = document.getElementById("stream-hud");
const hudFps = document.getElementById("hud-fps");
const hudTimestamp = document.getElementById("hud-timestamp");

const toggleStreamBtn = document.getElementById("toggle-stream-btn");
const btnText = document.getElementById("btn-text");
const snapshotBtn = document.getElementById("snapshot-btn");
const configBtn = document.getElementById("config-btn");

const configModal = document.getElementById("config-modal");
const serverHostInput = document.getElementById("server-host-input");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalResetBtn = document.getElementById("modal-reset-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");

// 3. State Aplikasi
let ws = null;
let isStreaming = false;
let currentObjectUrl = null;
let clientFpsCount = 0;
let lastClientFpsTime = Date.now();
let statusPollInterval = null;

// ==============================================================================
// 4. KONEKSI & STREAMING WEBSOCKET
// ==============================================================================
function startStream() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  setLoading(true, "Menghubungkan ke WebSocket Relay...");

  try {
    const wsUrl = getWsUrl();
    console.log(`[CLIENT] Membuka WebSocket ke: ${wsUrl}`);
    ws = new WebSocket(wsUrl);
    ws.binaryType = "blob";

    ws.onopen = () => {
      console.log("[CLIENT] ✅ WebSocket terhubung! Mengirim action: 'START'...");
      setLoading(true, "Memicu kamera ESP32-CAM (MQTT START)...");

      // Kirim sinyal START on-demand ke backend
      ws.send(JSON.stringify({ action: "START" }));
      isStreaming = true;
      updateButtonState(true);
    };

    ws.onmessage = (event) => {
      // 1. Jika data berupa binary (Blob JPEG dari kamera)
      if (event.data instanceof Blob) {
        setLoading(false);

        // Hapus Object URL frame sebelumnya untuk mencegah kebocoran memori (Memory Leak)
        if (currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
        }

        // Buat Object URL baru dari blob binary JPEG
        currentObjectUrl = URL.createObjectURL(event.data);
        liveStreamImg.src = currentObjectUrl;

        // Tampilkan HUD & elemen gambar
        liveStreamImg.classList.remove("hidden");
        standbyOverlay.classList.add("hidden");
        streamHud.classList.remove("hidden");
        snapshotBtn.disabled = false;

        // Hitung FPS di sisi client
        clientFpsCount++;
        const now = Date.now();
        if (now - lastClientFpsTime >= 1000) {
          hudFps.textContent = `${clientFpsCount} FPS`;
          clientFpsCount = 0;
          lastClientFpsTime = now;
        }

        // Perbarui jam di HUD
        const timeNow = new Date().toLocaleTimeString("id-ID", { hour12: false });
        hudTimestamp.textContent = timeNow;

      } else {
        // 2. Jika data berupa pesan teks JSON (Status Sistem)
        try {
          const data = JSON.parse(event.data);
          if (data.type === "STATUS") {
            updateHardwareStatus(data.espOnline, data.activeViewers);
          }
        } catch (e) {
          console.log("[CLIENT] Pesan teks dari server:", event.data);
        }
      }
    };

    ws.onclose = (event) => {
      console.log(`[CLIENT] WebSocket terputus (Code: ${event.code})`);
      stopStreamCleanup();
    };

    ws.onerror = (err) => {
      console.error("[CLIENT] ❌ Error WebSocket:", err);
      setLoading(false);
      alert(`Gagal terhubung ke WebSocket Relay (${getWsUrl()}).\nPastikan backend server sudah dijalankan di terminal!`);
      stopStreamCleanup();
    };

  } catch (err) {
    console.error("[CLIENT] Gagal membuka WebSocket:", err);
    setLoading(false);
    stopStreamCleanup();
  }
}

function stopStream() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("[CLIENT] Mengirim action: 'STOP' dan menutup koneksi...");
    try {
      ws.send(JSON.stringify({ action: "STOP" }));
      ws.close();
    } catch (e) {
      console.warn("Error saat menutup socket:", e);
    }
  }
  stopStreamCleanup();
}

function stopStreamCleanup() {
  isStreaming = false;
  ws = null;
  setLoading(false);
  updateButtonState(false);

  // Bersihkan object URL
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  // Tampilkan kembali layar standby
  liveStreamImg.classList.add("hidden");
  liveStreamImg.src = "";
  standbyOverlay.classList.remove("hidden");
  streamHud.classList.add("hidden");
  snapshotBtn.disabled = true;
  hudFps.textContent = "0 FPS";
}

// ==============================================================================
// 5. STATUS POLLING REST API
// ==============================================================================
async function fetchSystemStatus() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateHardwareStatus(data.espOnline, data.activeViewers);
  } catch (err) {
    // Backend offline / belum jalan
    updateHardwareStatus(false, 0);
  }
}

function updateHardwareStatus(isOnline, viewers) {
  if (isOnline) {
    espDot.className = "status-dot dot-online";
    espStatusText.className = "status-value text-online";
    espStatusText.textContent = "ONLINE";
  } else {
    espDot.className = "status-dot dot-offline";
    espStatusText.className = "status-value text-offline";
    espStatusText.textContent = "OFFLINE";
  }

  if (typeof viewers === "number") {
    activeViewersCount.textContent = viewers;
  }
}

// ==============================================================================
// 6. TAMPILAN & KONTROL UI
// ==============================================================================
function updateButtonState(streaming) {
  if (streaming) {
    toggleStreamBtn.className = "btn btn-danger btn-large";
    btnText.textContent = "Matikan Kamera";
    toggleStreamBtn.querySelector("svg").innerHTML = `
      <rect x="6" y="6" width="12" height="12"></rect>
    `;
  } else {
    toggleStreamBtn.className = "btn btn-primary btn-large";
    btnText.textContent = "Aktifkan Kamera";
    toggleStreamBtn.querySelector("svg").innerHTML = `
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    `;
  }
}

function setLoading(isLoading, text = "Memuat...") {
  if (isLoading) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove("hidden");
  } else {
    loadingOverlay.classList.add("hidden");
  }
}

// Ambil Snapshot Foto
snapshotBtn.addEventListener("click", () => {
  if (!liveStreamImg.src) return;

  const a = document.createElement("a");
  a.href = liveStreamImg.src;
  const timeStr = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `ESP32CAM_Snapshot_${timeStr}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// Tombol Toggle Utama
toggleStreamBtn.addEventListener("click", () => {
  if (isStreaming) {
    stopStream();
  } else {
    startStream();
  }
});

// Modal Pengaturan Host Server
configBtn.addEventListener("click", () => {
  serverHostInput.value = serverHost;
  configModal.classList.remove("hidden");
});

modalCloseBtn.addEventListener("click", () => {
  configModal.classList.add("hidden");
});

configModal.addEventListener("click", (e) => {
  if (e.target === configModal) configModal.classList.add("hidden");
});

modalResetBtn.addEventListener("click", () => {
  serverHost = DEFAULT_HOST;
  serverHostInput.value = DEFAULT_HOST;
  localStorage.removeItem("cam_server_host");
  alert(`Alamat server di-reset ke bawaan: ${DEFAULT_HOST}`);
  configModal.classList.add("hidden");
  fetchSystemStatus();
});

modalSaveBtn.addEventListener("click", () => {
  const val = serverHostInput.value.trim();
  if (val) {
    serverHost = val;
    localStorage.setItem("cam_server_host", val);
    alert(`Alamat server berhasil disimpan: ${serverHost}`);
    configModal.classList.add("hidden");
    fetchSystemStatus();
  }
});

// ==============================================================================
// 7. INISIALISASI AWAL
// ==============================================================================
fetchSystemStatus();
statusPollInterval = setInterval(fetchSystemStatus, 3000);

// Auto stop saat tab ditutup
window.addEventListener("beforeunload", () => {
  if (isStreaming) {
    stopStream();
  }
});


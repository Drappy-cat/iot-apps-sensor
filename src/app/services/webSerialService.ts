import {
  ArduinoSerialPacket,
  SerialConnectionStatus,
  SerialPortMetadata,
  SensorReadingStatus,
} from "../types/sensor";

export interface SerialCallbacks {
  onData?: (packet: ArduinoSerialPacket, rawLine: string) => void;
  onStatusChange?: (status: SerialConnectionStatus, errorMsg?: string) => void;
  onRawLog?: (log: string) => void;
}

class WebSerialService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private isReading = false;
  private callbacks: SerialCallbacks = {};
  private currentStatus: SerialConnectionStatus = "disconnected";
  private selectedBaudRate = 115200;
  private disconnectHandlerBound = false;

  constructor() {
    this.handleDeviceDisconnect = this.handleDeviceDisconnect.bind(this);
  }

  /**
   * Mengecek apakah browser mendukung Web Serial API
   */
  public isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  public getStatus(): SerialConnectionStatus {
    return this.currentStatus;
  }

  public setCallbacks(callbacks: SerialCallbacks) {
    this.callbacks = callbacks;
  }

  private notifyStatus(status: SerialConnectionStatus, errorMsg?: string) {
    this.currentStatus = status;
    this.callbacks.onStatusChange?.(status, errorMsg);
  }

  private log(message: string) {
    this.callbacks.onRawLog?.(message);
  }

  /**
   * Mendaftarkan listener disconnect fisik kabel USB
   */
  private setupDisconnectListener() {
    if (!this.disconnectHandlerBound && typeof navigator !== "undefined" && navigator.serial) {
      navigator.serial.addEventListener("disconnect", this.handleDeviceDisconnect);
      this.disconnectHandlerBound = true;
    }
  }

  private handleDeviceDisconnect(event: Event & { port?: SerialPort }) {
    if (this.port && (!event.port || event.port === this.port)) {
      this.log("Kabel USB terputus dari sistem.");
      this.disconnect("Kabel USB Arduino dicabut.");
    }
  }

  /**
   * Membuka koneksi serial ke Arduino via browser
   */
  public async connect(baudRate: number = 115200): Promise<boolean> {
    if (!this.isSupported()) {
      const msg = "Web Serial API tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge di Desktop.";
      this.notifyStatus("unsupported", msg);
      return false;
    }

    try {
      this.notifyStatus("connecting");
      this.selectedBaudRate = baudRate;
      this.setupDisconnectListener();

      // Minta izin ke pengguna untuk memilih port USB Serial
      this.port = await navigator.serial!.requestPort();

      // Buka port dengan baud rate yang ditentukan
      await this.port.open({
        baudRate: this.selectedBaudRate,
        bufferSize: 8192,
      });

      this.notifyStatus("connected");
      this.log(`Terhubung ke port serial (Baud: ${this.selectedBaudRate})`);

      // Mulai loop membaca stream
      this.startReading();
      return true;
    } catch (err: any) {
      console.error("WebSerial connect error:", err);
      let errorMsg = "Gagal menghubungkan ke perangkat serial.";

      if (err.name === "NotFoundError") {
        errorMsg = "Pemilihan port dibatalkan oleh pengguna.";
        this.notifyStatus("disconnected", errorMsg);
        return false;
      } else if (err.name === "InvalidStateError" || err.message?.includes("already open")) {
        errorMsg = "Port serial sudah dibuka oleh tab atau aplikasi lain (misal Arduino Serial Monitor). Tutup aplikasi lain terlebih dahulu.";
      } else if (err.name === "NetworkError") {
        errorMsg = "Tidak dapat mengakses port serial. Pastikan Arduino terpasang dengan baik.";
      } else {
        errorMsg = err.message || errorMsg;
      }

      this.notifyStatus("error", errorMsg);
      await this.cleanup();
      return false;
    }
  }

  /**
   * Membaca stream data per karakter / chunk dan memecah menjadi baris JSON
   */
  private async startReading() {
    if (!this.port || !this.port.readable) return;

    this.isReading = true;
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = (this.port.readable as any).pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.reader = reader;

    let buffer = "";

    try {
      while (this.isReading) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          const lines = buffer.split("\n");
          // Simpan sisa baris terakhir yang belum lengkap
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.length > 0) {
              this.processLine(cleanLine);
            }
          }
        }
      }
    } catch (err: any) {
      if (this.isReading) {
        console.error("Kesalahan saat membaca serial:", err);
        this.log(`Error stream serial: ${err.message || err}`);
        this.notifyStatus("error", `Terputus: ${err.message || "Kesalahan stream"}`);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // ignore
      }
      await readableStreamClosed.catch(() => {});
      await this.cleanup();
    }
  }

  /**
   * Memvalidasi dan memproses satu baris data JSON dari Arduino
   */
  private processLine(line: string) {
    this.log(`Rx: ${line}`);

    // Pastikan baris terlihat seperti JSON
    if (!line.startsWith("{") || !line.endsWith("}")) {
      return;
    }

    try {
      const parsed = JSON.parse(line);

      // Status pembacaan dari Arduino
      let status: SensorReadingStatus = "OK";
      if (parsed.status === "MODBUS_ERROR" || parsed.status === "ERROR") {
        status = "MODBUS_ERROR";
      } else if (parsed.status === "TIMEOUT") {
        status = "TIMEOUT";
      }

      const packet: ArduinoSerialPacket = {
        slaveId: typeof parsed.slaveId === "number" ? parsed.slaveId : 4,
        moisture: typeof parsed.moisture === "number" ? parsed.moisture : 0,
        temperature: typeof parsed.temperature === "number" ? parsed.temperature : 0,
        ec: typeof parsed.ec === "number" ? parsed.ec : 0,
        ph: typeof parsed.ph === "number" ? parsed.ph : 0,
        nitrogen: typeof parsed.nitrogen === "number" ? parsed.nitrogen : (parsed.n || 0),
        phosphorus: typeof parsed.phosphorus === "number" ? parsed.phosphorus : (parsed.p || 0),
        potassium: typeof parsed.potassium === "number" ? parsed.potassium : (parsed.k || 0),
        status: status,
        timestamp: parsed.timestamp || Date.now(),
      };

      // Validasi batas logis sensor jika status OK
      if (status === "OK") {
        if (
          packet.moisture < 0 || packet.moisture > 100 ||
          packet.temperature < -40 || packet.temperature > 90 ||
          packet.ph < 0 || packet.ph > 14
        ) {
          packet.status = "PARSE_ERROR";
        }
      }

      this.callbacks.onData?.(packet, line);
    } catch (err: any) {
      console.warn("Gagal parse baris JSON dari Arduino:", line, err);
      this.log(`Gagal parse JSON: ${line}`);
    }
  }

  /**
   * Menutup koneksi serial secara rapi
   */
  public async disconnect(reason?: string) {
    this.isReading = false;
    this.log(reason || "Memutuskan koneksi serial...");

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // ignore
      }
      this.reader = null;
    }

    await this.cleanup();
    this.notifyStatus("disconnected", reason);
  }

  private async cleanup() {
    this.isReading = false;
    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // ignore
      }
      this.port = null;
    }
  }

  /**
   * Mengambil informasi metadata perangkat USB jika tersedia
   */
  public getPortMetadata(): SerialPortMetadata {
    if (!this.port) {
      return { baudRate: this.selectedBaudRate };
    }
    const info = this.port.getInfo();
    return {
      usbVendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : undefined,
      usbProductId: info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : undefined,
      baudRate: this.selectedBaudRate,
    };
  }
}

export const webSerialService = new WebSerialService();

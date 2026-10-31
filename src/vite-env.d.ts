/// <reference types="vite/client" />

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "even" | "odd";
  bufferSize?: number;
  flowControl?: "none" | "hardware";
}

interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  getInfo(): SerialPortInfo;
  forget?(): Promise<void>;
}

interface Serial extends EventTarget {
  requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
  addEventListener(
    type: "connect" | "disconnect",
    listener: (this: Serial, ev: Event & { port?: SerialPort }) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "connect" | "disconnect",
    listener: (this: Serial, ev: Event & { port?: SerialPort }) => any,
    options?: boolean | EventListenerOptions
  ): void;
}

interface Navigator {
  readonly serial?: Serial;
}

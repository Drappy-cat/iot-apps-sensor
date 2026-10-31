/**
 * ==================================================================================
 * FIRMWARE ARDUINO UNO R3: SENSOR TANAH MODBUS RTU RS485 (pH, KELEMBABAN, SUHU)
 * ==================================================================================
 * Parameter Aktif:
 * 1. Kelembaban Tanah (Moisture, %)
 * 2. Suhu Tanah (Temperature, °C)
 * 3. pH Tanah (Acidity/Alkalinity, pH)
 * * Catatan: EC (Konduktivitas) dan NPK dinonaktifkan sesuai konfigurasi saat ini.
 * 
 * Spesifikasi Perangkat Keras:
 * - Mikrokontroler: Arduino Uno R3 (ATmega328P)
 * - Sensor: Soil Sensor Modbus RS485 (Slave ID: 4, Baud: 4800 bps)
 * - Komunikasi RS485: SoftwareSerial pada Pin D2 (RX) dan Pin D3 (TX)
 * - Pin Kontrol Transceiver DE & RE: Pin D4 (HIGH = Kirim, LOW = Terima)
 * - Koneksi Laptop: Kabel USB Serial (Baud Rate: 115200 bps)
 * 
 * Skema Pengkabelan (Wiring):
 * -------------------------------------------------------------
 * Modul MAX485          Arduino Uno R3
 * -------------------------------------------------------------
 * VCC                -> 5V
 * GND                -> GND
 * RO (Receiver Out)  -> D2 (RX SoftwareSerial)
 * DI (Driver In)     -> D3 (TX SoftwareSerial)
 * DE (Driver Enable) -> D4 (digabung dengan pin RE)
 * RE (Receiver En)   -> D4 (digabung dengan pin DE)
 * -------------------------------------------------------------
 * Modul MAX485          Sensor Tanah Modbus
 * -------------------------------------------------------------
 * A                  -> Kabel Kuning / A (RS485 +)
 * B                  -> Kabel Putih / B  (RS485 -)
 * Power Sensor       -> Adaptor 9V-24V DC Eksternal (Cokelat +, Biru -)
 *                     (GND Adaptor dihubungkan ke GND Arduino / Common Ground)
 * ==================================================================================
 */

#include <SoftwareSerial.h>

// Definisi Pin Arduino
const uint8_t RS485_RX_PIN = 2; // D2 -> RO Modul MAX485
const uint8_t RS485_TX_PIN = 3; // D3 -> DI Modul MAX485
const uint8_t RS485_DE_RE  = 4; // D4 -> DE & RE Modul MAX485

// Inisialisasi SoftwareSerial untuk RS485
SoftwareSerial modbusSerial(RS485_RX_PIN, RS485_TX_PIN);

// Konfigurasi Modbus Sensor
const uint8_t  SLAVE_ID         = 4;      // Slave ID 4
const uint32_t MODBUS_BAUD_RATE = 4800;   // Baud Rate Modbus RS485
const uint32_t USB_BAUD_RATE    = 115200; // Serial USB ke laptop

// Variabel Pewaktuan Non-Blocking
unsigned long previousMillis = 0;
const unsigned long READ_INTERVAL_MS = 2500; // Baca sensor setiap 2.5 detik

// Buffer Penerimaan Data RS485
byte responseBuffer[25];

/**
 * Menghitung Checksum CRC-16 Modbus standar
 */
uint16_t calculateCRC16(const byte *buffer, uint8_t length) {
  uint16_t crc = 0xFFFF;
  for (uint8_t i = 0; i < length; i++) {
    crc ^= (uint16_t)buffer[i];
    for (uint8_t j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc;
}

/**
 * Membangun query frame Modbus untuk membaca n register
 */
void makeQueryFrame(byte *frame, uint8_t slaveId, uint16_t startAddress, uint16_t regCount) {
  frame[0] = slaveId;
  frame[1] = 0x03; // Function Code: Read Holding Registers
  frame[2] = (startAddress >> 8) & 0xFF;
  frame[3] = startAddress & 0xFF;
  frame[4] = (regCount >> 8) & 0xFF;
  frame[5] = regCount & 0xFF;

  uint16_t crc = calculateCRC16(frame, 6);
  frame[6] = lowByte(crc);
  frame[7] = highByte(crc);
}

void setup() {
  pinMode(RS485_DE_RE, OUTPUT);
  digitalWrite(RS485_DE_RE, LOW); // Mode awal: Menerima (Receive)

  // Inisialisasi Hardware Serial ke Laptop (USB)
  Serial.begin(USB_BAUD_RATE);

  // Inisialisasi SoftwareSerial ke Modul RS485
  modbusSerial.begin(MODBUS_BAUD_RATE);

  delay(500);
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= READ_INTERVAL_MS) {
    previousMillis = currentMillis;
    readSoilSensor3Param();
  }
}

/**
 * Mengirim query Modbus RTU dan menunggu respons
 * Mengembalikan jumlah byte yang berhasil diterima
 */
uint8_t executeModbusQuery(const byte *query, uint8_t expectedBytes, uint16_t timeoutMs) {
  // Bersihkan buffer serial
  while (modbusSerial.available() > 0) {
    modbusSerial.read();
  }

  // Mode Transmit (Kirim)
  digitalWrite(RS485_DE_RE, HIGH);
  delayMicroseconds(50);
  modbusSerial.write(query, 8);
  modbusSerial.flush();

  // Mode Receive (Terima)
  delayMicroseconds(50);
  digitalWrite(RS485_DE_RE, LOW);

  unsigned long startWait = millis();
  uint8_t count = 0;

  while ((millis() - startWait) < timeoutMs && count < expectedBytes) {
    if (modbusSerial.available() > 0) {
      responseBuffer[count++] = modbusSerial.read();
    }
  }

  return count;
}

/**
 * Membaca 3 Parameter: Kelembaban, Suhu, dan pH
 * Mendukung format 4 register (Reg 0=Air, 1=Suhu, 2=EC(skip), 3=pH)
 * serta format 3 register (Reg 0=Air, 1=Suhu, 2=pH)
 */
void readSoilSensor3Param() {
  byte query[8];
  
  // 1. Coba query 4 register (format standar 4-in-1 / 7-in-1)
  // Register: 0=Moisture, 1=Temp, 2=EC, 3=pH
  makeQueryFrame(query, SLAVE_ID, 0x0000, 4);
  const uint8_t EXPECTED_4REG = 13; // 1 Slave + 1 Func + 1 ByteCount(8) + 8 Data + 2 CRC
  uint8_t bytesReceived = executeModbusQuery(query, EXPECTED_4REG, 400);

  bool validResponse = false;
  float moisture = 0.0f;
  float temperature = 0.0f;
  float ph = 0.0f;

  if (bytesReceived >= EXPECTED_4REG &&
      responseBuffer[0] == SLAVE_ID &&
      responseBuffer[1] == 0x03 &&
      responseBuffer[2] == 0x08) {
    
    // Validasi CRC16
    uint16_t receivedCRC = responseBuffer[11] | (responseBuffer[12] << 8);
    uint16_t calculatedCRC = calculateCRC16(responseBuffer, 11);

    if (receivedCRC == calculatedCRC) {
      uint16_t rawMoisture    = (responseBuffer[3] << 8) | responseBuffer[4];
      int16_t  rawTemperature = (responseBuffer[5] << 8) | responseBuffer[6];
      uint16_t rawReg2        = (responseBuffer[7] << 8) | responseBuffer[8];
      uint16_t rawReg3        = (responseBuffer[9] << 8) | responseBuffer[10];

      moisture = rawMoisture / 10.0f;
      temperature = rawTemperature / 10.0f;

      // Cari lokasi pH (Reg 3 jika ada EC di Reg 2, atau Reg 2 jika sensor 3-in-1)
      if (rawReg3 > 0 && rawReg3 <= 1400) {
        ph = (rawReg3 > 140) ? (rawReg3 / 100.0f) : (rawReg3 / 10.0f);
      } else if (rawReg2 > 0 && rawReg2 <= 1400) {
        ph = (rawReg2 > 140) ? (rawReg2 / 100.0f) : (rawReg2 / 10.0f);
      } else {
        ph = 7.0f;
      }

      validResponse = true;
    }
  }

  // 2. Jika query 4 register gagal/timeout, coba query 3 register langsung
  // Register: 0=Moisture, 1=Temp, 2=pH
  if (!validResponse) {
    delay(50);
    makeQueryFrame(query, SLAVE_ID, 0x0000, 3);
    const uint8_t EXPECTED_3REG = 11; // 1 Slave + 1 Func + 1 ByteCount(6) + 6 Data + 2 CRC
    bytesReceived = executeModbusQuery(query, EXPECTED_3REG, 400);

    if (bytesReceived >= EXPECTED_3REG &&
        responseBuffer[0] == SLAVE_ID &&
        responseBuffer[1] == 0x03 &&
        responseBuffer[2] == 0x06) {
      
      uint16_t receivedCRC = responseBuffer[9] | (responseBuffer[10] << 8);
      uint16_t calculatedCRC = calculateCRC16(responseBuffer, 9);

      if (receivedCRC == calculatedCRC) {
        uint16_t rawMoisture    = (responseBuffer[3] << 8) | responseBuffer[4];
        int16_t  rawTemperature = (responseBuffer[5] << 8) | responseBuffer[6];
        uint16_t rawPH          = (responseBuffer[7] << 8) | responseBuffer[8];

        moisture = rawMoisture / 10.0f;
        temperature = rawTemperature / 10.0f;
        ph = (rawPH > 140) ? (rawPH / 100.0f) : (rawPH / 10.0f);

        validResponse = true;
      }
    }
  }

  // 3. Kirim hasil pembacaan JSON via USB Serial
  if (validResponse) {
    // Validasi batas logis
    if (ph < 3.0f || ph > 10.0f) ph = constrain(ph, 3.0f, 10.0f);
    if (moisture < 0.0f) moisture = 0.0f;
    if (moisture > 100.0f) moisture = 100.0f;

    // Kirim JSON bersih dengan Kelembaban, Suhu, dan pH saja (EC dinonaktifkan)
    Serial.print(F("{\"slaveId\":"));
    Serial.print(SLAVE_ID);
    Serial.print(F(",\"moisture\":"));
    Serial.print(moisture, 1);
    Serial.print(F(",\"temperature\":"));
    Serial.print(temperature, 1);
    Serial.print(F(",\"ph\":"));
    Serial.print(ph, 2);
    Serial.print(F(",\"status\":\"OK\"}\n"));
  } else {
    // Kirim paket error
    Serial.print(F("{\"slaveId\":"));
    Serial.print(SLAVE_ID);
    Serial.print(F(",\"moisture\":0,\"temperature\":0,\"ph\":0,\"status\":\"MODBUS_ERROR\"}\n"));
  }
}

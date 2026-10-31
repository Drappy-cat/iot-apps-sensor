/**
 * ==================================================================================
 * FIRMWARE ESP32 DEV MODULE: SENSOR TANAH MODBUS RTU RS485 (pH, KELEMBABAN, SUHU)
 * ==================================================================================
 * Parameter Aktif:
 * 1. Kelembaban Tanah (Moisture, %)
 * 2. Suhu Tanah (Temperature, °C)
 * 3. pH Tanah (pH)
 * * Catatan: EC (Konduktivitas) dan NPK dinonaktifkan sesuai konfigurasi saat ini.
 * 
 * Spesifikasi Perangkat Keras:
 * - Mikrokontroler: ESP32 Dev Module (NodeMCU-32S / ESP32-WROOM-32)
 * - Sensor: Soil Sensor Modbus RS485 (Slave ID: 4, Baud: 4800 bps)
 * - Hardware Serial Modbus: Serial2 (UART2 bawaan hardware ESP32)
 *   - RX2: GPIO 16 (Dihubungkan ke pin RO Modul MAX485)
 *   - TX2: GPIO 17 (Dihubungkan ke pin DI Modul MAX485)
 *   - DE/RE: GPIO 4 (Dihubungkan ke pin DE & RE Modul MAX485)
 * - Komunikasi Laptop: Port USB Serial (Baud Rate: 115200 bps)
 * 
 * Skema Pengkabelan (Wiring):
 * ----------------------------------------------------------------------------------
 * Modul MAX485             ESP32 Dev Module
 * ----------------------------------------------------------------------------------
 * VCC                   -> 5V (VIN / V5 pada ESP32)
 * GND                   -> GND
 * RO (Receiver Output)  -> GPIO 16 (RX2)
 * DI (Driver Input)     -> GPIO 17 (TX2)
 * DE (Driver Enable)    -> GPIO 4  (digabung bersama pin RE)
 * RE (Receiver Enable)  -> GPIO 4  (digabung bersama pin DE)
 * ----------------------------------------------------------------------------------
 * Modul MAX485             Sensor Tanah Modbus
 * ----------------------------------------------------------------------------------
 * A                     -> Kabel Kuning / A (RS485 +)
 * B                     -> Kabel Putih / B  (RS485 -)
 * Power Sensor          -> Adaptor 9V-24V DC Eksternal (Cokelat +, Biru -)
 *                        (GND Adaptor dihubungkan ke GND ESP32 / Common Ground)
 * ==================================================================================
 */

#include <Arduino.h>

// Definisi Pin Hardware UART2 pada ESP32
#define RS485_RX_PIN 16 // GPIO 16 (RX2) -> RO MAX485
#define RS485_TX_PIN 17 // GPIO 17 (TX2) -> DI MAX485
#define RS485_DE_RE  4  // GPIO 4       -> DE & RE MAX485

// Inisialisasi Hardware Serial 2 (Bawaan ESP32)
HardwareSerial modbusSerial(2);

// Konfigurasi Modbus Sensor
const uint8_t  SLAVE_ID         = 4;      // Slave ID 4
const uint32_t MODBUS_BAUD_RATE = 4800;   // Baud Rate Modbus RS485
const uint32_t USB_BAUD_RATE    = 115200; // Baud Rate USB Serial ke Laptop

byte responseBuffer[25];

// Variabel Pewaktuan Non-Blocking
unsigned long previousMillis = 0;
const unsigned long READ_INTERVAL_MS = 2500; // Baca setiap 2.5 detik

// ==================================================================================
// FITUR OPSIONAL: DUAL MODE WI-FI & DIRECT FIREBASE (JIKA INGIN TANPA LAPTOP)
// ==================================================================================
#define ENABLE_WIFI_DIRECT false

#if ENABLE_WIFI_DIRECT
  #include <WiFi.h>
  #include <HTTPClient.h>

  const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
  const char* WIFI_PASSWORD = "PASSWORD_WIFI";
  const char* FIREBASE_URL  = "https://proyek-anda-default-rtdb.firebaseio.com/sensor_npk.json";
#endif

/**
 * Menghitung Checksum CRC-16 Modbus RTU standar
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
  frame[1] = 0x03; // Read Holding Registers
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
  digitalWrite(RS485_DE_RE, LOW); // Mode Terima

  // Serial Monitor USB ke Laptop
  Serial.begin(USB_BAUD_RATE);

  // Serial2 Hardware Modbus pada ESP32 (Pin 16 RX, Pin 17 TX)
  modbusSerial.begin(MODBUS_BAUD_RATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

#if ENABLE_WIFI_DIRECT
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
#endif

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
 */
uint8_t executeModbusQuery(const byte *query, uint8_t expectedBytes, uint16_t timeoutMs) {
  while (modbusSerial.available() > 0) {
    modbusSerial.read();
  }

  digitalWrite(RS485_DE_RE, HIGH);
  delayMicroseconds(50);
  modbusSerial.write(query, 8);
  modbusSerial.flush();

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
 */
void readSoilSensor3Param() {
  byte query[8];
  
  // 1. Coba query 4 register (format standar 4-in-1 / 7-in-1)
  makeQueryFrame(query, SLAVE_ID, 0x0000, 4);
  const uint8_t EXPECTED_4REG = 13;
  uint8_t bytesReceived = executeModbusQuery(query, EXPECTED_4REG, 400);

  bool validResponse = false;
  float moisture = 0.0f;
  float temperature = 0.0f;
  float ph = 0.0f;

  if (bytesReceived >= EXPECTED_4REG &&
      responseBuffer[0] == SLAVE_ID &&
      responseBuffer[1] == 0x03 &&
      responseBuffer[2] == 0x08) {
    
    uint16_t receivedCRC = responseBuffer[11] | (responseBuffer[12] << 8);
    uint16_t calculatedCRC = calculateCRC16(responseBuffer, 11);

    if (receivedCRC == calculatedCRC) {
      uint16_t rawMoisture    = (responseBuffer[3] << 8) | responseBuffer[4];
      int16_t  rawTemperature = (responseBuffer[5] << 8) | responseBuffer[6];
      uint16_t rawReg2        = (responseBuffer[7] << 8) | responseBuffer[8];
      uint16_t rawReg3        = (responseBuffer[9] << 8) | responseBuffer[10];

      moisture = rawMoisture / 10.0f;
      temperature = rawTemperature / 10.0f;

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

  // 2. Jika 4 register tidak direspons, coba query 3 register
  if (!validResponse) {
    delay(50);
    makeQueryFrame(query, SLAVE_ID, 0x0000, 3);
    const uint8_t EXPECTED_3REG = 11;
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

  // 3. Kirim via USB Serial
  if (validResponse) {
    if (ph < 3.0f || ph > 10.0f) ph = constrain(ph, 3.0f, 10.0f);
    if (moisture < 0.0f) moisture = 0.0f;
    if (moisture > 100.0f) moisture = 100.0f;

    Serial.print(F("{\"slaveId\":"));
    Serial.print(SLAVE_ID);
    Serial.print(F(",\"moisture\":"));
    Serial.print(moisture, 1);
    Serial.print(F(",\"temperature\":"));
    Serial.print(temperature, 1);
    Serial.print(F(",\"ph\":"));
    Serial.print(ph, 2);
    Serial.print(F(",\"status\":\"OK\"}\n"));

#if ENABLE_WIFI_DIRECT
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(FIREBASE_URL);
      http.addHeader("Content-Type", "application/json");

      String jsonPayload = String("{\"moisture\":") + moisture +
                           ",\"temperature\":" + temperature +
                           ",\"ph\":" + ph + "}";
      http.PUT(jsonPayload);
      http.end();
    }
#endif
  } else {
    Serial.print(F("{\"slaveId\":"));
    Serial.print(SLAVE_ID);
    Serial.print(F(",\"moisture\":0,\"temperature\":0,\"ph\":0,\"status\":\"MODBUS_ERROR\"}\n"));
  }
}

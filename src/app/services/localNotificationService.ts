/**
 * Local Notification Service – Critical Soil Condition Alerts
 *
 * Uses @capacitor/local-notifications on native Android.
 * On web browsers, falls back to the Web Notifications API.
 * Implements per-alert-type cooldown to prevent notification spam
 * (sensor data updates every 2 seconds, but alerts fire at most once per 15 min).
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { NPKSensorData } from "../types/sensor";

// ─── Alert Type Definitions ───────────────────────────────────────────
export type AlertType =
  | "moisture_critical"
  | "ph_acidic"
  | "ph_alkaline"
  | "temp_extreme";

interface AlertRule {
  id: number;
  type: AlertType;
  check: (data: NPKSensorData) => boolean;
  title: string;
  body: (data: NPKSensorData) => string;
}

const ALERT_RULES: AlertRule[] = [
  {
    id: 1001,
    type: "moisture_critical",
    check: (d) => d.moisture < 40,
    title: "🚨 Peringatan: Kelembaban Tanah Kritis!",
    body: (d) =>
      `Kelembaban tanah turun ke ${d.moisture.toFixed(1)}%. Tanaman berisiko dehidrasi berat, segera lakukan irigasi.`,
  },
  {
    id: 1002,
    type: "ph_acidic",
    check: (d) => d.ph < 5.5,
    title: "⚠️ Kualitas Tanah: pH Sangat Asam!",
    body: (d) =>
      `pH tanah tercatat ${d.ph.toFixed(1)}. Penyerapan hara terhambat, pertimbangkan penaburan kapur dolomit.`,
  },
  {
    id: 1003,
    type: "ph_alkaline",
    check: (d) => d.ph > 8.0,
    title: "⚠️ Kualitas Tanah: pH Terlalu Basa!",
    body: (d) =>
      `pH tanah tercatat ${d.ph.toFixed(1)}. Waspadai defisiensi mikronutrien fosfor dan besi.`,
  },
  {
    id: 1004,
    type: "temp_extreme",
    check: (d) => d.temperature > 35,
    title: "🌡️ Suhu Tanah Sangat Panas!",
    body: (d) =>
      `Suhu perakaran mencapai ${d.temperature.toFixed(1)}°C. Potensi stres panas pada akar tanaman.`,
  },
];

// ─── Cooldown Mechanism ──────────────────────────────────────────────
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes
const lastFiredMap: Map<AlertType, number> = new Map();

function isCoolingDown(type: AlertType): boolean {
  const lastFired = lastFiredMap.get(type);
  if (!lastFired) return false;
  return Date.now() - lastFired < COOLDOWN_MS;
}

function markFired(type: AlertType): void {
  lastFiredMap.set(type, Date.now());
}

// ─── Permission Handling ─────────────────────────────────────────────
const isNative = Capacitor.isNativePlatform();

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  }
  // Web fallback
  if ("Notification" in window) {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  return false;
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const result = await LocalNotifications.checkPermissions();
    return result.display === "granted";
  }
  if ("Notification" in window) {
    return Notification.permission === "granted";
  }
  return false;
}

// ─── Send Local Notification ─────────────────────────────────────────
async function sendLocalNotification(
  id: number,
  title: string,
  body: string
): Promise<void> {
  if (isNative) {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          smallIcon: "ic_stat_icon_config_sample",
          largeIcon: "ic_launcher",
          sound: "default",
        },
      ],
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/icon-192x192.png" });
  }
}

// ─── In-App Notification History ─────────────────────────────────────
export interface InAppNotification {
  id: number;
  type: "warning" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
  iconName: "Droplets" | "Activity" | "AlertTriangle" | "Zap";
}

const ICON_MAP: Record<AlertType, InAppNotification["iconName"]> = {
  moisture_critical: "Droplets",
  ph_acidic: "Activity",
  ph_alkaline: "Activity",
  temp_extreme: "Zap",
};

function saveInAppNotification(rule: AlertRule, data: NPKSensorData): void {
  const storageKey = "iot_notifications";
  let existing: InAppNotification[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) existing = JSON.parse(raw);
  } catch {
    // ignore
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const newNotif: InAppNotification = {
    id: Date.now(),
    type: rule.type === "moisture_critical" || rule.type === "temp_extreme" ? "error" : "warning",
    title: rule.title.replace(/[🚨⚠️🌡️]\s*/g, ""),
    message: rule.body(data),
    time: timeStr,
    read: false,
    iconName: ICON_MAP[rule.type],
  };

  // Keep max 50 notifications, newest first
  existing.unshift(newNotif);
  if (existing.length > 50) existing = existing.slice(0, 50);
  localStorage.setItem(storageKey, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent("iot_notifications_updated"));
}

// ─── Main Evaluation Function ────────────────────────────────────────
/**
 * Call this every time sensor data updates.
 * It evaluates all threshold rules and fires notifications
 * (respecting the cooldown period).
 */
export async function evaluateSensorAlerts(data: NPKSensorData): Promise<void> {
  const hasPermission = await hasNotificationPermission();

  for (const rule of ALERT_RULES) {
    if (rule.check(data) && !isCoolingDown(rule.type)) {
      markFired(rule.type);
      const body = rule.body(data);

      // Save to in-app notification history
      saveInAppNotification(rule, data);

      // Send OS-level notification if permitted
      if (hasPermission) {
        await sendLocalNotification(rule.id, rule.title, body);
      }
    }
  }
}

/**
 * Send a test notification – used from Settings screen
 */
export async function sendTestNotification(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  await sendLocalNotification(
    9999,
    "🔔 Tes Notifikasi Berhasil!",
    "Sistem peringatan kondisi kritis tanah sudah aktif dan berjalan."
  );
  return true;
}

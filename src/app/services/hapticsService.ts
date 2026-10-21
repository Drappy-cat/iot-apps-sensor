/**
 * Haptics Service – Cross-platform vibration feedback
 *
 * Uses @capacitor/haptics on native Android (Capacitor),
 * falls back to navigator.vibrate on Web browsers.
 * All methods are safe no-ops when neither API is available.
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();

/** Fallback vibrate for web browsers (no-op if unsupported) */
function webVibrate(pattern: number | number[]): void {
  try {
    navigator?.vibrate?.(pattern);
  } catch {
    // silently ignore – vibration not supported
  }
}

/**
 * Light tap – tab navigation, filter selection, modal close
 */
export async function hapticLight(): Promise<void> {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Light });
  } else {
    webVibrate(10);
  }
}

/**
 * Medium tap – setpoint increment/decrement, slider interaction
 */
export async function hapticMedium(): Promise<void> {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } else {
    webVibrate(20);
  }
}

/**
 * Heavy tap – major actions, long-press confirmations
 */
export async function hapticHeavy(): Promise<void> {
  if (isNative) {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } else {
    webVibrate(30);
  }
}

/**
 * Success notification – toggle ON, config saved, export completed
 */
export async function hapticSuccess(): Promise<void> {
  if (isNative) {
    await Haptics.notification({ type: NotificationType.Success });
  } else {
    webVibrate([15, 50, 15]);
  }
}

/**
 * Warning notification – access denied, viewer-blocked action
 */
export async function hapticWarning(): Promise<void> {
  if (isNative) {
    await Haptics.notification({ type: NotificationType.Warning });
  } else {
    webVibrate([30, 30, 30]);
  }
}

/**
 * Error notification – critical threshold alert, connection failure
 */
export async function hapticError(): Promise<void> {
  if (isNative) {
    await Haptics.notification({ type: NotificationType.Error });
  } else {
    webVibrate([50, 50, 50, 50]);
  }
}

export const INSTALL_DISMISSAL_KEY = "alaia:pwa-install-dismissed:v1";
export const INSTALL_DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export type InstallPlatform = "native" | "ios";

interface InstallEnvironment {
  hasNativePrompt: boolean;
  displayModeStandalone: boolean;
  navigatorStandalone: boolean;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  dismissedAt: number | null;
  now: number;
}

export function isIosDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isDismissedRecently(dismissedAt: number | null, now: number): boolean {
  return dismissedAt !== null && now - dismissedAt < INSTALL_DISMISSAL_COOLDOWN_MS;
}

/** Una sola decisión para Chromium/Desktop, standalone e iOS manual. */
export function resolveInstallPlatform(environment: InstallEnvironment): InstallPlatform | null {
  if (environment.displayModeStandalone || environment.navigatorStandalone) return null;
  if (isDismissedRecently(environment.dismissedAt, environment.now)) return null;
  if (environment.hasNativePrompt) return "native";
  if (isIosDevice(environment.userAgent, environment.platform, environment.maxTouchPoints)) return "ios";
  return null;
}

export function readInstallDismissedAt(storage: Storage): number | null {
  try {
    const value = Number(storage.getItem(INSTALL_DISMISSAL_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberInstallDismissal(storage: Storage, now: number): void {
  try {
    storage.setItem(INSTALL_DISMISSAL_KEY, String(now));
  } catch {
    // Storage privado/bloqueado: ocultar durante esta sesión sigue funcionando.
  }
}

import { describe, expect, it } from "vitest";
import {
  INSTALL_DISMISSAL_COOLDOWN_MS,
  isIosDevice,
  resolveInstallPlatform,
} from "./installRules";

const BASE = {
  hasNativePrompt: false,
  displayModeStandalone: false,
  navigatorStandalone: false,
  userAgent: "Mozilla/5.0 Chrome/140",
  platform: "Win32",
  maxTouchPoints: 0,
  dismissedAt: null,
  now: Date.UTC(2026, 6, 13),
};

describe("resolveInstallPlatform", () => {
  it("muestra instalación nativa solo cuando existe beforeinstallprompt", () => {
    expect(resolveInstallPlatform({ ...BASE, hasNativePrompt: true })).toBe("native");
    expect(resolveInstallPlatform(BASE)).toBeNull();
  });

  it("mantiene la estrategia manual para iPhone e iPadOS", () => {
    expect(resolveInstallPlatform({ ...BASE, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)" })).toBe("ios");
    expect(isIosDevice("Mozilla/5.0", "MacIntel", 5)).toBe(true);
  });

  it("no muestra nada si la app ya está instalada", () => {
    expect(resolveInstallPlatform({ ...BASE, hasNativePrompt: true, displayModeStandalone: true })).toBeNull();
    expect(resolveInstallPlatform({ ...BASE, hasNativePrompt: true, navigatorStandalone: true })).toBeNull();
  });

  it("respeta el descarte reciente y vuelve a ser elegible al terminar el cooldown", () => {
    const dismissedAt = BASE.now - 1_000;
    expect(resolveInstallPlatform({ ...BASE, hasNativePrompt: true, dismissedAt })).toBeNull();
    expect(
      resolveInstallPlatform({
        ...BASE,
        hasNativePrompt: true,
        dismissedAt: BASE.now - INSTALL_DISMISSAL_COOLDOWN_MS,
      }),
    ).toBe("native");
  });
});

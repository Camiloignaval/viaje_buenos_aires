export interface PwaCapabilities {
  standalone: boolean;
  ios: boolean;
  hasInstallPrompt: boolean;
  notifications: boolean;
  pushManager: boolean;
  serviceWorker: boolean;
}

export function isIos(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function getPwaCapabilities(target: Window = window): PwaCapabilities {
  const navigator = target.navigator as Navigator & { standalone?: boolean };
  const standalone = target.matchMedia?.("(display-mode: standalone)").matches === true || navigator.standalone === true;
  return {
    standalone,
    ios: isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
    hasInstallPrompt: false,
    notifications: "Notification" in target,
    pushManager: "PushManager" in target,
    serviceWorker: "serviceWorker" in navigator,
  };
}

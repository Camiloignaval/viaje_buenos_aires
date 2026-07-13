import { useState, useSyncExternalStore } from "react";
import {
  readInstallDismissedAt,
  rememberInstallDismissal,
  resolveInstallPlatform,
} from "./installRules";
import { installPromptStore, type InstallPromptStore } from "./installPromptStore";

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function PwaInstallPrompt({ store = installPromptStore }: { store?: InstallPromptStore }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [dismissedAt, setDismissedAt] = useState(() => readInstallDismissedAt(window.localStorage));
  const [hiddenForSession, setHiddenForSession] = useState(false);
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;

  const platform = resolveInstallPlatform({
    hasNativePrompt: Boolean(snapshot.promptEvent),
    displayModeStandalone,
    navigatorStandalone: navigatorWithStandalone.standalone === true || snapshot.installed,
    userAgent: navigatorWithStandalone.userAgent,
    platform: navigatorWithStandalone.platform,
    maxTouchPoints: navigatorWithStandalone.maxTouchPoints,
    dismissedAt,
    now: Date.now(),
  });

  if (!platform || hiddenForSession) return null;

  function dismiss() {
    const now = Date.now();
    rememberInstallDismissal(window.localStorage, now);
    setDismissedAt(now);
    setHiddenForSession(true);
  }

  async function install() {
    const event = store.consumePrompt();
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "dismissed") dismiss();
    else setHiddenForSession(true);
  }

  return (
    <aside className="pwa-install-prompt" aria-label="Instalar Alaia">
      <button type="button" className="pwa-install-dismiss" onClick={dismiss} aria-label="Ahora no">
        ×
      </button>
      {platform === "ios" ? (
        <p>
          Para guardar Alaia en tu inicio, toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong>.
        </p>
      ) : (
        <>
          <p>Alaia puede quedarse contigo, en tu pantalla de inicio.</p>
          <button type="button" className="pwa-install-action" onClick={() => void install()}>
            Dejarla en inicio
          </button>
        </>
      )}
    </aside>
  );
}

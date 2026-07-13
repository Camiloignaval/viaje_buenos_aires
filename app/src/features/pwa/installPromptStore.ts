export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptSnapshot {
  promptEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
}

export interface InstallPromptStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => InstallPromptSnapshot;
  consumePrompt: () => BeforeInstallPromptEvent | null;
}

export function createInstallPromptStore(target: Window): InstallPromptStore {
  let snapshot: InstallPromptSnapshot = { promptEvent: null, installed: false };
  const listeners = new Set<() => void>();

  function emit(next: InstallPromptSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  target.addEventListener("beforeinstallprompt", (rawEvent) => {
    const event = rawEvent as BeforeInstallPromptEvent;
    event.preventDefault();
    emit({ ...snapshot, promptEvent: event });
  });

  target.addEventListener("appinstalled", () => {
    emit({ promptEvent: null, installed: true });
  });

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    consumePrompt() {
      const event = snapshot.promptEvent;
      emit({ ...snapshot, promptEvent: null });
      return event;
    },
  };
}

// Este módulo se evalúa al cargar el router, antes del primer render: no pierde
// un beforeinstallprompt temprano mientras React monta la aplicación.
export const installPromptStore = createInstallPromptStore(window);

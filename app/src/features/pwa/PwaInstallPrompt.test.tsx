import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTALL_DISMISSAL_KEY } from "./installRules";
import { createInstallPromptStore, type BeforeInstallPromptEvent } from "./installPromptStore";
import { PwaInstallPrompt } from "./PwaInstallPrompt";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PwaInstallPrompt", () => {
  it("captura beforeinstallprompt, instala y no mezcla permisos de notificaciones", async () => {
    const store = createInstallPromptStore(window);
    const prompt = vi.fn().mockResolvedValue(undefined);
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { requestPermission });
    const event = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEvent;
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });
    window.dispatchEvent(event);

    render(<PwaInstallPrompt store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Instalar Alaia" }));

    expect(prompt).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Instalar Alaia" })).not.toBeInTheDocument());
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("persiste el descarte para no insistir en visitas recientes", () => {
    const store = createInstallPromptStore(window);
    const event = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEvent;
    Object.assign(event, {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });
    window.dispatchEvent(event);

    render(<PwaInstallPrompt store={store} />);
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));

    expect(Number(window.localStorage.getItem(INSTALL_DISMISSAL_KEY))).toBeGreaterThan(0);
    expect(screen.queryByRole("complementary", { name: "Instalar Alaia" })).not.toBeInTheDocument();
  });
});

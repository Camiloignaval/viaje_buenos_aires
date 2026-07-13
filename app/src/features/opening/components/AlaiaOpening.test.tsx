import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OPENING_SAFETY_FALLBACK_MS,
  OPENING_STORAGE_KEY,
  OPENING_VIDEO_SRC,
} from "../lib/openingConstants";
import { createOpeningRecord } from "../lib/openingRules";
import { AlaiaOpening } from "./AlaiaOpening";

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderOpening() {
  return render(
    <AlaiaOpening>
      <main>Home Alaia</main>
    </AlaiaOpening>,
  );
}

describe("AlaiaOpening", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, "", "/");
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockReducedMotion(false);
    Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.querySelectorAll("[data-test-previous-focus]").forEach((element) => element.remove());
  });

  it("muestra la apertura global la primera vez y mantiene Home montado detrás", () => {
    const { container } = renderOpening();

    expect(screen.getByText("Home Alaia")).toBeInTheDocument();
    expect(screen.getByTestId("alaia-opening")).toBeInTheDocument();

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", OPENING_VIDEO_SRC);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "auto");
    expect(video).toHaveAttribute("autoplay");
    expect(video).not.toHaveAttribute("controls");
    expect(video).not.toHaveAttribute("loop");
  });

  it("no la muestra de inmediato si ya fue vista", () => {
    window.localStorage.setItem(
      OPENING_STORAGE_KEY,
      JSON.stringify(createOpeningRecord(new Date())),
    );

    renderOpening();

    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
    expect(screen.getByText("Home Alaia")).toBeInTheDocument();
  });

  it("no se cierra sola mientras el video sigue reproduciendo", () => {
    renderOpening();

    // Sin metadata de duración (jsdom), aplica el fallback de la red de
    // seguridad: hasta ese momento la apertura sigue visible, esperando el video.
    act(() => vi.advanceTimersByTime(OPENING_SAFETY_FALLBACK_MS - 1));
    expect(screen.getByTestId("alaia-opening")).toBeInTheDocument();
  });

  it("cierra por la red de seguridad si el video nunca termina", () => {
    renderOpening();

    act(() => vi.advanceTimersByTime(OPENING_SAFETY_FALLBACK_MS));
    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(OPENING_STORAGE_KEY)).not.toBeNull();
  });

  it("sale inmediatamente si el video falla", () => {
    const { container } = renderOpening();
    const video = container.querySelector("video");

    fireEvent.error(video as HTMLVideoElement);

    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
    expect(screen.getByText("Home Alaia")).toBeInTheDocument();
  });

  it("sale con Escape sin tocar el intro de Experience", () => {
    window.sessionStorage.setItem("alaia:intro-video-2-seen:ba-2026", "1");

    renderOpening();
    fireEvent.keyDown(window, { key: "Escape" });
    act(() => vi.advanceTimersByTime(799));
    expect(screen.getByTestId("alaia-opening")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("alaia:intro-video-2-seen:ba-2026")).toBe("1");
    expect(document.querySelector("[data-alaia-intro-video]")).toBeNull();
  });

  it("sale cuando termina el video", () => {
    const { container } = renderOpening();
    const video = container.querySelector("video");

    fireEvent.ended(video as HTMLVideoElement);
    expect(screen.getByTestId("alaia-opening")).toHaveClass("is-fading");

    act(() => vi.advanceTimersByTime(799));
    expect(screen.getByTestId("alaia-opening")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
  });

  it("respeta prefers-reduced-motion con una salida corta y sin video", () => {
    mockReducedMotion(true);

    const { container } = renderOpening();
    expect(container.querySelector("video")).toBeNull();

    act(() => vi.advanceTimersByTime(199));
    expect(screen.getByTestId("alaia-opening")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    expect(screen.queryByTestId("alaia-opening")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(OPENING_STORAGE_KEY)).not.toBeNull();
  });

  it("aísla la app, enfoca el salto y restaura estado y foco al cerrar", () => {
    const previousFocus = document.createElement("button");
    previousFocus.dataset.testPreviousFocus = "true";
    document.body.append(previousFocus);
    previousFocus.focus();

    const { container } = renderOpening();
    const app = container.querySelector(".alaia-opening-app");
    const skip = screen.getByRole("button", { name: "Saltar apertura" });

    expect(app).toHaveAttribute("aria-hidden", "true");
    expect(app).toHaveAttribute("inert");
    expect(skip).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    act(() => vi.advanceTimersByTime(800));

    expect(app).not.toHaveAttribute("aria-hidden");
    expect(app).not.toHaveAttribute("inert");
    expect(previousFocus).toHaveFocus();
  });

  it("restaura el foco previo y limpia timers al desmontar durante la apertura", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const previousFocus = document.createElement("button");
    previousFocus.dataset.testPreviousFocus = "true";
    document.body.append(previousFocus);
    previousFocus.focus();

    const { unmount } = renderOpening();
    expect(screen.getByRole("button", { name: "Saltar apertura" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });

    unmount();

    expect(previousFocus).toHaveFocus();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });
});

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/prefersReducedMotion";
import {
  OPENING_FADE_MS,
  OPENING_MOBILE_MEDIA_QUERY,
  OPENING_REDUCED_MOTION_MS,
  OPENING_SAFETY_BUFFER_MS,
  OPENING_SAFETY_FALLBACK_MS,
  OPENING_VIDEO_SRC,
  OPENING_VIDEO_SRC_MOBILE,
  SUPPORTED_OPENING_VARIANT,
  type OpeningVariant,
} from "../lib/openingConstants";
import { isDevOpeningForceEnabled, shouldShowOpening } from "../lib/openingRules";
import { persistOpeningShown, readOpeningRecord } from "../lib/openingStorage";
import "./alaiaOpening.css";

type AlaiaOpeningProps = {
  children: ReactNode;
  variant?: OpeningVariant;
};

type OpeningStatus = "hidden" | "video" | "reduced";

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function resolveVideoSrc(): string {
  if (!canUseWindow() || typeof window.matchMedia !== "function") {
    return OPENING_VIDEO_SRC;
  }
  return window.matchMedia(OPENING_MOBILE_MEDIA_QUERY).matches
    ? OPENING_VIDEO_SRC_MOBILE
    : OPENING_VIDEO_SRC;
}

function resolveInitialStatus(variant: OpeningVariant): OpeningStatus {
  if (!canUseWindow() || variant !== SUPPORTED_OPENING_VARIANT) return "hidden";

  const force = isDevOpeningForceEnabled({
    search: window.location.search,
    isDev: import.meta.env.DEV,
  });

  const shouldShow = shouldShowOpening({
    record: readOpeningRecord(),
    force,
  });

  if (!shouldShow) return "hidden";
  if (prefersReducedMotion()) return "reduced";
  return "video";
}

export function AlaiaOpening({
  children,
  variant = SUPPORTED_OPENING_VARIANT,
}: AlaiaOpeningProps) {
  const [status, setStatus] = useState<OpeningStatus>(() => resolveInitialStatus(variant));
  const [isFading, setIsFading] = useState(false);
  const [videoSrc] = useState(() => resolveVideoSrc());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const skipButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const hasClosedRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  const rememberShown = useCallback(() => {
    persistOpeningShown({ variant });
  }, [variant]);

  const closeImmediately = useCallback(() => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    clearTimers();
    rememberShown();
    setIsFading(false);
    setStatus("hidden");
  }, [clearTimers, rememberShown]);

  const closeWithFade = useCallback(() => {
    if (hasClosedRef.current) return;
    hasClosedRef.current = true;
    clearTimers();
    rememberShown();
    setIsFading(true);
    const fadeDuration = status === "reduced" ? OPENING_REDUCED_MOTION_MS : OPENING_FADE_MS;
    const timerId = window.setTimeout(() => setStatus("hidden"), fadeDuration);
    timersRef.current.push(timerId);
  }, [clearTimers, rememberShown, status]);

  useEffect(() => {
    if (status === "hidden") return;
    if (status === "reduced") {
      rememberShown();
      const timerId = window.setTimeout(() => setStatus("hidden"), OPENING_REDUCED_MOTION_MS);
      timersRef.current.push(timerId);
      return clearTimers;
    }

    if (status !== "video") return;

    const video = videoRef.current;
    rememberShown();

    // El cierre real lo dispara onEnded cuando el video termina. Esto es solo
    // una red de seguridad: si el video se cuelga o nunca emite "ended", la
    // apertura igual se cierra. La ajustamos a la duración real al conocerla.
    let safetyTimerId = window.setTimeout(closeImmediately, OPENING_SAFETY_FALLBACK_MS);

    const onLoadedMetadata = () => {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      window.clearTimeout(safetyTimerId);
      const cap = video.duration * 1000 + OPENING_SAFETY_BUFFER_MS;
      safetyTimerId = window.setTimeout(closeImmediately, cap);
    };

    video?.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video && Number.isFinite(video.duration) && video.duration > 0) {
      onLoadedMetadata();
    }

    const played = video?.play?.();
    if (played && typeof played.catch === "function") {
      played.catch(closeImmediately);
    }

    return () => {
      window.clearTimeout(safetyTimerId);
      clearTimers();
      video?.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [clearTimers, closeImmediately, rememberShown, status]);

  useEffect(() => {
    if (status === "hidden") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithFade();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWithFade, status]);

  useEffect(() => {
    if (status === "hidden") return;

    const activeElement = document.activeElement;
    previousFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    skipButtonRef.current?.focus({ preventScroll: true });

    return () => {
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [status]);

  const isVisible = status !== "hidden";
  const overlayFading = isFading || status === "reduced";

  return (
    <>
      <div
        className="alaia-opening-app"
        data-opening-active={isVisible ? "true" : undefined}
        aria-hidden={isVisible ? true : undefined}
        inert={isVisible ? true : undefined}
      >
        {children}
      </div>
      {isVisible ? (
        <div
          className={overlayFading ? "alaia-opening is-fading" : "alaia-opening"}
          role="dialog"
          aria-label="Apertura de marca Alaia"
          aria-modal="true"
          data-testid="alaia-opening"
        >
          {status === "video" ? (
            <video
              ref={videoRef}
              className="alaia-opening__video"
              src={videoSrc}
              muted
              autoPlay
              playsInline
              preload="auto"
              onEnded={closeWithFade}
              onError={closeImmediately}
            />
          ) : null}
          <button
            ref={skipButtonRef}
            className="alaia-opening__skip"
            type="button"
            onClick={closeWithFade}
          >
            Saltar apertura
          </button>
        </div>
      ) : null}
    </>
  );
}

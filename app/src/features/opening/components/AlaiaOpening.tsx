import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/prefersReducedMotion";
import {
  OPENING_CROSSFADE_START_MS,
  OPENING_HOME_STABLE_MS,
  OPENING_MAX_TIMEOUT_MS,
  OPENING_REDUCED_MOTION_MS,
  OPENING_VIDEO_SRC,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
    const timerId = window.setTimeout(() => setStatus("hidden"), OPENING_REDUCED_MOTION_MS);
    timersRef.current.push(timerId);
  }, [clearTimers, rememberShown]);

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

    const fadeTimer = window.setTimeout(() => setIsFading(true), OPENING_CROSSFADE_START_MS);
    const doneTimer = window.setTimeout(closeImmediately, OPENING_HOME_STABLE_MS);
    const maxTimer = window.setTimeout(closeImmediately, OPENING_MAX_TIMEOUT_MS);
    timersRef.current.push(fadeTimer, doneTimer, maxTimer);

    const played = video?.play?.();
    if (played && typeof played.catch === "function") {
      played.catch(closeImmediately);
    }

    return clearTimers;
  }, [clearTimers, closeImmediately, rememberShown, status]);

  useEffect(() => {
    if (status === "hidden") return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithFade();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWithFade, status]);

  const isVisible = status !== "hidden";
  const overlayFading = isFading || status === "reduced";

  return (
    <>
      <div className="alaia-opening-app" data-opening-active={isVisible ? "true" : undefined}>
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
              src={OPENING_VIDEO_SRC}
              muted
              autoPlay
              playsInline
              preload="auto"
              onEnded={closeWithFade}
              onError={closeImmediately}
            />
          ) : null}
          <button className="alaia-opening__skip" type="button" onClick={closeWithFade}>
            Saltar apertura
          </button>
        </div>
      ) : null}
    </>
  );
}

import { useExperienceCtx } from "./experienceContext";
import { IntroParticles } from "./IntroParticles";
import { IndexPage } from "./IndexPage";
import { DAY_IN_MS } from "../lib/format";
import type { NextUnlock } from "@/features/story/engine/types";

// Espejo de renderTravelLine.
function TravelLine({ origin, destination }: { origin?: string; destination: string }) {
  if (!origin) {
    return null;
  }
  return (
    <div className="travel-line reveal reveal-2" aria-hidden="true">
      <span className="travel-line-city">{origin}</span>
      <span className="travel-line-route">
        <svg className="travel-line-svg" viewBox="0 0 240 24" preserveAspectRatio="none">
          <line className="travel-line-stroke" x1="4" y1="12" x2="236" y2="12" />
        </svg>
        <span className="travel-line-plane">✈</span>
      </span>
      <span className="travel-line-city">{destination}</span>
    </div>
  );
}

// Espejo de renderCountdown: el número es protagonista, nunca "Faltan X días".
function Countdown({ nextUnlock, now }: { nextUnlock: NextUnlock | null; now: Date }) {
  if (!nextUnlock) {
    return null;
  }
  const days = Math.max(0, Math.ceil((nextUnlock.date.getTime() - now.getTime()) / DAY_IN_MS));
  if (days === 0) {
    return <p className="countdown-today reveal reveal-4">Hoy comienza.</p>;
  }
  return (
    <div className="countdown-hero reveal reveal-4">
      <span className="countdown-number">{days}</span>
      <span className="countdown-label">{days === 1 ? "día" : "días"}</span>
    </div>
  );
}

// Espejo de renderCoverContent.
function CoverContent() {
  const { view, storyPackage, now } = useExperienceCtx();
  const { metadata, baseCopy } = storyPackage;
  return (
    <div className="cover-content">
      <div className="cover-header">
        <p className="eyebrow cover-eyebrow reveal reveal-1">{metadata.destination}</p>
        <h1 className="cover-title reveal reveal-2">{metadata.title}</h1>
        <TravelLine origin={metadata.origin} destination={metadata.destination} />
      </div>
      <p className="cover-promise reveal reveal-3">{baseCopy.welcomeMessage}</p>
      <div className="cover-countdown-group">
        <Countdown nextUnlock={view.nextUnlock} now={now} />
        <span className="cover-divider reveal reveal-5" aria-hidden="true" />
      </div>
    </div>
  );
}

// Espejo de renderStaticCover.
export function StaticCover() {
  return (
    <section className="book-page cover">
      <img className="cover-photo" src="/cover-hero.jpg" alt="" />
      <div className="cover-tint" aria-hidden="true" />
      <div className="cover-scrim" aria-hidden="true" />
      <CoverContent />
    </section>
  );
}

// Espejo de renderReplayIntroButton.
export function ReplayIntroButton() {
  const { actions } = useExperienceCtx();
  return (
    <button
      type="button"
      className="intro-replay-button"
      aria-label="Repetir intro"
      onClick={() => actions.replayIntro()}
    >
      ↻
    </button>
  );
}

// Espejo de renderIntroVideo. El <video> se registra en useExperience (ref) para
// enganchar los eventos (ended/error/play) — igual que attachIntroVideoEvents.
function IntroVideo() {
  const { actions } = useExperienceCtx();
  return (
    <div className="intro-video-shell" aria-label="Introducción de Aurora">
      <video
        className="intro-video"
        src="/video_intro_2.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        data-aurora-intro-video=""
        ref={actions.registerIntroVideo}
      />
      <div className="cover-tint" aria-hidden="true" />
      <div className="cover-scrim" aria-hidden="true" />
      <CoverContent />
      <div className="intro-dark-overlay" aria-hidden="true" />
      <IntroParticles />
    </div>
  );
}

// Espejo de renderIntroIndexStage: la portada-video que continúa hacia el índice.
export function IntroIndexStage() {
  const { coverIntroState } = useExperienceCtx();
  const stateClass =
    coverIntroState === "video"
      ? "is-video-running"
      : coverIntroState === "revealing"
        ? "is-index-writing"
        : "is-index-done";
  return (
    <div className={`cover-index-stage ${stateClass}`}>
      <IndexPage
        pendingReveal={coverIntroState !== "done"}
        revealing={coverIntroState === "revealing"}
        extraClass="page-index-ritual"
        showParticles
      />
      {coverIntroState === "video" ? <IntroVideo /> : null}
      {coverIntroState === "done" ? <ReplayIntroButton /> : null}
    </div>
  );
}

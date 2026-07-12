import type { CSSProperties } from "react";
import { PARTICLE_DEPTH, INTRO_PARTICLES, INTRO_GLINTS } from "../lib/particles";

type ParticleStyle = CSSProperties & Record<`--p-${string}`, string | number>;

// Espejo de renderIntroParticles(extraClass) — partículas doradas del umbral.
export function IntroParticles({ extraClass = "" }: { extraClass?: string }) {
  return (
    <div className={`intro-particles ${extraClass}`} aria-hidden="true">
      {INTRO_PARTICLES.map(([left, size, duration, delay, drift, depth], i) => {
        const { opacity, blur } = PARTICLE_DEPTH[depth];
        const style: ParticleStyle = {
          "--p-left": `${left}%`,
          "--p-size": `${size}px`,
          "--p-duration": `${duration}s`,
          "--p-delay": `-${delay}s`,
          "--p-drift": `${drift}px`,
          "--p-opacity": opacity,
          "--p-blur": `${blur}px`,
        };
        return (
          <span
            key={`rise-${i}`}
            className="intro-particle intro-particle-rise"
            style={style}
          />
        );
      })}
      {INTRO_GLINTS.map(([left, top, size, duration, delay, depth], i) => {
        const { opacity, blur } = PARTICLE_DEPTH[depth];
        const style: ParticleStyle = {
          "--p-left": `${left}%`,
          "--p-top": `${top}%`,
          "--p-size": `${size}px`,
          "--p-duration": `${duration}s`,
          "--p-delay": `-${delay}s`,
          "--p-opacity": opacity,
          "--p-blur": `${blur}px`,
        };
        return (
          <span
            key={`glint-${i}`}
            className="intro-particle intro-particle-glint"
            style={style}
          />
        );
      })}
    </div>
  );
}

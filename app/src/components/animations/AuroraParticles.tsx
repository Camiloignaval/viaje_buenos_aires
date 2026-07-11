import type { CSSProperties } from "react";

// Partículas doradas del umbral de Aurora — receta portada literal desde
// connectedShell.js (profundidad far/mid/near → tamaño/velocidad/opacidad/
// nitidez). Es atmósfera pura: aria-hidden, sin interacción.

type Depth = "far" | "mid" | "near";

const DEPTH: Record<Depth, { opacity: number; blur: number }> = {
  far: { opacity: 0.5, blur: 0.9 },
  mid: { opacity: 1, blur: 0.15 },
  near: { opacity: 1.3, blur: 0 },
};

interface Rise {
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  depth: Depth;
}

interface Glint {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  depth: Depth;
}

const RISING: Rise[] = [
  { left: 6, size: 1.3, duration: 66, delay: 40, drift: -6, depth: "far" },
  { left: 19, size: 1.5, duration: 72, delay: 12, drift: 10, depth: "far" },
  { left: 48, size: 1.4, duration: 68, delay: 5, drift: 7, depth: "far" },
  { left: 77, size: 1.5, duration: 63, delay: 20, drift: 9, depth: "far" },
  { left: 24, size: 2.7, duration: 44, delay: 6, drift: 12, depth: "mid" },
  { left: 52, size: 2.8, duration: 46, delay: 24, drift: 9, depth: "mid" },
  { left: 80, size: 2.6, duration: 42, delay: 37, drift: 13, depth: "mid" },
  { left: 15, size: 3.6, duration: 24, delay: 8, drift: -15, depth: "near" },
  { left: 70, size: 3.4, duration: 22, delay: 3, drift: -13, depth: "near" },
];

const GLINTS: Glint[] = [
  { left: 14, top: 22, size: 1.3, duration: 8.5, delay: 1.0, depth: "far" },
  { left: 81, top: 15, size: 1.4, duration: 8.8, delay: 3.0, depth: "far" },
  { left: 38, top: 30, size: 2.0, duration: 5.4, delay: 2.0, depth: "near" },
  { left: 66, top: 58, size: 2.2, duration: 5.8, delay: 0.5, depth: "near" },
];

// CSSProperties + las custom props --p-* que consume shell.css.
type ParticleStyle = CSSProperties & Record<`--p-${string}`, string | number>;

export function AuroraParticles({ subtle = false }: { subtle?: boolean }) {
  return (
    <div
      className={`aurora-particles${subtle ? " aurora-particles-subtle" : ""}`}
      aria-hidden="true"
    >
      {RISING.map((p, i) => {
        const { opacity, blur } = DEPTH[p.depth];
        const style: ParticleStyle = {
          "--p-left": `${p.left}%`,
          "--p-size": `${p.size}px`,
          "--p-duration": `${p.duration}s`,
          "--p-delay": `-${p.delay}s`,
          "--p-drift": `${p.drift}px`,
          "--p-opacity": opacity,
          "--p-blur": `${blur}px`,
        };
        return (
          <span
            key={`rise-${i}`}
            className="aurora-particle aurora-particle-rise"
            style={style}
          />
        );
      })}
      {GLINTS.map((p, i) => {
        const { opacity, blur } = DEPTH[p.depth];
        const style: ParticleStyle = {
          "--p-left": `${p.left}%`,
          "--p-top": `${p.top}%`,
          "--p-size": `${p.size}px`,
          "--p-duration": `${p.duration}s`,
          "--p-delay": `-${p.delay}s`,
          "--p-opacity": opacity,
          "--p-blur": `${blur}px`,
        };
        return (
          <span
            key={`glint-${i}`}
            className="aurora-particle aurora-particle-glint"
            style={style}
          />
        );
      })}
    </div>
  );
}

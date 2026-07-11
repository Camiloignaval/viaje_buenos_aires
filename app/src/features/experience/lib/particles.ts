// Profundidad simulada por capas (E-refino cinematográfico): cada capa correlaciona
// tamaño, velocidad, opacidad y nitidez. Datos portados VERBATIM de render.js
// (renderIntroParticles) — son parte de la atmósfera de Aurora.

type Depth = "far" | "mid" | "near";

export const PARTICLE_DEPTH: Record<Depth, { opacity: number; blur: number }> = {
  far: { opacity: 0.5, blur: 0.9 },
  mid: { opacity: 1, blur: 0.15 },
  near: { opacity: 1.3, blur: 0 },
};

// [left, size, duration, delay, drift, depth]
export type RiseTuple = [number, number, number, number, number, Depth];
// [left, top, size, duration, delay, depth]
export type GlintTuple = [number, number, number, number, number, Depth];

function withDepth<T extends number[]>(rows: T[], depth: Depth): (readonly [...T, Depth])[] {
  return rows.map((row) => [...row, depth] as const);
}

export const INTRO_PARTICLES: RiseTuple[] = [
  ...withDepth(
    [
      [6, 1.3, 66, 40, -6],
      [19, 1.5, 72, 12, 10],
      [33, 1.2, 60, 55, -9],
      [48, 1.4, 68, 5, 7],
      [62, 1.3, 74, 30, -11],
      [77, 1.5, 63, 20, 9],
      [91, 1.2, 70, 45, -7],
    ] as [number, number, number, number, number][],
    "far",
  ),
  ...withDepth(
    [
      [10, 2.2, 40, 18, -10],
      [24, 2.7, 44, 6, 12],
      [38, 2.1, 38, 33, -14],
      [52, 2.8, 46, 24, 9],
      [65, 2, 36, 10, -8],
      [80, 2.6, 42, 37, 13],
      [94, 2.3, 39, 3, -12],
    ] as [number, number, number, number, number][],
    "mid",
  ),
  ...withDepth(
    [
      [15, 3.6, 24, 8, -15],
      [42, 4, 27, 20, 16],
      [70, 3.4, 22, 3, -13],
      [88, 3.8, 26, 14, 14],
    ] as [number, number, number, number, number][],
    "near",
  ),
] as RiseTuple[];

export const INTRO_GLINTS: GlintTuple[] = [
  ...withDepth(
    [
      [14, 22, 1.3, 8.5, 1.0],
      [52, 76, 1.2, 9.2, 5.5],
      [81, 15, 1.4, 8.8, 3.0],
      [27, 60, 1.3, 9.5, 6.8],
    ] as [number, number, number, number, number][],
    "far",
  ),
  ...withDepth(
    [
      [38, 30, 2.0, 5.4, 2.0],
      [66, 58, 2.2, 5.8, 0.5],
      [90, 40, 1.9, 6.1, 4.2],
      [8, 68, 2.1, 5.6, 3.3],
    ] as [number, number, number, number, number][],
    "near",
  ),
] as GlintTuple[];

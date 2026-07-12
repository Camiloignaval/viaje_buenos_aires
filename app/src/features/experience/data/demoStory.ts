// El Story Package real de Alaia (Buenos Aires 2026), validado. Se importa el
// mismo JSON que usa la experience vanilla (read-only) — no se duplica la data.
//
// USO ACOTADO: es el demo LOCAL de desarrollo/QA — el único caso donde Experience
// muestra una historia sin un viaje real (rama `kind:"local"` de ExperiencePage,
// cuando no hay ?tripId=). En producción la historia SIEMPRE se resuelve desde el
// catálogo vía el baseStoryId del viaje (useResolvedStory); este package NUNCA es
// un fallback de un viaje conectado.
import raw from "@/story/data/story-ba2026.json";
import { loadStoryPackage } from "@/features/story/engine/storyPackage";

// `/*#__PURE__*/` le dice a Rollup que esta llamada no tiene efectos observables:
// así, cuando el gate `import.meta.env.DEV` elimina el único uso en producción,
// también se eliminan este const y el JSON de BA del bundle de producción (DCE).
export const demoStoryPackage = /*#__PURE__*/ loadStoryPackage(raw);

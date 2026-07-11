import { createContext, useContext } from "react";
import type { ExperienceContextValue } from "../experienceTypes";

// Contexto que reparte estado + acciones al árbol de componentes de la experience,
// evitando prop-drilling a través de ~40 componentes. Lo provee useExperience.
export const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function useExperienceCtx(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) {
    throw new Error("useExperienceCtx debe usarse dentro de <ExperienceContext.Provider>");
  }
  return ctx;
}

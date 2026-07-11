import type { ReactNode } from "react";
import { AlaiaParticles } from "@/components/animations/AlaiaParticles";
import { inviteCopy } from "../copy";

// Marco editorial compartido por las pantallas de invitación. Reutiliza la paleta
// del umbral de Alaia (alaia-entrance), igual que login y ExperienceUnavailable.
export function InviteFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="alaia-entrance">
      <AlaiaParticles subtle />
      <div className="alaia-entrance-content">
        <p className="alaia-eyebrow">{inviteCopy.eyebrow}</p>
        <h1 className="alaia-entrance-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

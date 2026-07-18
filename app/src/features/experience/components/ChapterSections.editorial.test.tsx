import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExperienceContextValue } from "../experienceTypes";
import type { ActivityWithPlace } from "@/features/story/engine/chapterContent";
import { ExperienceContext } from "./experienceContext";
import { ActivityCard, DayNote, NightNote } from "./ChapterSections";

// El insight vive dentro de ActivityCard, que consume el contexto de Experience.
// Solo se necesita lo mínimo para renderizar la tarjeta en modo no interactivo.
function renderWithExperience(ui: ReactNode) {
  const value = {
    interactive: false,
    stagedPhotosBySlot: new Map(),
  } as unknown as ExperienceContextValue;
  return render(<ExperienceContext.Provider value={value}>{ui}</ExperienceContext.Provider>);
}

function entryWith(overrides: Partial<ActivityWithPlace["activity"]>): ActivityWithPlace {
  return {
    activity: { id: "act-1", title: "Almuerzo en El Cuartito", ...overrides },
    place: null,
    suggestedMemories: [],
  } as ActivityWithPlace;
}

describe("ChapterSections — contenido editorial activado", () => {
  it("ActivityCard teje el insight dentro de la prosa, sin bloque propio", () => {
    renderWithExperience(
      <ActivityCard
        entry={entryWith({
          description: "Primera comida en la ciudad.",
          insight: "Aquí la pizza se come parada, apoyada en el mostrador.",
        })}
        chapterId="chapter-1"
        memoriesByActivityId={new Map()}
      />,
    );
    expect(screen.getByText(/Primera comida en la ciudad\. Aquí la pizza se come parada/)).toBeInTheDocument();
    expect(document.querySelector(".activity-insight")).toBeNull();
  });

  it("ActivityCard sin insight no inventa nada", () => {
    const { container } = renderWithExperience(
      <ActivityCard
        entry={entryWith({ description: "Llegada al hotel." })}
        chapterId="chapter-1"
        memoriesByActivityId={new Map()}
      />,
    );
    expect(container.querySelector(".passage-voice")).toHaveTextContent("Llegada al hotel.");
    expect(container.querySelector(".activity-insight")).toBeNull();
  });

  it("DayNote se fusiona en marginalia sin section-title", () => {
    render(
      <>
        <DayNote
          copy="Si llueve, Galerías Pacífico y el mercado están techados."
          title="Si el día cambia de idea"
          variant="plan-b"
          chapterId="chapter-3"
        />
        <DayNote
          copy="Si sobra tiempo, el Jardín Botánico queda cerca."
          title="Si el día da para más"
          variant="extra-time"
          chapterId="chapter-3"
        />
      </>,
    );
    expect(screen.getByText("Si el día cambia de idea")).toBeInTheDocument();
    expect(
      screen.getByText("Si llueve, Galerías Pacífico y el mercado están techados."),
    ).toBeInTheDocument();
    expect(screen.getByText("Si el día da para más")).toBeInTheDocument();
    expect(screen.getByText("Si sobra tiempo, el Jardín Botánico queda cerca.")).toBeInTheDocument();
    expect(document.querySelector(".section-title")).toBeNull();
  });

  it("DayNote no renderiza nada si el capítulo no trae ese contenido", () => {
    const { container } = render(
      <DayNote copy={undefined} title="Si el día cambia de idea" variant="plan-b" chapterId="chapter-1" />,
    );
    expect(container.querySelector(".day-note")).toBeNull();
  });

  it("NightNote es cierre tipográfico con filete y folio, sin título de sección", () => {
    render(<NightNote nightNote="Caminen veinte minutos más sin rumbo." chapterId="chapter-1" />);
    expect(screen.getByRole("heading", { name: "Cierre del día" })).toBeInTheDocument();
    expect(screen.getByText("Caminen veinte minutos más sin rumbo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Folio 1")).toHaveTextContent("— i —");
    expect(document.querySelector(".section-title")).toBeNull();
  });
});

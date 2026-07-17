import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChapterActivitySequence } from "./ChapterActivitySequence";

describe("ChapterActivitySequence", () => {
  it("presenta el recorrido como una secuencia editorial ordenada", () => {
    render(
      <ChapterActivitySequence chapterTitle="Bienvenidos a Buenos Aires">
        <li>El primer café</li>
        <li>Una caminata por Corrientes</li>
      </ChapterActivitySequence>,
    );

    expect(
      screen.getByRole("region", { name: "Recorrido de Bienvenidos a Buenos Aires" }),
    ).toBeInTheDocument();
    const sequence = screen.getByRole("list", { name: "Páginas de este día" });
    expect(sequence.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(sequence).toHaveClass("chapter-activity-sequence");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("no agrega una página vacía cuando el Story Package no trae actividades", () => {
    const { container } = render(
      <ChapterActivitySequence chapterTitle="Un día en calma">{null}</ChapterActivitySequence>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

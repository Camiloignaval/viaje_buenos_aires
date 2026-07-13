import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ExperienceUnavailable } from "./ExperienceUnavailable";

function renderState(variant: "empty" | "not-found" | "error", tripId?: string) {
  return render(
    <MemoryRouter>
      <ExperienceUnavailable variant={variant} tripId={tripId} />
    </MemoryRouter>,
  );
}

describe("ExperienceUnavailable", () => {
  it("vuelve a la portada del viaje cuando la historia todavía no existe", () => {
    renderState("empty", "trip-ba");

    expect(screen.getByRole("link", { name: "← Volver a la portada" })).toHaveAttribute(
      "href",
      "/trips/trip-ba",
    );
  });

  it("vuelve a Mis viajes cuando el viaje no está disponible", () => {
    renderState("not-found");

    expect(screen.getByRole("link", { name: "← Volver a Mis viajes" })).toHaveAttribute(
      "href",
      "/trips",
    );
  });

  it("mantiene el reintento como acción principal en un error técnico", () => {
    renderState("error");

    expect(screen.getByRole("button", { name: "Reintentar →" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

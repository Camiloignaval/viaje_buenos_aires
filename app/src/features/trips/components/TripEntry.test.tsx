import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripEntry } from "./TripEntry";
import type { Trip } from "../types";

const BASE_TRIP: Trip = {
  id: "1",
  title: "Luna de miel",
  destination: {
    countryCode: "AR",
    countryName: "Argentina",
    cityId: "nomi-111",
    cityName: "Buenos Aires",
    adminName: "CABA",
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
  },
  baseStoryId: "ba-2026",
  status: "active",
  role: "owner",
  updatedAt: "2026-01-05T18:00:00.000Z",
};

function renderEntry(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("TripEntry", () => {
  it("muestra 'Faltan X días' cuando el viaje tiene fechas", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    renderEntry(
      <ul>
        <TripEntry
          trip={{ ...BASE_TRIP, startDateTime: "2026-07-18T09:30", endDateTime: "2026-07-21T22:00" }}
          index={0}
          now={now}
        />
      </ul>,
    );
    expect(screen.getByText("Faltan 8 días.")).toBeInTheDocument();
  });

  it("no muestra countdown en viajes legacy sin fechas", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    renderEntry(
      <ul>
        <TripEntry trip={{ ...BASE_TRIP, destination: "Ruta del vino" }} index={0} now={now} />
      </ul>,
    );
    expect(screen.queryByText(/Falta|Hoy comienza|Mañana comienza|Día \d|recuerdo/)).not.toBeInTheDocument();
  });

  it("muestra 'Hoy comienza esta historia.' el día de la llegada", () => {
    const now = new Date("2026-07-18T06:00:00-03:00");
    renderEntry(
      <ul>
        <TripEntry
          trip={{ ...BASE_TRIP, startDateTime: "2026-07-18T09:30", endDateTime: "2026-07-21T22:00" }}
          index={0}
          now={now}
        />
      </ul>,
    );
    expect(screen.getByText("Hoy comienza esta historia.")).toBeInTheDocument();
  });

  it("sigue mostrando el destino además del countdown", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    renderEntry(
      <ul>
        <TripEntry
          trip={{ ...BASE_TRIP, startDateTime: "2026-07-18T09:30", endDateTime: "2026-07-21T22:00" }}
          index={0}
          now={now}
        />
      </ul>,
    );
    expect(screen.getByText("Buenos Aires, CABA")).toBeInTheDocument();
    expect(screen.getByText("Faltan 8 días.")).toBeInTheDocument();
  });

  it("no muestra countdown si falta solo una de las dos fechas", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    const { container } = renderEntry(
      <ul>
        <TripEntry trip={{ ...BASE_TRIP, startDateTime: "2026-07-18T09:30" }} index={0} now={now} />
      </ul>,
    );
    expect(container.querySelector(".trip-entry-countdown")).toBeNull();
  });

  it("fechas con formato inválido: no rompe el render ni muestra NaN/Invalid Date", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    const { container } = renderEntry(
      <ul>
        <TripEntry
          trip={{ ...BASE_TRIP, startDateTime: "esto-no-es-una-fecha", endDateTime: "2026-07-21T22:00" }}
          index={0}
          now={now}
        />
      </ul>,
    );
    expect(container.querySelector(".trip-entry-countdown")).toBeNull();
    expect(container.textContent).not.toMatch(/NaN/);
    expect(container.textContent).not.toMatch(/Invalid Date/);
  });

  it("destination como string (legacy) con fechas presentes igual no muestra countdown (sin timezone confiable)", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    const { container } = renderEntry(
      <ul>
        <TripEntry
          trip={{
            ...BASE_TRIP,
            destination: "Buenos Aires",
            startDateTime: "2026-07-18T09:30",
            endDateTime: "2026-07-21T22:00",
          }}
          index={0}
          now={now}
        />
      </ul>,
    );
    expect(container.querySelector(".trip-entry-countdown")).toBeNull();
  });

  it("navega con React Router hacia la portada del viaje", () => {
    const now = new Date("2026-07-10T15:00:00-03:00");
    renderEntry(
      <ul>
        <TripEntry trip={BASE_TRIP} index={0} now={now} />
      </ul>,
    );

    expect(screen.getByRole("link", { name: /luna de miel/i })).toHaveAttribute("href", "/trips/1");
  });
});

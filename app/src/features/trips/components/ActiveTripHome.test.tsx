import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { Trip } from "../types";
import { tripTemporalState } from "../lib/countdown";
import { tripUrl } from "../lib/tripUrl";
import { ActiveTripHome } from "./ActiveTripHome";

const TRIP: Trip = {
  id: "trip-1",
  title: "Buenos Aires en familia",
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
  updatedAt: "2026-07-01T12:00:00.000Z",
  startDateTime: "2026-07-18T09:30",
  endDateTime: "2026-07-21T22:00",
  accommodation: { type: "hotel", name: "Hotel Madero" },
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderInRouter(ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/trips/trip-1"]}>
      <Routes>
        <Route path="*" element={<>{ui}<LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ActiveTripHome", () => {
  it("muestra portada, cuenta regresiva, preparativos y entrada explícita a Experience", () => {
    renderInRouter(
      <ActiveTripHome
        trip={TRIP}
        lifecycle="upcoming"
        temporalState={tripTemporalState(
          new Date("2026-07-10T12:00:00-03:00"),
          TRIP.startDateTime ?? "",
          TRIP.endDateTime ?? "",
          "America/Argentina/Buenos_Aires",
        )}
        to={tripUrl(TRIP.id)}
      />,
    );

    expect(screen.getByRole("region", { name: "Portada del viaje activo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buenos Aires en familia" })).toBeInTheDocument();
    expect(screen.getByText("Buenos Aires, CABA")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Argentina" })).toHaveTextContent("🇦🇷");
    expect(screen.queryByText("AR")).not.toBeInTheDocument();
    expect(screen.getByText("18–21 de julio de 2026 · 3 noches")).toBeInTheDocument();
    expect(screen.getByText("La historia todavía está por comenzar.")).toBeInTheDocument();
    expect(screen.getByText("Todo estará listo cuando llegue el momento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar al viaje" })).toHaveAttribute(
      "href",
      "/experience?tripId=trip-1",
    );
  });

  it("renderiza la bandera de Chile de forma genérica y accesible", () => {
    const chileTrip: Trip = {
      ...TRIP,
      title: "Valdivia, 2026",
      destination: {
        countryCode: "CL",
        countryName: "Chile",
        cityId: "fallback:cl:valdivia",
        cityName: "Valdivia",
        adminName: "Región de Los Ríos",
        latitude: -39.8141,
        longitude: -73.246,
        timezone: "America/Santiago",
      },
    };

    renderInRouter(
      <ActiveTripHome
        trip={chileTrip}
        lifecycle="upcoming"
        temporalState={null}
        to={tripUrl(chileTrip.id)}
      />,
    );

    expect(screen.getByRole("img", { name: "Chile" })).toHaveTextContent("🇨🇱");
    expect(screen.queryByText("CL")).not.toBeInTheDocument();
  });

  it("navega por SPA (React Router) al hacer click — sin recarga de página", async () => {
    const user = userEvent.setup();
    renderInRouter(
      <ActiveTripHome trip={TRIP} lifecycle="upcoming" temporalState={null} to={tripUrl(TRIP.id)} />,
    );

    await user.click(screen.getByRole("link", { name: "Entrar al viaje" }));
    // La location del router cambió en memoria (navegación SPA), no un reload.
    expect(screen.getByTestId("location")).toHaveTextContent("/experience?tripId=trip-1");
  });

  it("CTA story-aware: con showAction=false NO muestra la entrada (historia sin resolver)", () => {
    renderInRouter(
      <ActiveTripHome
        trip={TRIP}
        lifecycle="upcoming"
        temporalState={null}
        to={tripUrl(TRIP.id)}
        showAction={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Buenos Aires en familia" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Entrar al viaje" })).not.toBeInTheDocument();
  });

  it("mantiene el CTA 'Entrar al viaje' cuando el viaje está en curso", () => {
    renderInRouter(
      <ActiveTripHome
        trip={TRIP}
        lifecycle="in-progress"
        temporalState={{ kind: "in-progress", dayIndex: 2, totalDays: 4, isLastDay: false }}
        to={tripUrl(TRIP.id)}
      />,
    );

    expect(screen.getByText("La historia se está escribiendo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar al viaje" })).toHaveAttribute(
      "href",
      "/experience?tripId=trip-1",
    );
  });

  it("degrada con elegancia para destinos y fechas legacy", () => {
    renderInRouter(
      <ActiveTripHome
        trip={{ ...TRIP, destination: "Ruta del vino", startDateTime: undefined, endDateTime: undefined }}
        lifecycle="upcoming"
        temporalState={null}
        to={tripUrl(TRIP.id)}
      />,
    );

    expect(screen.getByText("Ruta del vino")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/noches/)).not.toBeInTheDocument();
  });

  it("monta el momento autorizado despues del countdown y antes del CTA, reemplazando preparativos", () => {
    renderInRouter(
      <ActiveTripHome
        trip={TRIP}
        lifecycle="in-progress"
        temporalState={{ kind: "in-progress", dayIndex: 1, totalDays: 4, isLastDay: false }}
        to={tripUrl(TRIP.id)}
        companionMoment={<aside aria-label="Momento de Alaia">Hoy comienza una nueva historia.</aside>}
      />,
    );

    const countdown = screen.getByText(/la historia se est.* escribiendo/i);
    const moment = screen.getByRole("complementary", { name: "Momento de Alaia" });
    const cta = screen.getByRole("link", { name: "Entrar al viaje" });
    expect(countdown.compareDocumentPosition(moment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(moment.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/el viaje est.* ocurriendo ahora/i)).not.toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/experience?tripId=trip-1");
  });

  it("con slot nulo conserva exactamente los preparativos y no crea wrapper", () => {
    const { container } = renderInRouter(
      <ActiveTripHome
        trip={TRIP}
        lifecycle="in-progress"
        temporalState={{ kind: "in-progress", dayIndex: 1, totalDays: 4, isLastDay: false }}
        to={tripUrl(TRIP.id)}
        companionMoment={null}
      />,
    );

    expect(screen.getByText(/el viaje est.* ocurriendo ahora/i)).toBeInTheDocument();
    expect(container.querySelector(".active-trip-home-companion-moment")).toBeNull();
  });
});

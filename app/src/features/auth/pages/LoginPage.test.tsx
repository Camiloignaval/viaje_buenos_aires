import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "./LoginPage";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../hooks/useSession", () => ({ useSession, sessionQueryKey: ["auth", "session"] }));

// LoginForm real monta mutaciones; para estos tests de redirección lo stubeamos.
vi.mock("../components/LoginForm", () => ({ LoginForm: () => <div>formulario-login</div> }));

afterEach(() => vi.clearAllMocks());

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/trips" element={<div>pantalla-trips</div>} />
        <Route path="/onboarding" element={<div>pantalla-onboarding</div>} />
        <Route path="/invite/:token" element={<div>pantalla-invitacion</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage returnTo", () => {
  it("sin sesión muestra el formulario", () => {
    useSession.mockReturnValue({ status: "unauthenticated", user: null });
    renderAt("/login");
    expect(screen.getByText("formulario-login")).toBeInTheDocument();
  });

  it("autenticado con returnTo válido vuelve a la invitación (aunque no haya onboarding)", () => {
    useSession.mockReturnValue({ status: "authenticated", user: { onboardingCompleted: false } });
    renderAt("/login?returnTo=%2Finvite%2Fabc123");
    expect(screen.getByText("pantalla-invitacion")).toBeInTheDocument();
  });

  it("autenticado ignora un returnTo malicioso y cae al destino por defecto", () => {
    useSession.mockReturnValue({ status: "authenticated", user: { onboardingCompleted: true } });
    renderAt("/login?returnTo=https%3A%2F%2Fevil.com");
    expect(screen.getByText("pantalla-trips")).toBeInTheDocument();
  });

  it("autenticado sin returnTo respeta onboarding incompleto", () => {
    useSession.mockReturnValue({ status: "authenticated", user: { onboardingCompleted: false } });
    renderAt("/login");
    expect(screen.getByText("pantalla-onboarding")).toBeInTheDocument();
  });
});

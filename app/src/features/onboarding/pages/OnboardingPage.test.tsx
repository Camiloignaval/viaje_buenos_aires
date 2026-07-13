import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import OnboardingPage from "./OnboardingPage";

const { AUTHENTICATED_USER } = vi.hoisted(() => ({
  AUTHENTICATED_USER: {
    id: "u1",
    email: "kari@ejemplo.com",
    displayName: null,
    residenceCountryCode: null,
    onboardingCompleted: false,
  },
}));

vi.mock("@/features/auth/api/authApi", () => ({
  getSession: vi.fn().mockResolvedValue({ user: AUTHENTICATED_USER }),
}));

const completeOnboarding = vi.fn();
vi.mock("../api/onboardingApi", () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderPage(initialEntry = "/onboarding") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/experience" element={<LocationProbe />} />
          <Route path="/trips" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    completeOnboarding.mockReset();
  });

  it("pide el nombre primero, en su propia pantalla (una conversación por vez)", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: "¿Cómo quieres que te llamemos?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("¿Desde dónde viajás?")).not.toBeInTheDocument();
  });

  it("no deja continuar sin nombre, y avanza al país al completarlo", async () => {
    const user = userEvent.setup();
    renderPage();
    const nextButton = await screen.findByRole("button", { name: "Continuar →" });
    expect(nextButton).toBeDisabled();

    await user.type(screen.getByLabelText("Nombre"), "Kari");
    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    expect(await screen.findByRole("heading", { name: "¿Desde dónde viajás?" })).toBeInTheDocument();
  });

  it("volver desde país conserva el nombre ya escrito", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByLabelText("Nombre"), "Kari");
    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    await screen.findByRole("heading", { name: "¿Desde dónde viajás?" });

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(await screen.findByLabelText("Nombre")).toHaveValue("Kari");
  });

  it("completa el onboarding con displayName + país elegido", async () => {
    completeOnboarding.mockResolvedValue({
      user: { ...AUTHENTICATED_USER, displayName: "Kari", residenceCountryCode: "CL", onboardingCompleted: true },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Nombre"), "Kari");
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    await screen.findByRole("heading", { name: "¿Desde dónde viajás?" });
    await user.type(screen.getByLabelText("País de residencia"), "Chile");
    await user.click(await screen.findByRole("button", { name: /Chile/ }));
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith({ displayName: "Kari", residenceCountryCode: "CL" }),
    );
  });

  it("retoma el deep link original después de completar onboarding", async () => {
    completeOnboarding.mockResolvedValue({
      user: { ...AUTHENTICATED_USER, displayName: "Kari", residenceCountryCode: "CL", onboardingCompleted: true },
    });
    const user = userEvent.setup();
    renderPage("/onboarding?returnTo=%2Fexperience%3FtripId%3Dtrip-ba");

    await user.type(await screen.findByLabelText("Nombre"), "Kari");
    await user.click(screen.getByRole("button", { name: "Continuar →" }));
    await user.type(await screen.findByLabelText("País de residencia"), "Chile");
    await user.click(await screen.findByRole("button", { name: /Chile/ }));
    await user.click(screen.getByRole("button", { name: "Continuar →" }));

    expect(await screen.findByTestId("location")).toHaveTextContent(
      "/experience?tripId=trip-ba",
    );
  });
});

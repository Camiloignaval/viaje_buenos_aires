import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FeedbackPage from "./FeedbackPage";

const { submitFeedback } = vi.hoisted(() => ({ submitFeedback: vi.fn() }));

vi.mock("../api/feedbackApi", async (orig) => ({
  ...(await orig<typeof import("../api/feedbackApi")>()),
  submitFeedback,
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderFeedbackPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/feedback"]}>
        <Routes>
          <Route path="/feedback" element={<><FeedbackPage /><LocationProbe /></>} />
          <Route path="/trips" element={<><div>Mis viajes destino</div><LocationProbe /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("FeedbackPage", () => {
  it("renderiza la página editorial completa", () => {
    renderFeedbackPage();

    expect(screen.getByText("Alaia mejora con vos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Queremos seguir mejorando contigo" })).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "¿Hay algo que podríamos hacer mejor?Tu mirada también forma parte de esta historia.")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toBeInTheDocument();
  });

  it("envía el formulario existente y muestra éxito", async () => {
    const user = userEvent.setup();
    submitFeedback.mockResolvedValue({ feedback: { id: "f1", status: "received", createdAt: "2026-07-11" } });
    renderFeedbackPage();

    await user.click(screen.getByRole("combobox", { name: "Categoría" }));
    await user.click(screen.getByRole("option", { name: "Problema" }));
    await user.type(screen.getByLabelText("Mensaje"), "Me gustaría una portada aún más tranquila.");
    await user.click(screen.getByRole("button", { name: "Enviar sugerencia →" }));

    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith(expect.objectContaining({
      category: "problem",
      message: "Me gustaría una portada aún más tranquila.",
    })));
    expect(await screen.findByText((_, node) => node?.textContent === "Gracias por ayudarnos a mejorar Alaia.Leeremos tu mensaje con atención.")).toBeInTheDocument();
  });

  it("muestra loading mientras envía", async () => {
    const user = userEvent.setup();
    submitFeedback.mockImplementation(() => new Promise(() => {}));
    renderFeedbackPage();

    await user.type(screen.getByLabelText("Mensaje"), "Hay un detalle visual que revisaría.");
    await user.click(screen.getByRole("button", { name: "Enviar sugerencia →" }));

    expect(await screen.findByRole("button", { name: "Enviando..." })).toBeDisabled();
  });

  it("muestra error cuando la API rechaza el envío", async () => {
    const user = userEvent.setup();
    submitFeedback.mockRejectedValue(new Error("El feedback no está habilitado por ahora."));
    renderFeedbackPage();

    await user.type(screen.getByLabelText("Mensaje"), "Hay un detalle visual que revisaría.");
    await user.click(screen.getByRole("button", { name: "Enviar sugerencia →" }));

    expect(await screen.findByText("El feedback no está habilitado por ahora.")).toBeInTheDocument();
  });

  it("vuelve a Mis viajes usando React Router", async () => {
    const user = userEvent.setup();
    renderFeedbackPage();

    await user.click(screen.getByRole("link", { name: "← Volver a Mis viajes" }));

    expect(screen.getByText("Mis viajes destino")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/trips");
  });

  it("responde de forma segura si el feature flag está desactivado", () => {
    vi.stubEnv("VITE_ENABLE_FEEDBACK", "false");
    renderFeedbackPage();

    expect(screen.getByRole("heading", { name: "Las sugerencias no están disponibles por ahora" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje")).not.toBeInTheDocument();
  });
});

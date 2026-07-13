import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { RouteError } from "./RouteError";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RouteError", () => {
  it("mantiene el reintento y permite salir a Mis viajes sin recargar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        {
          path: "/",
          loader: () => {
            throw new Error("fallo controlado");
          },
          element: <div />,
          errorElement: <RouteError />,
        },
        {
          path: "/trips",
          element: <div>Mis viajes destino</div>,
        },
      ],
      { initialEntries: ["/"] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("button", { name: "Reintentar →" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "← Volver a Mis viajes" }));

    expect(await screen.findByText("Mis viajes destino")).toBeInTheDocument();
  });
});

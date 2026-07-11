import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SummaryStep } from "./SummaryStep";
import { INITIAL_WIZARD_DATA, type WizardData } from "./wizardData";

const FILLED: WizardData = {
  ...INITIAL_WIZARD_DATA,
  title: "Luna de miel",
  country: { code: "AR", name: "Argentina" },
  city: {
    id: "nomi-111",
    name: "Buenos Aires",
    adminName: "CABA",
    countryCode: "AR",
    countryName: "Argentina",
    latitude: -34.6037,
    longitude: -58.3816,
    timezone: "America/Argentina/Buenos_Aires",
  },
  startDateTime: "2026-07-18T09:30",
  endDateTime: "2026-07-21T22:00",
  travelCompanions: "partner",
  expectedTravelers: 2,
  travelReason: "honeymoon",
  travelStyle: ["romantic", "gastronomic"],
  travelBudgetStyle: "balanced",
};

describe("SummaryStep", () => {
  it("es 'Creo que ya empiezo a conocer esta historia', no una confirmación", () => {
    render(<SummaryStep data={FILLED} onEditStep={() => {}} onBack={() => {}} onBegin={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Creo que ya empiezo a conocer esta historia." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comenzar esta historia →" })).toBeInTheDocument();
  });

  it("se lee como portada: destino, fechas, personas, compañía, motivo, estilo y forma de vivir el viaje", () => {
    render(<SummaryStep data={FILLED} onEditStep={() => {}} onBack={() => {}} onBegin={() => {}} />);
    expect(screen.getByText(/Buenos Aires, CABA, Argentina/)).toBeInTheDocument();
    expect(screen.getByText("2 personas")).toBeInTheDocument();
    expect(screen.getByText("Mi pareja")).toBeInTheDocument();
    expect(screen.getByText("Luna de miel")).toBeInTheDocument();
    expect(screen.getByText("Romántico · Gastronómico")).toBeInTheDocument();
    expect(screen.getByText("Con equilibrio")).toBeInTheDocument();
  });

  it("muestra las fechas en formato humano, nunca ISO crudo", () => {
    render(<SummaryStep data={FILLED} onEditStep={() => {}} onBack={() => {}} onBegin={() => {}} />);
    expect(
      screen.getByText(/18 de julio de 2026 · 09:30 → 21 de julio de 2026 · 22:00/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/2026-07-18T09:30/)).not.toBeInTheDocument();
  });

  it("no muestra listas ni etiquetas en mayúscula — es prosa, no un formulario", () => {
    render(<SummaryStep data={FILLED} onEditStep={() => {}} onBack={() => {}} onBegin={() => {}} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("Destino")).not.toBeInTheDocument();
    expect(screen.queryByText("Motivo")).not.toBeInTheDocument();
  });

  it("construye la frase final usando plantillas (motivo + compañía + estilo + forma de vivir el viaje)", () => {
    render(<SummaryStep data={FILLED} onEditStep={() => {}} onBack={() => {}} onBegin={() => {}} />);
    expect(
      screen.getByText(/Creo que este será el comienzo de una vida juntos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Algo me dice que van a vivirla/)).toBeInTheDocument();
  });

  it("cada dato vuelve a su paso al hacer click, conservando el contexto para lectores de pantalla", async () => {
    const user = userEvent.setup();
    const onEditStep = vi.fn();
    render(<SummaryStep data={FILLED} onEditStep={onEditStep} onBack={() => {}} onBegin={() => {}} />);
    await user.click(screen.getByRole("button", { name: /Editar motivo/ }));
    expect(onEditStep).toHaveBeenCalledWith("reason");
  });

  it("muestra el error de creación si viene informado", () => {
    render(
      <SummaryStep
        data={FILLED}
        onEditStep={() => {}}
        onBack={() => {}}
        onBegin={() => {}}
        submitError="No se pudo crear el viaje."
      />,
    );
    expect(screen.getByText("No se pudo crear el viaje.")).toBeInTheDocument();
  });
});

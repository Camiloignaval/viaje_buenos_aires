import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountryCombobox } from "./CountryCombobox";

describe("CountryCombobox", () => {
  it("encuentra países acentuados aunque se escriba sin tilde", async () => {
    const user = userEvent.setup();
    render(<CountryCombobox label="País" value={null} onChange={() => {}} />);
    await user.type(screen.getByLabelText("País"), "peru");
    expect(await screen.findByRole("button", { name: "Perú" })).toBeInTheDocument();
  });

  it("prioriza la coincidencia más relevante primero", async () => {
    const user = userEvent.setup();
    render(<CountryCombobox label="País" value={null} onChange={() => {}} />);
    await user.type(screen.getByLabelText("País"), "mexico");
    const options = await screen.findAllByRole("option");
    expect(options[0]).toHaveTextContent("México");
  });
});

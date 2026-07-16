import { render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { GALLERY_STATES } from "./StatesGallery";

const ADAPTIVE_STATES = [
  "adaptive-weather",
  "adaptive-light",
  "adaptive-silence",
  "living-memory",
] as const;

function renderState(key: typeof ADAPTIVE_STATES[number]) {
  return render(<MemoryRouter>{GALLERY_STATES[key].render()}</MemoryRouter>);
}

describe("StatesGallery adaptive journey states", () => {
  it("declares exactly the four deterministic dev-only adaptive fixtures", () => {
    expect(ADAPTIVE_STATES.every((key) => Object.hasOwn(GALLERY_STATES, key))).toBe(true);
  });

  it("keeps fixtures dev-only and imports no production engine, hook, API or provider", () => {
    const source = readFileSync(join(process.cwd(), "src/features/dev/StatesGallery.tsx"), "utf8");
    expect(source).not.toMatch(/firstRealExperience|useAdaptiveJourney|useProductiveAdaptiveJourney|semanticMemoryApi|context-engine|weatherContext|provider/i);
    expect(source).toContain('import { VisibleCompanionExperience }');
    expect(source).toContain('import { LivingMemoryMomentView }');
  });

  it.each([
    ["adaptive-weather", "Quizás sea un buen momento para considerar el clima."],
    ["adaptive-light", "Puede ser un buen momento para disfrutar la luz natural."],
  ] as const)("%s renders one literal Editorial protagonist and no raw context", async (state, copy) => {
    renderState(state);
    expect(await screen.findByRole("complementary", { name: "Alaia" })).toHaveTextContent(copy);
    expect(screen.getAllByRole("complementary", { name: "Alaia" })).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/latitude|longitude|provider|precipitation|trip-|user-|weather\.provider/i);
  });

  it("adaptive-silence creates no contextual node, aria region or reserved slot", () => {
    const { container } = renderState("adaptive-silence");
    expect(container.querySelector(".visible-companion-experience, .active-story-contextual-slot")).toBeNull();
    expect(screen.queryByRole("complementary", { name: "Alaia" })).toBeNull();
  });

  it("living-memory renders one static semantic sentence without controls or identifiers", async () => {
    const { container } = renderState("living-memory");
    const region = await screen.findByRole("region", { name: "Recuerdo de Alaia" });
    expect(region).toHaveTextContent("Este viaje llega hoy a su último día.");
    expect(container.querySelectorAll(".living-memory-moment")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[data-memory-id], time, [aria-live], [role='alert']")).toBeNull();
    await waitFor(() => expect(region).toBeVisible());
  });
});

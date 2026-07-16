import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  VisibleCompanionExperienceViewModel,
  VisibleExperienceEvent,
} from "../lib/visibleExperience";
import { VisibleCompanionExperience } from "./VisibleCompanionExperience";

const VIEW_MODEL: VisibleCompanionExperienceViewModel = Object.freeze({
  label: "Alaia",
  text: "Hoy comienza una nueva historia.",
});

describe("VisibleCompanionExperience", () => {
  it("Assistive access / Literal copy: renders a non-alert complementary region", () => {
    const { container } = render(<VisibleCompanionExperience viewModel={VIEW_MODEL} />);

    expect(screen.getByRole("complementary", { name: "Alaia" })).toHaveTextContent(VIEW_MODEL.text);
    expect(screen.getByRole("heading", { name: "Alaia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar mensaje de Alaia" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.querySelector(".visible-companion-experience-decoration")).toHaveAttribute("aria-hidden", "true");
  });

  it("commits the visible receipt before exposing editorial content", async () => {
    const order: string[] = [];
    const onVisible = vi.fn(() => {
      expect(screen.queryByText(VIEW_MODEL.text)).not.toBeInTheDocument();
      order.push("visible");
      return true;
    });
    render(<VisibleCompanionExperience
      viewModel={VIEW_MODEL}
      onVisible={onVisible}
      observer={(event) => order.push(event.kind)}
    />);

    expect(await screen.findByText(VIEW_MODEL.text)).toBeInTheDocument();
    expect(order).toEqual(["visible", "render_success"]);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("fails closed without content when visible confirmation fails or throws", () => {
    const observer = vi.fn();
    const failed = render(<VisibleCompanionExperience viewModel={VIEW_MODEL} onVisible={() => false} observer={observer} />);
    expect(screen.queryByText(VIEW_MODEL.text)).not.toBeInTheDocument();
    expect(observer).not.toHaveBeenCalled();
    failed.unmount();

    render(<VisibleCompanionExperience viewModel={VIEW_MODEL} onVisible={() => { throw new Error("storage"); }} />);
    expect(screen.queryByText(VIEW_MODEL.text)).not.toBeInTheDocument();
  });

  it("Keyboard close: dismisses locally and emits exactly once", async () => {
    const user = userEvent.setup();
    const observer = vi.fn();
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const { rerender } = render(<VisibleCompanionExperience viewModel={VIEW_MODEL} observer={observer} />);
    const close = screen.getByRole("button", { name: "Cerrar mensaje de Alaia" });

    close.focus();
    await user.keyboard("{Enter}");
    close.click();
    rerender(<VisibleCompanionExperience viewModel={VIEW_MODEL} observer={observer} />);

    expect(screen.queryByRole("complementary", { name: "Alaia" })).not.toBeInTheDocument();
    expect(observer.mock.calls.map(([event]) => event)).toEqual([
      { kind: "render_success" },
      { kind: "dismiss" },
    ]);
    expect(VIEW_MODEL).toEqual({ label: "Alaia", text: "Hoy comienza una nueva historia." });
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("Observed lifecycle: freezes categorical events in render and dismiss order", async () => {
    const user = userEvent.setup();
    const events: VisibleExperienceEvent[] = [];
    render(<VisibleCompanionExperience viewModel={VIEW_MODEL} observer={(event) => events.push(event)} />);

    await user.click(screen.getByRole("button", { name: "Cerrar mensaje de Alaia" }));

    expect(events).toEqual([{ kind: "render_success" }, { kind: "dismiss" }]);
    expect(events.every(Object.isFrozen)).toBe(true);
    expect(JSON.stringify(events)).not.toContain(VIEW_MODEL.text);
  });

  it("dismisses once even when receipt persistence fails, without repeating callbacks", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn(() => false);
    const observer = vi.fn();
    const { rerender } = render(<VisibleCompanionExperience
      viewModel={VIEW_MODEL}
      onVisible={() => true}
      onDismiss={onDismiss}
      observer={observer}
    />);

    const close = await screen.findByRole("button", { name: "Cerrar mensaje de Alaia" });
    await user.click(close);
    close.click();
    rerender(<VisibleCompanionExperience viewModel={VIEW_MODEL} onVisible={() => true} onDismiss={onDismiss} observer={observer} />);

    expect(screen.queryByText(VIEW_MODEL.text)).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls.map(([event]) => event)).toEqual([{ kind: "render_success" }]);
  });

  it("Hostile observer: cannot alter visibility or dismissal", async () => {
    const user = userEvent.setup();
    const hostile = (event: VisibleExperienceEvent) => {
      (event as { kind: string }).kind = "payload";
      throw new Error("hostile observer");
    };
    render(<VisibleCompanionExperience viewModel={VIEW_MODEL} observer={hostile} />);

    expect(screen.getByRole("complementary", { name: "Alaia" })).toHaveTextContent(VIEW_MODEL.text);
    await user.click(screen.getByRole("button", { name: "Cerrar mensaje de Alaia" }));
    expect(screen.queryByText(VIEW_MODEL.text)).not.toBeInTheDocument();
  });

  it("renders no empty wrapper when the view model is null", () => {
    const { container } = render(<VisibleCompanionExperience viewModel={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("visible companion CSS contract", () => {
  const shellCss = readFileSync(
    join(process.cwd(), "src/styles/shell.css"),
    "utf8",
  );

  it("Viewports: remains fluid without a fixed width or horizontal overflow", () => {
    expect(shellCss).toMatch(/\.visible-companion-experience\s*\{[^}]*width:\s*min\(100%,\s*30rem\)/s);
    expect(shellCss).toMatch(/\.visible-companion-experience\s*\{[^}]*min-width:\s*0/s);
    expect(shellCss).not.toMatch(/\.visible-companion-experience\s*\{[^}]*width:\s*\d+(?:px|rem)\s*;/s);
  });

  it("Assistive access: provides a 44px close target and visible focus", () => {
    expect(shellCss).toMatch(/\.visible-companion-experience-close\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/s);
    expect(shellCss).toMatch(/\.visible-companion-experience-close:focus-visible\s*\{[^}]*var\(--focus-ring\)/s);
  });

  it("Motion reduced: limits entrance to opacity/translation and removes it on request", () => {
    expect(shellCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)[\s\S]*?\.visible-companion-experience\s*\{[^}]*animation:/);
    expect(shellCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.visible-companion-experience\s*\{[^}]*animation:\s*none/s);
    expect(shellCss).toMatch(/@keyframes visible-companion-enter\s*\{[\s\S]*?opacity:[\s\S]*?translateY\(0\.25rem\)/);
  });
});

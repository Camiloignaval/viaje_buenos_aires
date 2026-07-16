import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { platformRequest } = vi.hoisted(() => ({ platformRequest: vi.fn() }));
vi.mock("@/services/platformClient", () => ({ platformRequest }));

import { LivingMemoryMoment } from "./LivingMemoryMoment";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => vi.resetAllMocks());

describe("LivingMemoryMoment", () => {
  it("renders at most one exact semantic memory as a quiet named region", async () => {
    platformRequest.mockResolvedValue({ memory: { type: "trip_last_day", text: "Este viaje llega hoy a su último día." } });
    const observer = vi.fn();

    render(<LivingMemoryMoment tripId="trip-1" storyId="story-1" observer={observer} />, { wrapper });

    const region = await screen.findByRole("region", { name: "Recuerdo de Alaia" });
    expect(region).toHaveTextContent("Este viaje llega hoy a su último día.");
    expect(region.querySelectorAll("p")).toHaveLength(1);
    expect(region).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("[data-memory-id], time, [role='alert']")).toBeNull();
    expect(observer).toHaveBeenCalledWith(Object.freeze({ kind: "memory_rendered" }));
  });

  it.each([
    ["no memory", null],
    ["unsafe payload", { type: "trip_last_day", text: "private trip id" }],
  ])("preserves the legacy album when %s", async (_label, value) => {
    platformRequest.mockResolvedValue({ memory: value });
    const { container } = render(<LivingMemoryMoment tripId="trip-1" storyId="story-1" />, { wrapper });
    await waitFor(() => expect(platformRequest).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("isolates query and hostile observer failures", async () => {
    platformRequest.mockRejectedValue(new Error("private"));
    const hostile = () => { throw new Error("hostile"); };
    const { container, rerender } = render(
      <LivingMemoryMoment tripId="trip-1" storyId="story-1" observer={hostile} />,
      { wrapper },
    );
    await waitFor(() => expect(platformRequest).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    rerender(<LivingMemoryMoment tripId="" storyId="" observer={hostile} />);
    expect(container).toBeEmptyDOMElement();
  });
});

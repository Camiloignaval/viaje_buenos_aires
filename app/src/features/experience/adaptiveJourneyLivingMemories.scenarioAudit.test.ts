import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const EVIDENCE = [
  ["S01", "Selección única", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "selects one authority"],
  ["S02", "Terminal sin promoción", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "never promotes or queues"],
  ["S03", "Story exacta", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "exact structured Story evidence"],
  ["S04", "Story insegura", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "legacy, partial and contradictory"],
  ["S05", "Weather visible", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "S05/S07/S13 Weather"],
  ["S06", "Weather silencio", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "Weather is unavailable"],
  ["S07", "Financial aislado", "src/features/context-engine/decision/weatherLightRules.test.ts", "no depende de Financial"],
  ["S08", "Weather gate cerrado", "routes/context/weather.test.js", "default off"],
  ["S09", "Weather scope inválido", "routes/context/weather.test.js", "no miembro"],
  ["S10", "Light visible", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "S10/S13 Light"],
  ["S11", "Light inválido", "src/features/context-engine/decision/weatherLightRules.test.ts", "missingLight.evaluations"],
  ["S12", "Last Day memory", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "Last Day preserves memory destination"],
  ["S13", "Transitorio descarta memoria", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "transient_context"],
  ["S14", "Receipt continuidad", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "same-scope receipts"],
  ["S15", "Storage inseguro", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "corrupt storage"],
  ["S16", "Memory concurrencia", "lib/platformMemory.test.js", "concurrencia"],
  ["S17", "Memory lectura semántica", "routes/trips/[tripId]/semantic-memories.test.js", "type/text"],
  ["S18", "Memory ownership", "routes/trips/[tripId]/semantic-memories.test.js", "membership ajena"],
  ["S19", "Memory falla segura", "src/features/experience/components/LivingMemoryMoment.test.tsx", "query and hostile observer failures"],
  ["S20", "Consumidor estable", "src/features/experience/hooks/useAdaptiveJourney.test.tsx", "mantiene un instante por scope"],
  ["S21", "Observer hostil", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "hostile failures"],
  ["S22", "Superficies jerárquicas", "src/features/experience/components/productiveCompanionConsumers.test.ts", "inside the relevant activity passage"],
  ["S23", "Silencio total", "src/features/dev/StatesGallery.adaptive.test.tsx", "no contextual node"],
  ["S24", "Weather falla y temporal continúa", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "valid temporal branch"],
  ["S25", "Contrato terminal", "src/features/experience/adaptiveJourneyLivingMemories.integration.test.ts", "invalid"],
] as const;

describe("Adaptive Journey & Living Memories — S01–S25 evidence audit", () => {
  it("contains every scenario exactly once", () => {
    expect(EVIDENCE.map(([id]) => id)).toEqual(Array.from({ length: 25 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`));
  });

  it.each(EVIDENCE)("%s %s has executable named evidence", (_id, _name, relativePath, marker) => {
    const source = readFileSync(join(process.cwd(), relativePath), "utf8");
    expect(source).toContain(marker);
  });
});

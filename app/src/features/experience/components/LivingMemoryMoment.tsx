import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { semanticMemoryQueryOptions, type LivingMemoryDTO } from "../api/semanticMemoryApi";
import {
  observeVisibleExperience,
  type VisibleExperienceObserver,
} from "../lib/visibleExperience";

type LivingMemoryMomentProps = Readonly<{
  tripId: string;
  storyId: string;
  observer?: VisibleExperienceObserver;
}>;

export function LivingMemoryMomentView({ memory }: Readonly<{ memory: LivingMemoryDTO | null }>) {
  if (!memory) return null;
  return (
    <section className="living-memory-moment" aria-label="Recuerdo de Alaia">
      <p>{memory.text}</p>
    </section>
  );
}

export function LivingMemoryMoment({ tripId, storyId, observer }: LivingMemoryMomentProps) {
  const query = useQuery(semanticMemoryQueryOptions(tripId, storyId));
  const observedRef = useRef(false);
  const memory = query.data ?? null;

  useEffect(() => {
    if (!memory || observedRef.current) return;
    observedRef.current = true;
    observeVisibleExperience(observer, "memory_rendered");
  }, [memory, observer]);

  return <LivingMemoryMomentView memory={memory} />;
}

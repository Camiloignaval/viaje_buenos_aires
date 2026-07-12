import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "@/lib/prefersReducedMotion";

// Port fiel de observePreparationGroups (experienceView.js). Los elementos con
// [data-reveal-on-scroll] arrancan con opacity:0 (ver experience.css) y solo se
// muestran al ganar `.is-visible` — este efecto reproduce esa coreografía de
// revelado escalonado, con persistencia de las claves ya reveladas.
//
// Corre tras cada commit relevante (dep `signature`). `revealedKeysRef` persiste
// entre renders (equivalente al Set module-level del vanilla).
export function useRevealOnScroll(
  containerRef: RefObject<HTMLElement | null>,
  signature: unknown,
): void {
  const revealedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const appEl = containerRef.current;
    if (!appEl) {
      return;
    }

    const groups = [...appEl.querySelectorAll<HTMLElement>("[data-reveal-on-scroll]")];
    if (groups.length === 0) {
      return;
    }

    groups.forEach((group) => {
      const key = group.dataset.revealKey;
      if (key && revealedKeys.current.has(key)) {
        group.classList.add("is-visible");
      }
    });

    if (prefersReducedMotion()) {
      groups.forEach((group) => {
        if (group.dataset.revealKey) {
          revealedKeys.current.add(group.dataset.revealKey);
        }
        group.classList.add("is-visible");
      });
      return;
    }

    const root =
      appEl.querySelector<HTMLElement>(".book-preparations-mode") ??
      appEl.querySelector<HTMLElement>(".book");
    const isPreparationsReveal = root?.classList.contains("book-preparations-mode") ?? false;
    let pending = groups.filter((group) => !group.classList.contains("is-visible"));
    let firstRevealBatch = true;

    const revealVisibleGroups = () => {
      const rootRect = root?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight };
      const visibleGroups: { group: HTMLElement; top: number }[] = [];
      pending = pending.filter((group) => {
        const rect = group.getBoundingClientRect();
        const visible = rect.top <= rootRect.bottom - 24 && rect.bottom >= rootRect.top + 24;
        if (visible) {
          visibleGroups.push({ group, top: rect.top });
        }
        return !visible;
      });

      visibleGroups
        .sort((a, b) => a.top - b.top)
        .forEach(({ group }, index) => {
          // La cabecera de Preparativos llega hasta `.reveal-4`. El primer batch de
          // categorías espera esa coreografía (4600ms); los posteriores, ya por
          // scroll, entran casi inmediato pero escalonados.
          const baseDelay = isPreparationsReveal && firstRevealBatch ? 4600 : 80;
          const delay = baseDelay + index * 150;
          group.style.setProperty("--preparation-reveal-delay", `${delay}ms`);
          group.style.setProperty("--scroll-reveal-delay", `${delay}ms`);
          if (group.dataset.revealKey) {
            revealedKeys.current.add(group.dataset.revealKey);
          }
          group.classList.add("is-visible");
        });

      if (visibleGroups.length > 0) {
        firstRevealBatch = false;
      }

      if (pending.length === 0) {
        cleanup();
      }
    };

    const scheduleRevealCheck = () => requestAnimationFrame(revealVisibleGroups);

    function cleanup() {
      root?.removeEventListener("scroll", scheduleRevealCheck);
      window.removeEventListener("resize", scheduleRevealCheck);
    }

    root?.addEventListener("scroll", scheduleRevealCheck, { passive: true });
    window.addEventListener("resize", scheduleRevealCheck);

    scheduleRevealCheck();
    const timer = window.setTimeout(revealVisibleGroups, 120);

    return () => {
      cleanup();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, signature]);
}

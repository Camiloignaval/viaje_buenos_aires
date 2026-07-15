import { useCallback, useState } from "react";
import { useExperienceCtx } from "../components/experienceContext";
import {
  loadFavorites,
  toggleFavorite as toggleInStore,
  type FavoritesMap,
} from "../lib/favoritesStore";

// Favoritos del viaje, scopeados por el scopeId del contexto (tripId).
// Estado local reactivo sobre el store; el store es la fuente de verdad.
export function useFavorites() {
  const { scopeId } = useExperienceCtx();
  const [map, setMap] = useState<FavoritesMap>(() => loadFavorites(scopeId));

  const toggle = useCallback(
    (targetId: string) => {
      toggleInStore(scopeId, targetId);
      setMap(loadFavorites(scopeId));
    },
    [scopeId],
  );

  const isFavorite = useCallback((targetId: string) => targetId in map, [map]);

  return { isFavorite, toggle };
}

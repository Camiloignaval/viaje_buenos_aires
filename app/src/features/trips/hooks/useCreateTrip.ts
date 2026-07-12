import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTrip, type CreateTripInput } from "../api/tripsApi";
import { tripsQueryKey } from "./useTrips";

// Crea un viaje y refresca la lista (igual que el viejo tripStore.createTrip).
export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) => createTrip(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });
}

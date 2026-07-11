import { lazy } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { RootLayout } from "@/components/layout/RootLayout";
import { RouteError } from "@/components/feedback/RouteError";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { RequireOnboarding } from "@/features/onboarding/components/RequireOnboarding";

// Rutas por feature con lazy() + dynamic import: cada página es su propio chunk.
// El Suspense de RootLayout provee el fallback mientras cargan.
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const OnboardingPage = lazy(() => import("@/features/onboarding/pages/OnboardingPage"));
const TripsPage = lazy(() => import("@/features/trips/pages/TripsPage"));
const TripHomePage = lazy(() => import("@/features/trips/pages/TripHomePage"));
const ExperiencePage = lazy(() => import("@/features/experience/pages/ExperiencePage"));

const children: RouteObject[] = [
  { index: true, element: <Navigate to="/trips" replace /> },
  { path: "login", element: <LoginPage /> },
  {
    path: "onboarding",
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    ),
  },
  {
    path: "trips",
    element: (
      <RequireAuth>
        <RequireOnboarding>
          <TripsPage />
        </RequireOnboarding>
      </RequireAuth>
    ),
  },
  // Portada de un viaje concreto. `/trips/:tripId` es una ruta distinta de la
  // lista `/trips` (react-router las matchea por separado; no se solapan).
  {
    path: "trips/:tripId",
    element: (
      <RequireAuth>
        <RequireOnboarding>
          <TripHomePage />
        </RequireOnboarding>
      </RequireAuth>
    ),
  },
  // La experiencia funciona 100% local (sin auth); con ?tripId= se enriquece
  // contra la plataforma. Es la única experience (ya no hay HTML legacy).
  { path: "experience", element: <ExperiencePage /> },
];

// Galería de estados de acceso — SOLO desarrollo. El `if (import.meta.env.DEV)`
// se resuelve a `if (false)` en el build de producción, así que Rollup elimina
// el bloque completo (incluido el dynamic import) por dead-code elimination:
// la galería nunca llega a producción.
if (import.meta.env.DEV) {
  const StatesGallery = lazy(() => import("@/features/dev/StatesGallery"));
  children.push({ path: "dev/states", element: <StatesGallery /> });
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteError />,
    children,
  },
]);

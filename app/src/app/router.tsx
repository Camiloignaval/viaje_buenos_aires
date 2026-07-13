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
const FeedbackPage = lazy(() => import("@/features/feedback/pages/FeedbackPage"));
const ExperiencePage = lazy(() => import("@/features/experience/pages/ExperiencePage"));
const InvitePage = lazy(() => import("@/features/sharing/pages/InvitePage"));

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
  {
    path: "feedback",
    element: (
      <RequireAuth>
        <RequireOnboarding>
          <FeedbackPage />
        </RequireOnboarding>
      </RequireAuth>
    ),
  },
  // Sin tripId conserva la experiencia local. Con ?tripId=, ExperiencePage
  // monta auth + onboarding antes de iniciar cualquier query conectada.
  { path: "experience", element: <ExperiencePage /> },
  // Invitación a compartir un viaje. Ruta PÚBLICA: el preview se ve sin sesión;
  // la aceptación exige iniciar sesión con el correo invitado (returnTo).
  { path: "invite/:token", element: <InvitePage /> },
];

// Galería de estados de acceso — SOLO desarrollo. El `if (import.meta.env.DEV)`
// se resuelve a `if (false)` en el build de producción, así que Rollup elimina
// el bloque completo (incluido el dynamic import) por dead-code elimination:
// la galería nunca llega a producción.
if (import.meta.env.DEV) {
  const StatesGallery = lazy(() => import("@/features/dev/StatesGallery"));
  children.push({ path: "dev/states", element: <StatesGallery /> });
}

// Cualquier ruta desconocida vuelve a una pantalla segura y navegable. `/trips`
// aplica sus propios guards, así que este fallback no salta auth ni onboarding.
children.push({ path: "*", element: <Navigate to="/trips" replace /> });

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteError />,
    children,
  },
]);

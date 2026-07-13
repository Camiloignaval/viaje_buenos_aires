import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { LoadingScreen } from "@/components/feedback/LoadingScreen";
import { PwaInstallPrompt } from "@/features/pwa/PwaInstallPrompt";

// Layout raíz: envuelve todas las rutas con un límite de Suspense para que las
// rutas lazy (dynamic import) tengan un fallback consistente al cargar.
export function RootLayout() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
      <PwaInstallPrompt />
    </Suspense>
  );
}

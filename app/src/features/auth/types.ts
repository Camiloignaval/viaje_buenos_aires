// Forma del usuario tal como la devuelve /api/auth/session y /api/auth/verify-code.
// displayName/residenceCountryCode/onboardingCompleted son null hasta que el
// usuario completa /onboarding (usuarios legacy incluidos: nunca rompen sesión).
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  residenceCountryCode: string | null;
  emailVerifiedAt: string | null;
  onboardingCompleted: boolean;
}

// Estado de la sesión, con distinción explícita entre "no hay sesión" y "no se
// pudo verificar":
//   checking        → primera consulta de la cookie en curso
//   authenticated   → hay usuario
//   unauthenticated → respuesta válida sin sesión (o 401 explícito de sesión)
//   unavailable     → no se pudo verificar (red/timeout/5xx): estado recuperable,
//                     NO implica que el usuario cerró sesión
export type SessionStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

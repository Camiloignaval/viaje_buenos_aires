const DISPLAY_NAME_MAX_LENGTH = 80;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export function normalizeOnboardingInput(input = {}) {
  const displayName = String(input.displayName ?? '').trim();
  const residenceCountryCode = String(input.residenceCountryCode ?? '').trim().toUpperCase();

  if (!displayName) {
    throw new Error('Decinos cómo te llamamos.');
  }
  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new Error(`El nombre no puede superar los ${DISPLAY_NAME_MAX_LENGTH} caracteres.`);
  }
  if (!COUNTRY_CODE_PATTERN.test(residenceCountryCode)) {
    throw new Error('El país de residencia es inválido.');
  }

  return { displayName, residenceCountryCode };
}

// Onboarding pendiente se deriva de los campos guardados, no solo de la bandera:
// así una sesión antigua sin displayName/residenceCountryCode nunca queda
// marcada como completa por accidente.
export function isOnboardingComplete(user) {
  return Boolean(user?.onboardingCompleted && user?.displayName && user?.residenceCountryCode);
}

export function publicUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName ?? null,
    residenceCountryCode: user.residenceCountryCode ?? null,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    onboardingCompleted: isOnboardingComplete(user),
  };
}

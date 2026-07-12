const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

export function isFeedbackUiEnabled(env: ImportMetaEnv = import.meta.env) {
  const raw = env.VITE_ENABLE_FEEDBACK ?? env.ENABLE_FEEDBACK;
  if (raw == null || String(raw).trim() === "") return true;
  return !DISABLED_VALUES.has(String(raw).trim().toLowerCase());
}

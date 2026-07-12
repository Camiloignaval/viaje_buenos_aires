import { useExperienceCtx } from "./experienceContext";
import type { Theme } from "../lib/format";

// Espejo de renderThemeSwitch(theme, interactive, extraClass). El cambio de tema
// se aplica por re-render (el vanilla lo hacía in-place con applyThemePreferenceInPlace).
export function ThemeSwitch({ extraClass = "" }: { extraClass?: string }) {
  const { theme, interactive, actions } = useExperienceCtx();
  if (!interactive) {
    return null;
  }
  const nextTheme: Theme = theme === "light" ? "dark" : "light";
  const icon = nextTheme === "light" ? "☀" : "☾";
  const label = nextTheme === "light" ? "Alaia Día" : "Alaia Noche";
  const classes = ["theme-switch", extraClass].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={classes}
      data-next-theme={nextTheme}
      aria-label={`Cambiar a ${label}`}
      aria-pressed={theme === "light"}
      onClick={() => actions.toggleTheme(nextTheme)}
    >
      <span className="theme-switch-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="theme-switch-label">{label}</span>
    </button>
  );
}

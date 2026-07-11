import styles from "./LoadingScreen.module.css";

export function LoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <span className={styles.dot} />
      <span className={styles.srOnly}>Cargando…</span>
    </div>
  );
}

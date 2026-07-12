// Migración de marca Aurora → Alaia para claves persistidas locales.
//
// Copia idempotente (copy-if-absent) de toda clave `aurora:*` a su equivalente
// `alaia:*`. NO borra las claves viejas: durante la ventana de compatibilidad
// quedan como respaldo (rollback trivial). Tras migrar, la app escribe solo
// `alaia:*`. Segura ante:
//   - reejecución (no pisa datos ya migrados ni datos nuevos en alaia:*),
//   - storage no disponible / bloqueado (modo privado): se traga el error.
//
// NO toca IndexedDB (`aurora-photos`) ni la cookie `aurora_session`: ambas se
// conservan por decisión (identificadores técnicos estables e invisibles).

const OLD_PREFIX = "aurora:";
const NEW_PREFIX = "alaia:";

/** Copia las claves `aurora:*` a `alaia:*` en un Storage, solo si el destino no existe. */
export function migrateAuroraKeys(storage: Storage): void {
  try {
    // Se recolectan las claves primero: setItem durante la iteración de índices
    // puede reordenar/crecer el storage y saltear entradas.
    const oldKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(OLD_PREFIX)) oldKeys.push(key);
    }
    for (const oldKey of oldKeys) {
      const newKey = NEW_PREFIX + oldKey.slice(OLD_PREFIX.length);
      if (storage.getItem(newKey) === null) {
        const value = storage.getItem(oldKey);
        if (value !== null) storage.setItem(newKey, value);
      }
    }
  } catch {
    // localStorage/sessionStorage inaccesible (modo privado, cuota, etc.):
    // la app sigue funcionando; la migración simplemente no ocurre.
  }
}

/** Corre la migración para localStorage y sessionStorage. Idempotente. */
export function runBrandMigration(): void {
  if (typeof window === "undefined") return;
  migrateAuroraKeys(window.localStorage);
  migrateAuroraKeys(window.sessionStorage);
}

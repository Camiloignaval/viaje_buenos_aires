# Proposal: First Real Experience

## Intent

**Hoy:** los cinco motores están verificados por separado, pero no existe una composición de aplicación que demuestre el primer acompañamiento completo.

**Propuesto:** componer el primer día local del viaje con las APIs públicas existentes, sin transferir responsabilidades.

## Scope

### In Scope

- Compositor puro bajo `app/src/features/experience/` con un reloj lógico compartido.
- Cadena exacta: Living Context `settled` → decisión `trip_start_today` → acción o silencio Companion → mensaje Editorial → `MemoryCandidate`.
- `DeliveryIntent` inmutable, sin I/O; `memory` podrá describir el candidato sin persistirlo.
- Trace categórico sin IDs, texto, payloads, contenido privado ni errores crudos.
- Simulador dev/test fuera de entrypoints productivos y E2E Vitest real.

### Out of Scope

- Push, UI, timeline, rutas, Storybook, persistencia y entrega real.
- Reglas, providers, IA, chat, clima o cambios en Story Package.
- Modificar Living Context, Decision, Companion, Editorial o Memory.

## Capabilities

### New Capabilities

- `first-real-experience`: composición determinista y sin efectos del primer acompañamiento completo.

### Modified Capabilities

None. Los cinco motores existentes deben permanecer byte-unchanged.

## Approach

Crear una función async que espere Living Context `settled` y pase cada salida a la siguiente API. Companion conserva autoridad sobre acción/silencio: el silencio termina sin Editorial, Memory ni intent. El éxito genera valores congelados y llega sólo hasta `MemoryCandidate`. Un fixture interno prepara el caso canónico sin entrar en producción.

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `app/src/features/experience/firstRealExperience.ts` | Nuevo | Compositor, contratos, intent y trace |
| `app/src/features/experience/firstRealExperience.test.ts` | Nuevo | E2E runtime sin mocks de motores |
| `app/src/features/dev/firstRealExperienceSimulator.ts` | Nuevo | Fixture interno determinista |
| `app/src/features/dev/firstRealExperienceSimulator.test.ts` | Nuevo | Aislamiento sin I/O |

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Relojes divergentes alteran ventanas | Media | Compartir una única instancia lógica |
| Bypass o duplicación de autoridad | Media | Pasar outputs sin reconstruirlos y probar lineage |
| Fuga en trace/intents | Baja | Contratos cerrados y assertions negativas |
| Fixture entra a producción | Baja | Sin ruta, pantalla ni import desde entrypoints |

## Rollback Plan

Eliminar exclusivamente los cuatro archivos nuevos; no hay migraciones, datos persistidos ni cambios en motores.

## Dependencies

- APIs públicas verificadas de las etapas 7.x.
- Vitest para evidencia runtime pura.

## Success Criteria

- [ ] El fixture canónico produce `trip_start_today`, `in_app`, mensaje Editorial y `MemoryCandidate` `trip_started` con un solo reloj.
- [ ] El E2E prueba éxito, silencio y ausencia de bypass, I/O o responsabilidades duplicadas.
- [ ] Los cinco motores y entrypoints productivos permanecen byte-unchanged.
- [ ] Trace e intents no contienen datos privados, IDs, texto ni payloads.

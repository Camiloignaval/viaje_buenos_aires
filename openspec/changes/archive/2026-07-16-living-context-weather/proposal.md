# Proposal: Living Context Weather

## Qué revisar primero

“No modificar Foundation” significa preservar arquitectura e invariantes. Extender sus contratos cerrados con `weather` es necesario; evitarlo mediante otro resolver sería el rediseño prohibido.

## Intent

**Hoy:** Foundation resuelve cuatro módulos parciales, pero ningún contexto dinámico real. **Propuesto:** incorporar Weather decision-driven, reemplazable y no bloqueante, sin crear un data lake.

## Scope

### In Scope
- Open-Meteo detrás de un adapter backend; contrato normalizado estricto, sin filtrar su JSON.
- Coordenadas de ciudad y timezone del Trip; ventana limitada al viaje en curso y al día local actual. Fuera: `weather_outside_window`, sin request.
- Cache en memoria desacoplado, solo éxitos, TTL 15 minutos, deduplicación concurrente y falla parcial.
- Provenance/freshness/observabilidad sanitizadas; Health Check runtime opcional y legacy-safe.

### Out of Scope
- UI, Companion, IA, automatizaciones, notificaciones, geocoding/GPS, persistencia, config o dependencias nuevas.
- Otros providers/placeholders, registry genérico, segundo engine/resolver o endpoint agregador.

## Capabilities

### New Capabilities
- `living-context-weather`: contrato decision-driven, normalización provider, ventana temporal, cache, freshness y fallas.

### Modified Capabilities
- `living-context-resolution`: quinto módulo parcial y `capabilities.weather`, derivada solo de `weather.status === "available"`.
- `living-context-react-integration`: consulta Weather compartida sin duplicar Trip/Story ni reglas de dominio.
- `living-context-health`: diagnósticos Weather opcionales, locales, sanitizados y nunca críticos por ausencia de provider.

## Approach

Agregar Weather al único resolver `{ initial, settled }`. Un endpoint autenticado entrega `WeatherProviderSnapshot` validado; Open-Meteo queda confinado al provider. El dominio expone condición, temperatura, precipitación, lluvia/tormenta/nieve, amanecer/atardecer, `effectiveAt`, `expiresAt` y confianza honesta (`unknown`). La timezone IANA proviene del destino. Toda falla deja Weather `unavailable` y conserva los otros módulos. Futuros providers repetirán slices explícitos/localizados, no un registry mágico.

Weather habilita decisiones futuras indoor/outdoor, confort/vestimenta y luz natural; sus consumidores futuros no se implementan.

## Affected Areas

- `app/src/features/context-engine/`: contratos, resolver, query, hook y tests.
- `app/lib/context/`, `app/routes/context/`, `app/lib/apiRoutes.js`: provider, cache y endpoint.
- `app/src/features/story/health/`: diagnóstico opcional.

## Risks

- Licencia gratuita Open-Meteo no comercial y con atribución: gate legal; adapter reemplazable.
- Errores de hora local/DST: timezone explícita y datetime local testeado.
- Datos vencidos o coordenadas filtradas: reloj inyectado; keys/observer sanitizados.

## Rollback Plan

Revertir provider/cache/route y la extensión del resolver, hook y Health Check. Sin migraciones; los cuatro módulos Foundation continúan operativos.

## Dependencies

Open-Meteo Forecast API; aprobación comercial fuera de esta etapa.

## Success Criteria

- [ ] Weather válido dentro de ventana produce un único request compartido y capability real; fuera de ventana produce cero.
- [ ] Éxitos expiran a 15 minutos; errores, timeouts y payloads inválidos nunca se cachean.
- [ ] Tests prueban provider, TTL/dedupe, timezone/DST, fallback, partialidad, capability, observer y Health legacy.
- [ ] Typecheck, Node, React y `git diff --check` pasan; no se ejecuta build.

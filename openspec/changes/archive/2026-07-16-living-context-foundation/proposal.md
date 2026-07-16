# Proposal: Living Context Foundation

## Qué revisar primero

La decisión central es evolucionar `app/src/features/context-engine/`: un solo resolver de dominio, sin endpoint agregador ni segundo engine.

## Intent

**Hoy:** destino, tiempo, finanzas y narrativa existen, pero se componen en puntos distintos con relojes/provenance desparejos. **Propuesto:** ofrecer un snapshot tipado, trazable, parcial y reutilizable fuera de React, sin alterar la Etapa 6.

## Scope

### In Scope
- Contrato `LivingTravelContext` y resolver puro con reloj, adapter financiero y observador inyectables.
- Módulos destination, temporal, financial adapter y narrative, reutilizando `TravelContext`, `localeCatalog`, `tripTemporalState`, finanzas y Story Intelligence existentes.
- Hook React mínimo que reutilice snapshots/query keys, Health Check incremental y tests de composición parcial y no duplicación de requests.

### Out of Scope
- Segundo engine, registry genérico, endpoint monolítico, backend/Mongo/config nuevos sin necesidad.
- IA, Companion funcional, notificaciones, UI nueva o cambios editoriales de Etapa 6.
- Proveedores reales de clima, feriados, eventos, transporte, electricidad, alertas, ubicación o geofencing; solo puntos de extensión.

## Capabilities

### New Capabilities
- `living-context-resolution`: ownership, precedencia, provenance/freshness, capabilities y resolución parcial de los cuatro módulos.
- `living-context-react-integration`: consumo no bloqueante desde React sin waterfalls ni requests duplicados.
- `living-context-health`: warnings verificables para metadata curada incompleta o incoherente, compatibles con stories legacy.

### Modified Capabilities
- None.

## Approach

Componer en `features/context-engine` inputs opcionales de Trip/User/Story. Trip manda en destino/fechas; Story en narrativa curada; User en preferencias; catálogos son fallback. Preservar `baseStoryId` y `storyId`. Los módulos opcionales fallan aislados y reportan status/source; la observabilidad excluye PII y coordenadas exactas. React adapta datos ya cargados.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `app/src/features/context-engine/` | Modified | Contrato, resolver, módulos, adapter, hook y tests |
| `app/src/features/trips/lib/countdown.ts` | Modified | Reutilización temporal sin cambiar copy |
| `app/src/features/story/health/` | Modified | Warnings de contexto curado |
| `app/src/features/connected/hooks/` | Modified | Integración mínima con cache existente |

## Risks

| Risk | Mitigation |
|---|---|
| Story/Trip discrepan | Precedencia explícita y tests de ids/ownership |
| Timezone o finanzas fallan | Resultado parcial `unavailable`, nunca error global |
| Alcance supera 400 líneas | Dividir implementación en slices revisables |

## Rollback Plan

Revertir por slices hook, Health Check y resolver; conservar sin cambios los módulos financieros, temporales y Story existentes. Ninguna migración ni dato persistido requiere rollback.

## Success Criteria

- [ ] Resolver determinístico, sin React/window, no muta inputs y tolera módulos fallidos.
- [ ] Tests verifican precedencia, timezone/DST, freshness/provenance, narrativa literal, stories legacy y cero requests duplicados.
- [ ] Health Check solo emite warning/info por contexto incompleto; dinámicos futuros no son critical.
- [ ] No se agrega engine, endpoint, proveedor, UI, IA, Companion ni notificación.

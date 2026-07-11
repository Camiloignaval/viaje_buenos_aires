# Tasks: Viaje compartido e invitaciones (Alaia Together)

## Review Workload Forecast

| Campo | Valor |
|-------|-------|
| Líneas estimadas | **Alta** — backend (lib+5 endpoints), frontend (feature nuevo + auth-return), tests |
| 400-line budget risk | **High** |
| Chained PRs recommended | **Yes** (por fase; backend antes que frontend) |
| Decision needed before apply | **No** — D1/D2/D3 cerradas (ver proposal.md) |

**Estado**: plan aprobado, D1–D3 cerradas. Ejecución autónoma; commits temáticos por fase (sin push/tags/squash).

---

## Fase 1: Infra backend transversal

- [ ] 1.1 `platformErrors.js`: agregar `NotFoundError(404)`, `ConflictError(409)`, `GoneError(410)`, `ForbiddenError(403)` + `ERROR_CODES.NOT_FOUND/CONFLICT/GONE`
- [ ] 1.2 `platformMongo.js`: agregar `tripInvitations` a `PLATFORM_COLLECTIONS` + `getTripInvitationsCollection`
- [ ] 1.3 `platformTrips.js`: `TRIP_ROLES = { owner, editor }`; soporte `bootstrapKey`; helper de alta atómica de miembro (`$expr` cupo + `$ne`) y de cálculo de cupo
- [ ] 1.4 Tests: `platformErrors.test.js` (nuevos status), `platformTrips.test.js` (alta atómica, cupo, roles)
- [ ] 1.5 Validación: `npm run typecheck && npm test`

## Fase 2: Lib de invitaciones

- [ ] 2.1 `platformInvitations.js`: token 256b + `tokenHash` HMAC; `ensureInvitationIndexes` (lazy, idempotente)
- [ ] 2.2 `createInvitation` (owner, normalización, rechazos 409, cupo con pendientes [D2], tokenHash, inviteUrl)
- [ ] 2.3 `getInvitationByToken` (expiración lazy, sanitización de preview)
- [ ] 2.4 `acceptInvitation` (email match, estado, alta atómica, idempotente), `declineInvitation`, `revokeInvitation`, `listPendingInvitations`
- [ ] 2.5 Rate limiting por `createdBy` (patrón Mongo-count de feedback)
- [ ] 2.6 `platformInvitations.test.js` — exhaustivo (§17 design)
- [ ] 2.7 Validación: `npm run typecheck && npm test`

## Fase 3: Bootstrap de Buenos Aires

- [ ] 3.1 `scripts/bootstrapBuenosAiresTrip.js` (idempotente por `bootstrapKey`, falla si no hay usuario, no imprime secretos)
- [ ] 3.2 Índices idempotentes: `users.email` unique, `trips.bootstrapKey` unique sparse
- [ ] 3.3 Test de la función pura subyacente (usuario inexistente, creación, 2º run idempotente, owner, `ba-2026`, no duplica)
- [ ] 3.4 Validación: `npm test`

## Fase 4: Endpoints

- [ ] 4.1 `app/api/trips/[tripId]/invitations.js` — POST crear + GET listar (owner)
- [ ] 4.2 `app/api/trips/[tripId]/invitations/[invitationId]/revoke.js`
- [ ] 4.3 `app/api/invitations/[token].js` — GET preview público
- [ ] 4.4 `app/api/invitations/[token]/accept.js` y `.../decline.js`
- [ ] 4.5 Handlers finos con `sendPlatformError`; tabla de status 400/401/403/404/409/410/422/429
- [ ] 4.6 Validación: `npm test` (cobertura por lib)

## Fase 5: Frontend — retorno post-login (`returnTo`)

- [ ] 5.1 `features/sharing/lib/safeReturnTo.ts` (+ test: allowlist, open redirect)
- [ ] 5.2 `LoginPage.tsx` + `useLoginFlow.ts`: leer/validar `returnTo`, navegar ahí tras verify (conservado en URL)
- [ ] 5.3 `RequireAuth.tsx`: adjuntar `?returnTo=<location>` al redirigir a `/login`
- [ ] 5.4 Tests: returnTo válido, open redirect bloqueado, conservación entre pasos, no auto-accept
- [ ] 5.5 Validación: `npm run typecheck && npm run test:react`

## Fase 6: Frontend — vista `/invite/:token`

- [ ] 6.1 Ruta pública `/invite/:token` en `router.tsx` (lazy `InvitePage`)
- [ ] 6.2 `hooks/useInvitationPreview.ts`, `useAcceptInvitation.ts`, `useDeclineInvitation.ts` + `api/invitationsApi.ts`
- [ ] 6.3 `InvitePage` + estados: sin sesión, con sesión (match), email no coincide, terminales (expired/revoked/declined/accepted/404), cupo lleno
- [ ] 6.4 `copy.ts` editorial; navegación final a `/trips/:tripId`
- [ ] 6.5 Tests (`InvitePage.test.tsx`): cada estado + no auto-accept + navegación
- [ ] 6.6 Validación: `npm run typecheck && npm run test:react`

## Fase 7: Frontend — Portada (owner)

- [ ] 7.1 `TripInvitePanel`, `CreateInvitationDialog`, `ShareInvitation` (WhatsApp/copiar) + hooks `useCreateInvitation`/`useRevokeInvitation`/`useTripInvitations`
- [ ] 7.2 `lib/whatsappUrl.ts` (+ test); miembros/pendientes/cupos discretos; lenguaje editorial
- [ ] 7.3 `TripHomePage.tsx`: montar panel (owner) / indicador (editor)
- [ ] 7.4 Tests: owner ve CTA / editor no; crear; WhatsApp URL; copiar enlace
- [ ] 7.5 Validación: `npm run typecheck && npm run test:react`

## Fase 8: e2e y validación final

- [ ] 8.1 [D3] Playwright `e2e/invitations.spec.ts` (owner crea → invitado sin sesión → login → regreso → aceptar → ambos ven el trip) **o** cobertura equivalente por integración si no hay backend de test
- [ ] 8.2 Validación completa: `npm run typecheck && npm test && npm run test:react && npm run build && npm run test:e2e`
- [ ] 8.3 Ejecutar bootstrap manual en el entorno real: `node scripts/bootstrapBuenosAiresTrip.js --email="<owner>"`

---

## Plan de commits (propuesta — por fase, backend antes que frontend)

1. `feat(errors): add 404/409/410/403 typed platform errors` — Fase 1 (infra errores)
2. `feat(trips): add editor role and atomic membership/capacity helpers` — Fase 1 (trips)
3. `feat(invitations): add tripInvitations model and lib` — Fase 2
4. `feat(bootstrap): idempotent Buenos Aires trip bootstrap script` — Fase 3
5. `feat(invitations): add create/preview/accept/decline/revoke endpoints` — Fase 4
6. `feat(auth): safe returnTo after login` — Fase 5
7. `feat(sharing): public invite view with decision states` — Fase 6
8. `feat(sharing): owner invite panel with WhatsApp/copy in trip home` — Fase 7
9. `test(sharing): end-to-end invitation flow` — Fase 8

Sin `git add -A`/`.`; sin push; sin tags; sin squash. (Reglas heredadas de la Etapa 5.)

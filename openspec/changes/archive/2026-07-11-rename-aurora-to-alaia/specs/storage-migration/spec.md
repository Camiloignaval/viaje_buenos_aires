# Storage Migration Specification

## Purpose

Definir la migración de las claves persistidas locales `aurora:*` → `alaia:*` de forma
**automática, idempotente y sin pérdida de datos**, conservando sesiones y datos del
usuario (recuerdos, progreso, álbum, preferencias, tokens).

## Requirements

### Requirement: Automatic Idempotent Key Migration

Al iniciar la aplicación, el sistema MUST migrar cada clave de `localStorage`/`sessionStorage`
con prefijo `aurora:` a su equivalente `alaia:` mediante copia **solo si el destino no existe**
(copy-if-absent). La migración MUST ser idempotente: ejecutarla múltiples veces MUST NOT
alterar datos ya migrados ni datos nuevos.

#### Scenario: Primera migración copia las claves

- GIVEN `localStorage` con `aurora:progress:story-x` = `V` y sin `alaia:progress:story-x`
- WHEN la app arranca y corre la migración
- THEN MUST existir `alaia:progress:story-x` = `V`
- AND `aurora:progress:story-x` MUST seguir presente (no se borra en la ventana de compat)

#### Scenario: Reejecución no pisa datos nuevos

- GIVEN `alaia:progress:story-x` = `NUEVO` (escrito tras migrar) y `aurora:progress:story-x` = `VIEJO`
- WHEN la migración corre de nuevo
- THEN `alaia:progress:story-x` MUST seguir siendo `NUEVO` (copy-if-absent no sobrescribe)

#### Scenario: Storage no disponible no rompe el arranque

- GIVEN un entorno donde `localStorage` lanza al accederse (modo privado)
- WHEN corre la migración
- THEN MUST capturar el error y continuar sin romper el render

### Requirement: Application Writes Only New Keys

Después de la migración, la aplicación MUST escribir exclusivamente claves `alaia:*`.
Ningún camino de escritura MAY crear nuevas claves `aurora:*`.

#### Scenario: Escrituras posteriores usan alaia

- GIVEN la app migrada
- WHEN se guarda progreso, recuerdos, token de sync, tema o "intro vista"
- THEN la clave escrita MUST tener prefijo `alaia:`
- AND MUST NOT crearse ninguna clave `aurora:*`

### Requirement: Preserve Sessions and Stable Technical Stores

El cambio de marca MUST NOT cerrar sesiones ni migrar identificadores técnicos estables
invisibles al usuario.

#### Scenario: La cookie de sesión se conserva

- GIVEN una sesión activa con cookie `aurora_session`
- WHEN se despliega el cambio de marca
- THEN la cookie `aurora_session` MUST seguir siendo válida
- AND la sesión MUST NOT cerrarse

#### Scenario: La base IndexedDB de fotos se conserva

- GIVEN fotos del álbum en la base IndexedDB `aurora-photos`
- WHEN se despliega el cambio
- THEN las fotos MUST seguir accesibles desde `aurora-photos`
- AND MUST NOT perderse ni requerir recarga manual

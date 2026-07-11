# Trip Bootstrap Specification

## Purpose

Asociar de forma **idempotente y administrativa** el viaje Buenos Aires 2026 al usuario
owner real, mediante una clave estable, sin duplicar viajes ni exponer un endpoint público.

## Requirements

### Requirement: Idempotent Administrative Bootstrap

Un script manual MUST asociar el viaje Buenos Aires al usuario owner usando la conexión
Mongo y la config existentes, y MUST ser seguro al ejecutarse varias veces.

#### Scenario: Usuario inexistente falla claro

- GIVEN un email que no corresponde a ningún usuario
- WHEN se ejecuta el bootstrap con ese email
- THEN MUST fallar con un mensaje claro
- AND MUST NOT crear el usuario
- AND MUST NOT crear el viaje

#### Scenario: Primera ejecución crea el viaje del owner

- GIVEN un usuario existente y ningún viaje con `bootstrapKey: "buenos-aires-2026"`
- WHEN se ejecuta el bootstrap
- THEN MUST crear un trip con `ownerId` del usuario, `members` con ese usuario como `owner`,
  `baseStoryId: "ba-2026"`, destino Buenos Aires con `timezone`, y `expectedTravelers`
- AND MUST fijar `bootstrapKey: "buenos-aires-2026"`

#### Scenario: Segunda ejecución es idempotente

- GIVEN un viaje ya asociado por `bootstrapKey`
- WHEN se ejecuta el bootstrap otra vez
- THEN MUST NOT crear un viaje duplicado
- AND MUST NOT pisar fechas ni datos existentes del viaje
- AND el owner MUST seguir siendo el mismo usuario

#### Scenario: No deduplica por título

- GIVEN dos viajes con el mismo título pero distinto `bootstrapKey`
- WHEN se ejecuta el bootstrap
- THEN la identificación MUST ser por `bootstrapKey`, nunca por título

### Requirement: No Public Exposure and No Secret Leakage

El mecanismo de bootstrap MUST NOT exponerse como endpoint público y MUST NOT imprimir secretos.

#### Scenario: Sin endpoint público

- GIVEN el árbol de rutas `app/api/*`
- WHEN se inspecciona
- THEN MUST NOT existir una ruta que ejecute el bootstrap

#### Scenario: Logs sin secretos

- GIVEN una ejecución del bootstrap
- WHEN se revisan sus logs
- THEN MUST NOT contener la URI de Mongo, secretos ni tokens

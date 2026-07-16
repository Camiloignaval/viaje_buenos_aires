# Editorial Voice Specification

## Purpose

Convertir una `CompanionAction` válida en copy curado reproducible, sin decidir, enriquecer ni entregar.

## Requirements

### Requirement: Transformación pura e inmutable

La transformación **MUST** aceptar sólo `CompanionAction` y catálogo, ser pura, determinista e inmutable; **MUST NOT** leer reloj, azar, estado global, Living Context, Story, providers, Decision Engine/evaluations, React, red, storage, Push, delivery o IA.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Determinismo exacto|acción y catálogo idénticos|transforma repetidamente|salida exacta idéntica|
|Inmutabilidad profunda|inputs congelados válidos|transforma|no muta inputs y devuelve salida profundamente congelada|
|Frontera aislada|módulo editorial|inspecciona ejecución/dependencias|sólo lee `CompanionAction` y catálogo; no ejecuta sistemas prohibidos|

### Requirement: Cobertura semántica cerrada

El catálogo **MUST** cubrir `trip_start_tomorrow`, `trip_start_today`, `trip_last_day`, `weather_attention_candidate` y `light_moment_candidate` con al menos dos variantes curadas cada uno; **MUST NOT** usar fallback entre kinds ni añadir hechos, urgencia o recomendaciones.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Cobertura cinco kinds|cada kind y catálogo válido|transforma|elige sólo variante del mismo kind y preserva significado|
|Sin fallback|kind soportado sin variantes|transforma|lanza `EditorialContractError(MISSING_KIND)` sin salida parcial|
|Kind no soportado|kind desconocido|transforma|lanza `EditorialContractError(UNSUPPORTED_KIND)`|

### Requirement: Variación determinista versionada

La selección **MUST** derivar un seed opaco estable de identidad de acción y versión de catálogo. La versión **MUST** integrar la identidad editorial; IDs **MUST NOT** aparecer en texto.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Seed estable|misma identidad y versión|transforma|elige mismo `variantId`|
|Variación alcanzable|identidades válidas distintas|transforma fixture de cobertura|alcanza al menos dos variantes del kind|
|Versión identitaria|misma acción, versión distinta|transforma|referencia la versión correspondiente|
|IDs ocultos|acción con IDs marcadores|inspecciona texto|ningún marcador aparece|

### Requirement: Salida editorial exacta

`EditorialMessage` **MUST** contener exactamente `{locale:"es-CL", catalogVersion:"editorial-v1", variantId, text, actionRef, channel}`; `actionRef` **MUST** ser inmutable y `channel` **MUST** conservar la clasificación conceptual recibida. **MUST NOT** contener destino, autorización ni payload de delivery.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Contrato exacto|acción válida|transforma|devuelve sólo campos definidos y referencia/clasificación preservadas|
|Canal conceptual|cualquier mensaje|inspecciona|no implica destino, payload ni autorización|

### Requirement: Catálogo y tono validados

Cada texto **MUST** ser no vacío, `es-CL`, cálido, elegante, breve, optimista y contemplativo, y medir como máximo 160 code points Unicode inclusivos. **MUST NOT** usar voseo, imperativos, dramatismo, urgencia, exclamación urgente ni `debes|no olvides|tienes que|urgente|importante|alerta`, comparados como frases/stems tras normalizar caso y diacríticos.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Límite inclusivo|texto de 160 code points|valida|acepta|
|Exceso exacto|texto de 161 code points|valida|error `TEXT_TOO_LONG`|
|Vacío|texto vacío o sólo whitespace|valida|error `INVALID_TEXT`|
|Prohibido normalizado|frase/stem prohibido con caso/diacríticos variables o exclamación urgente|valida|error `FORBIDDEN_TEXT`|
|Fixture editorial|cada variante exacta del catálogo|revisa fixture aprobado|texto coincide exactamente y cumple tono|

### Requirement: V1 sin placeholders

V1 **MUST** tener allowlist de placeholders vacía y **MUST NOT** interpolar texto del usuario.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Placeholder rechazado|`{token}`, desconocido, escapado o malformado|valida|error `PLACEHOLDER_NOT_ALLOWED`|
|Sin interpolación|acción contiene texto marcador|transforma|marcador no aparece en salida|

### Requirement: Fallo contractual cerrado

Todo fallo **MUST** lanzar `EditorialContractError` con uno de `INVALID_ACTION|UNSUPPORTED_KIND|INVALID_CHANNEL|INVALID_CATALOG|INVALID_LOCALE|MISSING_KIND|DUPLICATE_VARIANT_ID|INVALID_TEXT|TEXT_TOO_LONG|FORBIDDEN_TEXT|PLACEHOLDER_NOT_ALLOWED`, sin fallback ni salida parcial.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Input inválido|no-acción o acción malformada|transforma|error `INVALID_ACTION`|
|Canal inválido|acción con channel inválido|transforma|error `INVALID_CHANNEL`|
|Catálogo inválido|catálogo malformado/versión distinta de `editorial-v1`, locale distinto, kind faltante o variantId duplicado|valida|respectivamente `INVALID_CATALOG`, `INVALID_LOCALE`, `MISSING_KIND` o `DUPLICATE_VARIANT_ID`|
|Entrada editorial inválida|texto largo, vacío, prohibido o placeholder|valida|código específico correspondiente|

### Requirement: Observación categórica aislada

El observer **MAY** recibir sólo `outcome`, `errorCode|none`, `kind`, `variantId|none`, `catalogVersion` y duración sanitizada; **MUST NOT** recibir IDs, texto, acción, payload, evidencia ni errores crudos. Su fallo **MUST NOT** alterar resultado o error contractual.

|Scenario|GIVEN|WHEN|THEN|
|---|---|---|---|
|Observer seguro|éxito o fallo|observa|emite sólo campos permitidos y duración sanitizada|
|Observer falla|callback lanza|transforma|mantiene resultado o `EditorialContractError` original|

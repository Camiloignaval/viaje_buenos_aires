# ALAIA — ETAPA 6.8

# Product Polish & Platform Excellence

> Documento maestro de implementación  
> Estado: Draft aprobado para ejecución  
> Destinatario: Claude Opus  
> Alcance: Plataforma completa (pre-Etapa 7)

---

# Índice

1. Introducción
2. Visión
3. Objetivos
4. Estado actual del proyecto
5. Restricciones generales
6. Forma de trabajo
7. Principios de producto
8. Principios de arquitectura
9. Principios de UX
10. Principios editoriales
11. Principios de datos
12. Principios de rendimiento
13. Principios de accesibilidad
14. Principios de seguridad
15. Alcance de la Etapa 6.8
16. Criterios generales de aceptación

---

# 1. Introducción

Esta etapa representa el último gran trabajo estructural antes del inicio de la Etapa 7.

No busca agregar inteligencia artificial.

No busca aumentar la cantidad de funcionalidades.

No busca hacer Alaia más compleja.

Su propósito es completamente distinto.

Debe transformar Alaia desde un excelente MVP hacia un producto que se sienta terminado.

La diferencia entre ambos estados no está dada por nuevas pantallas.

Está dada por pequeños detalles.

Consistencia.

Profundidad.

Contexto.

Calidad de datos.

Resiliencia.

Elegancia.

Continuidad.

Todas las mejoras de esta etapa deberán perseguir exactamente ese objetivo.

---

# 2. Visión

Alaia no es una aplicación para organizar viajes.

Alaia tampoco es una guía turística.

No es un gestor de tareas.

No es un dashboard.

No es una red social.

No es un mapa.

No es una aplicación financiera.

No es un chatbot.

Alaia es un libro vivo.

Cada viaje es una historia.

Cada pantalla es una página.

Cada interacción debe sentirse natural.

Cada dato debe existir porque ayuda a comprender, preparar, vivir o recordar un momento.

Toda decisión técnica deberá proteger esa visión.

---

# 3. Objetivos

Al finalizar la Etapa 6.8 Alaia deberá sentirse:

- más humana;
- más editorial;
- más consistente;
- más resiliente;
- más preparada para múltiples destinos;
- más preparada para inteligencia futura;
- más fácil de mantener;
- más elegante;
- más estable;
- más confiable.

No se busca aumentar funcionalidades.

Se busca aumentar calidad.

---

# 4. Estado actual del proyecto

Antes de modificar cualquier archivo debes inspeccionar el repositorio completo.

Asume únicamente aquello que puedas comprobar.

El proyecto ya posee una cantidad importante de infraestructura que no debe volver a implementarse.

Entre otras capacidades ya existentes se encuentran:

- React + TypeScript.
- React Router.
- TanStack Query.
- Passwordless Authentication.
- Cookie HttpOnly.
- Session Persistence.
- Onboarding.
- Creación de viajes.
- Biblioteca de viajes.
- Portada por viaje.
- Experience conectada.
- Story Packages.
- Story Catalog.
- Routing conectado mediante baseStoryId.
- Viajes compartidos.
- Sistema de invitaciones.
- Roles Owner / Editor.
- Álbum.
- PWA.
- Opening cinematográfico.
- Navegación editorial.
- Context Engine financiero.
- Money.
- Preferred Currency.
- Exchange Rate Provider.
- Exchange Rate Cache.
- Conversión contextual.
- Autocomplete de ciudades.
- Date Picker propio.
- Time Picker propio.
- API consolidada en una sola Vercel Function.
- Deploy productivo en www.alaia.cl.

Nada de esto debe ser reimplementado.

Toda nueva funcionalidad debe construirse sobre esta base.

---

# 5. Restricciones generales

Durante esta etapa queda explícitamente prohibido implementar:

- Inteligencia Artificial generativa.
- Chat.
- Recomendaciones dinámicas.
- Clima en tiempo real.
- Sistema social.
- Comentarios públicos.
- Feed.
- Sistema de seguidores.
- Dashboard administrativo.
- Analytics visibles.
- Sistema de reservas.
- Compra de entradas.
- Integraciones bancarias.
- Nuevas historias completas.
- Timeline Engine definitivo.
- Story Director definitivo.

Toda infraestructura futura deberá prepararse únicamente mediante contratos claros y puntos de extensión.

Nunca mediante código muerto.

---

# 6. Forma de trabajo

No implementar toda la etapa simultáneamente.

Claude deberá dividir internamente la misión en fases completamente independientes.

Cada fase seguirá obligatoriamente el siguiente flujo:

1. Diagnóstico.
2. Diseño.
3. Implementación.
4. Tests específicos.
5. Inspección.
6. Microauditoría.
7. Correcciones.
8. Commit temático.
9. Continuación automática.

No deberá solicitar aprobación entre fases.

No deberá entregar informes parciales.

No deberá detenerse por decisiones menores.

Solo podrá detenerse cuando exista un bloqueo técnico objetivo que impida continuar con seguridad.

---

# 7. Principios de producto

## Personas antes que lugares

Los destinos existen porque alguien los vive.

Nunca convertir Alaia en una colección de fichas turísticas.

---

## Historia antes que funcionalidad

Toda mejora debe sentirse integrada al relato.

Nunca como una herramienta agregada.

---

## Emoción antes que información

La información útil debe existir.

Pero nunca debe dominar la pantalla.

---

## Honestidad antes que automatización

Si Alaia no sabe algo debe decirlo.

Nunca inventarlo.

---

## Profundidad antes que cantidad

Es preferible una mejora pequeña perfectamente integrada que diez funcionalidades superficiales.

---

## Compatibilidad antes que perfección destructiva

No romper:

- Story Packages.
- Usuarios.
- Viajes.
- Invitaciones.
- Álbum.
- Experience.
- Context Engine.

Siempre preferir migraciones progresivas y compatibles.

---

# 8. Principios de arquitectura

Toda nueva pieza deberá cumplir:

- Responsabilidad única.
- Contratos pequeños.
- Bajo acoplamiento.
- Alta cohesión.
- Tipado estricto.
- Reutilización.
- Compatibilidad.
- Testabilidad.

Evitar:

- Managers gigantes.
- Helpers sin dueño.
- Código muerto.
- Flags innecesarios.
- Abstracciones prematuras.
- Arquitecturas especulativas.

---

# 9. Principios de UX

Toda nueva interacción deberá responder:

¿Por qué existe?

¿Qué emoción transmite?

¿Qué ocurre si falta información?

¿Qué ocurre offline?

¿Qué ocurre en mobile?

¿Cómo vuelve el usuario?

¿Cómo lo interpreta un lector de pantalla?

¿Qué acción principal existe?

Eliminar cualquier elemento visual que no aporte una respuesta clara a esas preguntas.

---

# 10. Principios editoriales

Todo el producto deberá mantener español chileno.

Evitar:

- voseo;
- lenguaje financiero;
- clichés turísticos;
- frases genéricas;
- textos administrativos.

Toda nueva pieza de copy deberá sentirse:

- cercana;
- breve;
- elegante;
- humana;
- específica.

---

# 11. Principios de datos

Todo nuevo dato persistido deberá tener:

- origen claro;
- dueño claro;
- validación;
- compatibilidad;
- estrategia de migración;
- comportamiento offline;
- cobertura de pruebas.

Nunca guardar información que pueda derivarse fácilmente salvo que exista una razón clara de rendimiento o histórico.

---

# 12. Principios de rendimiento

La Experience nunca debe bloquearse por información secundaria.

La historia siempre tiene prioridad.

Los datos contextuales deberán cargar progresivamente.

Evitar:

- waterfalls;
- requests por elemento;
- renders innecesarios;
- payloads completos cuando solo se requiere un subconjunto.

---

# 13. Principios de accesibilidad

Toda mejora deberá considerar:

- navegación por teclado;
- foco visible;
- contraste;
- reduced motion;
- safe areas;
- screen readers;
- tamaños táctiles;
- orden lógico de navegación.

La accesibilidad nunca deberá sacrificarse por estética.

---

# 14. Principios de seguridad

No confiar nunca en datos enviados por el cliente.

Validar:

- usuarios;
- roles;
- Story Packages;
- monedas;
- rutas;
- parámetros;
- payloads.

No exponer secretos.

No registrar información sensible.

No utilizar localStorage como fuente de autorización.

---

# 15. Alcance de la Etapa 6.8

La implementación se dividirá internamente en las siguientes fases.

## Fase 0

Higiene editorial.

## Fase 1

Context Engine Polish.

## Fase 2

Health Check Engine.

## Fase 3

Story Intelligence Metadata.

## Fase 4

Preparativos Inteligentes.

## Fase 5

Estado Vivo del Viaje.

## Fase 6

Favoritos.

## Fase 7

Notas Privadas.

## Fase 8

Información Contextual.

## Fase 9

Álbum Premium.

## Fase 10

PWA Premium.

## Fase 11

Microauditoría global.

## Fase 12

Validación final.

---

# 16. Criterios generales de aceptación

La Etapa 6.8 solo podrá considerarse terminada cuando:

- la arquitectura sea más simple que antes;
- el Context Engine permanezca intacto;
- los Story Packages sean más ricos y más consistentes;
- el producto se sienta más editorial;
- la deuda técnica haya disminuido;
- las suites permanezcan verdes;
- la UX haya mejorado objetivamente;
- no existan regresiones visibles;
- Alaia quede preparada para iniciar la Etapa 7.

---

# FIN PARTE 1/10

# PARTE 2/10

# Fase 0 — Higiene Editorial y Consistencia de Contenido

---

# Objetivo

Antes de enriquecer Alaia, garantizar que todo el contenido curado sea consistente.

El Context Engine no debe convivir con Story Packages que entreguen información contradictoria.

Esta fase no agrega funcionalidades.

Su propósito es aumentar la calidad de los datos.

---

# Principio

Una historia puede contener un error editorial.

Nunca debe contener un error estructural.

Toda inconsistencia detectada deberá clasificarse como:

- Error de contenido.
- Error de estructura.
- Error de metadata.
- Error de referencia.
- Error de contrato.
- Error de integridad.

Nunca ocultar errores.

Nunca asumir datos.

Nunca inventar contenido.

---

# Fase 0.1 — Auditoría completa de Story Packages

Inspeccionar todos los Story Packages presentes en el repositorio.

No asumir que actualmente solo existe Buenos Aires.

Buscar automáticamente todos los paquetes registrados.

Para cada uno generar internamente un diagnóstico.

Verificar:

- metadata
- destino
- país
- timezone
- capítulos
- días
- momentos
- lugares
- actividades
- restaurantes
- presupuestos
- referencias
- monedas
- media
- ids
- relaciones

No modificar todavía.

Solo auditar.

---

# Fase 0.2 — Higiene monetaria

Ya existe un Context Engine financiero.

Toda moneda visible debe ser consistente con él.

Buscar automáticamente:

- currency
- estimatedPrice
- estimatedCost
- budget
- money
- price
- amount

y también texto libre.

Ejemplos:

"$40.000 CLP"

"CLP"

"USD"

"ARS"

"BRL"

"No incluye entrada"

"Variable"

"Desde..."

Todo texto que pueda inducir a error monetario debe revisarse.

---

# Regla editorial

La historia pertenece al destino.

No al viajero.

Si una historia ocurre en Argentina:

La moneda editorial debe hablar en ARS.

Nunca en CLP.

Nunca en USD.

Salvo que el texto esté comparando explícitamente otra moneda.

---

# Caso específico conocido

Durante la Etapa 6.5 quedaron identificadas once menciones editoriales en CLP dentro del Story Package de Buenos Aires.

Esas menciones no fueron modificadas porque el alcance anterior protegía el copy.

Ahora sí forman parte del alcance.

Revisarlas cuidadosamente.

No cambiar el tono editorial.

No inventar cifras.

Si el monto en CLP representa realmente una conversión aproximada pensada para un chileno, reescribir el texto para que quede explícito.

Ejemplo:

Incorrecto

"Calcula unos $40.000 CLP."

Preferible

"Como referencia, equivale aproximadamente a $40.000 CLP según el cambio del momento."

Si en realidad el texto pretendía representar precio local:

corregir a ARS.

Nunca dejar ambigüedad.

---

# Fase 0.3 — Higiene editorial completa

Buscar textos que:

- contradigan metadata
- contradigan moneda
- contradigan destino
- contradigan fechas
- contradigan capítulos

Detectar:

- referencias antiguas a Aurora
- textos duplicados
- placeholders
- Lorem Ipsum
- TODO
- FIXME
- XXX
- comentarios editoriales olvidados

Corregir únicamente cuando exista evidencia objetiva.

---

# Fase 0.4 — Coherencia narrativa

Revisar que la voz narrativa sea consistente.

Todo Story Package debe mantener:

- español chileno
- tono editorial
- cercanía
- elegancia

Eliminar frases demasiado técnicas.

Eliminar frases demasiado turísticas.

Eliminar frases redundantes.

No convertir Alaia en una guía de viaje.

---

# Fase 0.5 — Calidad estructural

Cada capítulo debe verificar:

- orden correcto
- ids únicos
- navegación consistente
- timeline coherente
- parent válido
- hijos válidos
- capítulos alcanzables

No dejar elementos huérfanos.

---

# Fase 0.6 — Calidad multimedia

Verificar:

- imágenes existentes
- videos existentes
- media referenciada
- assets inexistentes
- tamaños
- formatos
- duplicados

No eliminar contenido.

Documentar únicamente aquello que requiera curación futura.

---

# Fase 0.7 — Health Score Editorial

Diseñar una puntuación interna.

No visible para el usuario.

Debe permitir responder:

¿Qué tan completo está este Story Package?

Ejemplo conceptual

Story Package

Contenido

Metadata

Media

Monedas

Timeline

Contexto

Consistencia

Referencias

Preparado IA

No mostrar porcentajes al usuario.

Solo preparar infraestructura.

---

# Fase 0.8 — Reporte interno

Generar internamente una lista de:

Errores críticos

Advertencias

Mejoras sugeridas

No detener la implementación por advertencias.

Solo detenerse por errores que rompan la Experience.

---

# Fase 1 — Context Engine Polish

---

# Objetivo

El Context Engine financiero ya existe.

No reimplementarlo.

Ahora debe evolucionar hacia el verdadero Context Engine de Alaia.

Todavía solo se implementará el primer nivel.

No crear módulos vacíos.

No crear arquitectura especulativa.

---

# Principio

El Context Engine responde preguntas sobre el contexto del viaje.

Nunca sobre lógica de negocio.

Nunca sobre UI.

Nunca sobre navegación.

Debe ser reutilizable.

---

# Información contextual mínima

Analizar si actualmente ya existen datos reutilizables para:

- timezone
- locale
- idioma
- sistema métrico
- moneda
- país
- ciudad

Si ya existen:

reutilizarlos.

Si faltan:

incorporarlos donde corresponda.

---

# No duplicar información

Ejemplo.

Si un Story Package ya define timezone:

No volver a calcularla.

Si destination ya conoce el país:

No crear otro campo equivalente.

Siempre utilizar una única fuente de verdad.

---

# Locale Resolver

Crear un resolver central.

Debe responder:

- locale
- idioma
- formato de fecha
- formato horario
- moneda
- sistema métrico

No mostrar configuración todavía.

Solo resolver.

---

# Sistema métrico

Preparar infraestructura para soportar:

- kilómetros
- millas

- Celsius
- Fahrenheit

No implementar UI todavía.

Solo contratos.

---

# Idioma

Preparar infraestructura para que un Story Package pueda indicar idioma predominante del destino.

Ejemplo:

Argentina

Español

Japón

Japonés

Brasil

Portugués

No traducir contenido.

Solo contexto.

---

# Zona horaria

Toda representación temporal debe provenir del Context Engine.

No calcular timezone en componentes.

No duplicar helpers.

---

# Context Snapshot

Diseñar un objeto reutilizable.

Ejemplo conceptual.

Travel Context

Destino

Moneda

Timezone

Locale

Idioma

Sistema métrico

No necesariamente con esos nombres.

Lo importante es que cualquier pantalla pueda obtener contexto sin conocer su origen.

---

# Preparación futura

El Context Engine deberá poder crecer naturalmente hacia:

- clima
- feriados
- propinas
- electricidad
- enchufes
- inflación
- cultura
- conectividad

No implementar esos módulos.

Solo evitar bloquearlos arquitectónicamente.

---

# No sobrearquitecturar

No crear:

ContextManager

GlobalContextProvider

MegaService

Singleton gigante

Registry innecesario

Factories genéricas

Usar composición sencilla.

---

# Validaciones

Agregar pruebas para:

Locale Resolver

Timezone

Country Resolver

Metric Resolver

Compatibilidad con Story Packages actuales

Compatibilidad con Context Engine financiero

Casos sin contexto

Casos corruptos

---

# Commit esperado

Si toda la Fase 0 y la Fase 1 quedan completamente verdes:

fix(content): normalize story packages and polish context engine

---

# Criterio de aceptación

Esta parte estará completa únicamente cuando:

- no existan contradicciones editoriales evidentes;
- el Context Engine sea la única fuente de verdad para información contextual;
- no exista duplicación de responsabilidades;
- todas las pruebas permanezcan verdes;
- la arquitectura sea más simple que antes.

---

# FIN PARTE 2/10

# PARTE 3/10

# Fase 2 — Story Package Health Check Engine

---

# Objetivo

Antes de que Alaia continúe creciendo, debe ser capaz de validar automáticamente la calidad técnica de cada Story Package.

El objetivo no es impedir el desarrollo.

El objetivo es detectar problemas antes de que lleguen al usuario.

Toda nueva historia deberá poder ejecutarse a través del Health Check Engine.

No será visible para el usuario.

Será una herramienta interna de calidad.

---

# Principios

El Health Check nunca modifica contenido.

Nunca corrige automáticamente.

Nunca inventa datos.

Nunca oculta errores.

Solo inspecciona.

Clasifica.

Reporta.

Y, cuando sea posible, propone la corrección.

---

# Health Check Categories

El motor deberá validar al menos:

## Metadata

Verificar:

- id válido
- slug válido
- baseStoryId
- versión
- destino
- país
- timezone
- idioma
- moneda
- fechas

---

## Story Structure

Verificar:

- capítulos existentes
- capítulos ordenados
- ids únicos
- capítulos alcanzables
- capítulos sin referencias rotas
- capítulos huérfanos
- navegación consistente

---

## Timeline

Verificar:

- días consecutivos
- horarios coherentes
- momentos ordenados
- actividades alcanzables

---

## Destino

Validar:

- ciudad
- país
- coordenadas
- timezone
- moneda local
- locale

---

## Media

Verificar:

- imágenes existentes
- videos existentes
- assets inexistentes
- referencias duplicadas
- formatos válidos

---

## Monetary

Validar:

- Money válido
- currency válida
- estimatedCost consistente
- budget consistente
- texto editorial consistente
- monedas visibles
- conversiones erróneas

---

## Experience

Verificar:

- chapters
- moments
- collections
- photo spots
- restaurants
- recommendations
- preparativos

---

## References

Buscar:

- ids inexistentes
- enlaces rotos
- referencias circulares
- referencias duplicadas

---

## Accessibility

Verificar:

- textos alternativos
- títulos
- orden lógico

---

## Context

Verificar:

- timezone
- locale
- moneda
- idioma
- contexto mínimo

---

# Resultado del Health Check

El resultado debe ser un objeto estructurado.

Ejemplo conceptual:

HealthReport

Status

Errors

Warnings

Suggestions

Summary

No es obligatorio utilizar estos nombres.

---

# Severidad

Clasificar:

CRITICAL

WARNING

INFO

Solo los errores críticos podrán bloquear una publicación.

---

# Reporte legible

Debe ser fácil entender:

Qué falló.

Dónde falló.

Por qué falló.

Cómo corregirlo.

---

# Integración

El Health Check no debe depender de React.

Debe poder ejecutarse:

- desde tests
- scripts
- CI
- validaciones futuras

---

# Story Quality Score

Además del reporte técnico, generar internamente un Quality Score.

No visible para usuarios.

No bloquear publicación.

Solo permitir detectar historias que requieren curación.

No convertir este score en una métrica comercial.

Debe ser únicamente una ayuda editorial.

---

# Preparación para IA

El Health Check debe dejar preparado el terreno para futuras verificaciones como:

- metadata IA incompleta
- emociones faltantes
- contexto insuficiente

No implementar todavía.

Solo permitir extender el motor.

---

# Tests

Agregar pruebas para:

- Story válido
- Story incompleto
- Metadata inválida
- Moneda incorrecta
- Timezone incorrecta
- Coordenadas inválidas
- Assets inexistentes
- Capítulos huérfanos
- Referencias rotas
- Timeline inconsistente

---

# Commit esperado

feat(health): introduce Story Package Health Check Engine

---

# Fase 3 — Story Intelligence Metadata

---

# Objetivo

Los Story Packages deben comenzar a describir significado.

No solamente contenido.

Esta metadata no será visible para el usuario.

Será utilizada posteriormente por:

- IA
- recomendaciones
- contexto
- recordatorios
- resúmenes
- narrativa

---

# Principio

No almacenar datos decorativos.

Toda metadata debe tener un uso futuro claro.

---

# Metadata propuesta

Evaluar incorporar, cuando corresponda:

emotion

energyLevel

walkingDifficulty

familyFriendly

rainFriendly

photoMoment

bestMoment

reservationRecommended

cashPreferred

durationEstimate

crowdLevel

indoor

outdoor

budgetLevel

foodType

romanticLevel

culturalLevel

historicalLevel

relaxLevel

---

# No hardcodear

La metadata debe pertenecer al Story Package.

No a componentes React.

---

# Metadata opcional

Toda metadata nueva debe ser opcional.

Nunca romper Stories existentes.

---

# Evolución futura

La IA podrá responder preguntas como:

¿Qué actividad romántica tenemos hoy?

¿Qué lugar conviene si llueve?

¿Qué momento requiere reserva?

¿Cuál demanda más caminata?

No implementar esas respuestas.

Solo preparar la información.

---

# Validaciones

Toda metadata deberá:

- tener tipo
- validación
- documentación
- compatibilidad
- tests

---

# Story Intelligence Validator

Extender el Health Check para detectar:

- metadata faltante
- metadata inválida
- inconsistencias

Solo advertencias.

Nunca bloquear.

---

# Documentación

Actualizar el contrato oficial del Story Package.

Toda nueva metadata deberá quedar documentada.

---

# Commit esperado

feat(story): enrich Story Package intelligence metadata

---

# Criterios de aceptación

Esta parte se considerará finalizada cuando:

- exista un Health Check reutilizable;
- el Story Package soporte metadata inteligente;
- no se rompan Stories existentes;
- el modelo quede preparado para IA futura;
- las suites permanezcan verdes.

---

# FIN PARTE 3/10

# PARTE 4/10

# Fase 4 — Preparativos Inteligentes

---

# Objetivo

Los preparativos deben dejar de sentirse como una checklist manual.

Deben sentirse como una conversación silenciosa entre Alaia y el destino.

El usuario no debería preparar un viaje.

Debería sentir que Alaia ya entendió qué necesita para ese destino.

---

# Principios

Los preparativos nunca serán:

- una lista genérica;
- una colección de tareas;
- una pantalla administrativa.

Los preparativos deben responder únicamente a:

¿Qué necesito saber antes de vivir esta historia?

---

# Context Driven

Toda la información deberá derivarse del Context Engine.

Nunca hardcodear información en React.

Preparativos deberán obtener contexto desde:

- país
- ciudad
- moneda
- idioma
- timezone
- metadata del Story Package

---

# Categorías

Preparar infraestructura para soportar:

## Documentación

Ejemplos:

- Pasaporte
- Visa
- Documento nacional
- Licencia internacional

---

## Dinero

Ejemplos:

- Moneda local
- Conversión contextual
- Conviene efectivo
- Tarjetas aceptadas

Nunca mostrar cotizaciones financieras.

---

## Conectividad

Ejemplos:

- eSIM
- roaming
- WiFi habitual
- cobertura

---

## Electricidad

Ejemplos:

- tipo de enchufe
- adaptador
- voltaje

---

## Clima promedio

No implementar clima en tiempo real.

Mostrar únicamente contexto promedio cuando exista información curada.

Ejemplo:

Julio

10°–17°

Lleven abrigo para la noche.

---

## Idioma

Mostrar idioma predominante.

No agregar traductor.

---

## Transporte

Ejemplos:

- SUBE
- Suica
- MetroCard

Solo si corresponde.

---

## Recomendaciones específicas

Ejemplos:

Conviene reservar.

Conviene llegar temprano.

Se llena al atardecer.

---

# Jerarquía

Los preparativos deben mantener el lenguaje editorial.

Nunca transformarse en una lista de tareas.

Preferir:

"Todo listo."

"Solo queda disfrutar."

"No olviden llevar abrigo para la noche."

Antes que:

□ Llevar abrigo

□ Comprar adaptador

---

# Evolución

Los preparativos deberán adaptarse naturalmente según:

antes del viaje

durante el viaje

después del viaje

---

# Sin contadores

Evitar:

8 tareas

3 pendientes

2 completas

No convertir Alaia en una app de productividad.

---

# Fase 5 — Estado Vivo del Viaje

---

# Objetivo

El viaje debe sentirse vivo.

Hoy Alaia conoce fechas.

Ahora debe comprender el momento del viaje.

---

# Estados

Como mínimo analizar:

Muy anticipado

Faltan más de 30 días.

---

Preparación

30 a 8 días.

---

Cuenta regresiva

7 días.

---

Mañana.

---

Hoy comienza.

---

En curso.

---

Último día.

---

Finalizado.

---

Recuerdo.

---

# Cada estado

Cada estado podrá modificar:

copy

microcopy

mensaje

tono

No cambiar navegación.

---

# Ejemplos

Antes

Faltan 18 días.

Todo está listo para cuando quieran comenzar.

---

Durante

Día 2 de 4.

Hoy continúa su historia.

---

Después

Este viaje ya forma parte de ustedes.

---

# Contexto

El estado nunca dependerá del reloj del dispositivo.

Siempre utilizar:

Context Engine

Timezone del destino

---

# No exagerar

No agregar:

animaciones

confetti

mensajes épicos

gamificación

---

# Continuidad

Toda la portada deberá respirar el momento real del viaje.

---

# Preparación futura

Dejar preparado para futuras capacidades:

aniversarios

recuerdos

revisitas

No implementarlas.

---

# Tests

Agregar cobertura para:

todos los estados

cambios de timezone

viajes antiguos

viajes futuros

viajes en curso

---

# Commit esperado

feat(travel): introduce intelligent preparation and living travel states

---

# Criterios de aceptación

Esta fase estará completa cuando:

- los preparativos dependan del contexto real;
- desaparezca la sensación de checklist;
- el estado del viaje evolucione naturalmente;
- no se rompa la Experience existente;
- todo permanezca editorial;
- las suites permanezcan verdes.

---

# FIN PARTE 4/10

# PARTE 5/10

# Fase 6 — Favoritos

---

# Objetivo

Alaia no debe convertirse en una aplicación de listas.

Sin embargo, las personas naturalmente desarrollan preferencias durante un viaje.

Un lugar puede emocionar incluso antes de visitarlo.

Una cafetería puede llamar la atención.

Un restaurante puede convertirse en "ese lugar al que definitivamente queremos ir".

Alaia debe permitir registrar esas pequeñas intenciones.

No como tareas.

Como afinidad.

---

# Principio

Favorito no significa:

Pendiente.

Checklist.

Completado.

Bookmark.

Significa:

"Esto nos llamó la atención."

---

# Alcance

Los favoritos podrán existir inicialmente sobre:

- lugares
- restaurantes
- cafés
- actividades
- photo spots
- momentos

No sobre capítulos completos.

No sobre viajes completos.

---

# Persistencia

Cada favorito pertenece al viaje.

Nunca al Story Package.

Dos usuarios distintos pueden marcar favoritos distintos sobre exactamente la misma historia.

---

# Colaboración

En viajes compartidos:

Cada persona conserva sus favoritos.

No mezclarlos automáticamente.

En el futuro podrán compararse.

No implementarlo todavía.

---

# UI

Evitar:

Botones grandes.

Contadores.

Listas administrativas.

Preferir:

Un pequeño corazón.

Una animación muy discreta.

Un cambio visual editorial.

---

# Navegación

No crear una pantalla nueva.

Los favoritos deberán integrarse naturalmente dentro del flujo existente.

---

# Futuro

La IA podrá utilizar favoritos para responder preguntas como:

"¿Qué era lo que más les interesaba antes de viajar?"

No implementar todavía.

---

# Tests

Agregar cobertura para:

- marcar favorito
- quitar favorito
- persistencia
- recarga
- múltiples favoritos
- viajes distintos
- usuario sin favoritos

---

# Fase 7 — Notas Privadas

---

# Objetivo

Esta probablemente sea una de las funcionalidades más importantes de Alaia.

Las notas no existen para organizar.

Existen para recordar.

---

# Filosofía

Una nota puede ser mucho más valiosa que una fotografía.

Ejemplo:

"Prometimos volver."

Cinco años después esa frase tendrá más valor que cualquier dato técnico.

---

# Alcance

Permitir notas sobre:

- un lugar
- un momento
- un día
- una actividad

No crear notas globales.

---

# Principios

Las notas pertenecen al viaje.

Nunca al Story Package.

Nunca modificar contenido curado.

---

# UX

Las notas deben sentirse naturales.

No como un editor de documentos.

Evitar:

Textareas enormes.

Botones de guardar.

Barras de herramientas.

Formato enriquecido.

Solo texto.

---

# Guardado

Siempre automático.

No mostrar:

"Guardado correctamente."

Guardar silenciosamente.

---

# Longitud

No imponer un límite extremadamente pequeño.

Pero tampoco convertir Alaia en un bloc de notas.

Elegir un límite razonable.

Documentarlo.

---

# Estados

Sin nota.

Con nota.

Editando.

Error.

Offline.

---

# Offline

Las notas deben poder escribirse sin conexión.

Sin perder información.

Sin bloquear la interfaz.

Sin duplicarse.

---

# Conflictos

Preparar la arquitectura para resolver conflictos futuros.

No implementar sincronización compleja todavía.

---

# Privacidad

Las notas son privadas.

No compartirlas.

No incluirlas en invitaciones.

No exponerlas mediante endpoints públicos.

---

# Integración futura

Las notas podrán alimentar:

- recuerdos
- IA
- resúmenes
- cartas
- aniversarios

No implementar aún.

---

# Tests

Agregar pruebas para:

- crear nota
- editar nota
- eliminar nota
- offline
- persistencia
- múltiples notas
- sincronización básica
- recarga

---

# Commit esperado

feat(memory): introduce favorites and private notes

---

# Criterios de aceptación

La fase estará completa cuando:

- los favoritos se sientan parte natural del viaje;
- las notas se sientan personales;
- no aparezcan pantallas administrativas;
- todo funcione offline cuando corresponda;
- la arquitectura quede preparada para futuras memorias;
- las suites permanezcan completamente verdes.

---

# FIN PARTE 5/10

# PARTE 6/10

# Fase 8 — Información Contextual

---

# Objetivo

Toda historia necesita contexto.

Pero el contexto nunca debe transformarse en una ficha técnica.

El usuario no vino a leer Wikipedia.

Vino a vivir una historia.

La información contextual existe para ayudar discretamente cuando aporta valor.

Nunca para llenar espacio.

---

# Filosofía

La información contextual debe sentirse como una pequeña nota editorial.

No como especificaciones.

No como un panel.

No como un dashboard.

---

# Información permitida

Evaluar incorporar, cuando exista información confiable:

- efectivo recomendado
- tarjetas aceptadas
- idioma predominante
- mejor momento del día
- horario sugerido
- tiempo estimado
- reserva recomendada
- dificultad para caminar
- apto para lluvia
- ideal para niños
- nivel de tranquilidad
- nivel de movimiento
- fotografía recomendada
- vista nocturna
- vista diurna

Nunca mostrar información si no existe evidencia.

Nunca inventar.

---

# Jerarquía visual

Toda información contextual debe ser secundaria.

La historia siempre ocupa el primer lugar.

La información contextual nunca puede competir con:

- fotografías
- recuerdos
- narrativa
- momentos

---

# Presentación

Evitar:

cards

badges gigantes

íconos coloridos sin sentido

listas interminables

Preferir:

pequeñas líneas editoriales

íconos discretos

texto breve

aire visual

---

# Contexto financiero

Toda referencia monetaria debe utilizar el Context Engine.

Nunca convertir automáticamente el valor principal.

Siempre mostrar:

Moneda local primero.

Conversión únicamente como ayuda.

---

# Clima

No implementar clima en tiempo real.

Cuando exista información curada:

mostrar únicamente contexto promedio.

Ejemplo:

Julio

10°–17°

Las noches suelen ser frías.

---

# Electricidad

Preparar soporte para:

tipo de enchufe

voltaje

adaptadores

Solo cuando exista contenido curado.

---

# Cultura

Preparar soporte para pequeños consejos culturales.

Ejemplos:

Es habitual dejar propina.

Conviene reservar.

Los lunes suele cerrar.

No implementar recomendaciones generadas.

Solo contenido curado.

---

# Integración

Toda esta información deberá provenir del Story Package o del Context Engine.

Nunca hardcodearse dentro de React.

---

# Fase 9 — Álbum Premium

---

# Objetivo

Hoy el álbum guarda archivos.

Debe comenzar a guardar recuerdos.

---

# Filosofía

El usuario nunca recuerda:

IMG_3482.jpg

Recuerda:

"La tarde que llovía."

"La foto frente al Obelisco."

"La primera cena."

El álbum debe acercarse a esa idea.

---

# Agrupación

Evaluar agrupar automáticamente por:

día

lugar

momento

actividad

comida

paisaje

No modificar todavía la navegación principal.

---

# Resúmenes

Cuando exista suficiente contenido, poder mostrar discretamente:

15 recuerdos

4 lugares

2 momentos favoritos

No convertirlo en una métrica.

Solo una forma elegante de resumir.

---

# Portadas

Cuando un grupo tenga múltiples fotografías:

Elegir automáticamente una portada representativa.

No implementar IA.

Utilizar reglas simples.

---

# Cronología

Mantener el orden narrativo.

Nunca ordenar únicamente por fecha de archivo.

---

# Integración con favoritos

Si un recuerdo pertenece a un lugar favorito:

Preparar la arquitectura para futuras relaciones.

No cambiar todavía la UI.

---

# Integración con notas

Si existe una nota privada asociada:

Preparar la arquitectura para que el futuro álbum pueda mostrarla.

No implementarlo todavía.

---

# Eliminaciones

Nunca eliminar fotografías automáticamente.

Nunca deduplicar destructivamente.

---

# Preparación futura

El Álbum deberá quedar preparado para:

cartas

resúmenes

aniversarios

postales

recuerdos IA

No implementar esas funcionalidades.

---

# Tests

Agregar cobertura para:

agrupación

portadas

cronología

persistencia

casos vacíos

favoritos

notas relacionadas

---

# Commit esperado

feat(memory): enrich contextual information and premium album

---

# Criterios de aceptación

La fase estará completa cuando:

- la información contextual se sienta editorial;
- el álbum represente recuerdos y no archivos;
- no aparezcan dashboards;
- la Experience continúe siendo protagonista;
- todo permanezca compatible con la infraestructura existente;
- las pruebas permanezcan completamente verdes.

---

# FIN PARTE 6/10

# PARTE 7/10

# Fase 10 — PWA Premium y Continuidad

---

# Objetivo

Cuando Alaia está instalada, no debe sentirse como un sitio web.

Debe sentirse como una aplicación nativa.

La continuidad debe ser uno de los pilares de la experiencia.

El usuario nunca debería preguntarse:

"¿Dónde estaba?"

Alaia debería recordarlo.

---

# Filosofía

Instalar Alaia no debe cambiar su funcionamiento.

Debe mejorar la continuidad.

Debe mejorar la sensación de pertenencia.

Debe reducir la fricción.

Nunca debe agregar pasos innecesarios.

---

# Restauración de estado

Al volver a abrir Alaia instalada, restaurar cuando sea posible:

- último viaje abierto;
- última portada;
- último capítulo;
- último día;
- última sección;
- último scroll significativo.

No restaurar estados efímeros como:

- diálogos abiertos;
- loaders;
- errores temporales;
- modales.

---

# Restauración inteligente

No restaurar ciegamente.

Validar siempre:

- sesión vigente;
- permisos;
- existencia del viaje;
- existencia del Story Package;
- consistencia del estado.

Si el contexto cambió:

volver elegantemente al punto lógico anterior.

Nunca mostrar errores técnicos.

---

# Instalación

Revisar completamente el flujo de instalación.

Validar:

- beforeinstallprompt;
- appinstalled;
- standalone;
- iOS;
- Android;
- Desktop Chromium.

---

# Banner de instalación

El banner debe sentirse editorial.

Nunca publicitario.

Nunca insistente.

Debe respetar:

- descarte temporal;
- instalación previa;
- modo standalone;
- navegación del usuario.

---

# iOS

Revisar cuidadosamente:

- instrucciones;
- safe areas;
- icono;
- splash;
- status bar;
- nombre;
- comportamiento fullscreen.

---

# Android

Validar:

- iconos adaptativos;
- manifest;
- shortcuts futuros;
- orientación;
- colores;
- launch experience.

---

# Service Worker

Auditar completamente:

- cache;
- actualización;
- invalidación;
- assets;
- fallback;
- limpieza.

No aumentar agresivamente el cache.

Priorizar consistencia.

---

# Continuidad

Toda restauración debe sentirse invisible.

Nunca mostrar:

"Restaurando..."

Simplemente continuar donde la historia quedó.

---

# Offline

La aplicación debe comportarse con elegancia cuando no exista conexión.

Mostrar únicamente mensajes necesarios.

No llenar la interfaz de advertencias.

---

# Preparación futura

Preparar infraestructura para:

- background sync;
- descarga de historias;
- cache inteligente;
- assets offline.

No implementar todavía.

---

# Fase 11 — Auditoría Global

---

# Objetivo

Antes de cerrar la Etapa 6.8 realizar una auditoría completa del proyecto.

No asumir que el código existente es correcto.

Revisarlo.

---

# Arquitectura

Buscar:

- código duplicado;
- responsabilidades mezcladas;
- helpers muertos;
- imports muertos;
- adapters innecesarios;
- hooks redundantes;
- stores innecesarios;
- providers innecesarios;
- Contexts sin uso;
- componentes duplicados.

Eliminar únicamente aquello cuya eliminación sea completamente segura.

---

# React

Buscar:

- renders evitables;
- memo innecesarios;
- useEffect redundantes;
- dependencias incorrectas;
- callbacks innecesarios;
- estados duplicados.

---

# TypeScript

Buscar:

- any;
- casts innecesarios;
- tipos duplicados;
- contratos débiles;
- unions inconsistentes.

Fortalecer el tipado cuando sea seguro.

---

# Backend

Auditar:

- rutas;
- validaciones;
- errores;
- middlewares;
- autenticación;
- autorización;
- payloads;
- respuestas.

Buscar simplificaciones.

---

# Mongo

Buscar:

- índices faltantes;
- consultas repetidas;
- proyecciones innecesarias;
- lecturas redundantes.

No optimizar prematuramente.

Solo mejoras objetivas.

---

# UX

Recorrer todas las pantallas.

Desktop.

Tablet.

Mobile.

PWA.

Buscar:

- espacios inconsistentes;
- botones fuera de tono;
- cards innecesarias;
- iconografía inconsistente;
- alineaciones;
- scroll extraño;
- loaders excesivos;
- dobles pantallas;
- navegación confusa.

Corregir únicamente cuando exista una mejora objetiva.

---

# Accesibilidad

Revisar:

- teclado;
- focus;
- aria;
- contraste;
- reduced motion;
- tamaños táctiles;
- lectores de pantalla.

---

# Performance

Buscar:

- waterfalls;
- requests repetidos;
- imágenes grandes;
- rerenders;
- cálculos repetidos;
- almacenamiento redundante.

---

# Seguridad

Verificar nuevamente:

- autenticación;
- autorización;
- tokens;
- endpoints públicos;
- sanitización;
- logs;
- información sensible.

---

# Story Packages

Ejecutar nuevamente el Health Check completo.

Todos los Story Packages deben quedar consistentes.

---

# Context Engine

Revisar que ninguna pantalla vuelva a duplicar lógica contextual.

Toda la información contextual debe provenir del Context Engine.

---

# Deuda técnica

Clasificar:

Crítica.

Media.

Baja.

No resolver deuda especulativa.

Solo deuda real.

---

# Commit esperado

chore(polish): platform excellence audit

---

# Criterios de aceptación

La auditoría estará completa cuando:

- el proyecto tenga menos deuda que antes;
- no existan duplicaciones relevantes;
- la arquitectura sea más simple;
- la UX sea más consistente;
- el rendimiento no haya empeorado;
- la accesibilidad haya mejorado;
- todas las pruebas permanezcan verdes.

---

# FIN PARTE 7/10

# PARTE 8/10

# Fase 12 — Validación Integral

---

# Objetivo

Antes de considerar terminada la Etapa 6.8, Alaia deberá demostrar que continúa siendo estable.

No basta con que compile.

Debe demostrar que la experiencia completa permanece consistente.

Toda mejora deberá validarse técnica y funcionalmente.

---

# Filosofía

No declarar éxito por intuición.

No asumir que una funcionalidad sigue funcionando porque no fue modificada.

Verificar.

Siempre verificar.

---

# Validaciones técnicas

Ejecutar todas las suites permitidas por el repositorio.

Como mínimo:

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:react
```

```bash
npm run build
```

```bash
npx playwright test
```

```bash
git diff --check
```

---

# Regla del build

Si existe una regla documentada del proyecto que prohíba ejecutar build después de cambios:

No ejecutar build.

No marcarlo como verde.

No inventar resultados.

Documentar exactamente la razón.

Si no existe esa regla:

Ejecutarlo.

---

# Playwright

No reducir cobertura.

No eliminar navegadores.

No agregar skips.

No esconder fallos.

Si una plataforma falla:

Investigar.

Corregir.

Repetir.

---

# Validación manual

Recorrer completamente el flujo principal.

Como mínimo verificar:

Login

Logout

Creación de viaje

Biblioteca

Portada

Experience

Preparativos

Capítulos

Momentos

Álbum

Favoritos

Notas

Invitaciones

Context Engine

Conversión monetaria

Autocomplete de ciudades

Date Picker

Time Picker

PWA

Offline

Responsive

Back navigation

ReturnTo

Deep Links

Estados vacíos

Errores

ExperienceUnavailable

---

# Validación visual

Revisar:

Desktop

Tablet

360 px

390 px

414 px

430 px

PWA

Safari

Chromium

Firefox

WebKit

---

# Validación editorial

Buscar nuevamente:

- textos inconsistentes
- lenguaje administrativo
- tono diferente
- frases repetidas
- placeholders
- errores ortográficos
- errores gramaticales

Corregir únicamente cuando exista una mejora objetiva.

---

# Validación Context Engine

Verificar que:

Toda conversión monetaria:

- muestre moneda local primero;
- muestre conversión como contexto;
- sobreviva offline;
- sobreviva sin proveedor;
- sobreviva con cache stale.

---

# Validación Story Packages

Ejecutar nuevamente:

Health Check

Quality Score

Metadata

Contexto

Monedas

Media

Timeline

Referencias

---

# Validación PWA

Instalar nuevamente.

Verificar:

- icono
- nombre
- splash
- standalone
- restauración
- continuidad
- service worker
- actualización

---

# Validación de navegación

Recorrer todas las pantallas.

Buscar especialmente:

- pantallas duplicadas
- navegación circular
- botones que no respetan el padre lógico
- dobles loaders
- flashes
- scroll perdido
- back incorrecto

Toda navegación debe sentirse natural.

---

# Validación de rendimiento

Verificar:

No aumentaron:

- requests
- bundles
- payloads
- renders
- tiempos de carga

Cuando exista una mejora simple:

Aplicarla.

---

# Validación de accesibilidad

Confirmar:

- navegación teclado
- foco
- aria
- contraste
- reduced motion
- safe areas

---

# Commit final

Si todas las validaciones quedan completamente verdes:

```text
chore(stage6): finalize Product Polish
```

No realizar push.

No crear tags.

No archivar OpenSpec.

---

# Informe Consolidado Final

No entregar informes parciales.

El informe final deberá contener exactamente:

## 1.

Diagnóstico inicial.

---

## 2.

Resumen de todas las fases ejecutadas.

---

## 3.

Arquitectura final.

---

## 4.

Decisiones mantenidas.

---

## 5.

Decisiones modificadas.

---

## 6.

Justificación de cada mejora importante.

---

## 7.

Story Packages revisados.

---

## 8.

Health Check Engine implementado.

---

## 9.

Context Engine final.

---

## 10.

Metadata inteligente agregada.

---

## 11.

Preparativos inteligentes.

---

## 12.

Estado vivo del viaje.

---

## 13.

Favoritos.

---

## 14.

Notas privadas.

---

## 15.

Información contextual.

---

## 16.

Álbum Premium.

---

## 17.

PWA Premium.

---

## 18.

Microauditoría.

---

## 19.

Archivos creados.

---

## 20.

Archivos modificados.

---

## 21.

Migraciones realizadas.

---

## 22.

Compatibilidad hacia atrás.

---

## 23.

Cobertura de pruebas.

---

## 24.

Resultado exacto de todas las suites.

---

## 25.

Commits creados.

---

## 26.

Riesgos pendientes.

---

## 27.

Deuda técnica restante.

---

## 28.

Recomendaciones para la Etapa 7.

---

## 29.

Key Learnings.

---

## 30.

Confirmación explícita.

Responder únicamente una de estas opciones:

- La Etapa 6.8 queda oficialmente finalizada y Alaia está preparada para iniciar la Etapa 7.

o

- La Etapa 6.8 no puede cerrarse todavía, indicando exactamente qué bloquea el cierre.

---

# Reglas finales

No hacer push.

No crear tags.

No archivar OpenSpec.

No eliminar archivos del usuario.

No modificar assets personales.

No reducir cobertura.

No simplificar pruebas.

No introducir deuda técnica.

No agregar funcionalidades fuera del alcance.

El objetivo no es escribir más código.

El objetivo es que Alaia termine esta etapa sintiéndose como un producto terminado.

---

# FIN PARTE 8/10

# PARTE 9/10

# Anexo A — Criterios de Calidad de Alaia

---

# Objetivo

La Etapa 6.8 no solo debe agregar capacidades.

Debe elevar el estándar completo del producto.

Toda decisión deberá compararse contra estos criterios.

---

# Calidad editorial

Toda pantalla debe poder responder:

¿Por qué existe?

¿Qué emoción transmite?

¿Qué información entrega?

¿Qué acción principal propone?

Si una pantalla no puede responder claramente estas preguntas:

Debe simplificarse.

---

# Calidad visual

Buscar activamente:

- cards innecesarias;
- fondos innecesarios;
- bordes sin propósito;
- sombras excesivas;
- iconos inconsistentes;
- botones duplicados;
- CTA secundarios demasiado llamativos;
- loaders excesivos;
- espacios muertos.

La interfaz debe sentirse liviana.

---

# Calidad de navegación

Recorrer completamente Alaia.

En cada pantalla preguntarse:

¿Existe un único camino lógico hacia adelante?

¿Existe un único camino lógico hacia atrás?

¿El usuario entiende dónde está?

¿Puede perderse?

Eliminar cualquier navegación redundante.

---

# Calidad emocional

Buscar elementos demasiado fríos.

Ejemplos:

"Guardar"

"Enviar"

"Continuar"

"Aceptar"

Evaluar cuidadosamente cuándo una acción puede convertirse en lenguaje editorial.

Nunca exagerar.

Nunca romantizar todo.

Solo cuando tenga sentido.

---

# Calidad técnica

Reducir:

- complejidad ciclomática;
- ramas innecesarias;
- estados duplicados;
- helpers repetidos;
- lógica repetida;
- componentes gigantes.

---

# Calidad React

Buscar:

Componentes con demasiadas responsabilidades.

Hooks excesivamente largos.

Effects encadenados.

Memo innecesarios.

Callbacks innecesarios.

Estados derivados.

Simplificar.

---

# Calidad Backend

Buscar:

Endpoints muy grandes.

Validaciones repetidas.

Errores inconsistentes.

Schemas débiles.

Duplicación.

Consultas repetidas.

---

# Calidad Mongo

Revisar:

Índices.

Consultas.

Proyecciones.

Filtros.

Ordenamientos.

Duplicación de lecturas.

---

# Calidad Story Package

Toda historia debe sentirse curada.

No ensamblada.

Buscar:

- textos repetidos;
- recomendaciones redundantes;
- lugares repetidos;
- horarios inconsistentes;
- moneda incorrecta;
- metadata incompleta.

---

# Calidad UX Mobile

Recorrer nuevamente toda la aplicación únicamente desde perspectiva móvil.

Buscar:

- scrolls incómodos;
- botones demasiado pequeños;
- safe areas;
- overlays;
- sheets;
- teclado;
- pickers;
- focus.

---

# Calidad PWA

La aplicación instalada debe sentirse nativa.

Verificar:

- icono;
- splash;
- transición;
- restauración;
- continuidad.

---

# Calidad Offline

Buscar cualquier flujo que:

- rompa;
- muestre errores técnicos;
- pierda información;
- reinicie estados.

Toda degradación debe ser elegante.

---

# Calidad del Context Engine

Confirmar que ninguna pantalla vuelve a calcular:

- moneda;
- timezone;
- locale;
- idioma;
- sistema métrico.

Toda esa información debe provenir del Context Engine.

---

# Calidad de datos

Todo dato nuevo debe responder:

¿Quién lo crea?

¿Quién lo modifica?

¿Quién lo consume?

¿Dónde vive?

¿Quién es la fuente de verdad?

Si alguna respuesta es ambigua:

Corregir.

---

# Calidad futura

Toda decisión debe responder también:

¿Esta implementación facilitará la Etapa 7?

Si la respuesta es no:

Buscar una solución mejor.

---

# Anexo B — Definición de Producto Terminado

La Etapa 6.8 podrá considerarse terminada únicamente cuando Alaia transmita las siguientes sensaciones:

El usuario nunca siente que está usando una aplicación.

Siente que está entrando nuevamente a su historia.

Nunca siente que debe configurar.

Siente que Alaia ya comprendió el contexto.

Nunca siente que debe aprender a usar la interfaz.

Todo resulta natural.

Nunca siente que la aplicación está incompleta.

Siempre existe un siguiente paso lógico.

Nunca aparecen pantallas administrativas innecesarias.

Nunca aparecen decisiones visuales arbitrarias.

Nunca aparecen contradicciones entre contenido y contexto.

Toda la experiencia se percibe continua.

---

# Checklist final interno

Antes de cerrar la etapa responder internamente:

□ El código es más simple.

□ Hay menos deuda técnica.

□ Hay menos duplicación.

□ El producto es más consistente.

□ Los Story Packages son más ricos.

□ El Context Engine es la única fuente contextual.

□ El Health Check funciona.

□ La navegación es coherente.

□ La UI es más editorial.

□ La PWA se siente más nativa.

□ El álbum representa recuerdos.

□ Favoritos funcionan.

□ Notas funcionan.

□ La información contextual no invade.

□ Todo sigue siendo compatible.

□ Las suites están verdes.

□ No existen regresiones visibles.

Si alguna respuesta es negativa:

No cerrar la etapa.

Resolver primero.

---

# Filosofía final

Nunca olvides que Alaia no vende viajes.

No vende hoteles.

No vende vuelos.

No vende experiencias.

Alaia ayuda a las personas a recordar una parte importante de sus vidas.

Toda decisión de ingeniería debe proteger esa idea.

---

# FIN PARTE 9/10

# PARTE 10/10

# Cierre Oficial de la Etapa 6.8

## Objetivo Final

Al finalizar esta misión, Alaia no debe tener simplemente más funcionalidades.

Debe tener una mejor arquitectura.

Debe tener mejores datos.

Debe tener mejores contratos.

Debe tener una experiencia más coherente.

Debe sentirse como un producto terminado.

No como un MVP.

No como una demo.

No como una aplicación "en desarrollo".

Sino como una plataforma sólida sobre la cual podrá construirse la inteligencia de Alaia durante la Etapa 7.

---

# Criterios Obligatorios de Cierre

La Etapa 6.8 solamente podrá darse por finalizada si TODOS los siguientes puntos son verdaderos.

---

## Arquitectura

- No aumentó la complejidad innecesariamente.
- Se redujo deuda técnica.
- No aparecieron nuevos "helpers" gigantes.
- No aparecieron servicios multipropósito.
- No existen responsabilidades duplicadas.
- El Context Engine continúa siendo la única fuente de verdad contextual.
- El Health Check Engine quedó desacoplado.
- Story Packages mantienen compatibilidad hacia atrás.

---

## Producto

- Alaia se siente más editorial.
- Los preparativos se sienten naturales.
- El estado del viaje acompaña mejor a la historia.
- La información contextual no invade.
- El álbum comienza a representar recuerdos.
- Favoritos y notas se sienten parte del viaje.
- La navegación continúa siendo simple.
- No existen pantallas redundantes.

---

## UX

Todas las pantallas deben revisarse nuevamente.

Buscar especialmente:

- loaders innecesarios
- dobles pantallas
- navegación confusa
- botones administrativos
- cards sin propósito
- espacios muertos
- overlays incómodos
- scroll extraño
- jerarquía inconsistente

Corregir únicamente cuando exista una mejora objetiva.

---

## Mobile

Toda la experiencia debe inspeccionarse nuevamente desde:

- 360 px
- 390 px
- 412 px
- 430 px
- Tablet
- iPhone Safari
- Android Chrome
- PWA instalada

Buscar:

- safe areas
- teclado
- sheets
- scroll
- pickers
- navegación
- overlays
- orientación
- accesibilidad

---

## Accesibilidad

Confirmar nuevamente:

- navegación por teclado
- orden lógico
- foco visible
- aria
- reduced motion
- contraste
- tamaños táctiles
- lectores de pantalla

---

## Performance

Verificar que esta etapa no aumentó:

- tamaño del bundle
- renders
- consultas
- payloads
- consumo de memoria
- tiempos de carga

Cuando exista una mejora sencilla y segura:

Aplicarla.

---

## Seguridad

Confirmar nuevamente:

- autenticación
- autorización
- sanitización
- validaciones
- endpoints públicos
- Context Engine
- Story Packages
- invitaciones
- notas privadas
- favoritos

No introducir nuevas superficies de ataque.

---

# Pruebas Finales

Ejecutar todas las suites permitidas.

## TypeScript

```bash
npm run typecheck
```

---

## Backend

```bash
npm test
```

---

## React

```bash
npm run test:react
```

---

## Build

```bash
npm run build
```

Solo ejecutarlo si las reglas del repositorio lo permiten.

Nunca declarar un build exitoso si no fue ejecutado.

---

## Playwright

```bash
npx playwright test
```

No reducir cobertura.

No eliminar navegadores.

No utilizar skips para ocultar fallos.

---

## Git

```bash
git diff --check
```

El resultado debe quedar limpio.

---

# Commits

Trabajar por fases internas.

Cada fase debe quedar completamente verde antes de crear su commit.

Al finalizar deberá existir una historia Git limpia, entendible y coherente.

No generar commits enormes sin significado.

Los mensajes deberán reflejar claramente cada bloque funcional.

Ejemplo:

```text
fix(content): normalize editorial story packages

feat(context): extend contextual travel engine

feat(health): introduce Story Package Health Check

feat(story): enrich story intelligence metadata

feat(preparation): introduce intelligent travel preparation

feat(memory): add favorites and private notes

feat(album): evolve memories and contextual information

feat(pwa): improve continuity and restoration

chore(polish): complete platform excellence audit

chore(stage6): finalize product polish
```

No hacer squash.

No reescribir historia.

No hacer push.

---

# Git

Antes de finalizar revisar:

```bash
git status --short
```

Confirmar que únicamente permanezcan fuera del staging aquellos archivos que realmente deban permanecer locales.

Nunca eliminar archivos personales del usuario.

---

# Informe Final

No entregar informes por fase.

Entregar un único informe consolidado.

Debe contener exactamente:

## 1.

Diagnóstico inicial.

---

## 2.

Problemas encontrados.

---

## 3.

Decisiones mantenidas.

---

## 4.

Decisiones modificadas.

---

## 5.

Arquitectura final.

---

## 6.

Health Check Engine.

---

## 7.

Context Engine.

---

## 8.

Story Intelligence Metadata.

---

## 9.

Preparativos Inteligentes.

---

## 10.

Estado Vivo del Viaje.

---

## 11.

Favoritos.

---

## 12.

Notas Privadas.

---

## 13.

Información Contextual.

---

## 14.

Álbum Premium.

---

## 15.

PWA Premium.

---

## 16.

Microauditoría.

---

## 17.

Archivos creados.

---

## 18.

Archivos modificados.

---

## 19.

Migraciones.

---

## 20.

Compatibilidad.

---

## 21.

Cobertura de pruebas.

---

## 22.

Resultados exactos de:

- TypeScript
- Backend
- React
- Build
- Playwright
- git diff --check

---

## 23.

Commits creados.

---

## 24.

Riesgos pendientes.

---

## 25.

Deuda técnica restante.

Clasificarla en:

- Crítica
- Media
- Baja

---

## 26.

Recomendaciones para la Etapa 7.

No implementar.

Solo recomendar.

---

## 27.

Key Learnings.

Explicar qué aprendizajes dejó esta etapa desde el punto de vista:

- arquitectura
- producto
- UX
- datos
- Story Packages
- Context Engine
- PWA
- continuidad

---

## 28.

Veredicto Final.

Responder únicamente una de las siguientes opciones:

### Opción A

"La Etapa 6.8 queda oficialmente finalizada.

Alaia está preparada para iniciar la Etapa 7."

---

### Opción B

"La Etapa 6.8 no puede cerrarse todavía."

En ese caso indicar exactamente:

- qué bloquea el cierre;
- por qué;
- cuál sería la solución;
- qué pruebas faltan;
- qué riesgo implica avanzar sin resolverlo.

---

# Principio Final

Nunca olvides el propósito de Alaia.

No estamos construyendo una aplicación para organizar viajes.

Estamos construyendo un lugar al que las personas volverán años después para recordar una parte importante de sus vidas.

Cada decisión de ingeniería debe proteger esa promesa.

Si en algún momento dudas entre una solución técnicamente correcta y una solución que preserve mejor la experiencia humana, busca una tercera opción que consiga ambas.

Ese es el estándar esperado para Alaia.

---

# Fin del documento

Este documento constituye la especificación oficial de la **Etapa 6.8 — Product Polish & Platform Excellence**.

Su aprobación implica el inicio de la última etapa de consolidación antes de la Etapa 7 (Intelligence).

No realizar push.

No crear tags.

No archivar OpenSpec.

No comenzar la Etapa 7 hasta completar satisfactoriamente todos los criterios definidos en este documento.

# FIN PARTE 10/10

---

# Anexo C — Design Review 1.0

## Objetivo

Antes de declarar oficialmente terminada la Etapa 6.8, realizar una revisión completa del producto desde la perspectiva de una persona que nunca ha usado Alaia.

Esta revisión no busca encontrar bugs.

No busca revisar arquitectura.

No busca revisar cobertura.

Busca responder una única pregunta:

> **¿Esto realmente se siente como Alaia?**

Toda decisión durante esta revisión deberá priorizar la percepción del usuario por sobre la implementación técnica.

---

# Filosofía

La mayoría de los problemas de un producto no son bugs.

Son pequeñas fricciones.

Son pequeñas inconsistencias.

Son pequeños detalles que, acumulados, hacen que la experiencia deje de sentirse premium.

Esta revisión existe para encontrar precisamente esos detalles.

---

# Forma de trabajo

Recorrer Alaia completa.

Como si fuera la primera vez.

Sin mirar el código.

Sin pensar en componentes.

Sin pensar en tickets.

Sin pensar en arquitectura.

Solo experimentar el producto.

Cada vez que algo haga pensar:

"esto se siente raro"

"esto se siente tosco"

"esto rompe el ritmo"

"esto parece administrativo"

"esto no parece Alaia"

detenerse.

Analizar.

Buscar la causa.

Corregir únicamente cuando exista una mejora objetiva.

---

# Qué revisar

## Identidad

¿Toda la aplicación transmite la misma personalidad?

¿Existe alguna pantalla que parezca pertenecer a otro producto?

---

## Microcopy

Buscar:

- frases frías;
- frases demasiado técnicas;
- frases repetidas;
- CTA inconsistentes;
- textos administrativos;
- mensajes innecesarios.

Todo debe sentirse humano.

---

## Navegación

Recorrer absolutamente todas las pantallas.

Buscar:

- pasos innecesarios;
- pantallas duplicadas;
- loaders repetidos;
- dobles transiciones;
- back incorrectos;
- caminos sin salida;
- navegación circular.

Cada pantalla debe tener un padre lógico.

Siempre.

---

## Ritmo

La aplicación debe respirar.

Buscar:

pantallas demasiado cargadas.

pantallas demasiado vacías.

transiciones demasiado rápidas.

transiciones demasiado lentas.

silencios incómodos.

---

## Tipografía

Revisar:

jerarquías.

pesos.

espaciados.

interlineado.

alineaciones.

Todo debe sentirse consistente.

---

## Espaciado

Buscar:

elementos demasiado juntos.

espacios muertos.

cards innecesarias.

contenedores redundantes.

márgenes inconsistentes.

---

## Color

Buscar:

elementos que llamen demasiado la atención.

colores inconsistentes.

botones demasiado agresivos.

badges innecesarios.

---

## Iconografía

Todos los iconos deben hablar el mismo idioma visual.

Eliminar:

iconos decorativos.

iconos repetidos.

iconos ambiguos.

---

## Motion

Revisar:

fade.

slide.

opening.

transiciones.

hover.

focus.

Todo movimiento debe tener un propósito.

Nunca animar únicamente porque es posible hacerlo.

---

## Mobile

Recorrer toda la aplicación únicamente en móvil.

Preguntarse constantemente:

¿Esto realmente se siente como una aplicación premium?

No como una web adaptada.

---

## PWA

Abrir únicamente la versión instalada.

Buscar:

continuidad.

restauración.

fluidez.

consistencia.

---

## Storytelling

Cada pantalla debe responder:

¿Qué historia estoy ayudando a contar?

Si la respuesta es:

"Ninguna."

Entonces probablemente esa pantalla necesite simplificarse.

---

## Coherencia emocional

Todo Alaia debe transmitir exactamente la misma personalidad.

Nunca debe sentirse que una pantalla fue construida por otro equipo.

Nunca debe sentirse un cambio brusco de tono.

---

# Criterio de aprobación

La Design Review solamente podrá darse por aprobada cuando, al recorrer toda Alaia de principio a fin, no existan momentos que provoquen pensamientos como:

- "esto todavía parece un MVP";
- "esto parece una pantalla administrativa";
- "esto rompe el ritmo";
- "esto no parece Alaia";
- "esto quedó a medio terminar";
- "esto necesita otra iteración".

La sensación final debe ser:

> **"Alaia se siente como un producto terminado."**

---

# Mejora continua

Si durante esta revisión aparecen oportunidades pequeñas de mejora que:

- no cambian la arquitectura;
- no amplían el alcance;
- no agregan deuda técnica;
- mejoran objetivamente la percepción del producto;

implementarlas inmediatamente.

No abrir tickets para detalles que puedan resolverse de forma segura en ese momento.

---

# Cierre definitivo

Solo después de completar exitosamente:

- todas las fases anteriores;
- todas las validaciones;
- toda la Design Review;

Claude podrá declarar oficialmente:

> **La Etapa 6.8 queda completamente finalizada.**

A partir de ese momento Alaia deberá considerarse lista para comenzar la **Etapa 7 — Intelligence**, con una base sólida, coherente, editorial y preparada para evolucionar sin comprometer la calidad del producto.

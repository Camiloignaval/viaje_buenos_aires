# DOMAIN_MODEL.md

**Autor:** Lead Software Architect
**Alcance:** Modelo conceptual del dominio de Aurora. Sin código, sin arquitectura técnica, sin stack.
**Estado:** Para discusión — precede a cualquier decisión de arquitectura técnica.

---

## Criterio de diseño

Antes de listar dominios, fijo el criterio con el que decidí separar, fusionar o descartar cada uno: **un dominio existe si tiene una razón propia para cambiar**, administra información que nadie más debería administrar, y puede describirse sin mencionar cómo lo usan los demás. Si dos conceptos siempre cambian juntos y por la misma razón, son el mismo dominio aunque tengan nombres distintos. Si un concepto es solo una pantalla que combina información de otros dominios, no es un dominio — es una vista.

Con ese criterio, fusioné algunos candidatos que me diste, separé otros, y descarté dos por completo. Lo justifico en cada caso.

---

## 1. Story Package

**Responsabilidad:** Ser la fuente única de verdad del contenido de una historia: capítulos, actividades sugeridas, lugares, presupuesto, checklist, cumpleaños/hito especial, carta final, configuración narrativa.

**Problema que resuelve:** Que ninguna otra parte del sistema necesite saber qué es "Buenos Aires" para funcionar. Sin este dominio, el contenido y el motor son la misma cosa — que es exactamente el problema que tiene el código actual hoy.

**Información que administra:** Metadata de la historia (destino, fechas, protagonistas), estructura de capítulos, actividades sugeridas por capítulo, lugares (restaurantes, cafeterías, puntos de interés), presupuesto de referencia, checklist de preparación, definición del capítulo especial (cumpleaños/aniversario), carta final, mood asignado.

**Eventos que produce:** `StoryPackagePublicado`, `StoryPackageActualizado`.

**Eventos que consume:** Ninguno. Es un dominio de **contenido**, no de **comportamiento** — no reacciona a nada, solo es leído.

**Depende de:** Nada. Es la base sobre la que se apoya todo lo demás.

**Nunca debería conocer la existencia de:** el viajero, su progreso, sus memorias, su ubicación, notificaciones, sincronización, ni el mecanismo de acceso. Un Story Package debe poder describirse completamente sin saber que alguien lo está viviendo.

---

## 2. Story Engine

**Responsabilidad:** Decidir, en cada instante, **qué parte de la historia corresponde mostrar ahora** — es la pieza que interpreta "dónde está el viajero en su historia" y responde con "esto es lo que ve".

**Problema que resuelve:** Sin este dominio, la lógica de "qué mostrar" quedaría dispersa en cada pantalla, acoplada al contenido específico de un viaje (que es, otra vez, el problema actual).

**Información que administra:** Ninguna información propia y persistente — es un dominio de **orquestación**, no de datos. Su "estado" es el resultado de combinar Story Package + Story Progress + Story Mood en el momento de la consulta.

**Eventos que produce:** Ninguno propiamente — es un lector/orquestador, no un emisor de hechos de negocio.

**Eventos que consume:** Todos los eventos de `Story Progress` (para saber qué capítulo mostrar) y los cambios de `Story Mood` (para saber con qué tono narrarlo).

**Depende de:** Story Package, Story Progress, Story Mood.

**Nunca debería conocer la existencia de:** Media Storage, Sincronización, Notification Engine, Story Access, Story Profiling, Admin/Story Authoring. El Story Engine no sabe cómo se guardó una foto ni cómo llegó el viajero a la historia — solo sabe interpretar el momento narrativo actual.

---

## 3. Story Progress (incluye la máquina de estados de capítulos)

**Decisión de diseño:** No separo "Chapter State Machine" como dominio propio. La máquina de estados **es** la regla de negocio central de Story Progress — separarlas dejaría un dominio con datos sin comportamiento y otro con comportamiento sin datos, el antipatrón clásico de "modelo anémico". Van juntas.

**Responsabilidad:** Ser la única fuente de verdad de **en qué punto de la historia está un viajero concreto**: qué capítulo está bloqueado, disponible, iniciado o finalizado; si ya llegó al capítulo especial; si ya entró en modo memoria; si ya vivió un aniversario.

**Problema que resuelve:** Evita que el bloqueo/desbloqueo de capítulos se decida "a ojo" en la interfaz (que es la situación actual: hoy no existe ninguna lógica de bloqueo por fecha). Centraliza la única regla que de verdad no se puede violar: la secuencialidad.

**Información que administra:** Estado de cada capítulo por viajero, fecha/hora de apertura y cierre de cada capítulo, transiciones válidas, condición de desbloqueo del capítulo especial.

**Eventos que produce:** `CapituloDesbloqueado`, `CapituloIniciado`, `CapituloFinalizado`, `CapituloEspecialDesbloqueado`, `HistoriaEntroEnModoMemoria`, `AniversarioAlcanzado`.

**Eventos que consume:** `MemoriaCapturada` (para saber que un capítulo tiene contenido asociado), señales de tiempo (cambio de fecha/día), y la acción explícita del viajero de cerrar un capítulo.

**Depende de:** Story Package (para saber cuántos capítulos existen y sus condiciones de desbloqueo definidas por el autor). No depende de nada más.

**Nunca debería conocer la existencia de:** Media Storage, Notification Engine, Story Mood, Story Profiling, Story Authoring. El progreso de un viaje no necesita saber cómo se ve, cómo se notifica, ni cómo se creó la historia.

---

## 4. Memory Engine (Foto + Video + Nota fusionados)

**Decisión de diseño:** Confirmando lo que ya definiste — Foto, Video y Nota **no son dominios**, son formas que puede tomar un mismo concepto: la **Memoria**. Separarlos como dominios independientes fuerza a triplicar reglas idénticas (contexto, favorito, ubicación, fecha) que en realidad pertenecen a un único concepto de negocio.

**Responsabilidad:** Capturar, describir y proteger cada recuerdo que el viajero registra durante un capítulo: sus fotos, videos, notas, ubicación, fecha y si es favorito.

**Problema que resuelve:** Que el acto de "guardar un recuerdo" sea una sola operación de negocio, consistente, sin importar si el viajero sacó una foto, grabó un video, escribió una nota, o las tres cosas juntas.

**Información que administra:** Cada Memoria: a qué actividad/capítulo pertenece, qué medios contiene (0 o más fotos, 0 o más videos), su nota asociada (opcional), ubicación (opcional), fecha/hora, si está marcada como favorita, si fue archivada.

**Eventos que produce:** `MemoriaCapturada`, `MemoriaMarcadaFavorita`, `MemoriaArchivada`.

**Eventos que consume:** Ninguno de otros dominios de negocio — reacciona directamente a la acción del viajero. Sí depende de confirmaciones técnicas de custodia (ver Media Storage y Sincronización) para saber si una memoria quedó verdaderamente a salvo.

**Depende de:** Media Storage (para la custodia física de fotos/video), Sincronización (para garantizar que nunca se pierda un recuerdo).

**Nunca debería conocer la existencia de:** Story Mood, Notification Engine, Story Profiling, Story Access, Album Engine. Memory Engine solo sabe capturar y proteger — no sabe cómo se van a mostrar esos recuerdos después ni con qué tono.

---

## 5. Album Engine

**Responsabilidad:** Ensamblar las Memorias capturadas en una narrativa coherente para revivirlas — el álbum, la timeline convertida en "máquina del tiempo", el recorrido de "Revivir viaje".

**Problema que resuelve:** Separa "capturar un recuerdo" (Memory Engine) de "presentar los recuerdos como una historia" (Album Engine). Son responsabilidades distintas: la primera ocurre durante el viaje bajo presión de tiempo real; la segunda ocurre después, con calma, y puede reinterpretarse con el tiempo (por ejemplo, priorizar qué recuerdos destacar en un aniversario).

**Información que administra:** No es dueño de las Memorias — las **proyecta**. Administra el orden narrativo de presentación, agrupaciones por capítulo/acto, y qué se destaca en cada revisión (ej. "mejor foto", "mejor momento").

**Eventos que produce:** Ninguno relevante para otros dominios — es principalmente un consumidor/lector.

**Eventos que consume:** `MemoriaCapturada`, `MemoriaMarcadaFavorita`, `HistoriaEntroEnModoMemoria`, `AniversarioAlcanzado`.

**Depende de:** Memory Engine, Story Progress, Story Package (para la estructura narrativa de capítulos/actos).

**Nunca debería conocer la existencia de:** Story Access, Traveler Identity, Notification Engine, Story Profiling, Media Storage (no le importa cómo se guardó el archivo, solo cómo se presenta).

---

## 6. Story Mood

**Responsabilidad:** Definir la "personalidad emocional" con la que se narra una historia (Romantic, Family, Friends, etc.) y las reglas de tono que de ahí se derivan.

**Problema que resuelve:** Permite que el mismo motor narrativo suene distinto según el tipo de viaje, sin tocar ni un dato de negocio. Es, en términos de diseño, un dominio puramente de **configuración de tono**, no de contenido ni de reglas.

**Información que administra:** Catálogo de moods disponibles, reglas de tono/copy por mood, mood primario/secundario/de apoyo asignado a una historia.

**Eventos que produce:** `MoodAsignado`, `MoodActualizado`.

**Eventos que consume:** `StoryProfileGenerado` (para recibir una sugerencia de mood, no una imposición — la decisión final la valida Story Authoring).

**Depende de:** Nada estructuralmente — es un catálogo autocontenido.

**Nunca debería conocer la existencia de:** Story Progress, Memory Engine, Sincronización, Media Storage, Location Awareness. El tono no debe tener ni idea de en qué capítulo está el viajero ni de cómo se guardan sus datos.

---

## 7. Story Profiling

**Responsabilidad:** Traducir las respuestas de un formulario de un futuro viajero en un perfil estructurado (relación, ocasión, ritmo, intereses) que sirva de insumo para crear su historia.

**Problema que resuelve:** Evita preguntarle directamente al usuario "¿qué mood querés?" — nadie piensa así. Este dominio existe exclusivamente para inferir intención a partir de señales indirectas.

**Información que administra:** Story Request (respuestas crudas del formulario), Story Profile (estructura derivada), sugerencia de mood resultante.

**Eventos que produce:** `StoryProfileGenerado`.

**Eventos que consume:** `SolicitudDeHistoriaRecibida` (la única entrada, disparada quiere crear una historia).

**Depende de:** Nada más que la solicitud misma.

**Nunca debería conocer la existencia de:** Story Progress, Memory Engine, Notification Engine, Media Storage, Location Awareness. Este dominio solo existe **antes** de que la historia empiece a vivirse — no debe mezclarse con nada de lo que ocurre durante el viaje.

---

## 8. Story Authoring (Story Curator hoy, Aurora Studio mañana)

**Decisión de diseño:** Trato "Story Curator" y "Aurora Studio" como **el mismo dominio en distintos grados de automatización**, no como dos dominios distintos. La responsabilidad de negocio —"convertir un perfil en un Story Package publicable, con supervisión humana"— no cambia; lo que cambia es cuánta de esa supervisión es manual (hoy) o asistida por herramienta (Aurora Studio, mañana). Modelarlos como dominios separados obligaría a migrar datos y contratos el día que se automatice, cuando en realidad es una evolución de madurez, no un cambio de responsabilidad.

**Responsabilidad:** Revisar, ajustar y aprobar la creación de un Story Package a partir de un Story Profile, antes de que quede disponible para un viajero.

**Problema que resuelve:** Garantiza que ninguna historia se publique sin criterio humano detrás — es la salvaguarda de calidad y de la filosofía de marca.

**Información que administra:** Estado de revisión de una historia en construcción (pendiente, en edición, aprobada, publicada), historial de ajustes hechos al perfil o al mood sugerido.

**Eventos que produce:** `StoryPackagePublicado` (dispara la existencia del dominio #1), `StoryProfileAjustado`.

**Eventos que consume:** `StoryProfileGenerado`, `MoodAsignado`.

**Depende de:** Story Profiling, Story Mood.

**Nunca debería conocer la existencia de:** Story Progress, Memory Engine, Album Engine, Notification Engine, Location Awareness, Sincronización. Curar una historia no requiere saber nada de cómo se vive después.

---

## 9. Traveler Identity

**Responsabilidad:** Saber **quién** está viviendo una historia, y —a futuro— qué historias pertenecen a esa persona (su biblioteca de viajes).

**Problema que resuelve:** Hoy no existe realmente este dominio (v1 usa una contraseña compartida, no identidad). Pero es indispensable para el futuro "Aurora deja de ser la app de un viaje, se convierte en la biblioteca de una vida": sin una identidad estable, no hay forma de agrupar múltiples historias bajo la misma persona.

**Información que administra:** Identidad del viajero, lista de historias a las que tiene acceso.

**Eventos que produce:** `ViajeroRegistrado`, `HistoriaAgregadaABiblioteca`.

**Eventos que consume:** `AccesoAHistoriaConcedido`.

**Depende de:** Nada estructuralmente.

**Nunca debería conocer la existencia de:** Story Progress, Memory Engine, Story Mood, Notification Engine, Media Storage. La identidad no necesita saber nada del contenido ni del comportamiento dentro de una historia — solo qué historias posee.

---

## 10. Story Access (incluye invitación/QR)

**Decisión de diseño:** Fusiono "Invitation/QR" dentro de Story Access — la invitación es simplemente **un mecanismo** de entrada, no un dominio con reglas propias distintas a "¿este viajero puede entrar a esta historia?".

**Responsabilidad:** Decidir si un viajero concreto puede entrar a una historia concreta, y por qué medio (QR, link, invitación).

**Problema que resuelve:** Separa "quién es el viajero" (Traveler Identity) de "qué tiene permitido abrir" (Story Access) — son preguntas distintas y cambian por razones distintas (una identidad es estable; un permiso de acceso puede revocarse, expirar, o ser puntual).

**Información que administra:** Mecanismos de invitación válidos, estado de cada invitación (usada, pendiente, expirada), relación viajero↔historia autorizada.

**Eventos que produce:** `AccesoAHistoriaConcedido`.

**Eventos que consume:** `StoryPackagePublicado` (una historia solo puede empezar a otorgar accesos una vez publicada).

**Depende de:** Traveler Identity, Story Package (solo su existencia/identificador, no su contenido).

**Nunca debería conocer la existencia de:** Story Progress, Memory Engine, Story Mood, Notification Engine, Album Engine. El acceso es una decisión binaria de entrada, no le incumbe nada de lo que pasa después.

---

## 11. Notification Engine

**Responsabilidad:** Decidir qué, cuándo y con qué prioridad se comunica algo al viajero, respetando límites estrictos (nunca más de una notificación push por día, nunca en horario de descanso, nunca si ya abrió la app).

**Problema que resuelve:** Sin un dominio dedicado, la lógica de "cuándo interrumpir a alguien" quedaría dispersa y sería fácil de violar accidentalmente con una notificación de más — justo lo que la filosofía de Aurora prohíbe explícitamente.

**Información que administra:** Reglas de prioridad entre tipos de evento, calendario de comunicación pre-viaje, historial de notificaciones ya enviadas (para no repetir en el día).

**Eventos que produce:** `NotificacionEnviada`.

**Eventos que consume:** `CapituloDesbloqueado`, `CapituloEspecialDesbloqueado`, `AniversarioAlcanzado`, `ProximidadDetectada`.

**Depende de:** Story Progress, Location Awareness, Settings (para horarios/preferencias del viajero).

**Nunca debería conocer la existencia de:** Media Storage, Album Engine, Story Authoring, Story Profiling, Memory Engine. No necesita saber contenido de recuerdos ni cómo se construyó la historia — solo reacciona a hechos ya ocurridos en otros dominios.

---

## 12. Location Awareness

**Responsabilidad:** Detectar cuándo el viajero está físicamente cerca de un lugar relevante de su historia ("momentos cercanos") y generar esa señal — sin decidir qué hacer con ella.

**Problema que resuelve:** Separa "saber que estoy cerca de algo" de "avisarle a alguien sobre eso" (que es responsabilidad de Notification Engine). Esto evita que la lógica geográfica se mezcle con la lógica de comunicación.

**Información que administra:** Lugares relevantes de la historia actual (leídos de Story Package) y proximidad detectada en tiempo real.

**Eventos que produce:** `ProximidadDetectada`.

**Eventos que consume:** Ninguno de negocio — solo lee posición del dispositivo (una capacidad externa, no un dominio de Aurora) y la contrasta contra Story Package.

**Depende de:** Story Package (lugares relevantes).

**Nunca debería conocer la existencia de:** Memory Engine, Story Progress, Story Authoring, Story Profiling, Notification Engine (produce la señal, pero no sabe ni le importa qué hace Notification Engine con ella).

---

## 13. Synchronization (incluye Offline Storage)

**Decisión de diseño:** Fusiono "Offline Storage" dentro de Sincronización. Guardar localmente y reconciliar con el resto del sistema son, en el fondo, **la misma responsabilidad de negocio**: garantizar que ningún recuerdo ni progreso se pierda sin importar la conectividad. Separarlos en dos dominios obligaría a coordinar dos fuentes de verdad sobre el mismo hecho ("¿está guardado o no?").

**Responsabilidad:** Garantizar que ninguna acción del viajero (capturar una memoria, cerrar un capítulo) se pierda, sin importar si hay conexión o no, y sin bloquear nunca la experiencia.

**Problema que resuelve:** Es la promesa central "nunca perder un recuerdo" — sin este dominio, esa promesa depende de la suerte de la red.

**Información que administra:** Estado de sincronización de cada pieza de información pendiente (local únicamente, pendiente de enviar, sincronizada, en error recuperable).

**Eventos que produce:** `SincronizacionCompletada`, `SincronizacionFallidaRecuperable`.

**Eventos que consume:** Cualquier hecho de negocio que necesite persistirse (`MemoriaCapturada`, `CapituloFinalizado`, etc.) — pero los trata como **datos opacos**, no como conceptos de negocio.

**Depende de:** Media Storage (para saber si el contenido pesado quedó a salvo).

**Nunca debería conocer la existencia de:** Story Mood, Notification Engine, Album Engine, Story Profiling, Location Awareness. Sincronización no debe entender el _significado_ de lo que guarda — solo debe garantizar que llegue a salvo. Este desconocimiento deliberado es lo que le permite servir a todos los demás dominios sin volverse un cuello de botella acoplado.

---

## 14. Media Storage

**Responsabilidad:** Custodiar de forma segura y durable los archivos pesados (fotos, videos) que produce una Memoria.

**Problema que resuelve:** Aísla "cómo se guarda un archivo binario de forma confiable" de "qué significa ese archivo para la historia". Es, deliberadamente, el dominio más "ciego" de todos.

**Información que administra:** Referencias a archivos y su estado de custodia (subido, confirmado, perdido/por reintentar). No administra ningún significado narrativo.

**Eventos que produce:** `ArchivoCustodiado`, `ArchivoConCustodiaFallida`.

**Eventos que consume:** Solicitudes de custodia provenientes de Memory Engine (a través de Sincronización).

**Depende de:** Nada — es una capacidad de soporte pura.

**Nunca debería conocer la existencia de: absolutamente ningún otro dominio de negocio.** Ni "Memoria", ni "Capítulo", ni "Historia" deberían ser conceptos que Media Storage entienda. Si este dominio necesita saber qué es un capítulo para funcionar, algo está mal diseñado.

---

## 15. Settings

**Responsabilidad:** Guardar las preferencias del viajero que no son parte de la historia en sí (idioma, preferencias de notificación, ajustes de accesibilidad).

**Problema que resuelve:** Evita que preferencias personales del viajero contaminen el Story Package (que debe seguir siendo igual para cualquiera que viva esa historia).

**Información que administra:** Preferencias individuales del viajero.

**Eventos que produce:** `PreferenciaActualizada`.

**Eventos que consume:** Ninguno.

**Depende de:** Traveler Identity (las preferencias pertenecen a alguien).

**Nunca debería conocer la existencia de:** Story Package, Story Progress, Memory Engine, Album Engine. Las preferencias son transversales a cualquier historia, no específicas de una.

---

## 16. Maps — capacidad de soporte, no dominio central

No lo elevo a dominio propio. Los mapas no administran información de negocio propia: las coordenadas y lugares ya viven en Story Package, y las ubicaciones de recuerdos ya viven en Memory Engine. "Maps" es una **capacidad de presentación** que lee de ambos para dibujar algo — tratarlo como dominio inflaría el modelo sin necesidad. Queda mencionado aquí para que quede explícito que fue una decisión, no un olvido.

---

## 17. Admin Panel — no es un dominio

El Admin Panel **no administra ninguna información propia**: es una interfaz que le da forma humana a capacidades que ya pertenecen a Story Authoring y a Story Access (y, en modo lectura, a Story Progress para monitoreo). Modelarlo como dominio sería confundir "una pantalla" con "una responsabilidad de negocio". Esta distinción importa: si algún día Aurora Studio reemplaza al panel actual, no cambia ningún dominio — solo cambia la interfaz sobre los mismos dominios.

---

## 18. Analytics — descartado como dominio, con una salvedad acotada

No creo un dominio de "Analytics" clásico (dashboards, funnels, métricas de retención) porque **contradice directamente la filosofía del producto**: el manifiesto rechaza explícitamente mostrar estadísticas "por orgullo" y el principio de diseño prohíbe convertir a Aurora en una herramienta de medición.

Sí reconozco una necesidad legítima y mucho más acotada: **señales de comportamiento** (qué lugares visita más, qué favoritos marca) que alimenten, a futuro, el aprendizaje opcional de Story Profiling (mencionado en la documentación como mejora futura) y las notificaciones inteligentes. Esa capacidad no merece ser un dominio de "Analytics" — es un insumo interno de Story Profiling y Notification Engine, nunca una pantalla ni un reporte expuesto al viajero. Si en el futuro se necesita más que eso, debe ser una decisión de producto explícita, no una consecuencia de haber modelado el dominio de forma genérica "por si acaso".

---

## Mapa de dependencias (resumen)

```
Story Profiling → Story Authoring → Story Package → Story Engine ← Story Progress ← Story Access ← Traveler Identity
                        ↑                                 ↑              ↑
                    Story Mood ──────────────────────────┘         (invitación/QR)

Story Progress → Notification Engine ← Location Awareness
Story Progress → Memory Engine → Album Engine
Memory Engine → Synchronization → Media Storage
Traveler Identity → Settings → Notification Engine
```

La regla que sostiene todo el mapa: **las flechas nunca vuelven hacia atrás en más de un salto**, y ningún dominio de contenido (Story Package, Story Mood) apunta hacia un dominio de comportamiento (Progress, Memory, Notification). Eso es lo que permite que el contenido cambie sin tocar el comportamiento, y que el comportamiento evolucione sin tocar el contenido.

---

## Future Vision

Hoy Aurora vive un único Story Package (Buenos Aires 2026), pero el modelo de dominio de arriba está diseñado para que **agregar la historia número 1.000 sea un acto de contenido, no de ingeniería**. Así es como escala:

- **Story Package es el único contrato entre "contenido" y "motor".** Ningún dominio de comportamiento (Engine, Progress, Memory, Album, Notification) contiene una sola regla específica de Buenos Aires — todos leen del Story Package como una entrada genérica. Una historia nueva es, conceptualmente, solo _otra instancia_ de ese contrato.

- **Story Progress, Memory Engine y Album Engine son instanciados por historia, no compartidos.** Cada viajero avanzando en cada historia tiene su propio progreso y sus propias memorias — el modelo ya lo asume porque Story Progress depende de Story Package, no al revés. Miles de historias corriendo en paralelo no es un caso especial, es el caso normal.

- **Traveler Identity + Story Access son la bisagra hacia "biblioteca de una vida".** El día que una persona tenga Buenos Aires 2026, Bariloche 2027 y Japón 2032, no hace falta ningún concepto nuevo: es la misma identidad con múltiples accesos concedidos, cada uno apuntando a un Story Package distinto.

- **Story Mood y Story Profiling escalan horizontalmente sin tocar el motor.** Agregar un mood nuevo (por ejemplo, "viaje con niños") es agregar una entrada al catálogo de Story Mood — el Story Engine nunca necesita enterarse de que existe un mood nuevo, porque solo consume el que ya fue asignado.

- **Story Authoring puede madurar de humano-manual a Aurora Studio automatizado sin romper nada río abajo**, porque el resto del sistema no depende de _cómo_ se creó un Story Package, solo de que exista uno publicado con la forma correcta.

- **Media Storage y Sincronización escalan por volumen, no por lógica nueva.** Como deliberadamente no saben qué es una "historia" o un "capítulo", mil historias no son mil casos distintos para ellos — son la misma operación repetida mil veces.

El principio detrás de todo esto es el mismo que sostiene el resto del documento: **cuanto menos sabe un dominio de los demás, más fácil es multiplicar el sistema sin multiplicar la complejidad.** Esa es la apuesta de diseño que hace posible pasar de un viaje a una plataforma sin reescribir el corazón de Aurora en el camino.

---

_Sin código, sin arquitectura técnica, sin stack. A la espera de tu revisión antes de pasar a diseño técnico._

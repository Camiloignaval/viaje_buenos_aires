# UNDERSTANDING_REPORT.md

**Autor:** Lead Software Architect / Lead Frontend Engineer
**Alcance:** Lectura completa de los 18 documentos de `app/documentacion`
**Estado:** Pendiente de aprobación — no se ha escrito código ni propuesto arquitectura

---

## 1. Qué entendí del proyecto

Aurora **no es una app de viajes**. Es un **motor narrativo** que transforma un viaje real en una experiencia de lectura progresiva, con un ciclo de vida que empieza antes del viaje y **nunca termina**:

```
PRE_TRIP → TRAVEL (día a día) → CUMPLEAÑOS → MEMORY MODE → ANIVERSARIOS → FOREVER
```

Cada día del viaje es un **capítulo bloqueado por tiempo y por secuencia** (no se accede al día 3 sin haber cerrado el día 2, ni aunque la fecha ya lo permita). La interfaz nunca debe sentirse como "una aplicación": nada de progreso porcentual, nada de errores técnicos, nada de gamificación, nada de urgencia. Todo el vocabulario de UI está deliberadamente reemplazado (Archivo → Recuerdo, Eliminar → "¿Seguro que quieres despedirte de este recuerdo?").

Existe también una **capa de negocio/producto** (formulario → Story Request → Story Profiling Engine → Story Mood → IA → Story Curator humano → Story Package → publicación) pensada para que Aurora escale de "el viaje de Kari" a una **plataforma multi-historia** (Bariloche, Europa, Japón...).

**El origen real importa**: Aurora nació como un regalo de cumpleaños de Camilo para Kari (viaje a Buenos Aires, julio 2026), no como un producto comercial planificado. Eso explica por qué el corpus tiene dos capas superpuestas que **no siempre coinciden**: la especificación *genérica* del motor (doc 14-17) y la especificación *literal* del viaje real (docs 07, 08, 11, 13), escrita con fechas y nombres propios hardcodeados.

## 2. Cuál creo que es el verdadero objetivo de Aurora

No es "documentar un viaje". Es **maximizar la probabilidad de que, dentro de 10 años, alguien vuelva a abrir la app y sienta lo mismo que sintió ese día**.

Todo el diseño de producto está subordinado a una sola pregunta operativa, repetida en varios documentos con distintas palabras: **"¿esto ayuda a recordar mejor?"**. Funciones, textos, animaciones y hasta la arquitectura técnica se justifican o se descartan con ese criterio, no con métricas de retención, engagement o conversión — de hecho el producto **prohíbe explícitamente** optimizar por esas métricas (sin popups, sin pedir reviews, sin estadísticas "por orgullo").

Secundariamente, el objetivo de negocio (implícito, no declarado como tal hasta los docs 14-17) es que ese mismo motor emocional sea **reutilizable** para terceros: convertir un regalo personal en un producto sin perder la autenticidad que lo hizo funcionar la primera vez. Ese es, a mi juicio, el verdadero desafío del proyecto — no técnico, sino de **fidelidad de producto bajo generalización**.

## 3. Pilares del producto

- **El recuerdo es el producto, no el viaje.** Toda decisión de UX se filtra por esto.
- **Anti-spoiler y secuencialidad estricta.** Nunca se ve el día siguiente; el capítulo N+1 exige fecha cumplida *y* capítulo N finalizado.
- **Vocabulario y tono de marca no negociables.** Ningún texto técnico o corporativo puede llegar al usuario (doc 06, 10, 11).
- **Offline-first / nunca perder un recuerdo.** localStorage primero, sync después, jamás al revés.
- **El cumpleaños como clímax narrativo** que rompe deliberadamente todas las reglas de itinerario.
- **Story Engine desacoplado del contenido.** El motor no debe saber nada de Buenos Aires, Kari o julio 2026 — todo viene de un Story Package (doc 14).
- **Story Mood como capa de personalización emocional** sin tocar reglas de negocio (doc 16-17).
- **"Con cariño, no perfecto."** Autenticidad por sobre pulido — filosofía de diseño explícita en el manifiesto.

## 4. Riesgos que detecto

- **Deuda de especificación entre "ejemplo real" y "motor genérico".** Nadie ha traducido `Fecha == 18 Julio` o el nombre "Kari" a su forma parametrizada (`story.chapters[n].date`, `story.travelerName`). Si se empieza a programar sobre los docs 07/08 tal cual están, se construye una app de un solo viaje, no un motor — contradiciendo directamente el doc 14.
- **Contradicciones normativas sin resolver** entre documentos "oficiales": la pantalla de Calificación del cumpleaños (doc 08) choca con la prohibición explícita de pedir calificaciones (doc 03, 04); la navegación de Memory Mode tiene dos versiones incompatibles (10 ítems en doc 08 vs. 4 ítems en doc 12).
- **Modelo de datos ambiguo** para Foto/Video/Nota: doc 07 sugiere un registro compuesto, doc 08 los modela como tres entidades con máquinas de estado independientes. Construir el schema de base de datos sin resolver esto obliga a reescribir migraciones después.
- **Persistencia mal especificada**: "localStorage → MongoDB → Cloudinary" como cadena de fallback no es arquitectónicamente coherente (son sistemas con responsabilidades distintas, no sustitutos entre sí).
- **Concepto de "logro" mencionado pero nunca definido** (doc 10): sin trigger, sin pantalla, sin estructura. Riesgo de que se implemente de forma inconsistente con "nunca gamificación".
- **Story Profiling Engine sin lógica determinística documentada**: solo hay ejemplos ilustrativos de formulario → mood, no reglas ni pesos. Es un riesgo de producto (no técnico): sin esa lógica, no hay manera de decidir *hoy* qué construir primero.

## 5. Dudas que tengo (necesito resolución antes de diseñar nada)

1. ¿Los documentos 07 y 08 son la **especificación literal y vigente** del motor, o son un **caso de ejemplo** (Buenos Aires 2026) que debe reinterpretarse en términos de Story Package? Esto cambia completamente el approach de datos.
2. Ante la contradicción de navegación de Memory Mode (10 ítems vs. 4 ítems), ¿cuál prevalece?
3. ¿La "Calificación" y las "Estadísticas" son errores de redacción en el doc 08, o son excepciones deliberadas a los principios 03/04 que debo respetar tal cual?
4. ¿Foto, Video y Nota son una entidad o tres? Necesito una respuesta antes de tocar cualquier modelo de datos.
5. ¿En qué fase del roadmap estamos realmente construyendo? ¿v1 (todo manual, un solo viaje real) o ya apuntamos a v2/v3 (Story Curator + multi-historia)? El código correcto es distinto según la respuesta.

## 6. Partes del producto que considero críticas

- **La máquina de estados de capítulos** (bloqueo por fecha + secuencia previa finalizada): es la columna vertebral de toda la experiencia narrativa.
- **El Story Engine / Story Package** como frontera entre motor y contenido — si esto no se respeta desde el día uno, no hay vuelta atrás sin reescritura.
- **El sistema offline-first de guardado de recuerdos** (foto/video/nota): es la promesa central de "nunca perder un recuerdo".
- **El evento del cumpleaños**, por ser el clímax emocional y narrativo de todo el ciclo.
- **El vocabulario/tono de marca**, porque es lo que diferencia a Aurora de "cualquier otra app" según su propio manifiesto.

## 7. Partes que nunca deberían romperse

- **La secuencialidad de capítulos y el anti-spoiler.** Romper esto rompe la premisa narrativa completa del producto.
- **El principio "nunca culpar al usuario / nunca lenguaje técnico de error"**, incluso en estados de falla de red o de sync.
- **La irreversibilidad controlada**: cerrar un día es definitivo por diseño; pero eliminar un recuerdo nunca debe ser una pérdida real (siempre "archivado", recuperable).
- **La independencia entre Story Mood y reglas de negocio**: el tono puede cambiar, los datos (fechas, lugares, presupuesto) nunca.
- **Que la IA sea invisible para el usuario final** y que la app publicada funcione 100% sin IA ni conexión.

## 8. Aurora en una frase

**Aurora es el motor que convierte un viaje en un libro que se abre cada mañana durante el viaje y se vuelve a abrir, para siempre, cada aniversario.**

---

*No he escrito código ni propuesto componentes o arquitectura. Quedo a la espera de tu aprobación y de tus respuestas a la sección 5 antes de continuar.*

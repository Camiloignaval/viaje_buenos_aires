Me parece que llegamos al punto justo para dejar de iterar y empezar a construir.

Hay una sola cosa que no incluiría respecto de lo último que hablamos: no haría que el nombre de la pantalla cambie entre "Para ustedes", "Lo que permanece", etc. Cambiaría el mensaje, pero mantendría el nombre fijo. La consistencia pesa más que la sorpresa en una navegación que el usuario verá muchas veces.

Así que el diseño final que le pediría a Codex sería:

Mis viajes → la biblioteca.
Para ustedes → el espacio personal de Alaia.
El título "Para ustedes" no cambia.
Lo que cambia es únicamente el mensaje editorial superior según el momento del viaje.

Eso le da personalidad sin afectar la orientación del usuario.

# Alaia — Refinamiento Editorial Final

## Parte 2 — Biblioteca de Historias (Mis viajes)

---

# Objetivo

La pantalla **Mis viajes** debe recuperar un único propósito.

Ser la biblioteca personal de historias.

Hoy la pantalla mezcla responsabilidades.

Aunque funcionalmente todo funciona, visualmente todavía transmite la sensación de ser una mezcla entre:

- biblioteca
- dashboard
- configuración
- panel personal

Eso rompe ligeramente la identidad editorial del producto.

Después de este refinamiento, "Mis viajes" debe sentirse como una estantería donde viven historias.

Nada más.

---

# Nueva misión de la pantalla

Cuando el usuario entra aquí debe pensar inmediatamente:

"Aquí están nuestras historias."

No:

"Aquí configuro Alaia."

No:

"Aquí manejo mi cuenta."

No:

"Aquí cambio preferencias."

Todo lo que no pertenezca directamente a una historia deberá salir de esta pantalla.

---

# Contenido permitido

La biblioteca únicamente puede contener:

• título

• historia principal

• otras historias

• crear nuevo viaje

Nada más.

Todo el resto deberá vivir fuera.

---

# Contenido que debe salir

Mover completamente fuera de la biblioteca:

- acompañamiento
- sugerencias
- instalación PWA
- correo
- cerrar sesión
- cualquier configuración futura
- cualquier preferencia futura

La biblioteca nunca debe transformarse en una pantalla de administración.

---

# Jerarquía visual

La jerarquía debe ser extremadamente simple.

Ejemplo conceptual:

Mis viajes

↓

Historia principal

↓

Otras historias

↓

Crear nuevo viaje

↓

Fin de la pantalla

Nada más.

La pantalla debe respirar.

---

# La historia principal

Debe sentirse claramente distinta al resto.

No necesariamente mediante tamaño.

Puede ser mediante:

- espacio
- ritmo
- composición
- fotografía
- tipografía

Debe ser evidente cuál es la historia viva.

---

# Otras historias

No deben sentirse archivadas.

No deben sentirse viejas.

No deben sentirse olvidadas.

Simplemente pertenecen a otro momento.

La diferencia debe ser sutil.

No dramática.

---

# Biblioteca viva

No quiero una lista de viajes.

Quiero una biblioteca que cuente historias.

Cada viaje debe comunicar naturalmente su estado.

No repetir siempre la misma estructura.

---

# Antes del viaje

Transmitir preparación.

No ansiedad.

No cuenta regresiva exagerada.

No grandes números.

La sensación debe ser:

"La historia todavía está por comenzar."

---

# Durante el viaje

Transmitir presente.

La historia está ocurriendo.

No decir simplemente:

"En progreso."

No parece Alaia.

Buscar una frase editorial breve.

---

# Último día

Debe sentirse especial.

No triste.

No administrativo.

Debe transmitir que todavía queda historia.

No que está terminando una tarea.

---

# Recién finalizado

Debe transmitir cercanía.

Ejemplos conceptuales:

Hace unos días.

Hace dos semanas.

Hace poco.

Nunca copiar literalmente.

Buscar el mejor tono editorial.

---

# Historias antiguas

No quiero que todo termine diciendo:

"Hace 342 días."

Eso no genera recuerdos.

Prefiero referencias naturales.

Ejemplos conceptuales:

Primavera de 2026.

Invierno de 2025.

Hace un tiempo.

No repetir exactamente estas frases.

Buscar la mejor versión.

---

# Evitar

No convertir las fechas en datos administrativos.

La historia importa más que la fecha exacta.

---

# Navegación

Agregar únicamente un acceso editorial muy discreto.

Ejemplo conceptual:

Mis viajes Para ustedes →

Debe sentirse como un enlace.

No como un botón.

No competir visualmente con las historias.

---

# Responsive

La biblioteca debe conservar exactamente la misma personalidad en:

Desktop.

Tablet.

Mobile.

PWA.

No crear experiencias distintas.

Solo adaptar la composición.

---

# Espaciado

Prefiero mucho aire.

Antes que muchas líneas.

Las historias deben respirar.

No sentirse comprimidas.

---

# Cards

Revisar si realmente todas las cards existentes siguen siendo necesarias.

Si alguna puede desaparecer sin perder claridad:

eliminarla.

No introducir nuevas cards.

---

# Componentes

Reducir al mínimo los componentes visuales.

Menos cajas.

Menos fondos.

Menos bordes.

Más composición.

---

# Tipografía

La tipografía debe hacer el trabajo principal.

No los contenedores.

No los colores.

No los fondos.

---

# Color

No introducir nuevos colores.

Utilizar únicamente la identidad existente.

La emoción debe surgir del contenido.

No del color.

---

# Auditoría Visual

Durante esta implementación revisar:

- márgenes
- ritmo
- alineaciones
- jerarquías
- tamaños
- iconografía
- peso visual
- scroll

Si encuentras pequeñas mejoras objetivas:

implémentalas.

No ampliar alcance.

---

# Definition of Done

Esta parte estará terminada cuando una persona pueda entrar a "Mis viajes" y pensar inmediatamente:

"Aquí viven nuestras historias."

Y no:

"Aquí administro la aplicación."

Ese será el criterio principal para evaluar esta pantalla.

# Alaia — Refinamiento Editorial Final

## Parte 3 — "Para ustedes"

---

# Objetivo

"Para ustedes" será el único espacio donde Alaia habla directamente con las personas.

No será una pantalla de configuración.

No será una cuenta.

No será un panel.

No será un dashboard.

No será un lugar donde el usuario "administra" Alaia.

Será un espacio editorial.

Un pequeño refugio.

Un lugar tranquilo.

La diferencia con "Mis viajes" debe sentirse inmediatamente.

---

# Filosofía

Si "Mis viajes" habla de historias,

"Para ustedes" habla de personas.

La biblioteca mira hacia los recuerdos.

"Para ustedes" mira hacia quienes los viven.

Nunca mezclar ambos mundos.

---

# Identidad

El nombre de la pantalla es:

## Para ustedes

Ese nombre es permanente.

No cambia.

No depende del viaje.

No depende del tiempo.

No depende del contexto.

No implementar variantes como:

- Contigo
- Carta
- Carta de hoy
- Lo que permanece
- La próxima historia
- Bienvenidos
- De vuelta
- Lo que todavía recuerdan

La personalidad cambia mediante el mensaje.

Nunca mediante el nombre.

---

# Encabezado

Encabezado:

ALAIA

Título:

Para ustedes

Nada más.

No agregar subtítulos técnicos.

No agregar descripciones largas.

La emoción debe venir del contenido.

---

# El mensaje editorial

La parte superior de la pantalla debe contener un único mensaje.

No un banner.

No una card.

No una alerta.

No un componente destacado.

Simplemente texto.

Debe sentirse como si Alaia hubiera decidido escribir unas pocas líneas.

No debe parecer generado automáticamente.

No debe parecer una IA.

No debe parecer marketing.

No debe parecer una notificación.

Debe parecer humano.

---

# Estados del mensaje

Crear un mensaje distinto para:

• Sin viajes.

• Antes del viaje.

• Durante el viaje.

• Último día.

• Después del viaje.

• Mucho tiempo después.

No crear decenas de variantes.

Solo unas pocas.

Muy bien escritas.

---

# Longitud

Máximo:

3 o 4 líneas.

Nunca párrafos largos.

Nunca bloques densos.

Debe poder leerse en pocos segundos.

---

# Tono

Buscar un equilibrio entre:

cálido

editorial

elegante

sobrio

silencioso

Evitar:

sentimentalismo

frases motivacionales

marketing

lugares comunes

poesía exagerada

---

# No explicar

El mensaje no debe explicar funcionalidades.

No decir:

"Aquí puedes configurar..."

"No olvides..."

"Activa..."

"Administra..."

Eso rompe la magia.

---

# Acompañamiento

Después del mensaje aparece:

## Acompañamiento

Mantener toda la funcionalidad existente.

No cambiar lógica.

No cambiar backend.

No cambiar permisos.

Solo mejorar:

- organización;
- jerarquía;
- microcopy.

Debe sentirse como una invitación.

Nunca como una configuración.

---

# Instalación

Después:

## Instalar Alaia

Mantener toda la lógica existente.

Android:

Instalar Alaia.

iPhone:

Cómo instalar Alaia.

Nunca ambos.

Nunca mostrar cuando ya está instalada.

No duplicar información.

No explicar detalles técnicos.

---

# Sugerencias

Después:

## Sugerencias

Mover completamente este bloque desde la biblioteca.

El objetivo no es recibir feedback.

El objetivo es invitar a construir Alaia entre todos.

Revisar completamente el copy.

Debe sentirse cercano.

Nunca corporativo.

Nunca un formulario clásico.

---

# Cuenta

Último bloque funcional.

Mostrar únicamente:

correo

Cerrar sesión

Nada más.

No crear:

perfil

avatar

estadísticas

preferencias irrelevantes

seguridad

información técnica

No ampliar alcance.

---

# Cierre editorial

Al finalizar la pantalla agregar un pequeño cierre.

No un footer.

No un copyright.

No un bloque técnico.

Solo una despedida muy discreta.

Dirección conceptual:

"Gracias por confiarle sus historias a Alaia."

No copiar literalmente si encuentras una versión más elegante.

Debe sentirse como el final de una carta.

---

# Composición

No utilizar:

cards

paneles

fondos secundarios

bloques pesados

La separación debe lograrse mediante:

aire

espacio

ritmo

filetes

tipografía

---

# Máximo de secciones

"Para ustedes" nunca debe transformarse en un panel de configuración.

Máximo:

4 bloques principales.

Si en el futuro aparece un quinto bloque,

primero evaluar moverlo a otro lugar.

La simplicidad tiene prioridad.

---

# Microcopy

Revisar completamente toda la pantalla.

Eliminar palabras como:

Configuración

Opciones

Preferencias

Panel

Sistema

Cuenta del usuario

Actualizar

Guardar cambios

Todo debe sentirse escrito por Alaia.

---

# Auditoría

Al finalizar la implementación pregúntate:

¿Hay algún bloque que todavía se sienta demasiado administrativo?

Si la respuesta es sí,

mejorarlo.

No agregando diseño.

Sino quitando administración.

---

# Definition of Done

Esta parte estará terminada cuando el usuario entre a "Para ustedes" y sienta que:

"Alaia me está acompañando."

No:

"Estoy configurando una aplicación."

Ese será el criterio principal para evaluar esta pantalla.

# Alaia — Refinamiento Editorial Final

## Parte 4 — Product Polish, Auditoría Editorial y Revisión de Experiencia

---

# Objetivo

Esta etapa no consiste en agregar funcionalidades.

Consiste en eliminar todas aquellas pequeñas decisiones que todavía hacen que Alaia se sienta demasiado "aplicación".

No quiero una auditoría técnica.

Quiero una auditoría de experiencia.

El criterio principal ya no es:

"¿Funciona?"

Ahora es:

"¿Se siente como Alaia?"

---

# Pensar como Product Owner

Durante esta revisión deja de pensar como ingeniero.

Piensa como:

- diseñador de producto;
- editor;
- director creativo;
- alguien que va a usar Alaia durante años.

No busques únicamente errores.

Busca fricción.

Busca ruido.

Busca elementos que rompan el ritmo.

Busca componentes que existan solo porque "siempre estuvieron ahí".

---

# Pregunta principal

Mientras recorras la aplicación hazte constantemente esta pregunta:

## ¿Esto hace que Alaia se sienta más humana o más administrativa?

Si la respuesta es:

"más administrativa"

debe revisarse.

---

# Auditoría completa

Recorre toda la experiencia.

No solamente las pantallas modificadas.

Incluye:

- login
- onboarding
- creación de viaje
- biblioteca
- Para ustedes
- portada de experiencia
- preparativos
- capítulos
- momentos
- álbum
- favoritos
- notas
- estados vacíos
- estados de error
- PWA instalada

Busca continuidad visual.

---

# Espaciado

Revisar cuidadosamente:

- márgenes
- paddings
- separación entre bloques
- respiración del contenido

Prefiero más aire.

Antes que más componentes.

---

# Ritmo

Una pantalla no debe sentirse pesada.

Debe tener un ritmo de lectura natural.

Evitar:

- bloques demasiado grandes;
- elementos muy juntos;
- cambios bruscos de tamaño.

---

# Jerarquía

Comprobar que la vista siempre responda a esta pregunta:

¿Qué es lo primero que debo mirar?

Si la respuesta no es evidente,

la jerarquía debe mejorarse.

---

# Tipografía

La tipografía debe hacer la mayor parte del trabajo.

No depender de:

- sombras
- fondos
- bordes
- cajas

Si un componente necesita demasiada decoración para entenderse,

probablemente el problema es la jerarquía.

---

# Color

No introducir nuevos colores.

No aumentar saturación.

No crear acentos nuevos.

La emoción debe venir del contenido.

No del color.

---

# Componentes

Buscar componentes que puedan desaparecer.

No reemplazarlos.

Simplemente quitarlos.

Preguntarse:

¿Este componente aporta algo?

¿O solo ocupa espacio?

---

# Cards

Auditar todas las cards nuevas y antiguas.

Si alguna existe únicamente por costumbre,

eliminarla.

La composición editorial debe prevalecer.

---

# Iconografía

Revisar:

- tamaño
- alineación
- peso visual
- consistencia

Los iconos deben acompañar.

Nunca competir con el contenido.

---

# Botones

Buscar botones innecesarios.

Preguntarse:

¿Puede resolverse con un enlace editorial?

Si la respuesta es sí,

preferir el enlace.

---

# Animaciones

Las animaciones deben sentirse naturales.

Nunca llamar la atención.

Nunca retrasar la interacción.

Nunca parecer un efecto.

Solo acompañar.

---

# Scroll

Recorrer todas las pantallas.

Buscar:

- espacios muertos;
- finales abruptos;
- scroll excesivo;
- cambios de ritmo.

Especialmente:

Mis viajes.

Para ustedes.

---

# Responsive

Revisar cuidadosamente:

Desktop.

Tablet.

Mobile.

PWA.

No crear diferencias funcionales.

Solo adaptar la composición.

---

# Accesibilidad

Confirmar:

- contraste;
- foco;
- navegación por teclado;
- tamaños táctiles;
- jerarquía semántica.

No introducir regresiones.

---

# Estados vacíos

Todos los estados vacíos deben sentirse intencionales.

Nunca improvisados.

Nunca parecer un error.

Nunca decir solamente:

"No hay datos."

Buscar un tono editorial.

---

# Estados de error

Los errores deben ser honestos.

Pero tranquilos.

Evitar:

mensajes técnicos

errores largos

explicaciones innecesarias

Mantener el tono de Alaia.

---

# Consistencia

Buscar diferencias pequeñas entre pantallas.

Por ejemplo:

- distintos tamaños de títulos;
- distintos márgenes;
- distintos estilos de enlaces;
- distintos pesos tipográficos.

Si no existe una razón clara,

unificarlos.

---

# Auditoría Editorial

Al finalizar la revisión responder internamente:

¿Qué partes siguen sintiéndose demasiado administrativas?

Para cada una:

decidir si:

- puede simplificarse;
- puede eliminarse;
- puede reescribirse;
- puede reorganizarse.

No agregar funcionalidades.

---

# Mejoras permitidas

Puedes implementar pequeñas mejoras adicionales únicamente si cumplen TODAS estas condiciones:

- mejoran objetivamente la experiencia;
- no cambian arquitectura;
- no modifican backend;
- no agregan nuevas funciones;
- no amplían el alcance;
- no generan deuda técnica.

---

# Mejoras prohibidas

No iniciar nuevas etapas.

No agregar nuevas ideas.

No comenzar features futuras.

No rediseñar Experience.

No rediseñar capítulos.

No rediseñar Context Engine.

No rediseñar Companion.

No tocar Web Push.

No tocar invitaciones.

No tocar sincronización.

---

# Filosofía final

Quiero que al terminar esta revisión ocurra algo muy simple.

Que alguien use Alaia durante algunos minutos...

...y deje de pensar en la aplicación.

Empiece a pensar únicamente en su historia.

Ese será el verdadero indicador de éxito.

---

# Definition of Done

Esta parte estará terminada cuando:

- no existan elementos evidentemente administrativos;
- la navegación sea consistente;
- el ritmo visual sea tranquilo;
- la composición respire;
- la identidad editorial sea evidente;
- Alaia se sienta como un lugar y no como una aplicación.

# Alaia — Refinamiento Editorial Final

## Parte 5 — Validación, QA, Commits y Criterios de Cierre

---

# Objetivo

Hasta ahora el trabajo ha sido editorial.

A partir de esta etapa quiero validar que absolutamente nada de lo construido haya deteriorado la calidad técnica del proyecto.

No quiero asumir.

No quiero "debería funcionar".

Quiero evidencia.

Cada cambio debe estar respaldado por validaciones reales.

---

# Filosofía de Validación

No busques únicamente errores.

Busca regresiones.

Busca inconsistencias.

Busca pequeñas roturas que puedan haber aparecido durante el refinamiento.

La experiencia editorial nunca puede deteriorar la estabilidad del producto.

---

# Validaciones obligatorias

Ejecutar:

```bash
npm run typecheck
```

Debe finalizar limpio.

Sin errores.

Sin warnings nuevos.

---

Ejecutar:

```bash
npm test
```

Toda la suite backend debe permanecer completamente verde.

No eliminar tests.

No modificar tests únicamente para que pasen.

---

Ejecutar:

```bash
npm run test:react
```

Toda la suite React debe permanecer completamente verde.

No reducir cobertura.

No eliminar assertions.

---

Ejecutar:

```bash
git diff --check
```

Debe quedar completamente limpio.

Sin espacios.

Sin conflictos.

Sin errores de formato.

---

# Build

Antes de ejecutar build revisa la documentación activa del repositorio.

No asumir reglas heredadas.

Si el repositorio permite ejecutar:

```bash
npm run build
```

ejecutarlo.

Si existe una prohibición documentada y vigente:

no ejecutarlo.

Explicar exactamente dónde está documentada.

Nunca inventar restricciones.

---

# Playwright

Revisar la política real del proyecto.

Si corresponde ejecutar:

```bash
npx playwright test
```

hacerlo.

No reducir cobertura.

No eliminar Firefox.

No agregar skips.

No ocultar errores.

Si existe un problema del entorno:

demostrarlo con evidencia.

No asumir que es un bug de Alaia.

---

# Recorrido Manual

Después de las validaciones automáticas realizar un recorrido completo.

Desktop.

Tablet.

Mobile.

PWA.

Verificar:

- navegación;
- ritmo;
- jerarquía;
- biblioteca;
- Para ustedes;
- Experience;
- Preparativos;
- Álbum;
- Favoritos;
- Notas;
- estados vacíos;
- estados de error.

---

# Consistencia

Confirmar que el refinamiento editorial no haya roto:

- Context Engine;
- Companion;
- Web Push;
- PWA;
- Invitaciones;
- Álbum;
- Favoritos;
- Notas.

---

# Revisión de Performance

No introducir renders innecesarios.

No crear efectos secundarios.

No agregar listeners duplicados.

No introducir nuevas dependencias si no son estrictamente necesarias.

No aumentar complejidad sin beneficio claro.

---

# Commits

Si todo queda correctamente validado:

crear un commit temático.

Mensaje sugerido:

```text
style(product): refine editorial navigation and personal space
```

Si encuentras un mensaje mejor que represente exactamente el trabajo realizado, puedes utilizarlo.

No hacer squash.

No reescribir commits anteriores.

No modificar historial.

---

# Push

No realizar push.

No integrar a master.

No crear tags.

No archivar OpenSpec.

Este trabajo termina únicamente dejando la rama preparada.

---

# Definition of Done

Esta parte estará terminada cuando:

- todas las validaciones disponibles estén verdes;
- el refinamiento editorial no introduzca regresiones;
- la navegación sea consistente;
- la identidad del producto sea más fuerte que antes;
- la rama quede lista para revisión.

No declarar terminado algo que no haya sido validado.

# Alaia — Refinamiento Editorial Final

## Parte 6 — Informe Final, Criterios de Aceptación y Cierre

---

# Objetivo

Este documento termina únicamente cuando Alaia sea objetivamente mejor.

No cuando simplemente se hayan movido componentes.

No cuando los tests pasen.

No cuando exista un commit.

La implementación solo estará terminada cuando la experiencia completa sea más coherente con la identidad de Alaia.

---

# Informe Final

No entregar informes parciales.

No entregar avances.

No explicar paso a paso.

Trabajar completamente de forma autónoma.

Al finalizar entregar un único informe consolidado.

---

# El informe debe incluir

## 1. Resumen Ejecutivo

Explicar brevemente:

- qué se modificó;
- por qué se modificó;
- cómo mejora Alaia.

No listar archivos todavía.

Primero explicar el resultado como producto.

---

## 2. Nueva Navegación

Explicar:

- cómo quedó la biblioteca;
- cómo quedó "Para ustedes";
- cómo cambió la separación entre ambos mundos.

---

## 3. Biblioteca

Describir:

- jerarquía nueva;
- estados editoriales;
- elementos eliminados;
- composición;
- mejoras visuales.

---

## 4. Para ustedes

Describir:

- nueva estructura;
- mensaje editorial;
- acompañamiento;
- instalación;
- sugerencias;
- cuenta;
- cierre editorial.

---

## 5. Microcopy

Resumir:

- textos modificados;
- tono editorial;
- cambios relevantes.

No listar absolutamente todos.

Solo los importantes.

---

## 6. Mejoras Visuales

Explicar:

- espaciados;
- jerarquías;
- ritmo;
- composición;
- eliminación de elementos innecesarios.

---

## 7. Auditoría Editorial

Responder explícitamente:

¿Qué partes seguían sintiéndose demasiado administrativas?

¿Cuáles corregiste?

¿Cuáles decidiste mantener?

¿Y por qué?

---

## 8. Mejoras Adicionales

Si durante la implementación encontraste pequeñas oportunidades objetivas de mejora:

explicarlas.

Solo aquellas realmente implementadas.

No listar ideas futuras.

---

## 9. Validaciones

Indicar exactamente:

TypeScript

Backend

React

Build

Playwright

git diff --check

Explicar cuáles se ejecutaron.

Cuáles no.

Y por qué.

Nunca asumir.

---

## 10. Archivos

Entregar un resumen de:

- archivos creados;
- archivos modificados.

No listar cada cambio línea por línea.

Solo una visión general.

---

## 11. Commit

Indicar:

mensaje

hash

rama

No hacer push.

---

# Autoevaluación

Antes de terminar responde internamente estas preguntas.

---

## Biblioteca

¿Parece una biblioteca?

¿O todavía parece un dashboard?

---

## Para ustedes

¿Parece una configuración?

¿O realmente parece un espacio donde Alaia habla con las personas?

---

## Navegación

¿El usuario entiende inmediatamente dónde vive cada cosa?

---

## Producto

¿Hay algo que todavía se siente demasiado técnico?

---

## Filosofía

¿Alaia hoy se siente más humana que antes?

---

# Definition of Done

Considerar este trabajo terminado únicamente si todas las siguientes afirmaciones son verdaderas.

☐ Mis viajes se siente como una biblioteca.

☐ Para ustedes se siente como un espacio personal.

☐ La navegación es más simple.

☐ Se eliminaron responsabilidades mezcladas.

☐ No se agregaron funcionalidades innecesarias.

☐ La identidad editorial es más fuerte.

☐ El producto se siente más tranquilo.

☐ La experiencia es más coherente.

☐ No existen regresiones técnicas.

☐ Las validaciones ejecutadas permanecen verdes.

☐ La rama queda lista para revisión.

---

# Lo que NO debe ocurrir

No comenzar la Etapa 7.

No crear nuevas funcionalidades.

No agregar IA.

No agregar nuevas pantallas.

No rediseñar Experience.

No rediseñar Companion.

No modificar Context Engine.

No modificar Web Push.

No abrir nuevas líneas de trabajo.

Este documento termina aquí.

---

# Último Principio

Quiero cerrar esta etapa con una única idea.

No estamos construyendo una aplicación para organizar viajes.

Estamos construyendo un lugar donde las personas volverán años después para recordar una parte importante de sus vidas.

Cada decisión debe acercar Alaia a esa idea.

Nunca alejarla.

Si durante la implementación debes elegir entre:

- una solución más funcional; o
- una solución más humana,

elige siempre la segunda, siempre que no comprometa la claridad, la accesibilidad ni la estabilidad del producto.

Ese es el criterio más importante de todo este documento.

---

# Cierre

Cuando todo termine quiero poder abrir Alaia y sentir que:

las funciones desaparecieron,

las historias quedaron,

y las personas pasaron al centro.

Ese será el verdadero cierre de la Etapa 6.

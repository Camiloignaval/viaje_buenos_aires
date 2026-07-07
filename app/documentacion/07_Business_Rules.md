# 07 · Business Rules

## Aurora Business Rules

Version: 1.0

---

# Introducción

Este documento define todas las reglas funcionales del producto.

No describe componentes.

No describe diseño.

No describe tecnología.

Describe únicamente el comportamiento esperado del sistema.

Toda implementación debe respetar estas reglas.

Si una funcionalidad contradice este documento, la implementación debe considerarse incorrecta.

---

# 1. Principios generales

Aurora es una plataforma basada en capítulos.

Cada capítulo representa un día importante del viaje.

Un capítulo puede encontrarse únicamente en uno de los siguientes estados:

• Bloqueado

• Disponible

• Iniciado

• Finalizado

No existen estados adicionales.

---

# 2. Estados de un capítulo

## Bloqueado

El usuario no puede acceder.

Solo puede visualizar una tarjeta bloqueada.

Debe mostrarse:

• Candado

• Nombre del capítulo

• Fecha

• Una frase inspiradora aleatoria

Nunca mostrar actividades.

Nunca mostrar mapas.

Nunca mostrar fotografías.

Nunca mostrar restaurantes.

Nunca mostrar horarios.

Nunca mostrar sorpresas.

---

## Disponible

El capítulo puede abrirse.

Todavía no ha sido iniciado.

Debe mostrarse únicamente la portada del capítulo.

No mostrar inmediatamente el contenido.

---

## Iniciado

El usuario ya abrió el capítulo.

El itinerario completo queda disponible.

Todas las actividades del día pueden consultarse.

Las fotografías pueden subirse.

Los videos pueden subirse.

Las notas pueden escribirse.

---

## Finalizado

El usuario decidió terminar el capítulo.

El itinerario deja de modificarse.

Se almacenan automáticamente todos los recuerdos asociados.

El capítulo queda marcado como completo.

---

# 3. Regla principal de desbloqueo

Un capítulo solo podrá pasar de "Bloqueado" a "Disponible" cuando se cumplan simultáneamente las siguientes condiciones.

Condición 1.

La fecha actual debe ser igual o posterior a la fecha del capítulo.

Y

Condición 2.

El capítulo inmediatamente anterior debe encontrarse en estado Finalizado.

Si cualquiera de estas condiciones no se cumple.

El capítulo permanecerá bloqueado.

---

# Ejemplo

17 Julio

Todos los capítulos permanecen bloqueados.

---

18 Julio

Solo Día 1 puede desbloquearse.

---

19 Julio

Si Día 1 está Finalizado

↓

Desbloquear Día 2.

Si Día 1 NO está Finalizado

↓

Mantener Día 2 bloqueado.

---

20 Julio

Aplicar exactamente la misma lógica.

---

# 4. Capítulo del cumpleaños

Existe un capítulo especial.

Fecha:

22 Julio.

Este capítulo no pertenece al itinerario.

Debe permanecer oculto hasta cumplir ambas condiciones.

• Fecha >= 22 Julio.

• Día 4 Finalizado.

Solo entonces aparecerá.

---

# 5. Finalizar capítulo

El botón

🌙 Dar por terminado este día

es irreversible.

Antes de finalizar debe mostrarse una confirmación elegante.

Ejemplo.

"¿Seguro que quieres cerrar este capítulo?

Todavía podrás volver a leerlo.

Pero ya no podrás seguir agregando actividades."

Botones.

Seguir explorando.

Cerrar capítulo.

---

# 6. Al cerrar un capítulo

El sistema debe:

Guardar automáticamente.

✓ Fotografías.

✓ Videos.

✓ Favoritos.

✓ Notas.

✓ Checklist.

✓ Estado.

✓ Hora de cierre.

✓ Duración del recorrido.

Posteriormente ejecutar la animación de cierre.

Nunca desbloquear inmediatamente el siguiente día.

---

# 7. Días futuros

Nunca pueden abrirse manualmente.

Si el usuario intenta abrir uno.

Mostrar un modal.

Seleccionar una frase aleatoria.

Ejemplos.

"No adelantemos capítulos."

"Primero disfrutemos el día de hoy."

"Mañana descubriremos una nueva aventura."

Nunca utilizar mensajes negativos.

Nunca utilizar errores.

Nunca utilizar "Acceso denegado".

---

# 8. Fotografías

Una fotografía pertenece siempre a una única actividad.

Nunca podrá existir una fotografía sin actividad asociada.

Cada fotografía puede almacenar:

• Imagen

• Video

• Nota

• Emoji

• Fecha

• Hora

• Coordenadas (opcional)

• Favorito

---

# 9. Videos

Mismas reglas que fotografías.

Nunca reproducirse automáticamente.

---

# 10. Notas

Las notas son completamente libres.

No existe límite práctico de longitud.

Las notas nunca deben perderse.

Si el usuario pierde conexión.

Guardar localmente.

Sincronizar posteriormente.

---

# 11. Favoritos

Todo elemento puede marcarse como favorito.

Ejemplos.

Actividad.

Fotografía.

Video.

Restaurante.

Cafetería.

Lugar.

El favorito nunca modifica el itinerario.

Solo mejora el álbum final.

---

# 12. Persistencia

La aplicación debe funcionar completamente sin conexión.

Prioridad.

1. localStorage

2. MongoDB Atlas

3. Cloudinary

Si la nube no está disponible.

El usuario nunca debe perder información.

---

# 13. Eliminación

Aurora nunca elimina inmediatamente.

Todo elemento eliminado pasa primero al estado:

Archivado.

El usuario podrá recuperarlo.

---

# 14. Errores

Los errores nunca deben mostrarse utilizando lenguaje técnico.

Ejemplo incorrecto.

Upload failed.

Ejemplo correcto.

"No logramos guardar este recuerdo todavía.

Seguiremos intentándolo."

---

# 15. Objetivo final

Toda regla definida en este documento tiene una prioridad superior a cualquier decisión visual.

Si una animación contradice una regla.

Debe modificarse la animación.

Nunca la regla.

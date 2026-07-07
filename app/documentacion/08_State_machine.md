# 08 · State Machine

## Aurora State Machine

Version: 1.0

---

# Introducción

Aurora es una aplicación basada completamente en estados.

Toda pantalla.

Toda animación.

Todo botón.

Toda transición.

Debe depender exclusivamente del estado actual del viaje.

Nunca deben existir estados ambiguos.

Nunca deben existir múltiples estados activos simultáneamente.

Cada historia solo puede encontrarse en un único estado principal.

---

# Estados principales

PRE_TRIP

↓

DAY_1_AVAILABLE

↓

DAY_1_STARTED

↓

DAY_1_COMPLETED

↓

DAY_2_AVAILABLE

↓

DAY_2_STARTED

↓

DAY_2_COMPLETED

↓

DAY_3_AVAILABLE

↓

DAY_3_STARTED

↓

DAY_3_COMPLETED

↓

DAY_4_AVAILABLE

↓

DAY_4_STARTED

↓

DAY_4_COMPLETED

↓

BIRTHDAY_AVAILABLE

↓

BIRTHDAY_COMPLETED

↓

MEMORY_MODE

↓

ANNIVERSARY_MODE

---

# Estado PRE_TRIP

Descripción

El viaje aún no comienza.

Objetivo

Crear ilusión.

Pantallas permitidas

✔ Cuenta regresiva

✔ Hotel

✔ Vuelos

✔ Restaurantes

✔ Checklist

✔ Presupuesto

✔ Equipaje

✔ Consejos

Pantallas prohibidas

✖ Itinerario

✖ Fotos

✖ Timeline

✖ Álbum

✖ Cumpleaños

---

# Evento

Fecha == 18 Julio

↓

Cambiar automáticamente

↓

DAY_1_AVAILABLE

---

# DAY_1_AVAILABLE

El capítulo está listo.

Todavía no fue abierto.

Mostrar únicamente:

Hero

Frase

Botón

✨ Comenzar Día 1

Nunca mostrar actividades directamente.

---

Evento

Usuario presiona

Comenzar Día 1

↓

DAY_1_STARTED

---

# DAY_1_STARTED

Estado activo.

Permitir

✔ Actividades

✔ Fotografías

✔ Videos

✔ Notas

✔ Favoritos

✔ Checklist

✔ Gastos

✔ Mapa

✔ Restaurantes

✔ Cafeterías

No permitir

Finalizar automáticamente.

Siempre manual.

---

Evento

Usuario presiona

🌙 Finalizar Día

↓

DAY_1_COMPLETED

---

# DAY_1_COMPLETED

Guardar

Fotos

Videos

Notas

Checklist

Favoritos

Hora

Duración

Ejecutar

Animación

↓

Cerrar libro

↓

Esperar próximo día

---

Evento

Fecha == 19

↓

DAY_2_AVAILABLE

---

Si fecha == 19

pero

DAY_1_COMPLETED == false

↓

Permanecer

DAY_1_STARTED

---

# DAY_2

Repetir exactamente la misma lógica.

---

# DAY_3

Exactamente igual.

---

# DAY_4

Exactamente igual.

---

Evento

DAY_4_COMPLETED

↓

Esperar

↓

22 Julio

---

# BIRTHDAY_AVAILABLE

Este estado es único.

No contiene itinerario.

No contiene horarios.

No contiene mapas.

Contiene únicamente recuerdos.

Pantallas

✔ Feliz cumpleaños

✔ Foto

✔ Video

✔ Reflexión

✔ Carta

✔ Restaurante favorito

✔ Cafetería favorita

✔ Mejor momento

✔ Mejor fotografía

✔ Calificación

---

Evento

Finalizar cumpleaños

↓

BIRTHDAY_COMPLETED

---

Evento

Cerrar pantalla

↓

MEMORY_MODE

---

# MEMORY_MODE

La guía desaparece.

Ahora existe un álbum.

Nueva navegación.

Inicio

Álbum

Timeline

Mapa

Videos

Restaurantes

Cafeterías

Estadísticas

Carta

Configuración

No existe itinerario.

---

# ANNIVERSARY_MODE

Cada aniversario.

Evento

Fecha

18 Julio

↓

Mostrar

Hace exactamente X años comenzó esta aventura.

Botones

📖 Revivir viaje

📸 Abrir álbum

---

Si el usuario elige

Revivir

↓

Reproducir automáticamente

Día 1

↓

Día 2

↓

Día 3

↓

Día 4

↓

Cumpleaños

Utilizando

Fotos

Videos

Notas

Frases

Recuerdos

---

# Estados secundarios

Cada actividad posee además estados propios.

LOCKED

↓

AVAILABLE

↓

VISITED

↓

PHOTO_ADDED

↓

VIDEO_ADDED

↓

NOTE_ADDED

↓

COMPLETED

---

Cada fotografía

EMPTY

↓

UPLOADING

↓

UPLOADED

↓

SYNCED

↓

FAVORITE

↓

ARCHIVED

---

Cada video

Misma lógica.

---

Cada nota

EMPTY

↓

DRAFT

↓

SAVED

↓

SYNCED

---

# Sincronización

OFFLINE

↓

LOCAL_ONLY

↓

SYNC_PENDING

↓

SYNCING

↓

SYNCED

↓

ERROR_RECOVERABLE

Nunca perder datos.

Nunca bloquear al usuario.

---

# Errores

Nunca modifican el estado principal.

Los errores únicamente afectan

la sincronización.

Nunca el viaje.

---

# Máquina de estados completa

PRE_TRIP

↓

DAY1_AVAILABLE

↓

DAY1_STARTED

↓

DAY1_COMPLETED

↓

DAY2_AVAILABLE

↓

DAY2_STARTED

↓

DAY2_COMPLETED

↓

DAY3_AVAILABLE

↓

DAY3_STARTED

↓

DAY3_COMPLETED

↓

DAY4_AVAILABLE

↓

DAY4_STARTED

↓

DAY4_COMPLETED

↓

WAITING_BIRTHDAY

↓

BIRTHDAY_AVAILABLE

↓

BIRTHDAY_COMPLETED

↓

MEMORY_MODE

↓

ANNIVERSARY_MODE

↓

FOREVER

---

# Regla de oro

El estado siempre tiene prioridad.

Nunca la interfaz.

La UI únicamente representa el estado actual.

Nunca lo determina.

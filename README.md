# Buenos Aires 2026 — Camilo ❤ Kari

Guía de viaje interactiva, de un solo archivo, sin dependencias externas.

## Abrir

Doble clic en `index.html`. Se abre en cualquier navegador, sin internet y sin instalar nada.

## Fotos

Las fotos van en la carpeta `images/`, con estos nombres exactos (si falta alguna, se muestra un placeholder elegante en su lugar — nada se rompe):

- `cover-hero.jpg` — portada
- `hotel.jpg` — Cyan Américas Towers Hotel
- `dia1-hero.jpg`, `dia1-cuartito.jpg`, `dia1-colon.jpg`, `dia1-obelisco.jpg`, `dia1-corrientes.jpg`, `dia1-rapanui.jpg`, `dia1-cena.jpg`
- `dia2-hero.jpg`, `dia2-floralis.jpg`, `dia2-cementerio.jpg`, `dia2-almuerzo.jpg`, `dia2-rosedal.jpg`, `dia2-cafepalermo.jpg`, `dia2-puertomadero.jpg`, `dia2-cena.jpg`
- `dia3-hero.jpg`, `dia3-mercado.jpg`, `dia3-dorrego.jpg`, `dia3-caminito.jpg`, `dia3-almuerzo.jpg`, `dia3-galerias.jpg`, `dia3-cafe.jpg`, `dia3-floreria.jpg`, `dia3-mafalda.jpg`
- `dia4-hero.jpg`, `dia4-ateneo.jpg`, `dia4-almuerzo.jpg`, `dia4-cafe.jpg`
- `medialunas-hero.jpg`, `prep-avion-vertical.jpg` (versión vertical de `prep-avion.jpg`, se usa en mobile)

Para reemplazar una foto: sobrescribí el archivo con el mismo nombre en `images/`.

> `dia2-desayuno.jpg` y `dia3-desayuno.jpg` quedaron sin usar — el hotel incluye desayuno, así que esas fichas de cafetería se sacaron de la guía.

## Imprimir

Botón de impresora en el header, o `Ctrl+P`. Ya está optimizado para papel A4: sin botones, sin animaciones, cada capítulo arranca en hoja nueva y las tarjetas/mapas/timelines no se cortan entre páginas.

## Cambiar colores

Todo el color y la tipografía sale de las variables al principio del `<style>`, dentro de `:root`. Por ejemplo, para cambiar el morado principal:

```css
--primary:#5A31F4;      /* morado principal */
--primary-light:#EEE9FF; /* fondo suave del mismo color */
```

Cambiando esas dos líneas, se actualiza toda la guía (botones, iconos, barras de presupuesto, etc.).

## Modificar el itinerario

- **Texto y horarios**: cada día vive en su propio bloque `<div id="chapter-dia-N">` dentro del `<body>` — buscá el número de día y editá directamente el HTML (horarios de timeline, direcciones, qué pedir, precios).
- **Checklist, apps recomendadas y presupuesto total del viaje**: no están en el HTML, sino como datos en el `<script>` final (`CHECKLIST`, `APPS`, `TRIP_BUDGET`, `CHAPTERS`). Editar esos arrays actualiza automáticamente esas secciones.
- **Presupuestos diarios**: son tarjetas manuales (`.dashboard`) dentro de cada día — si cambiás un precio, actualizá también el "Total del día" y el "Acumulado del viaje" de los días siguientes a mano.

## Estructura

Un único archivo `index.html` (HTML + CSS + JS inline). Sin build, sin npm, sin frameworks.

## App complementaria (opcional)

La carpeta `app/` tiene una mini app aparte (Vite + MongoDB + Cloudinary) para
checklists interactivos y álbum de fotos con backend real. `index.html` puede
conectarse a ella completando `API_BASE` en su `<script>` — mientras esa
línea quede vacía, la guía sigue funcionando 100% local. Detalle completo en
[`app/README.md`](app/README.md).

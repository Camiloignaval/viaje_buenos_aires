# Alaia — Web Push y acompañamiento mínimo

## Alcance

La suscripción Web Push usa la API estándar, Service Worker y VAPID. La clave privada no llega al navegador: se configura solamente en Vercel con `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. El endpoint y sus claves se consideran capacidades secretas: se guardan sin logging y vinculados al usuario autenticado.

Una suscripción corresponde a un dispositivo y un usuario; un usuario puede tener varios dispositivos. `endpointHash` es único e idempotente. Un 404/410 del proveedor revoca la suscripción. El contenido visible en lock screen es neutral, sin nombres, fechas, notas, fotos ni ubicación.

## Consentimiento y plataformas

El permiso solo se solicita tras pulsar **Permitir acompañamiento** y con al menos un viaje. Nunca durante login o carga. En iPhone/iPad Safari no se solicita desde el navegador: se muestran instrucciones para instalar y abrir Alaia. WebKit documenta que Web Push en iOS/iPadOS requiere una web app agregada al inicio y una interacción directa: <https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/>.

Android/Chromium conserva `beforeinstallprompt`, lo captura temprano y lo dispara solamente por CTA. No se promete abrir una PWA instalada ni transferir una sesión entre Safari y standalone.

## Acompañamiento y scheduler

`lib/companionEngine.js` es puro, idempotente y timezone-safe: evalúa víspera, inicio, último día, regreso y semana posterior contra preferencias y eventos enviados. No hay geofencing, ubicación permanente, IA, clima ni notificaciones de actividades.

El scheduler queda explícitamente pendiente: el repositorio no declara un plan Vercel ni un scheduler configurado. En Hobby, Vercel limita Cron a una ejecución diaria y no garantiza el minuto dentro de la hora, lo que no permite prometer notificaciones temporales precisas por zona destino. Fuente: <https://vercel.com/docs/cron-jobs/usage-and-pricing>. Cuando exista infraestructura aprobada, debe ejecutar reconciliación idempotente y registrar sólo el tipo, viaje, fecha y resultado, no el contenido privado.

## Validación operativa

Antes de habilitar el envío real hay que configurar las tres variables VAPID en Vercel y obtener consentimiento explícito. El botón de prueba se limita a los propios dispositivos y lleva a `/trips`; no se envió ninguna notificación real durante el desarrollo.

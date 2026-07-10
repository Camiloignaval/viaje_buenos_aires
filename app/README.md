# Buenos Aires 2026 — App del viaje

Mini app web para vivir el viaje, no solo leerlo: checklists interactivos y un
álbum de recuerdos donde subir las fotos reales y escribir notas.

> **Esta carpeta contiene dos apps distintas, sin relación entre sí.** Todo lo
> de abajo (`index.html`, `main.js`, `data.js`, `storage.js`, `image.js`,
> `auth.js`, `style.css`, `api/memories.js`, `api/upload.js`, `lib/mongodb.js`,
> `lib/cloudinary.js`) es el prototipo original descrito en esta página.
> **Aurora** — el motor narrativo del viaje, con Story Engine, Memory Engine y
> (desde la Épica 5) backend propio de sincronización — vive en `src/story/`,
> `src/memory/`, `src/experience/`, `src/sync/`, `api/aurora/*` y
> `lib/aurora*.js`, y se abre desde `experience.html` (más `admin.html` como
> Aurora Studio, y `debug.html`/`memories.html` como herramientas internas).
> Aurora comparte la misma `MONGODB_URI` que el prototipo viejo (una sola
> variable de entorno) y usa sus propias claves de `localStorage`
> (`aurora:progress:*`, `aurora:memories:*`) — nunca las del prototipo. Ver
> `src/sync/README.md` para el detalle de la sincronización y
> `documentacion/PROJECT_STATUS_V1.md` para el estado consolidado de Aurora.

**Estado actual del prototipo original: Fase 2 — código del backend listo, falta desplegar.** El
código para MongoDB + Cloudinary ya está escrito (`api/`, `lib/`). La app
detecta sola si el backend responde:

- Corriendo con `npm run dev` (sin desplegar) → usa `localStorage` (modo local).
- Desplegada en Vercel con las variables de entorno cargadas → usa MongoDB + Cloudinary.

No hay que tocar código para "activar" el backend — simplemente empieza a
funcionar solo cuando lo detecta disponible.

## Estructura de carpetas

```
app/
├─ index.html            # shell HTML, monta la app en #app
├─ package.json
├─ .env.local             # tus credenciales — NUNCA se sube a git
├─ src/
│  ├─ main.js              # arma la UI y conecta los eventos (checkboxes, subir foto, notas)
│  ├─ data.js               # contenido estático: checklists + las 10 fotos del álbum
│  ├─ storage.js            # capa de datos — decide sola: API o localStorage
│  ├─ image.js               # comprime las fotos en el navegador antes de subirlas
│  ├─ auth.js                 # modal de contraseña para subir fotos
│  └─ style.css               # diseño (fondo #FAFAFC, morado #5A31F4, tarjetas redondeadas)
├─ lib/
│  ├─ mongodb.js          # conexión cacheada a MongoDB Atlas
│  ├─ cloudinary.js       # configuración del SDK de Cloudinary
│  └─ cors.js              # headers CORS — la guía (index.html) llama a esta API desde otro origen
├─ api/                    # funciones serverless de Vercel
│  ├─ memories.js           # GET (listar) / POST (crear)
│  ├─ memories/[id].js       # PATCH (actualizar) / DELETE (borrar)
│  ├─ upload.js               # sube una foto a Cloudinary (con contraseña)
│  └─ video-upload-signature.js # firma para subir video DIRECTO a Cloudinary
└─ public/
   └─ favicon.svg
```

## La guía (`index.html`, fuera de esta carpeta) también usa esta API

El archivo de la guía (`../index.html`, en la raíz del proyecto) es un HTML
estático aparte — no pasa por Vite. Tiene su propia copia mínima de esta
misma lógica (checklist, álbum, video) y llama a esta API por su cuenta.

Para que funcione, dentro de `index.html` hay que pegar la URL de esta app
una vez desplegada en Vercel. Buscá esta línea (cerca del inicio del
`<script>`, sección "BACKEND") y completala:

```js
var API_BASE = ""; // ej: "https://ba-trip-2026.vercel.app"
```

Mientras quede vacía, la guía sigue funcionando en modo local
(`localStorage`) sin romperse — simplemente no queda nada en Mongo/Cloudinary
hasta que se complete esa línea con la URL real.

## Cómo correr en local

```bash
cd app
npm install
npm run dev
```

Abre la URL que muestra la terminal (por defecto `http://localhost:5173`).

Para generar el build de producción (lo que se sube a Vercel):

```bash
npm run build
npm run preview   # para revisar el build localmente antes de desplegar
```

## Cómo está armada la app (para que puedas seguir el código)

- **`data.js`** tiene el contenido que no cambia: las categorías del
  checklist (Documentos, Equipaje, Apps, Dinero, Lugares, Momentos) y las 10
  fotos del álbum, cada una con su `id` fijo (`foto-1`, `foto-2`, ...).
- **`storage.js`** es la única pieza que sabe *dónde* vive el estado del
  usuario (`completed`, `note`, `imageUrl`). Al arrancar, prueba si
  `/api/memories` responde:
  - **Responde** → todas las lecturas/escrituras van por `fetch()` contra la
    API (Mongo + Cloudinary).
  - **No responde** (404, error de red — típico de `npm run dev` sin
    desplegar) → usa `localStorage`, igual que en la Fase 1 original.
  `main.js` llama siempre a las mismas funciones (`getMemories`,
  `upsertMemory`, `uploadImage`) sin saber cuál de los dos modos está activo.
- **`image.js`** comprime cada foto en el navegador (máximo 1600px de lado,
  JPEG calidad 0.82) antes de guardarla o subirla. Esto evita dos problemas:
  llenar el `localStorage` (tiene ~5-10MB de cupo total) y superar el límite
  de tamaño de request de las funciones serverless de Vercel (~4.5MB).
- **`auth.js`** muestra un modal pidiendo una contraseña antes de subir una
  foto, y la recuerda en `sessionStorage` para no repetirla toda la sesión.
  La validación real ocurre en el servidor (`api/upload.js`, contra la
  variable `UPLOAD_PASSWORD`) — si no configurás esa variable, no se pide
  contraseña (útil mientras solo probás vos).
- **`lib/mongodb.js`** cachea la conexión a Mongo entre invocaciones de la
  función serverless (evita abrir una conexión nueva en cada request).
- **`api/memories.js`**, **`api/memories/[id].js`** y **`api/upload.js`**
  implementan exactamente los endpoints pedidos: `GET`/`POST /api/memories`,
  `PATCH`/`DELETE /api/memories/:id`, `POST /api/upload`.

## Modelo de datos (`Memory`)

```js
{
  id: "foto-3",              // fijo, viene de data.js
  title: "Mafalda",
  day: 3,
  category: "fotos",
  completed: true,
  note: "Hicimos fila 10 minutos pero valió la pena",
  imageUrl: "https://res.cloudinary.com/.../foto-3.jpg", // o data URL en modo local
  cloudinaryPublicId: "ba-trip-2026/xxxxx",
  createdAt: "2026-07-18T...",
  updatedAt: "2026-07-18T...",
}
```

---

## Fase 2 — Desplegar el backend (MongoDB + Cloudinary + Vercel)

**El código ya está.** Ya creaste la cuenta de Mongo, el cluster, el usuario y
la cuenta de Cloudinary — lo que falta es cargar esas credenciales en
**Vercel** (no solo en tu `.env.local`, que es solo para tu compu) y
desplegar. Los pasos 1-8 quedan acá documentados por si algún día hay que
recrear algo desde cero.

### Paso 1 — Crear cuenta en MongoDB Atlas

1. Entrá a **https://www.mongodb.com/cloud/atlas/register**
2. Registrate con tu email o con tu cuenta de Google.
3. Cuando te pregunte "What is your goal today?" o similar, elegí cualquier
   opción — no importa, se puede saltar.

### Paso 2 — Crear un cluster gratis

1. Te va a ofrecir crear un cluster. Elegí el plan **M0 (Free)**.
2. Como proveedor da igual (AWS/Google/Azure); elegí la región más cercana a
   Chile (por ejemplo `São Paulo` o `us-east-1`).
3. Ponele un nombre simple, por ejemplo `ba-trip-cluster`.
4. Click en **Create** y esperá 2-3 minutos a que se aprovisione.

### Paso 3 — Crear un usuario de base de datos

1. En el asistente que aparece ("Security Quickstart" o similar), en
   **Username and Password**, creá un usuario, por ejemplo `ba-trip-user`.
2. Generá una contraseña segura (el mismo Atlas te ofrece un botón
   "Autogenerate Secure Password") y **guardala en un lugar seguro** — no la
   vas a poder ver de nuevo después.
3. En **Network Access**, agregá `0.0.0.0/0` ("Allow access from anywhere")
   — es lo más simple para este proyecto personal. Si más adelante te importa
   más la seguridad, se puede restringir a las IPs de Vercel.

### Paso 4 — Obtener el connection string

1. Cuando el cluster esté listo, click en **Connect**.
2. Elegí **Drivers** (a veces dice "Connect your application").
3. Copiá el string que empieza con `mongodb+srv://...` — se ve así:
   ```
   mongodb+srv://ba-trip-user:<password>@ba-trip-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Reemplazá `<password>` por la contraseña real del Paso 3.

### Paso 5 — Crear la base de datos `ba_trip`

1. En el connection string de arriba, agregá el nombre de la base justo
   después de `.net/` y antes de `?`:
   ```
   mongodb+srv://ba-trip-user:TU_PASSWORD@ba-trip-cluster.xxxxx.mongodb.net/ba_trip?retryWrites=true&w=majority
   ```
   (Mongo crea la base sola la primera vez que se guarda algo — no hace falta
   crearla a mano desde la interfaz.)

### Paso 6 — La colección `memories`

No hace falta crearla a mano tampoco — se crea sola la primera vez que la API
guarde un recuerdo. Si preferís crearla manualmente: **Database → Browse
Collections → Add My Own Data** → Database name `ba_trip`, Collection name
`memories`.

### Paso 7 — Crear cuenta en Cloudinary

1. Entrá a **https://cloudinary.com/users/register/free**
2. Registrate con email o Google. El plan **Free** alcanza de sobra para este
   proyecto.

### Paso 8 — Obtener las credenciales de Cloudinary

1. Una vez adentro, andá al **Dashboard** (es la primera pantalla que ves al
   loguearte).
2. Ahí vas a ver, arriba, un cuadro **"Product Environment Credentials"** con
   tres datos:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click en el ícono de ojo para revelarlo)
3. Copiá los tres — son los que necesito.

### Paso 9 — Crear proyecto en Vercel

1. Entrá a **https://vercel.com/signup** y registrate (lo más simple: con tu
   cuenta de GitHub).
2. Si el código va a vivir en GitHub: subí la carpeta `app/` a un repositorio
   nuevo, y en Vercel elegí **Add New → Project → Import** ese repositorio.
3. Si todavía no querés usar GitHub, avisame y lo desplegamos directo desde
   la terminal con `vercel deploy` (te voy guiando en ese momento).

### Paso 10 — Configurar las variables de entorno en Vercel

1. Dentro del proyecto en Vercel: **Settings → Environment Variables**.
2. Agregá estas 5, una por una (nombre exacto a la izquierda, valor a la
   derecha) — son las mismas 4 que ya tenés en tu `.env.local`, más una nueva
   opcional:

   | Nombre | Valor | ¿Obligatoria? |
   |---|---|---|
   | `MONGODB_URI` | el connection string completo, con `/buenos_aires` | Sí |
   | `CLOUDINARY_CLOUD_NAME` | del Paso 8 | Sí |
   | `CLOUDINARY_API_KEY` | del Paso 8 | Sí |
   | `CLOUDINARY_API_SECRET` | del Paso 8 | Sí |
   | `UPLOAD_PASSWORD` | una contraseña que inventes vos (para que no cualquiera con el link pueda subir fotos) | No — si la dejás vacía, no se pide contraseña |

3. Marcá los 3 entornos (Production, Preview, Development) para cada una.
4. Guardá y hacé un **Redeploy** del proyecto para que tomen efecto.

### Probar el backend en tu compu antes de desplegar (opcional)

Si tenés la CLI de Vercel instalada (`npm i -g vercel`), podés probar la API
localmente sin desplegar nada, usando las variables de tu `.env.local`:

```bash
cd app
vercel dev
```

Esto sí ejecuta las funciones de `api/` de verdad (a diferencia de
`npm run dev`, que solo sirve el frontend). Si `MONGODB_URI` o las de
Cloudinary están mal cargadas, vas a ver el error apenas abras la app.

---

## Épica 5 — Backend de Aurora (variables de entorno)

Comparte la conexión Mongo del backend del prototipo viejo (`MONGODB_URI`, abajo) — antes usaba una `AURORA_MONGODB_URI` separada, unificada para evitar mantener dos variables para el mismo cluster. Variables necesarias en `.env.local`/Vercel:

| Variable | Qué es | ¿Nueva o reusada? |
|---|---|---|
| `MONGODB_URI` | Connection string a Mongo Atlas — la misma que usa el prototipo viejo (`lib/mongodb.js`) | Reusada |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Las fotos de Aurora van a la carpeta `aurora/<storyId>`, en la misma cuenta | Reusada |
| `AURORA_ADMIN_PASSWORD` | Contraseña para publicar historias desde Aurora Studio (`admin.html`) | Nueva |

Sin `MONGODB_URI`, `/api/aurora/*` responde `503` (nunca crashea) y Aurora sigue funcionando 100% local — ver `src/sync/README.md`.

---

## Checklist final de configuración (para ir tildando)

- [x] Cuenta creada en MongoDB Atlas
- [x] Cluster creado
- [x] Usuario de base de datos creado (con contraseña guardada)
- [x] Connection string con la base `buenos_aires` agregada, en `.env.local`
- [x] Cuenta creada en Cloudinary
- [x] Cloud Name / API Key / API Secret copiados, en `.env.local`
- [ ] (Opcional) `UPLOAD_PASSWORD` elegida y agregada a `.env.local`
- [ ] Cuenta creada en Vercel
- [ ] Proyecto importado o listo para `vercel deploy`
- [ ] Las variables de entorno cargadas en Vercel (4 obligatorias + `UPLOAD_PASSWORD` opcional)
- [ ] Redeploy hecho después de cargar las variables

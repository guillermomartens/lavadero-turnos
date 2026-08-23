# Cómo publicar AquaTurnos gratis (paso a paso, sin usar la terminal)

Esta guía asume que no tenés experiencia técnica. Vas a necesitar:
- Una cuenta de GitHub (gratis)
- Una cuenta de Turso (gratis) — acá vive la base de datos
- Una cuenta de Render (gratis) — acá vive el servidor

Tiempo estimado: 20-30 minutos la primera vez.

---

## Paso 1 — Subir el código a GitHub

1. Andá a [github.com](https://github.com) y creá una cuenta (o iniciá sesión si ya tenés).
2. Arriba a la derecha, hacé clic en el **+** y elegí **New repository**.
3. Ponele de nombre, por ejemplo, `lavadero-turnos`. Dejalo en **Public** o **Private**
   (cualquiera de las dos sirve para lo que necesitamos). Hacé clic en **Create repository**.
4. En la página del repositorio recién creado, buscá el enlace que dice
   **"uploading an existing file"** (o andá a **Add file → Upload files**).
5. Descomprimí en tu computadora el .zip que te entregué (`lavadero-turnos.zip`).
6. Arrastrá **todo el contenido de la carpeta** (no la carpeta en sí, sino lo que está
   adentro: `backend`, `public`, `admin`, `package.json`, etc.) a la zona de carga de GitHub.
   *No subas la carpeta `node_modules` si la tenés — no hace falta, GitHub la va a instalar solo.*
7. Abajo de todo, hacé clic en **Commit changes**.

Listo, tu código ya está en GitHub.

---

## Paso 2 — Crear la base de datos en Turso (gratis, para siempre)

1. Andá a [turso.tech](https://turso.tech) y creá una cuenta (podés entrar con tu cuenta
   de GitHub, es más rápido).
2. Una vez adentro, buscá el botón **Create Database** (o "New Database").
3. Ponele un nombre, por ejemplo `lavadero-db`. Elegí la región más cercana a Mendoza
   (si aparece algo como "São Paulo" o "South America", esa es la mejor opción; si no,
   cualquier región de EE.UU. también funciona bien).
4. Cuando la base esté creada, entrá a ella y buscá dos datos que vas a necesitar:
   - **Database URL** (empieza con `libsql://...`)
   - **Auth Token** (un texto largo — normalmente hay un botón "Create Token" o "Generate Token")
5. Copiá esos dos valores en un bloc de notas, los vas a pegar en el próximo paso.

---

## Paso 3 — Crear el servidor en Render (gratis)

1. Andá a [render.com](https://render.com) y creá una cuenta (podés entrar con GitHub).
2. Hacé clic en **New +** → **Web Service**.
3. Elegí **Build and deploy from a Git repository** y conectá tu cuenta de GitHub si te
   lo pide. Seleccioná el repositorio `lavadero-turnos` que creaste en el Paso 1.
4. Completá el formulario así:
   - **Name:** `lavadero-turnos` (o el nombre que quieras)
   - **Region:** la más cercana disponible (Oregon suele ser la opción por defecto)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
5. Antes de crear el servicio, buscá la sección **Environment Variables** (o "Advanced" →
   "Add Environment Variable") y cargá estas tres:

   | Key | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | (el que copiaste de Turso en el Paso 2) |
   | `TURSO_AUTH_TOKEN` | (el que copiaste de Turso en el Paso 2) |
   | `JWT_SECRET` | Inventá una frase larga y secreta, por ejemplo `mendoza-lavadero-clave-2026-xyz` |

6. Hacé clic en **Create Web Service**.

Render va a instalar todo y arrancar el servidor. Esto tarda 2-5 minutos. Vas a ver los
logs en pantalla; cuando diga algo como `Servidor de turnos corriendo`, ya está listo.

Render te va a dar una URL parecida a `https://lavadero-turnos.onrender.com` — esa es tu
sitio en vivo.

---

## Paso 4 — Cargar los datos iniciales (categorías, servicios, sectores)

La primera vez, la base de datos en Turso está vacía. Tenés dos formas de cargarla:

**Opción A (recomendada, sin terminal):** entrá al back office
(`https://tu-sitio.onrender.com/admin`), iniciá sesión, y cargá manualmente tus
categorías, servicios y sectores desde las pantallas correspondientes.

Para el primer ingreso vas a necesitar un usuario admin. Como la base está vacía,
todavía no existe ninguno — seguí la **Opción B** primero solo para crear ese usuario
y los datos de ejemplo, y después edítalos o borralos desde el panel.

**Opción B (con el botón "Shell" de Render, una sola vez):**

1. En el dashboard de tu servicio en Render, buscá la pestaña **Shell** (arriba, junto a
   "Logs", "Environment", etc.). Te abre una terminal dentro de tu propio servidor,
   sin que vos tengas que instalar nada.
2. Escribí exactamente esto y presioná Enter:
   ```
   npm run seed
   ```
3. Esperá el mensaje `✅ Seed completo.` — ya tenés categorías, servicios, sectores,
   horarios de ejemplo, y el usuario admin de prueba:
   ```
   Email:    admin@lavadero.com
   Password: admin123
   ```
4. Entrá a `https://tu-sitio.onrender.com/admin` con esas credenciales, **cambiá la
   contraseña de inmediato** (ver más abajo cómo), y desde ahí editá o borrá las
   categorías/servicios de ejemplo y cargá los tuyos.

### Cómo cambiar la contraseña del admin de prueba

Por ahora esto requiere el mismo "Shell" de Render. Escribí:
```
node
```
y luego, línea por línea:
```js
const bcrypt = require('bcryptjs');
const db = require('./backend/db/query');
db.run("UPDATE admin_users SET password_hash = ? WHERE email = 'admin@lavadero.com'", [bcrypt.hashSync('TU-CLAVE-NUEVA-ACA', 10)]).then(() => process.exit());
```
(Reemplazá `TU-CLAVE-NUEVA-ACA` por la contraseña que quieras usar.)

---

## Cosas importantes para saber

- **El plan free de Render "duerme" el servidor** después de 15 minutos sin uso. La
  primera visita después de estar dormido tarda unos 30-60 segundos en responder — es
  normal, no es un error. Las visitas siguientes son rápidas.
- **Los datos NO se pierden**, aunque el servidor se reinicie o dormite, porque viven en
  Turso, no en el servidor de Render.
- Cada vez que subas cambios de código a GitHub, Render vuelve a desplegar automáticamente.
- Turso tiene un límite gratuito muy generoso (500 bases de datos, varios GB de
  almacenamiento) — para un lavadero, nunca deberías llegar a pagar nada.

## Si en el futuro querés conectar un dominio propio (ej. turnos.tulavadero.com.ar)

Tanto Render como el registrador de tu dominio (Nic.ar, GoDaddy, etc.) tienen una
sección para "Custom Domain" / "Dominios personalizados". Ahí es donde sí podés usar
**Cloudflare** si querés: comprás o transferís el dominio, y usás Cloudflare solo como
DNS/proxy delante de la URL que te dio Render. Si llegás a ese punto, decime y te
armo esa guía también.

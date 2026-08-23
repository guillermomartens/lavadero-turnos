# AquaTurnos — Sistema de turnos para lavadero de vehículos

Aplicación web completa (backend + base de datos + frontend) para gestionar turnos
de un lavadero de autos: vista de cliente para reservar, y back office para
administrar servicios, sectores, horarios, la agenda diaria y reportes.

## Stack (liviano, sin frameworks pesados)

- **Backend:** Node.js + Express
- **Base de datos:** SQLite compatible vía [Turso](https://turso.tech) (libSQL) — en
  producción vive en la nube de Turso (plan gratuito), y en desarrollo local, si no
  configurás credenciales de Turso, usa automáticamente un archivo `.db` en disco
  (mismo motor SQLite, cero configuración)
- **Frontend:** HTML + CSS + JavaScript vanilla (sin React/Vue/build step)
- **Autenticación admin:** JWT

**¿Querés publicarlo gratis en internet ya mismo?** Seguí la guía paso a paso (sin usar
la terminal) en [`DEPLOY.md`](./DEPLOY.md) — usa Render + Turso, ambos con plan gratuito
permanente.

## Estructura del proyecto

```
lavadero-turnos/
├── backend/
│   ├── server.js              # Servidor Express (arranca todo)
│   ├── db/
│   │   ├── schema.sql         # Esquema de la base de datos
│   │   ├── connection.js      # Cliente libSQL (Turso en prod, archivo local en dev)
│   │   ├── query.js           # Helper de queries (get/all/run/withTransaction)
│   │   ├── seed.js            # Datos de ejemplo + usuario admin de prueba
│   │   └── lavadero.db        # (solo en modo local; se genera solo, no se versiona)
│   ├── middleware/auth.js     # Verificación de JWT
│   ├── utils/disponibilidad.js# Lógica de cálculo de horarios libres
│   └── routes/
│       ├── auth.js            # POST /api/auth/login
│       ├── public.js          # Endpoints públicos (cliente)
│       ├── admin_turnos.js    # Agenda / gestión de turnos
│       ├── admin_catalogo.js  # CRUD categorías, servicios, sectores, horarios
│       └── admin_reportes.js  # Estadísticas
├── public/                    # Vista del cliente (se sirve en "/")
│   ├── index.html
│   ├── css/styles.css
│   └── js/app.js
├── admin/                     # Back office (se sirve en "/admin")
│   ├── index.html
│   ├── css/admin.css
│   └── js/ (api.js, ui.js, agenda.js, servicios.js, sectores.js, reportes.js, main.js)
├── package.json
└── .env.example
```

## Instalación y puesta en marcha

Requiere **Node.js 18 o superior**.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editá .env y cambiá JWT_SECRET por una clave secreta propia.
# Si querés usar Turso (recomendado para producción), completá también
# TURSO_DATABASE_URL y TURSO_AUTH_TOKEN (ver DEPLOY.md). Si los dejás vacíos,
# el sistema usa automáticamente un archivo local backend/db/lavadero.db —
# perfecto para probar en tu computadora sin crear ninguna cuenta.

# 3. Cargar datos de ejemplo (categorías, servicios, sectores, horarios y un admin de prueba)
npm run seed

# 4. Iniciar el servidor
npm start
```

Para publicarlo gratis en internet (sin usar la terminal en ningún momento), seguí
[`DEPLOY.md`](./DEPLOY.md).

Por defecto queda disponible en:

- **Vista cliente:** http://localhost:3000/
- **Back office:** http://localhost:3000/admin

### Usuario admin de prueba (creado por el seed)

```
Email:    admin@lavadero.com
Password: admin123
```

**Importante:** cambiá esta contraseña (o creá un nuevo usuario y desactivá este)
antes de usar el sistema en producción. La tabla `admin_users` guarda la
contraseña hasheada con bcrypt; para crear un usuario nuevo podés usar la
consola de Node:

```js
const bcrypt = require('bcryptjs');
const db = require('./backend/db/connection');
db.prepare('INSERT INTO admin_users (nombre, email, password_hash) VALUES (?, ?, ?)')
  .run('Tu Nombre', 'tu@email.com', bcrypt.hashSync('tu-clave-segura', 10));
```

## Cómo funciona

### Vista del cliente (`/`)

Formulario de 5 pasos, inspirado en la experiencia de reserva de WashPoint:

1. **Datos** — teléfono (con detección automática de "cliente que vuelve"), nombre, apellido, e-mail
2. **Vehículo** — tipo de vehículo, marca y patente
3. **Servicio** — categoría, servicio y sector (los servicios pueden restringirse
   a ciertos tipos de vehículo, ej. "Express Moto" solo para motos)
4. **Turno** — fecha y horario, calculado en tiempo real según disponibilidad real
   (respeta horarios de atención, capacidad del sector y turnos ya ocupados)
5. **Confirmación** — resumen y "pagar después" (igual que el sistema de referencia)

El botón **"Mis turnos"** en la parte superior permite buscar por teléfono,
ver el historial y cancelar turnos propios que aún no se completaron.

### Back office (`/admin`)

- **Agenda:** todos los turnos del día (o del filtro elegido), cambio de estado
  (pendiente → confirmado → en proceso → completado / cancelado / no asistió),
  marcar como pagado, alta manual de turnos, eliminación.
- **Servicios y categorías:** alta/edición/baja de categorías y de los
  servicios que se ofrecen (nombre, duración, precio, a qué vehículos aplica).
- **Sectores y horarios:** boxes/bahías de lavado, su capacidad (cuántos autos
  simultáneos admite) y el horario de atención por día de la semana.
- **Reportes:** turnos totales, completados, cancelados, ingresos cobrados vs.
  potenciales, gráfico de turnos por día, ranking de servicios, sectores y
  mejores clientes — todo filtrable por rango de fechas.

## Cómo se calcula la disponibilidad

La lógica vive en `backend/utils/disponibilidad.js`. Para un sector + servicio
+ fecha dados:

1. Busca el horario de atención de ese sector para ese día de la semana.
2. Genera franjas cada 15 minutos dentro de ese horario, del largo de la
   duración del servicio.
3. Descarta las franjas que se solapen con bloqueos puntuales (feriados,
   mantenimiento) o que ya estén ocupadas por la cantidad de turnos igual a la
   capacidad del sector.
4. Si la fecha es hoy, descarta horarios ya pasados.

Antes de guardar un turno, el servidor vuelve a validar la disponibilidad
(evita que dos personas reserven el mismo horario al mismo tiempo).

## Personalización rápida

- **Nombre y logo:** editá `public/index.html` y `admin/index.html` (el bloque
  `.brand`) y el emoji 🚿 por tu isotipo.
- **Colores:** están centralizados como variables CSS en `public/css/styles.css`
  y `admin/css/admin.css` (`:root { --teal-900, --aqua-400, ... }`).
- **Categorías/servicios/sectores/horarios iniciales:** editá
  `backend/db/seed.js` o cargalos directamente desde el back office una vez
  levantado el sistema.

## Despliegue

Al usar Turso (base de datos en la nube) en vez de un archivo SQLite local, la app
**no necesita disco persistente** en el servidor — esto la hace compatible con planes
gratuitos que antes no servían para esto (como el free tier de Render). Ver la guía
completa y gratuita en [`DEPLOY.md`](./DEPLOY.md).

También podés desplegarla en:

- Un VPS propio (con `pm2` o `systemd` para mantener el proceso vivo) — con o sin Turso,
  ya que en un VPS sí tenés disco persistente propio
- Railway, Fly.io u otro servicio con soporte para Node
- Una PC/mini-PC en el propio local, si preferís no depender de internet para
  el back office (la vista de cliente sí necesitaría exponerse a internet para
  que los clientes reserven desde afuera)

Recordá siempre:
1. Cambiar `JWT_SECRET` en `.env`/variables de entorno por un valor propio y secreto.
2. Servir el sitio con HTTPS en producción (Render, Railway y similares ya lo hacen
   automáticamente).
3. Turso hace backups automáticos de tu base, pero para mayor tranquilidad podés
   exportarla periódicamente desde su panel.

## Próximos pasos sugeridos (no incluidos en esta versión)

- Envío de recordatorios por e-mail/WhatsApp
- Integración de pago online real (Mercado Pago, etc.) — hoy solo existe la
  opción "pagar después"
- Roles diferenciados dentro del back office (admin vs. operador)
- Exportar reportes a Excel/PDF

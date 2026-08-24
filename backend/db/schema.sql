-- ==========================================================
-- Esquema de base de datos - Sistema de Turnos Lavadero
-- ==========================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin', -- admin | operador
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  email TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- Auto, Camioneta, SUV, Utilitario, Moto, Cuatriciclo, Bicicleta
  marca TEXT,
  patente TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sectores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  capacidad INTEGER NOT NULL DEFAULT 1, -- turnos simultaneos
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_min INTEGER NOT NULL DEFAULT 30,
  activo INTEGER NOT NULL DEFAULT 1,
  aplica_tipo_vehiculo TEXT -- JSON array opcional: ["Auto","SUV"] o NULL = todos
);

-- Asocia un servicio a una o mas categorias, cada una con su propio precio
-- (un mismo servicio puede valer distinto en AquaGo que en Wash Point, por ejemplo)
CREATE TABLE IF NOT EXISTS servicio_categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  precio REAL NOT NULL DEFAULT 0,
  UNIQUE(servicio_id, categoria_id)
);

-- Horarios de atencion por sector y dia de semana (0=Domingo ... 6=Sabado)
CREATE TABLE IF NOT EXISTS horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER NOT NULL REFERENCES sectores(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL, -- 0-6
  hora_inicio TEXT NOT NULL, -- 'HH:MM'
  hora_fin TEXT NOT NULL,    -- 'HH:MM'
  activo INTEGER NOT NULL DEFAULT 1
);

-- Bloqueos puntuales (feriados, mantenimiento, etc.)
CREATE TABLE IF NOT EXISTS bloqueos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER REFERENCES sectores(id) ON DELETE CASCADE, -- NULL = todos los sectores
  fecha TEXT NOT NULL, -- 'YYYY-MM-DD'
  hora_inicio TEXT,    -- NULL = todo el dia
  hora_fin TEXT,
  motivo TEXT
);

CREATE TABLE IF NOT EXISTS turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  vehiculo_id INTEGER REFERENCES vehiculos(id),
  servicio_id INTEGER NOT NULL REFERENCES servicios(id),
  categoria_id INTEGER REFERENCES categorias(id),
  sector_id INTEGER NOT NULL REFERENCES sectores(id),
  fecha TEXT NOT NULL,        -- 'YYYY-MM-DD'
  hora_inicio TEXT NOT NULL,  -- 'HH:MM'
  hora_fin TEXT NOT NULL,     -- 'HH:MM'
  precio REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|confirmado|en_proceso|completado|cancelado|no_show
  estado_pago TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|pagado
  notas TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_sector_fecha ON turnos(sector_id, fecha);
CREATE INDEX IF NOT EXISTS idx_turnos_cliente ON turnos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_servicio_categorias_servicio ON servicio_categorias(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_categorias_categoria ON servicio_categorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_horarios_sector ON horarios(sector_id);

const db = require('./query');

/**
 * Migra bases de datos creadas con el esquema viejo (donde cada servicio
 * tenía una sola categoria_id y un solo precio) al esquema nuevo, donde un
 * servicio puede asociarse a varias categorías, cada una con su propio precio.
 *
 * Es segura de ejecutar en cada arranque del servidor: primero revisa qué
 * columnas/tablas ya existen y no repite trabajo si ya se migró antes.
 */
async function migrarServicioCategorias() {
  // 1) Asegurar que exista la tabla de asociación (ya la crea schema.sql,
  //    pero la repetimos acá por si esta función se llama en otro orden).
  await db.run(`
    CREATE TABLE IF NOT EXISTS servicio_categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
      categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
      precio REAL NOT NULL DEFAULT 0,
      UNIQUE(servicio_id, categoria_id)
    )
  `);

  // 2) ¿La tabla "servicios" todavía tiene las columnas viejas categoria_id/precio?
  const columnas = await db.all(`PRAGMA table_info(servicios)`);
  const tieneCategoriaId = columnas.some(c => c.name === 'categoria_id');
  const tienePrecio = columnas.some(c => c.name === 'precio');

  if (tieneCategoriaId && tienePrecio) {
    // 2a) Copiar los datos existentes (categoria + precio) a la nueva tabla de asociación
    const legacy = await db.all(
      `SELECT id, categoria_id, precio FROM servicios WHERE categoria_id IS NOT NULL`
    );
    let migrados = 0;
    for (const s of legacy) {
      const yaExiste = await db.get(
        `SELECT id FROM servicio_categorias WHERE servicio_id = ? AND categoria_id = ?`,
        [s.id, s.categoria_id]
      );
      if (!yaExiste) {
        await db.run(
          `INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`,
          [s.id, s.categoria_id, s.precio]
        );
        migrados++;
      }
    }

    // 2b) Recrear la tabla "servicios" sin las columnas viejas (categoria_id/precio
    //     tenían NOT NULL, lo que impediría cargar servicios compartidos entre categorías).
    //     Se preservan todos los IDs, nombres y demás datos.
    await db.run(`ALTER TABLE servicios RENAME TO servicios_legacy_tmp`);
    await db.run(`
      CREATE TABLE servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        duracion_min INTEGER NOT NULL DEFAULT 30,
        activo INTEGER NOT NULL DEFAULT 1,
        aplica_tipo_vehiculo TEXT
      )
    `);
    await db.run(`
      INSERT INTO servicios (id, nombre, descripcion, duracion_min, activo, aplica_tipo_vehiculo)
      SELECT id, nombre, descripcion, duracion_min, activo, aplica_tipo_vehiculo FROM servicios_legacy_tmp
    `);
    await db.run(`DROP TABLE servicios_legacy_tmp`);

    if (migrados > 0) {
      console.log(`🔄 Migración: ${migrados} servicio(s) convertido(s) al nuevo esquema de categorías múltiples.`);
    }
    console.log('🔄 Migración: tabla "servicios" actualizada (ya no requiere una única categoría/precio fijo).');
  }
}

/** Agrega la columna categoria_id a "turnos" si la base es de una version anterior. */
async function migrarTurnoCategoria() {
  const columnas = await db.all(`PRAGMA table_info(turnos)`);
  const tieneCategoriaId = columnas.some(c => c.name === 'categoria_id');
  if (!tieneCategoriaId) {
    await db.run(`ALTER TABLE turnos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id)`);
    console.log('🔄 Migración: agregada columna categoria_id a turnos.');
  }
}

async function runMigrations() {
  await migrarTurnoCategoria();
  await migrarServicioCategorias();
}

module.exports = { runMigrations };

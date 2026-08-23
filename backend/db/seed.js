const bcrypt = require('bcryptjs');
const { initSchema } = require('./connection');
const db = require('./query');

/** Carga datos de ejemplo. Segura de llamar aunque ya haya datos (usa INSERT OR IGNORE
 *  para el admin, y solo crea categorías/servicios/sectores si la tabla está vacía). */
async function runSeed() {
  await initSchema();

  const passwordHash = bcrypt.hashSync('admin123', 10);
  await db.run(
    `INSERT OR IGNORE INTO admin_users (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)`,
    ['Administrador', 'admin@lavadero.com', passwordHash, 'admin']
  );

  const existentes = await db.get('SELECT COUNT(*) as c FROM categorias');
  if (existentes.c > 0) {
    console.log('ℹ️  Ya hay categorías cargadas, no se agregan datos de ejemplo nuevamente.');
    return;
  }

  const cat1 = await db.run(`INSERT INTO categorias (nombre, orden) VALUES (?, ?)`, ['Lavadero Principal', 1]);
  const catLavadero = cat1.lastInsertRowid;
  const cat2 = await db.run(`INSERT INTO categorias (nombre, orden) VALUES (?, ?)`, ['Lavado Express', 2]);
  const catExpress = cat2.lastInsertRowid;

  const sec1 = await db.run(`INSERT INTO sectores (nombre, categoria_id, capacidad) VALUES (?, ?, ?)`, ['Box 1', catLavadero, 1]);
  const sectorBox1 = sec1.lastInsertRowid;
  const sec2 = await db.run(`INSERT INTO sectores (nombre, categoria_id, capacidad) VALUES (?, ?, ?)`, ['Box 2', catLavadero, 1]);
  const sectorBox2 = sec2.lastInsertRowid;
  const sec3 = await db.run(`INSERT INTO sectores (nombre, categoria_id, capacidad) VALUES (?, ?, ?)`, ['Bahía Express', catExpress, 2]);
  const sectorExpress = sec3.lastInsertRowid;

  await db.run(
    `INSERT INTO servicios (categoria_id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)`,
    [catLavadero, 'Lavado Completo', 'Exterior + interior + aspirado', 45, 8000, null]
  );
  await db.run(
    `INSERT INTO servicios (categoria_id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)`,
    [catLavadero, 'Lavado Exterior', 'Carrocería y llantas', 25, 5000, null]
  );
  await db.run(
    `INSERT INTO servicios (categoria_id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)`,
    [catLavadero, 'Encerado', 'Encerado protector de pintura', 60, 12000, JSON.stringify(['Auto', 'Camioneta', 'SUV'])]
  );
  await db.run(
    `INSERT INTO servicios (categoria_id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)`,
    [catExpress, 'Express Auto', 'Lavado rápido exterior', 15, 3500, JSON.stringify(['Auto'])]
  );
  await db.run(
    `INSERT INTO servicios (categoria_id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?, ?, ?)`,
    [catExpress, 'Express Moto', 'Lavado rápido para motos', 10, 2000, JSON.stringify(['Moto'])]
  );

  for (let dia = 1; dia <= 6; dia++) {
    await db.run(`INSERT INTO horarios (sector_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`, [sectorBox1, dia, '08:00', '18:00']);
    await db.run(`INSERT INTO horarios (sector_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`, [sectorBox2, dia, '08:00', '18:00']);
  }
  for (let dia = 0; dia <= 6; dia++) {
    await db.run(`INSERT INTO horarios (sector_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`, [sectorExpress, dia, '09:00', '20:00']);
  }

  console.log('✅ Datos de ejemplo cargados (categorías, servicios, sectores, horarios, admin de prueba).');
}

// Si se ejecuta directamente (node backend/db/seed.js / npm run seed), corre y termina.
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error al cargar datos de ejemplo:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };

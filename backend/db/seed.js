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

  // Servicio exclusivo de "Lavadero Principal"
  const s1 = await db.run(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?)`,
    ['Lavado Completo', 'Exterior + interior + aspirado', 45, null]
  );
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s1.lastInsertRowid, catLavadero, 8000]);

  // Servicio disponible en AMBAS categorías, con precio distinto en cada una
  const s2 = await db.run(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?)`,
    ['Lavado Exterior', 'Carrocería y llantas', 25, null]
  );
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s2.lastInsertRowid, catLavadero, 5000]);
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s2.lastInsertRowid, catExpress, 4000]);

  const s3 = await db.run(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?)`,
    ['Encerado', 'Encerado protector de pintura', 60, JSON.stringify(['Auto', 'Camioneta', 'SUV'])]
  );
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s3.lastInsertRowid, catLavadero, 12000]);

  // Servicios exclusivos de "Lavado Express"
  const s4 = await db.run(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?)`,
    ['Express Auto', 'Lavado rápido exterior', 15, JSON.stringify(['Auto'])]
  );
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s4.lastInsertRowid, catExpress, 3500]);

  const s5 = await db.run(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo) VALUES (?, ?, ?, ?)`,
    ['Express Moto', 'Lavado rápido para motos', 10, JSON.stringify(['Moto'])]
  );
  await db.run(`INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)`, [s5.lastInsertRowid, catExpress, 2000]);

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

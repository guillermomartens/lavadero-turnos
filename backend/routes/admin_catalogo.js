const express = require('express');
const db = require('../db/query');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function wrap(fn) {
  return (req, res) => fn(req, res).catch(err => {
    console.error(err);
    res.status(500).json({ error: 'Error interno.' });
  });
}

// ---------------- Categorias ----------------
router.get('/categorias', wrap(async (req, res) => {
  res.json(await db.all('SELECT * FROM categorias ORDER BY orden, nombre'));
}));
router.post('/categorias', wrap(async (req, res) => {
  const { nombre, orden } = req.body;
  const info = await db.run('INSERT INTO categorias (nombre, orden) VALUES (?, ?)', [nombre, orden || 0]);
  res.status(201).json(await db.get('SELECT * FROM categorias WHERE id = ?', [info.lastInsertRowid]));
}));
router.put('/categorias/:id', wrap(async (req, res) => {
  const { nombre, orden, activo } = req.body;
  await db.run(
    'UPDATE categorias SET nombre = COALESCE(?, nombre), orden = COALESCE(?, orden), activo = COALESCE(?, activo) WHERE id = ?',
    [nombre ?? null, orden ?? null, activo ?? null, req.params.id]
  );
  res.json(await db.get('SELECT * FROM categorias WHERE id = ?', [req.params.id]));
}));
router.delete('/categorias/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------------- Servicios ----------------
// Cada servicio puede estar asociado a una o mas categorias, cada una con su
// propio precio (ver tabla servicio_categorias). Este endpoint devuelve cada
// servicio junto con la lista de categorias en las que está disponible.
router.get('/servicios', wrap(async (req, res) => {
  const servicios = await db.all('SELECT * FROM servicios ORDER BY nombre');
  const asociaciones = await db.all(`
    SELECT sc.id, sc.servicio_id, sc.categoria_id, sc.precio, c.nombre as categoria_nombre
    FROM servicio_categorias sc JOIN categorias c ON c.id = sc.categoria_id
    ORDER BY c.orden, c.nombre
  `);
  const resultado = servicios.map(s => ({
    ...s,
    categorias: asociaciones.filter(a => a.servicio_id === s.id)
  }));
  res.json(resultado);
}));

router.post('/servicios', wrap(async (req, res) => {
  const { nombre, descripcion, duracion_min, aplica_tipo_vehiculo, categorias } = req.body;
  // categorias: [{ categoria_id, precio }, ...] (opcional, se puede asociar despues)
  const info = await db.run(`
    INSERT INTO servicios (nombre, descripcion, duracion_min, aplica_tipo_vehiculo)
    VALUES (?, ?, ?, ?)
  `, [nombre, descripcion || null, duracion_min || 30,
      aplica_tipo_vehiculo ? JSON.stringify(aplica_tipo_vehiculo) : null]);

  const servicioId = info.lastInsertRowid;

  if (Array.isArray(categorias)) {
    for (const c of categorias) {
      await db.run(
        'INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)',
        [servicioId, c.categoria_id, c.precio || 0]
      );
    }
  }

  res.status(201).json(await db.get('SELECT * FROM servicios WHERE id = ?', [servicioId]));
}));

router.put('/servicios/:id', wrap(async (req, res) => {
  const { nombre, descripcion, duracion_min, activo, aplica_tipo_vehiculo } = req.body;
  await db.run(`
    UPDATE servicios SET
      nombre = COALESCE(?, nombre),
      descripcion = COALESCE(?, descripcion),
      duracion_min = COALESCE(?, duracion_min),
      activo = COALESCE(?, activo),
      aplica_tipo_vehiculo = COALESCE(?, aplica_tipo_vehiculo)
    WHERE id = ?
  `, [nombre ?? null, descripcion ?? null, duracion_min ?? null,
      activo ?? null, aplica_tipo_vehiculo ? JSON.stringify(aplica_tipo_vehiculo) : null, req.params.id]);
  res.json(await db.get('SELECT * FROM servicios WHERE id = ?', [req.params.id]));
}));

router.delete('/servicios/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM servicios WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------------- Asociación servicio <-> categoría (con precio) ----------------
router.post('/servicio-categorias', wrap(async (req, res) => {
  const { servicio_id, categoria_id, precio } = req.body;
  if (!servicio_id || !categoria_id) {
    return res.status(400).json({ error: 'servicio_id y categoria_id son requeridos.' });
  }
  const info = await db.run(
    'INSERT INTO servicio_categorias (servicio_id, categoria_id, precio) VALUES (?, ?, ?)',
    [servicio_id, categoria_id, precio || 0]
  );
  res.status(201).json(await db.get('SELECT * FROM servicio_categorias WHERE id = ?', [info.lastInsertRowid]));
}));

router.put('/servicio-categorias/:id', wrap(async (req, res) => {
  const { precio } = req.body;
  await db.run('UPDATE servicio_categorias SET precio = COALESCE(?, precio) WHERE id = ?', [precio ?? null, req.params.id]);
  res.json(await db.get('SELECT * FROM servicio_categorias WHERE id = ?', [req.params.id]));
}));

router.delete('/servicio-categorias/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM servicio_categorias WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------------- Sectores ----------------
router.get('/sectores', wrap(async (req, res) => {
  res.json(await db.all(`
    SELECT s.*, c.nombre as categoria_nombre FROM sectores s
    LEFT JOIN categorias c ON c.id = s.categoria_id
    ORDER BY s.nombre
  `));
}));
router.post('/sectores', wrap(async (req, res) => {
  const { nombre, categoria_id, capacidad } = req.body;
  const info = await db.run('INSERT INTO sectores (nombre, categoria_id, capacidad) VALUES (?, ?, ?)',
    [nombre, categoria_id || null, capacidad || 1]);
  res.status(201).json(await db.get('SELECT * FROM sectores WHERE id = ?', [info.lastInsertRowid]));
}));
router.put('/sectores/:id', wrap(async (req, res) => {
  const { nombre, categoria_id, capacidad, activo } = req.body;
  await db.run(`
    UPDATE sectores SET nombre = COALESCE(?, nombre), categoria_id = COALESCE(?, categoria_id),
    capacidad = COALESCE(?, capacidad), activo = COALESCE(?, activo) WHERE id = ?
  `, [nombre ?? null, categoria_id ?? null, capacidad ?? null, activo ?? null, req.params.id]);
  res.json(await db.get('SELECT * FROM sectores WHERE id = ?', [req.params.id]));
}));
router.delete('/sectores/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM sectores WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------------- Horarios ----------------
router.get('/horarios', wrap(async (req, res) => {
  const { sector_id } = req.query;
  if (sector_id) {
    return res.json(await db.all('SELECT * FROM horarios WHERE sector_id = ? ORDER BY dia_semana, hora_inicio', [sector_id]));
  }
  res.json(await db.all(`
    SELECT h.*, s.nombre as sector_nombre FROM horarios h
    JOIN sectores s ON s.id = h.sector_id
    ORDER BY s.nombre, h.dia_semana, h.hora_inicio
  `));
}));
router.post('/horarios', wrap(async (req, res) => {
  const { sector_id, dia_semana, hora_inicio, hora_fin } = req.body;
  const info = await db.run('INSERT INTO horarios (sector_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
    [sector_id, dia_semana, hora_inicio, hora_fin]);
  res.status(201).json(await db.get('SELECT * FROM horarios WHERE id = ?', [info.lastInsertRowid]));
}));
router.put('/horarios/:id', wrap(async (req, res) => {
  const { hora_inicio, hora_fin, activo } = req.body;
  await db.run('UPDATE horarios SET hora_inicio = COALESCE(?, hora_inicio), hora_fin = COALESCE(?, hora_fin), activo = COALESCE(?, activo) WHERE id = ?',
    [hora_inicio ?? null, hora_fin ?? null, activo ?? null, req.params.id]);
  res.json(await db.get('SELECT * FROM horarios WHERE id = ?', [req.params.id]));
}));
router.delete('/horarios/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM horarios WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

// ---------------- Bloqueos ----------------
router.get('/bloqueos', wrap(async (req, res) => {
  res.json(await db.all('SELECT * FROM bloqueos ORDER BY fecha'));
}));
router.post('/bloqueos', wrap(async (req, res) => {
  const { sector_id, fecha, hora_inicio, hora_fin, motivo } = req.body;
  const info = await db.run('INSERT INTO bloqueos (sector_id, fecha, hora_inicio, hora_fin, motivo) VALUES (?, ?, ?, ?, ?)',
    [sector_id || null, fecha, hora_inicio || null, hora_fin || null, motivo || null]);
  res.status(201).json(await db.get('SELECT * FROM bloqueos WHERE id = ?', [info.lastInsertRowid]));
}));
router.delete('/bloqueos/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM bloqueos WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;

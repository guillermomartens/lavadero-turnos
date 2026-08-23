const express = require('express');
const db = require('../db/query');
const { withTransaction } = require('../db/query');
const { getSlotsDisponibles } = require('../utils/disponibilidad');

const router = express.Router();

// ---------- Categorias / Servicios / Sectores (solo activos) ----------

router.get('/categorias', async (req, res) => {
  try {
    const categorias = await db.all(
      'SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY orden, nombre'
    );
    res.json(categorias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías.' });
  }
});

router.get('/servicios', async (req, res) => {
  try {
    const { categoria_id } = req.query;
    let servicios;
    if (categoria_id) {
      servicios = await db.all(
        'SELECT id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo FROM servicios WHERE activo = 1 AND categoria_id = ? ORDER BY nombre',
        [categoria_id]
      );
    } else {
      servicios = await db.all(
        'SELECT id, nombre, descripcion, duracion_min, precio, aplica_tipo_vehiculo, categoria_id FROM servicios WHERE activo = 1 ORDER BY nombre'
      );
    }
    res.json(servicios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener servicios.' });
  }
});

router.get('/sectores', async (req, res) => {
  try {
    const { categoria_id } = req.query;
    let sectores;
    if (categoria_id) {
      sectores = await db.all(
        'SELECT id, nombre, categoria_id FROM sectores WHERE activo = 1 AND categoria_id = ? ORDER BY nombre',
        [categoria_id]
      );
    } else {
      sectores = await db.all(
        'SELECT id, nombre, categoria_id FROM sectores WHERE activo = 1 ORDER BY nombre'
      );
    }
    res.json(sectores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener sectores.' });
  }
});

// ---------- Disponibilidad ----------

router.get('/disponibilidad', async (req, res) => {
  try {
    const { sector_id, servicio_id, fecha } = req.query;
    if (!sector_id || !servicio_id || !fecha) {
      return res.status(400).json({ error: 'sector_id, servicio_id y fecha son requeridos.' });
    }
    const slots = await getSlotsDisponibles({
      sectorId: Number(sector_id),
      servicioId: Number(servicio_id),
      fecha
    });
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular disponibilidad.' });
  }
});

// ---------- Clientes ----------

router.get('/clientes/buscar', async (req, res) => {
  try {
    const { telefono } = req.query;
    if (!telefono) return res.status(400).json({ error: 'telefono es requerido.' });

    const cliente = await db.get('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
    if (!cliente) return res.json({ existe: false });

    const vehiculos = await db.all('SELECT * FROM vehiculos WHERE cliente_id = ?', [cliente.id]);
    res.json({ existe: true, cliente, vehiculos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar cliente.' });
  }
});

// ---------- Turnos (crear / consultar / cancelar) ----------

router.post('/turnos', async (req, res) => {
  const {
    telefono, nombre, apellido, email,
    vehiculo,
    servicio_id, sector_id, fecha, hora_inicio
  } = req.body;

  if (!telefono || !nombre || !apellido || !servicio_id || !sector_id || !fecha || !hora_inicio) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para agendar el turno.' });
  }

  try {
    const servicio = await db.get('SELECT * FROM servicios WHERE id = ? AND activo = 1', [servicio_id]);
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado.' });

    // Revalidar disponibilidad antes de la transacción para evitar dobles reservas
    const slots = await getSlotsDisponibles({ sectorId: Number(sector_id), servicioId: Number(servicio_id), fecha });
    const disponible = slots.some(s => s.hora_inicio === hora_inicio);
    if (!disponible) {
      return res.status(409).json({ error: 'Ese horario ya no está disponible. Por favor elegí otro.' });
    }

    const turnoId = await withTransaction(async (tx) => {
      let cliente = await tx.get('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
      if (!cliente) {
        const info = await tx.run(
          'INSERT INTO clientes (nombre, apellido, telefono, email) VALUES (?, ?, ?, ?)',
          [nombre, apellido, telefono, email || null]
        );
        cliente = { id: info.lastInsertRowid };
      } else {
        await tx.run(
          'UPDATE clientes SET nombre = ?, apellido = ?, email = COALESCE(?, email) WHERE id = ?',
          [nombre, apellido, email || null, cliente.id]
        );
      }

      let vehiculoId = null;
      if (vehiculo && vehiculo.tipo) {
        const info = await tx.run(
          'INSERT INTO vehiculos (cliente_id, tipo, marca, patente) VALUES (?, ?, ?, ?)',
          [cliente.id, vehiculo.tipo, vehiculo.marca || null, vehiculo.patente || null]
        );
        vehiculoId = info.lastInsertRowid;
      }

      const [h, m] = hora_inicio.split(':').map(Number);
      const finMin = h * 60 + m + servicio.duracion_min;
      const hora_fin = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`;

      const result = await tx.run(
        `INSERT INTO turnos (cliente_id, vehiculo_id, servicio_id, sector_id, fecha, hora_inicio, hora_fin, precio, estado, estado_pago)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 'pendiente')`,
        [cliente.id, vehiculoId, servicio_id, sector_id, fecha, hora_inicio, hora_fin, servicio.precio]
      );

      return result.lastInsertRowid;
    });

    const turno = await db.get(`
      SELECT t.*, s.nombre as servicio_nombre, sec.nombre as sector_nombre
      FROM turnos t
      JOIN servicios s ON s.id = t.servicio_id
      JOIN sectores sec ON sec.id = t.sector_id
      WHERE t.id = ?
    `, [turnoId]);
    res.status(201).json(turno);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el turno.' });
  }
});

router.get('/turnos/cliente/:telefono', async (req, res) => {
  try {
    const { telefono } = req.params;
    const cliente = await db.get('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
    if (!cliente) return res.json([]);

    const turnos = await db.all(`
      SELECT t.*, s.nombre as servicio_nombre, sec.nombre as sector_nombre
      FROM turnos t
      JOIN servicios s ON s.id = t.servicio_id
      JOIN sectores sec ON sec.id = t.sector_id
      WHERE t.cliente_id = ?
      ORDER BY t.fecha DESC, t.hora_inicio DESC
    `, [cliente.id]);

    res.json(turnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener turnos.' });
  }
});

router.put('/turnos/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;
    const { telefono } = req.body;

    const turno = await db.get(`
      SELECT t.*, c.telefono FROM turnos t JOIN clientes c ON c.id = t.cliente_id WHERE t.id = ?
    `, [id]);

    if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });
    if (turno.telefono !== telefono) return res.status(403).json({ error: 'No autorizado.' });
    if (['completado', 'cancelado'].includes(turno.estado)) {
      return res.status(400).json({ error: 'Este turno ya no se puede cancelar.' });
    }

    await db.run(`UPDATE turnos SET estado = 'cancelado', actualizado_en = datetime('now') WHERE id = ?`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar el turno.' });
  }
});

module.exports = router;

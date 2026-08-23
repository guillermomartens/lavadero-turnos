const express = require('express');
const db = require('../db/query');
const { withTransaction } = require('../db/query');
const { requireAuth } = require('../middleware/auth');
const { getSlotsDisponibles } = require('../utils/disponibilidad');
const { enviarConfirmacionTurno } = require('../utils/email');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { fecha, desde, hasta, estado, sector_id } = req.query;

    let sql = `
      SELECT t.*, s.nombre as servicio_nombre, sec.nombre as sector_nombre,
             c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.telefono as cliente_telefono,
             v.tipo as vehiculo_tipo, v.marca as vehiculo_marca, v.patente as vehiculo_patente
      FROM turnos t
      JOIN servicios s ON s.id = t.servicio_id
      JOIN sectores sec ON sec.id = t.sector_id
      JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN vehiculos v ON v.id = t.vehiculo_id
      WHERE 1=1
    `;
    const params = [];

    if (fecha) { sql += ' AND t.fecha = ?'; params.push(fecha); }
    if (desde) { sql += ' AND t.fecha >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND t.fecha <= ?'; params.push(hasta); }
    if (estado) { sql += ' AND t.estado = ?'; params.push(estado); }
    if (sector_id) { sql += ' AND t.sector_id = ?'; params.push(sector_id); }

    sql += ' ORDER BY t.fecha, t.hora_inicio';

    const turnos = await db.all(sql, params);
    res.json(turnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la agenda.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { telefono, nombre, apellido, email, vehiculo, servicio_id, sector_id, fecha, hora_inicio } = req.body;
    if (!telefono || !nombre || !apellido || !servicio_id || !sector_id || !fecha || !hora_inicio) {
      return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const servicio = await db.get('SELECT * FROM servicios WHERE id = ?', [servicio_id]);
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const id = await withTransaction(async (tx) => {
      let cliente = await tx.get('SELECT * FROM clientes WHERE telefono = ?', [telefono]);
      if (!cliente) {
        const info = await tx.run(
          'INSERT INTO clientes (nombre, apellido, telefono, email) VALUES (?, ?, ?, ?)',
          [nombre, apellido, telefono, email || null]
        );
        cliente = { id: info.lastInsertRowid };
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', 'pendiente')`,
        [cliente.id, vehiculoId, servicio_id, sector_id, fecha, hora_inicio, hora_fin, servicio.precio]
      );

      return result.lastInsertRowid;
    });

    const turnoCompleto = await db.get(`
      SELECT t.*, s.nombre as servicio_nombre, sec.nombre as sector_nombre,
             c.nombre as cliente_nombre, c.email as cliente_email
      FROM turnos t
      JOIN servicios s ON s.id = t.servicio_id
      JOIN sectores sec ON sec.id = t.sector_id
      JOIN clientes c ON c.id = t.cliente_id
      WHERE t.id = ?
    `, [id]);

    enviarConfirmacionTurno(turnoCompleto);

    res.status(201).json(turnoCompleto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el turno.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, estado_pago, fecha, hora_inicio, hora_fin, notas, sector_id } = req.body;

    const turno = await db.get('SELECT * FROM turnos WHERE id = ?', [id]);
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado.' });

    const fields = [];
    const params = [];
    if (estado !== undefined) { fields.push('estado = ?'); params.push(estado); }
    if (estado_pago !== undefined) { fields.push('estado_pago = ?'); params.push(estado_pago); }
    if (fecha !== undefined) { fields.push('fecha = ?'); params.push(fecha); }
    if (hora_inicio !== undefined) { fields.push('hora_inicio = ?'); params.push(hora_inicio); }
    if (hora_fin !== undefined) { fields.push('hora_fin = ?'); params.push(hora_fin); }
    if (sector_id !== undefined) { fields.push('sector_id = ?'); params.push(sector_id); }
    if (notas !== undefined) { fields.push('notas = ?'); params.push(notas); }
    fields.push("actualizado_en = datetime('now')");

    params.push(id);
    await db.run(`UPDATE turnos SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json(await db.get('SELECT * FROM turnos WHERE id = ?', [id]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el turno.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM turnos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el turno.' });
  }
});

router.get('/disponibilidad', async (req, res) => {
  try {
    const { sector_id, servicio_id, fecha } = req.query;
    const slots = await getSlotsDisponibles({ sectorId: Number(sector_id), servicioId: Number(servicio_id), fecha });
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular disponibilidad.' });
  }
});

module.exports = router;

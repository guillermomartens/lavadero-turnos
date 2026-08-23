const express = require('express');
const db = require('../db/query');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function rangoDefault(desde, hasta) {
  const hoy = new Date();
  const hastaDef = hasta || hoy.toISOString().slice(0, 10);
  const desdeDefDate = new Date(hoy);
  desdeDefDate.setDate(desdeDefDate.getDate() - 29);
  const desdeDef = desde || desdeDefDate.toISOString().slice(0, 10);
  return { desde: desdeDef, hasta: hastaDef };
}

router.get('/resumen', async (req, res) => {
  try {
    const { desde, hasta } = rangoDefault(req.query.desde, req.query.hasta);

    const totales = await db.get(`
      SELECT COUNT(*) as total_turnos,
             SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completados,
             SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
             SUM(CASE WHEN estado = 'no_show' THEN 1 ELSE 0 END) as no_show,
             SUM(CASE WHEN estado_pago = 'pagado' THEN precio ELSE 0 END) as ingresos_confirmados,
             SUM(CASE WHEN estado != 'cancelado' THEN precio ELSE 0 END) as ingresos_potenciales
      FROM turnos
      WHERE fecha BETWEEN ? AND ?
    `, [desde, hasta]);

    const porEstado = await db.all(`
      SELECT estado, COUNT(*) as cantidad FROM turnos
      WHERE fecha BETWEEN ? AND ? GROUP BY estado
    `, [desde, hasta]);

    const porServicio = await db.all(`
      SELECT s.nombre as servicio, COUNT(*) as cantidad, SUM(t.precio) as ingresos
      FROM turnos t JOIN servicios s ON s.id = t.servicio_id
      WHERE t.fecha BETWEEN ? AND ? AND t.estado != 'cancelado'
      GROUP BY s.nombre ORDER BY cantidad DESC
    `, [desde, hasta]);

    const porDia = await db.all(`
      SELECT fecha, COUNT(*) as cantidad, SUM(CASE WHEN estado != 'cancelado' THEN precio ELSE 0 END) as ingresos
      FROM turnos
      WHERE fecha BETWEEN ? AND ?
      GROUP BY fecha ORDER BY fecha
    `, [desde, hasta]);

    const porSector = await db.all(`
      SELECT sec.nombre as sector, COUNT(*) as cantidad
      FROM turnos t JOIN sectores sec ON sec.id = t.sector_id
      WHERE t.fecha BETWEEN ? AND ? AND t.estado != 'cancelado'
      GROUP BY sec.nombre ORDER BY cantidad DESC
    `, [desde, hasta]);

    const clientesTop = await db.all(`
      SELECT c.nombre, c.apellido, c.telefono, COUNT(*) as visitas, SUM(t.precio) as gastado
      FROM turnos t JOIN clientes c ON c.id = t.cliente_id
      WHERE t.fecha BETWEEN ? AND ? AND t.estado != 'cancelado'
      GROUP BY c.id ORDER BY visitas DESC LIMIT 10
    `, [desde, hasta]);

    res.json({ rango: { desde, hasta }, totales, porEstado, porServicio, porDia, porSector, clientesTop });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el reporte.' });
  }
});

module.exports = router;

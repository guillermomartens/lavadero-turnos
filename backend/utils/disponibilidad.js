const db = require('../db/query');

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Devuelve los slots disponibles para un sector/servicio en una fecha dada.
 * Considera: horario de atencion del dia, capacidad del sector, turnos ya
 * reservados (no cancelados) y bloqueos puntuales.
 */
async function getSlotsDisponibles({ sectorId, servicioId, fecha }) {
  const servicio = await db.get('SELECT * FROM servicios WHERE id = ?', [servicioId]);
  if (!servicio) return [];

  const duracion = servicio.duracion_min;
  const fechaObj = new Date(fecha + 'T00:00:00');
  const diaSemana = fechaObj.getDay(); // 0-6

  const horarios = await db.all(
    'SELECT * FROM horarios WHERE sector_id = ? AND dia_semana = ? AND activo = 1',
    [sectorId, diaSemana]
  );

  if (horarios.length === 0) return [];

  const sector = await db.get('SELECT * FROM sectores WHERE id = ?', [sectorId]);
  const capacidad = sector ? sector.capacidad : 1;

  const turnosExistentes = await db.all(
    `SELECT hora_inicio, hora_fin FROM turnos WHERE sector_id = ? AND fecha = ? AND estado != 'cancelado'`,
    [sectorId, fecha]
  );

  const bloqueos = await db.all(
    'SELECT * FROM bloqueos WHERE fecha = ? AND (sector_id = ? OR sector_id IS NULL)',
    [fecha, sectorId]
  );

  const slots = [];
  const STEP = 15;

  for (const h of horarios) {
    let inicio = timeToMinutes(h.hora_inicio);
    const fin = timeToMinutes(h.hora_fin);

    while (inicio + duracion <= fin) {
      const slotInicio = inicio;
      const slotFin = inicio + duracion;

      const bloqueado = bloqueos.some(b => {
        if (!b.hora_inicio) return true;
        const bIni = timeToMinutes(b.hora_inicio);
        const bFin = timeToMinutes(b.hora_fin);
        return slotInicio < bFin && slotFin > bIni;
      });

      if (!bloqueado) {
        const solapados = turnosExistentes.filter(t => {
          const tIni = timeToMinutes(t.hora_inicio);
          const tFin = timeToMinutes(t.hora_fin);
          return slotInicio < tFin && slotFin > tIni;
        }).length;

        if (solapados < capacidad) {
          slots.push({
            hora_inicio: minutesToTime(slotInicio),
            hora_fin: minutesToTime(slotFin)
          });
        }
      }

      inicio += STEP;
    }
  }

  const hoy = new Date();
  const esHoy = fechaObj.toDateString() === hoy.toDateString();
  if (esHoy) {
    const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();
    return slots.filter(s => timeToMinutes(s.hora_inicio) > ahoraMin);
  }

  return slots;
}

module.exports = { getSlotsDisponibles, timeToMinutes, minutesToTime };

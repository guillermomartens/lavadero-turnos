// Envío de emails transaccionales vía Brevo (https://www.brevo.com), plan gratis:
// 300 emails/día para siempre. Se configura con las variables de entorno
// BREVO_API_KEY, EMAIL_FROM y EMAIL_FROM_NAME (ver DEPLOY.md).
//
// Si BREVO_API_KEY no está configurada, las funciones no hacen nada (no rompen
// la reserva de turnos ni tiran error) — así el sistema sigue funcionando
// perfectamente aunque todavía no se haya configurado el envío de mails.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'AquaGo Turnos';

const emailHabilitado = Boolean(BREVO_API_KEY && EMAIL_FROM);

if (!emailHabilitado) {
  console.log('ℹ️  Envío de emails deshabilitado (falta BREVO_API_KEY o EMAIL_FROM en las variables de entorno).');
}

async function enviarEmail({ to, toName, subject, html }) {
  if (!emailHabilitado) return; // silenciosamente no hace nada
  if (!to) return; // el cliente no cargó email, no hay a quién mandarle

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: EMAIL_FROM_NAME, email: EMAIL_FROM },
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent: html
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('❌ Error al enviar email (Brevo):', res.status, errText);
    }
  } catch (err) {
    // Un fallo de email NUNCA debe romper la reserva de turnos.
    console.error('❌ Error al enviar email:', err.message);
  }
}

function formatFecha(fechaISO) {
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

function moneyStr(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

/** Email de confirmación al crear un turno. */
async function enviarConfirmacionTurno(turno) {
  const fecha = formatFecha(turno.fecha);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0D3B3E, #135E62); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">¡Turno confirmado! 🚿</h1>
      </div>
      <div style="border: 1px solid #DCE9E9; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p style="color: #0B2027; font-size: 15px;">Hola ${turno.cliente_nombre || ''}, tu turno quedó reservado con estos datos:</p>
        <table style="width: 100%; font-size: 14px; color: #0B2027; border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding: 6px 0; color: #6C8C8C;">Servicio</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${turno.servicio_nombre}</td></tr>
          <tr><td style="padding: 6px 0; color: #6C8C8C;">Sector</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${turno.sector_nombre}</td></tr>
          <tr><td style="padding: 6px 0; color: #6C8C8C;">Fecha</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${fecha}</td></tr>
          <tr><td style="padding: 6px 0; color: #6C8C8C;">Hora</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${turno.hora_inicio}hs</td></tr>
          <tr><td style="padding: 10px 0 0; color: #6C8C8C; border-top: 1px solid #DCE9E9;">Total</td><td style="padding: 10px 0 0; text-align: right; font-weight: bold; border-top: 1px solid #DCE9E9;">${moneyStr(turno.precio)}</td></tr>
        </table>
        <p style="color: #6C8C8C; font-size: 13px; margin-top: 20px;">Pago en el lavadero al finalizar el servicio. Si necesitás cancelar o ver tus turnos, ingresá a nuestro sitio y usá la opción "Mis turnos" con tu número de teléfono.</p>
      </div>
    </div>
  `;
  await enviarEmail({
    to: turno.cliente_email,
    toName: turno.cliente_nombre,
    subject: `Turno confirmado - ${fecha} ${turno.hora_inicio}hs`,
    html
  });
}

/** Email de aviso al cancelar un turno. */
async function enviarCancelacionTurno(turno) {
  const fecha = formatFecha(turno.fecha);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #6C8C8C; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Turno cancelado</h1>
      </div>
      <div style="border: 1px solid #DCE9E9; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p style="color: #0B2027; font-size: 15px;">
          Se canceló tu turno de <strong>${turno.servicio_nombre}</strong> del ${fecha} a las ${turno.hora_inicio}hs.
        </p>
        <p style="color: #6C8C8C; font-size: 13px;">Si fue un error o querés reservar otro horario, ingresá nuevamente a nuestro sitio.</p>
      </div>
    </div>
  `;
  await enviarEmail({
    to: turno.cliente_email,
    toName: turno.cliente_nombre,
    subject: `Turno cancelado - ${fecha} ${turno.hora_inicio}hs`,
    html
  });
}

module.exports = { enviarConfirmacionTurno, enviarCancelacionTurno };

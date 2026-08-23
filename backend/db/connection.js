const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Modo Turso (producción): TURSO_DATABASE_URL + TURSO_AUTH_TOKEN en .env
// Modo local (desarrollo, sin cuenta de Turso): usa un archivo .db en disco
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'lavadero.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

// Ejecuta el esquema (CREATE TABLE IF NOT EXISTS ...) sentencia por sentencia.
// Se llama una vez al arrancar el servidor (ver server.js) y es segura de repetir.
async function initSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

module.exports = { client, initSchema };

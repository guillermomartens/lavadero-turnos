const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initSchema } = require('./db/connection');
const { runSeed } = require('./db/seed');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const adminTurnosRoutes = require('./routes/admin_turnos');
const adminCatalogoRoutes = require('./routes/admin_catalogo');
const adminReportesRoutes = require('./routes/admin_reportes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- API ----------
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin/turnos', adminTurnosRoutes);
app.use('/api/admin/catalogo', adminCatalogoRoutes);
app.use('/api/admin/reportes', adminReportesRoutes);

// ---------- Archivos estaticos ----------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

async function start() {
  await initSchema(); // crea las tablas si no existen (Turso o archivo local)
  await runSeed();     // carga admin de prueba y datos de ejemplo SOLO si la base está vacía
  app.listen(PORT, () => {
    console.log(`🚗💦  Servidor de turnos corriendo en http://localhost:${PORT}`);
    console.log(`   Cliente:     http://localhost:${PORT}/`);
    console.log(`   Back office: http://localhost:${PORT}/admin`);
  });
}

start().catch(err => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});

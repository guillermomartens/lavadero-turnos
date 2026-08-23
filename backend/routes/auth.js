const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/query');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    const user = await db.get('SELECT * FROM admin_users WHERE email = ? AND activo = 1', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

// Cambiar la propia contraseña (requiere estar logueado y saber la actual)
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Completá la contraseña actual y la nueva.' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await db.get('SELECT * FROM admin_users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const ok = bcrypt.compareSync(passwordActual, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });

    const nuevoHash = bcrypt.hashSync(passwordNueva, 10);
    await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [nuevoHash, user.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/query');
const { signToken } = require('../middleware/auth');

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

module.exports = router;

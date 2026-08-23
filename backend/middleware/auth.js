const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Falta token.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { requireAuth, signToken, JWT_SECRET };

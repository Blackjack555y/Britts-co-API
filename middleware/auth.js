// middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'britts-co-secret-2025-change-in-production';
const JWT_EXPIRES = '24h';

/**
 * Genera un JWT token para un usuario autenticado
 * @param {object} user - { codigo, nombre }
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { codigo: user.codigo, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/**
 * Middleware para verificar JWT token en headers
 * Uso: router.post('/ruta', verifyToken, (req, res) => {...})
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [Auth] Token no proporcionado');
    return res.status(401).json({ success: false, error: 'No autorizado - Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { codigo, nombre, iat, exp }
    console.log('✅ [Auth] Usuario autenticado:', decoded.codigo, decoded.nombre);
    next();
  } catch (err) {
    console.error('❌ [Auth] Token inválido:', err.message);
    return res.status(401).json({ success: false, error: 'No autorizado - Token inválido o expirado' });
  }
}

/**
 * Middleware para verificar que el usuario es administrador (codigo ZZ2006)
 */
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.codigo !== 'ZZ2006') {
    console.log('❌ [Auth] Acceso denegado - No es admin:', req.user?.codigo);
    return res.status(403).json({ success: false, error: 'Acceso denegado - Solo administradores' });
  }
  next();
}

module.exports = { generateToken, verifyToken, verifyAdmin, JWT_SECRET };

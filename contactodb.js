const express = require('express');
const router = express.Router();
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === Generar código para contacto (similar a requerimientos) ===
function generarCodigoContacto() {
  const prefijo = 'CNT';
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const fechaStr = `${anio}${mes}${dia}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sufijo = '';
  for (let i = 0; i < 3; i++) sufijo += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${prefijo}${fechaStr}${sufijo}`;
}

// Multer opcional (no se espera archivo pero no falla si llega)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/contacto';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// === POST /api/contactodb ===
// Guarda un mensaje de contacto en DBW00004
router.post('/', upload.single('archivo'), (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;
    if (!nombre || !email || !asunto || !mensaje) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    const codigo = generarCodigoContacto();
    const archivoRuta = req.file ? req.file.path : null;

    const sql = `
      INSERT INTO DBW00004
      (Contacto, Nombre, Correo, Asunto, Mensaje)
      VALUES (?, ?, ?, ?, ?)
    `; // Estado usa default de la tabla (si existiera)

    const mensajeFinal = `${mensaje}${archivoRuta ? '\n\nArchivo adjunto: ' + archivoRuta : ''}`;
    console.log('📤 Insertando contacto:', { codigo, nombre, email, asunto });

    db.query(sql, [codigo, nombre, email, asunto, mensajeFinal], (err) => {
      if (err) {
        console.error('❌ Error al insertar contacto:', err);
        return res.status(500).json({ error: 'Error al guardar el contacto.' });
      }
      console.log(`✅ Contacto ${codigo} registrado correctamente.`);
      res.status(200).json({ success: true, mensaje: `Contacto ${codigo} enviado correctamente.`, codigo });
    });
  } catch (error) {
    console.error('⚠️ Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado en el servidor.' });
  }
});

// === GET /api/contactodb y /api/contactodb/:codigo ===
router.get(['/', '/:codigo'], (req, res) => {
  const codigo = req.params.codigo || null;
  let sql = `
    SELECT Contacto, Nombre, Correo, Asunto, Mensaje, created_at
    FROM DBW00004
  `;
  const params = [];
  if (codigo) {
    sql += ' WHERE Contacto = ?';
    params.push(codigo);
  }
  sql += ' ORDER BY created_at DESC, Contacto DESC';
  console.log('📡 Ejecutando consulta:', sql, params);
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error al consultar DBW00004:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
    }
    res.json(results);
  });
});

module.exports = router;

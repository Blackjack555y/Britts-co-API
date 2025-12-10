const express = require('express');
const router = express.Router();
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === Función para generar el código de requerimiento ===
function generarCodigoRequerimiento() {
  const prefijo = "BRT";
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear()).slice(-2);

  const fechaStr = `${anio}${mes}${dia}`;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = "";
  for (let i = 0; i < 3; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefijo}${fechaStr}${codigo}`;
}

// === Configuración de multer para subir archivos ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/requerimientos';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  }
});

// === POST /api/requerimientosdb ===
// Registrar un nuevo requerimiento
router.post('/', upload.single('archivo'), (req, res) => {
  try {
    const { email, asunto, tipo, solucion, programa, version, detalle, contacto } = req.body;

    if (!email || !asunto || !tipo || !solucion || !programa || !version || !detalle) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    // 🔹 Aquí usamos tu nueva función
    const requerimiento = generarCodigoRequerimiento();
    const archivoRuta = req.file ? req.file.path : null;

    const sql = `
      INSERT INTO DBW00002
      (Requerimiento, Correo, Asunto, Tipo, Solucion, Programa, Version, Detalle, Contacto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `; // Estado usa default de la tabla

    console.log('📤 Insertando requerimiento:', {
      requerimiento, email, asunto, tipo, solucion, programa, version, detalle, contacto
    });

    db.query(sql, [
      requerimiento,
      email,
      asunto,
      tipo,
      solucion,
      programa,
      version,
      `${detalle}${archivoRuta ? '\n\nArchivo adjunto: ' + archivoRuta : ''}`,
      contacto || ''
    ], (err) => {
      if (err) {
        console.error('❌ Error al insertar requerimiento:', err);
        return res.status(500).json({ error: 'Error al guardar el requerimiento.' });
      }

      console.log(`✅ Requerimiento ${requerimiento} registrado correctamente.`);
      res.status(200).json({
        success: true,
        mensaje: `Requerimiento ${requerimiento} enviado correctamente.`,
        codigo: requerimiento  // 👈 Esto es clave
      });
    });

  } catch (error) {
    console.error('⚠️ Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado en el servidor.' });
  }
});

// === GET /api/requerimientosdb y /api/requerimientosdb/:codigo ===

router.get(['/', '/:codigo'], (req, res) => {
  const codigo = req.params.codigo || null;

  let sql = `
    SELECT 
      Requerimiento,
      Correo,
      Asunto,
      Tipo,
      Solucion,
      Programa,
      Version,
      Detalle,
  Contacto,
  Estado
    FROM DBW00002
  `;

  const params = [];

  if (codigo) {
    sql += ' WHERE Solucion = ?';
    params.push(codigo);
  }

  sql += ' ORDER BY Solucion, Requerimiento DESC';

  console.log('📡 Ejecutando consulta:', sql, params);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error al consultar DBW00002:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
    }

    console.log('✅ Resultados obtenidos:', results.length);

    // Agrupar por solución
    const data = {};
    results.forEach(row => {
      const solucion = row.Solucion || 'Sin solución';
      if (!data[solucion]) data[solucion] = [];
      data[solucion].push({
        requerimiento: row.Requerimiento,
        correo: row.Correo,
        asunto: row.Asunto,
        tipo: row.Tipo,
        programa: row.Programa,
        version: row.Version,
        detalle: row.Detalle,
  contacto: row.Contacto,
  estado: row.Estado
      });
    });

    res.json(data);
  });
});

module.exports = router;

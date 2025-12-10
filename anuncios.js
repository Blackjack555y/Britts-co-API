const express = require('express');
const router = express.Router();
const db = require('./db');

// Allowed types for the banner style
const TIPOS = new Set(['info', 'success', 'warning', 'danger']);

// Helpers
function toBool(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return undefined;
}

function rowToApi(r) {
  return {
    id: r.id,
    activo: !!r.activo,
    tipo: r.tipo,
    titulo: r.titulo || undefined,
    mensaje: r.mensaje,
    link_url: r.link_url || undefined,
  image_url: r.image_url || null,
  image_alt: r.image_alt || null,
  dismissible: !!r.dismissible,
  starts_at: r.starts_at || null,
  ends_at: r.ends_at || null,
  include_pages: r.include_pages || null,
  exclude_pages: r.exclude_pages || null,
  };
}

// GET /api/anuncios/activo → 200 with JSON or 204 No Content
router.get('/activo', (req, res) => {
  console.log('📡 Consultando anuncio activo...');
  const sql = `
  SELECT id, activo, tipo, titulo, mensaje, link_url, image_url, image_alt, dismissible, starts_at, ends_at, include_pages, exclude_pages, updated_at
    FROM DBW00003
    WHERE activo = 1
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al consultar anuncio activo:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
    }
    if (!rows || rows.length === 0) {
      return res.status(204).end();
    }
    console.log('✅ Anuncio activo encontrado:', rows[0].id);
    res.json(rowToApi(rows[0]));
  });
});

// GET /api/anuncios → lista ordenada por updated_at desc
router.get('/', (req, res) => {
  console.log('📡 Listando anuncios...');
  const sql = `
  SELECT id, activo, tipo, titulo, mensaje, link_url, image_url, image_alt, dismissible, starts_at, ends_at, include_pages, exclude_pages, created_at, updated_at
    FROM DBW00003
    ORDER BY updated_at DESC
  `;
  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Error al listar anuncios:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
    }
    console.log('✅ Anuncios listados:', rows.length);
    res.json(rows.map(rowToApi));
  });
});

// POST /api/anuncios → crear anuncio
router.post('/', express.json(), (req, res) => {
  const {
    titulo = null,
    mensaje,
  tipo = 'info',
  link_url = '',
  image_url = null,
  image_alt = null,
    activo = false,
    dismissible = true,
  starts_at = null,
  ends_at = null,
  include_pages = null,
  exclude_pages = null
  } = req.body || {};

  if (!mensaje || String(mensaje).trim() === '') {
    return res.status(400).json({ error: 'mensaje es requerido' });
  }
  if (!TIPOS.has(tipo)) {
    return res.status(400).json({ error: "tipo inválido. Use: 'info'|'success'|'warning'|'danger'" });
  }

  const activoBool = toBool(activo) ?? false;
  const dismissibleBool = toBool(dismissible) ?? true;

  console.log('📤 Creando anuncio...');
  const sql = `
    INSERT INTO DBW00003
      (titulo, mensaje, tipo, link_url, image_url, image_alt, activo, dismissible, starts_at, ends_at, include_pages, exclude_pages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  const safeLink = (link_url == null ? '' : link_url);
  const params = [titulo, mensaje, tipo, safeLink, image_url, image_alt, activoBool ? 1 : 0, dismissibleBool ? 1 : 0, starts_at, ends_at, include_pages, exclude_pages];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Error al crear anuncio:', err);
      return res.status(500).json({ error: 'Error al guardar en la base de datos.' });
    }
    const id = result.insertId;
    db.query(
  'SELECT id, activo, tipo, titulo, mensaje, link_url, image_url, image_alt, dismissible, starts_at, ends_at, include_pages, exclude_pages FROM DBW00003 WHERE id = ?',
      [id],
      (selErr, rows) => {
        if (selErr) {
          console.error('❌ Error al leer anuncio creado:', selErr);
          return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
        }
        console.log('✅ Anuncio creado:', id);
        res.status(201).json(rowToApi(rows[0]));
      }
    );
  });
});

// PATCH /api/anuncios/:id → actualización parcial
router.patch('/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  const fields = [];
  const params = [];

  if (body.titulo !== undefined) { fields.push('titulo = ?'); params.push(body.titulo); }
  if (body.mensaje !== undefined) {
    if (!body.mensaje || String(body.mensaje).trim() === '') {
      return res.status(400).json({ error: 'mensaje no puede ser vacío' });
    }
    fields.push('mensaje = ?'); params.push(body.mensaje);
  }
  if (body.tipo !== undefined) {
    if (!TIPOS.has(body.tipo)) {
      return res.status(400).json({ error: "tipo inválido. Use: 'info'|'success'|'warning'|'danger'" });
    }
    fields.push('tipo = ?'); params.push(body.tipo);
  }
  if (body.link_url !== undefined) { fields.push('link_url = ?'); params.push(body.link_url == null ? '' : body.link_url); }
  if (body.image_url !== undefined) { fields.push('image_url = ?'); params.push(body.image_url || null); }
  if (body.image_alt !== undefined) { fields.push('image_alt = ?'); params.push(body.image_alt || null); }
  if (body.activo !== undefined) { fields.push('activo = ?'); params.push(toBool(body.activo) ? 1 : 0); }
  if (body.dismissible !== undefined) { fields.push('dismissible = ?'); params.push(toBool(body.dismissible) ? 1 : 0); }
  if (body.starts_at !== undefined) { fields.push('starts_at = ?'); params.push(body.starts_at || null); }
  if (body.ends_at !== undefined) { fields.push('ends_at = ?'); params.push(body.ends_at || null); }
  if (body.include_pages !== undefined) { fields.push('include_pages = ?'); params.push(body.include_pages || null); }
  if (body.exclude_pages !== undefined) { fields.push('exclude_pages = ?'); params.push(body.exclude_pages || null); }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No hay cambios para aplicar' });
  }

  const sql = `UPDATE DBW00003 SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
  params.push(id);

  console.log('📤 Actualizando anuncio:', id);
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ Error al actualizar anuncio:', err);
      return res.status(500).json({ error: 'Error al guardar en la base de datos.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Anuncio no encontrado' });
    }
    db.query(
  'SELECT id, activo, tipo, titulo, mensaje, link_url, image_url, image_alt, dismissible, starts_at, ends_at, include_pages, exclude_pages FROM DBW00003 WHERE id = ?',
      [id],
      (selErr, rows) => {
        if (selErr) {
          console.error('❌ Error al leer anuncio actualizado:', selErr);
          return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
        }
        console.log('✅ Anuncio actualizado:', id);
        res.json(rowToApi(rows[0]));
      }
    );
  });
});

module.exports = router;

/*
Optional DDL (run once in MySQL):
CREATE TABLE IF NOT EXISTS anuncios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'info',
  link_url VARCHAR(500) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 0,
  dismissible TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/

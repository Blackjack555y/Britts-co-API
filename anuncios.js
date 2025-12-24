const express = require('express');
const router = express.Router();
const db = require('./db');
const fs = require('fs');
const path = require('path');
const { verifyToken, verifyAdmin } = require('./middleware/auth');
const { unifiedUpload } = require('./config/multer');

// Allowed types for the banner style (keeping backward compatibility)
const TIPOS = new Set(['info', 'success', 'warning', 'danger', 'banner', 'popup', 'carousel']);

// Unified upload handler for all file types (primary + carousel slides)
const uploadFields = unifiedUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'carousel_images', maxCount: 10 }
]);

// Helpers
function toBool(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return undefined;
}

function rowToApi(r) {
  const obj = {
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo || undefined,
    mensaje: r.mensaje || undefined,
    imagen_url: r.imagen_url || r.image_url || null,
    link_url: r.link_url || undefined,
    activo: !!r.activo,
    dismissible: !!r.dismissible,
    include_pages: r.include_pages || null,
    exclude_pages: r.exclude_pages || null,
    starts_at: r.starts_at || null,
    ends_at: r.ends_at || null,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
  
  // Add carousel_images if tipo is carousel
  if (r.tipo === 'carousel' && r.carousel_images) {
    try {
      obj.carousel_images = JSON.parse(r.carousel_images);
    } catch (e) {
      obj.carousel_images = [];
      console.error('⚠️ [Anuncios] Error parsing carousel_images:', e.message);
    }
  }
  
  return obj;
}

/**
 * Deactivate all other banners/popups to enforce single-active rule
 */
function deactivateOthers(excludeId = null) {
  return new Promise((resolve, reject) => {
    const sql = excludeId 
      ? 'UPDATE DBW00003 SET activo = 0 WHERE id != ?'
      : 'UPDATE DBW00003 SET activo = 0';
    const params = excludeId ? [excludeId] : [];
    
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      console.log(`✅ [Anuncios] Desactivados ${result.affectedRows} anuncios previos`);
      resolve(result);
    });
  });
}

/**
 * Delete image file from disk safely (works for single image and carousel image arrays)
 */
function deleteImageFile(imagePath, isCarouselImage = false) {
  if (!imagePath) return;
  
  try {
    const filename = path.basename(imagePath);
    const uploadDir = isCarouselImage ? 'carousels' : 'anuncios';
    const fullPath = path.join(__dirname, 'uploads', uploadDir, filename);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`🗑️ [Anuncios] ${isCarouselImage ? 'Carousel' : ''} Imagen eliminada:`, filename);
    }
  } catch (err) {
    console.error('❌ [Anuncios] Error al eliminar imagen:', err.message);
  }
}

/**
 * Delete multiple carousel images from disk
 */
function deleteCarouselImages(carouselImagesJson) {
  if (!carouselImagesJson) return;
  
  try {
    const images = JSON.parse(carouselImagesJson);
    if (Array.isArray(images)) {
      images.forEach(img => deleteImageFile(img, true));
    }
  } catch (err) {
    console.error('❌ [Anuncios] Error al parsear carousel_images para eliminación:', err.message);
  }
}

// ==================== PUBLIC ENDPOINTS ====================

// ==================== PUBLIC ENDPOINTS ====================

/**
 * GET /api/anuncios/activo
 * Fetch the single active banner/popup (public endpoint for frontend)
 */
router.get('/activo', (req, res) => {
  console.log('📡 [Anuncios] GET /activo - Consultando anuncio activo...');
  
  const sql = `
    SELECT id, activo, tipo, titulo, mensaje, link_url, imagen_url, dismissible, 
           starts_at, ends_at, include_pages, exclude_pages, updated_at
    FROM DBW00003
    WHERE activo = 1
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  
  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ [Anuncios] Error al consultar anuncio activo:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos' });
    }
    
    if (!rows || rows.length === 0) {
      console.log('📭 [Anuncios] No hay anuncio activo');
      return res.status(204).end();
    }
    
    const anuncio = rows[0];
    
    // Optional: Verify image exists if imagen_url is set
    if (anuncio.imagen_url) {
      const filename = path.basename(anuncio.imagen_url);
      const fullPath = path.join(__dirname, 'uploads', 'anuncios', filename);
      
      if (!fs.existsSync(fullPath)) {
        console.log('⚠️ [Anuncios] Imagen no existe, tratando como sin anuncio:', filename);
        return res.status(204).end();
      }
    }
    
    console.log('✅ [Anuncios] Anuncio activo encontrado:', anuncio.id, anuncio.tipo);
    res.json(rowToApi(anuncio));
  });
});

// ==================== ADMIN ENDPOINTS (Protected) ====================

/**
 * GET /api/anuncios
 * List all anuncios (admin only)
 */
router.get('/', verifyToken, (req, res) => {
  console.log('📡 [Anuncios] GET / - Listando anuncios... Usuario:', req.user.codigo);
  
  const sql = `
    SELECT id, activo, tipo, titulo, mensaje, link_url, imagen_url, carousel_images, dismissible, 
           starts_at, ends_at, include_pages, exclude_pages, created_at, updated_at
    FROM DBW00003
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  
  db.query(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ [Anuncios] Error al listar:', err);
      return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
    }
    
    console.log('✅ [Anuncios] Listados:', rows.length, 'registros');
    res.json({ success: true, data: rows.map(rowToApi) });
  });
});

/**
 * POST /api/anuncios
 * Create new banner/popup/carousel with optional image upload (admin only)
 * For carousel: requires tipo='carousel', imagen_url (primary), and carousel_images (array of 2+ images)
 */
router.post('/', verifyToken, uploadFields, async (req, res) => {
  try {
    const tipo = (req.body?.tipo || 'banner').toLowerCase();
    console.log('📤 [Anuncios] POST / - Creando anuncio... Usuario:', req.user.codigo, 'Tipo:', tipo);
    
    const {
      titulo = null,
      mensaje = null,
      link_url = null,
      activo = true,
      dismissible = true,
      include_pages = null,
      exclude_pages = null,
      starts_at = null,
      ends_at = null
    } = req.body;
    
    // Validation
    if (!tipo || !TIPOS.has(tipo)) {
      if (req.file) deleteImageFile(`/uploads/anuncios/${req.file.filename}`);
      if (req.files && req.files.length > 0) {
        req.files.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
      }
      return res.status(400).json({ 
        success: false, 
        error: "tipo requerido. Valores: 'info'|'success'|'warning'|'danger'|'banner'|'popup'|'carousel'" 
      });
    }
    
    // Handle primary image (always in anuncios directory with unified storage)
    let imagen_url = null;
    const primaryFile = req.files?.image?.[0];
    if (tipo === 'carousel') {
      if (!primaryFile) {
        const slidesForCleanup = req.files?.carousel_images || [];
        slidesForCleanup.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
        return res.status(400).json({ 
          success: false, 
          error: "Para carrusel, se requiere una imagen principal (campo 'image')" 
        });
      }
      imagen_url = `/uploads/anuncios/${primaryFile.filename}`;
      console.log('📸 [Anuncios] Imagen principal subida:', primaryFile.filename);
    } else if (primaryFile) {
      imagen_url = `/uploads/anuncios/${primaryFile.filename}`;
      console.log('📸 [Anuncios] Imagen subida:', primaryFile.filename);
    }
    
    // Handle carousel images
    let carousel_images = null;
    if (tipo === 'carousel') {
      const slides = req.files?.carousel_images || [];
      if (slides.length < 2) {
        // cleanup primary (stored in anuncios dir) and any uploaded slides
        deleteImageFile(imagen_url, false);
        slides.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
        return res.status(400).json({ 
          success: false, 
          error: "Para carrusel se requieren al menos 2 imágenes adicionales (campo 'carousel_images')" 
        });
      }
      carousel_images = JSON.stringify(
        slides.map(f => `/uploads/carousels/${f.filename}`)
      );
      console.log('🎠 [Anuncios] Carrusel con', slides.length, 'imágenes');
    }
    
    const activoBool = toBool(req.body?.activo) ?? true;
    const dismissibleBool = toBool(req.body?.dismissible) ?? true;
    
    // Single-active enforcement
    if (activoBool) {
      await deactivateOthers();
    }
    
    // INSERT - carousel_images included, id is AUTO_INCREMENT
    const sql = `
      INSERT INTO DBW00003
        (tipo, titulo, mensaje, link_url, imagen_url, carousel_images, activo, dismissible, 
         include_pages, exclude_pages, starts_at, ends_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      tipo, titulo, mensaje, link_url, imagen_url, carousel_images,
      activoBool ? 1 : 0, dismissibleBool ? 1 : 0,
      include_pages, exclude_pages, starts_at, ends_at
    ];
    
    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('❌ [Anuncios] Error al crear:', err);
        deleteImageFile(imagen_url, false);
        const slides = req.files?.carousel_images || [];
        slides.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
        return res.status(500).json({ success: false, error: err.message || 'Error al guardar en la base de datos' });
      }
      
      const id = result.insertId;
      
      db.query('SELECT * FROM DBW00003 WHERE id = ?', [id], (selErr, rows) => {
        if (selErr) {
          console.error('❌ [Anuncios] Error al leer anuncio creado:', selErr);
          return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
        }
        
        console.log('✅ [Anuncios] Creado:', id, tipo, imagen_url ? '(con imagen)' : '(sin imagen)');
        res.status(201).json({ 
          success: true, 
          mensaje: 'Anuncio creado exitosamente',
          data: rowToApi(rows[0]) 
        });
      });
    });
  } catch (err) {
    console.error('❌ [Anuncios] Error al crear anuncio:', err);
    // Cleanup files on error
    const primary = req.files?.image?.[0];
    if (primary) deleteImageFile(`/uploads/anuncios/${primary.filename}`, false);
    const slides = req.files?.carousel_images || [];
    slides.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
    return res.status(500).json({ success: false, error: err.message || 'Error al procesar solicitud' });
  }
});

/**
 * PUT /api/anuncios/:id
 * Update existing banner/popup/carousel with optional image replacement (admin only)
 */
router.put('/:id', verifyToken, uploadFields, async (req, res) => {
  const { id } = req.params;
  
  db.query('SELECT * FROM DBW00003 WHERE id = ?', [id], async (err, rows) => {
    if (err) {
      console.error('❌ [Anuncios] Error al buscar anuncio:', err);
      return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
    }
    
    if (!rows || rows.length === 0) {
      console.log('❌ [Anuncios] Anuncio no encontrado:', id);
      if (req.files?.image?.[0]) deleteImageFile(`/uploads/anuncios/${req.files.image[0].filename}`);
      if (req.files?.carousel_images) {
        req.files.carousel_images.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
      }
      return res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
    }
    
    const existing = rows[0];
    const newTipo = req.body?.tipo || existing.tipo;
    
    try {
      await handleAnuncioUpdate(req, res, id, existing, newTipo);
    } catch (error) {
      console.error('❌ [Anuncios] Error en actualización:', error);
      if (req.files?.image?.[0]) deleteImageFile(`/uploads/anuncios/${req.files.image[0].filename}`);
      if (req.files?.carousel_images) {
        req.files.carousel_images.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
      }
      return res.status(500).json({ success: false, error: error.message || 'Error al procesar solicitud' });
    }
  });
});

async function handleAnuncioUpdate(req, res, id, existing, tipo) {
  console.log('📝 [Anuncios] PUT /:id - Actualizando anuncio:', id, 'Usuario:', req.user.codigo, 'Tipo:', tipo);
  
  // Validation - tipo
  if (tipo && !TIPOS.has(tipo)) {
    if (req.files?.image?.[0]) deleteImageFile(`/uploads/anuncios/${req.files.image[0].filename}`);
    if (req.files?.carousel_images) {
      req.files.carousel_images.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
    }
    return res.status(400).json({ 
      success: false, 
      error: "tipo inválido. Valores: 'info'|'success'|'warning'|'danger'|'banner'|'popup'|'carousel'" 
    });
  }
  
  // Extract fields with defaults from existing
  const titulo = req.body?.titulo !== undefined ? req.body.titulo : existing.titulo;
  const mensaje = req.body?.mensaje !== undefined ? req.body.mensaje : existing.mensaje;
  const link_url = req.body?.link_url !== undefined ? req.body.link_url : existing.link_url;
  const activo = req.body?.activo !== undefined ? req.body.activo : existing.activo;
  const dismissible = req.body?.dismissible !== undefined ? req.body.dismissible : existing.dismissible;
  const include_pages = req.body?.include_pages !== undefined ? req.body.include_pages : existing.include_pages;
  const exclude_pages = req.body?.exclude_pages !== undefined ? req.body.exclude_pages : existing.exclude_pages;
  const starts_at = req.body?.starts_at !== undefined ? req.body.starts_at : existing.starts_at;
  const ends_at = req.body?.ends_at !== undefined ? req.body.ends_at : existing.ends_at;
  
  const oldImageUrl = existing.imagen_url;
  const oldCarouselImages = existing.carousel_images;
  
  let imagen_url = oldImageUrl;
  let carousel_images = oldCarouselImages;
  
  // Handle primary image update
  const primaryFile = req.files?.image?.[0];
  if (primaryFile) {
    imagen_url = `/uploads/anuncios/${primaryFile.filename}`;
    console.log('📸 [Anuncios] Nueva imagen principal subida:', primaryFile.filename);
    
    // Delete old image
    if (oldImageUrl) {
      deleteImageFile(oldImageUrl, false);
    }
  }
  
  // Handle carousel images update
  if (tipo === 'carousel') {
    const slides = req.files?.carousel_images || [];
    if (slides.length > 0) {
      carousel_images = JSON.stringify(
        slides.map(f => `/uploads/carousels/${f.filename}`)
      );
      console.log('🎠 [Anuncios] Carrusel actualizado con', slides.length, 'imágenes');
      
      // Delete old carousel images
      if (oldCarouselImages) {
        deleteCarouselImages(oldCarouselImages);
      }
    }
  } else {
    // If changing from carousel to non-carousel, clean up carousel images
    if (existing.tipo === 'carousel' && oldCarouselImages) {
      deleteCarouselImages(oldCarouselImages);
      carousel_images = null;
    }
  }
  
  const activoBool = toBool(activo) ?? false;
  const dismissibleBool = toBool(dismissible) ?? true;
  
  try {
    if (activoBool) {
      await deactivateOthers(id);
    }
    
    const sql = `
      UPDATE DBW00003 
      SET tipo = ?, titulo = ?, mensaje = ?, link_url = ?, imagen_url = ?, carousel_images = ?,
          activo = ?, dismissible = ?, include_pages = ?, exclude_pages = ?, 
          starts_at = ?, ends_at = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    const params = [
      tipo, titulo, mensaje, link_url, imagen_url, carousel_images,
      activoBool ? 1 : 0, dismissibleBool ? 1 : 0,
      include_pages, exclude_pages, starts_at, ends_at, id
    ];
    
    db.query(sql, params, (updateErr, result) => {
      if (updateErr) {
        console.error('❌ [Anuncios] Error al actualizar:', updateErr);
        if (req.file) deleteImageFile(imagen_url, tipo === 'carousel');
        if (req.files && req.files.length > 0) {
          req.files.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
        }
        return res.status(500).json({ success: false, error: 'Error al guardar en la base de datos' });
      }
      
      db.query('SELECT * FROM DBW00003 WHERE id = ?', [id], (selErr, updatedRows) => {
        if (selErr) {
          console.error('❌ [Anuncios] Error al leer anuncio actualizado:', selErr);
          return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
        }
        
        console.log('✅ [Anuncios] Actualizado:', id, tipo);
        res.json({ 
          success: true, 
          mensaje: 'Anuncio actualizado exitosamente',
          data: rowToApi(updatedRows[0]) 
        });
      });
    });
  } catch (err) {
    console.error('❌ [Anuncios] Error en deactivateOthers:', err);
    if (req.file) deleteImageFile(imagen_url, tipo === 'carousel');
    if (req.files && req.files.length > 0) {
      req.files.forEach(f => deleteImageFile(`/uploads/carousels/${f.filename}`, true));
    }
    return res.status(500).json({ success: false, error: 'Error al procesar solicitud' });
  }
}

// PATCH /api/anuncios/:id → actualización parcial
router.patch('/:id', verifyToken, express.json(), (req, res) => {
  const { id } = req.params;
  console.log('📝 [Anuncios] PATCH /:id - Actualización parcial:', id, 'Usuario:', req.user.codigo);
  
  const body = req.body || {};
  const fields = [];
  const params = [];

  if (body.titulo !== undefined) { fields.push('titulo = ?'); params.push(body.titulo); }
  if (body.mensaje !== undefined) { fields.push('mensaje = ?'); params.push(body.mensaje); }
  if (body.tipo !== undefined) {
    if (!TIPOS.has(body.tipo)) {
      return res.status(400).json({ success: false, error: "tipo inválido" });
    }
    fields.push('tipo = ?'); params.push(body.tipo);
  }
  if (body.link_url !== undefined) { fields.push('link_url = ?'); params.push(body.link_url); }
  if (body.imagen_url !== undefined) { fields.push('imagen_url = ?'); params.push(body.imagen_url || null); }
  if (body.activo !== undefined) { fields.push('activo = ?'); params.push(toBool(body.activo) ? 1 : 0); }
  if (body.dismissible !== undefined) { fields.push('dismissible = ?'); params.push(toBool(body.dismissible) ? 1 : 0); }
  if (body.starts_at !== undefined) { fields.push('starts_at = ?'); params.push(body.starts_at || null); }
  if (body.ends_at !== undefined) { fields.push('ends_at = ?'); params.push(body.ends_at || null); }
  if (body.include_pages !== undefined) { fields.push('include_pages = ?'); params.push(body.include_pages || null); }
  if (body.exclude_pages !== undefined) { fields.push('exclude_pages = ?'); params.push(body.exclude_pages || null); }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, error: 'No hay cambios para aplicar' });
  }

  const sql = `UPDATE DBW00003 SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('❌ [Anuncios] Error al actualizar:', err);
      return res.status(500).json({ success: false, error: 'Error al guardar en la base de datos' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
    }
    
    db.query('SELECT * FROM DBW00003 WHERE id = ?', [id], (selErr, rows) => {
      if (selErr) {
        console.error('❌ [Anuncios] Error al leer anuncio actualizado:', selErr);
        return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
      }
      
      console.log('✅ [Anuncios] Actualizado (parcial):', id);
      res.json({ success: true, mensaje: 'Anuncio actualizado', data: rowToApi(rows[0]) });
    });
  });
});

/**
 * DELETE /api/anuncios/:id
 * Delete banner/popup/carousel and its image file(s) (admin only)
 */
router.delete('/:id', verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.params;
  console.log('🗑️ [Anuncios] DELETE /:id - Eliminando anuncio:', id, 'Usuario:', req.user.codigo);
  
  db.query('SELECT imagen_url, carousel_images, tipo FROM DBW00003 WHERE id = ?', [id], (err, rows) => {
    if (err) {
      console.error('❌ [Anuncios] Error al buscar anuncio:', err);
      return res.status(500).json({ success: false, error: 'Error al acceder a la base de datos' });
    }
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Anuncio no encontrado' });
    }
    
    const record = rows[0];
    const isCarousel = record.tipo === 'carousel';
    
    db.query('DELETE FROM DBW00003 WHERE id = ?', [id], (delErr, result) => {
      if (delErr) {
        console.error('❌ [Anuncios] Error al eliminar:', delErr);
        return res.status(500).json({ success: false, error: 'Error al eliminar de la base de datos' });
      }
      
      // Clean up primary image
      if (record.imagen_url) {
        deleteImageFile(record.imagen_url, isCarousel);
      }
      
      // Clean up carousel images if present
      if (isCarousel && record.carousel_images) {
        deleteCarouselImages(record.carousel_images);
      }
      
      console.log('✅ [Anuncios] Eliminado:', id);
      res.json({ success: true, mensaje: 'Anuncio eliminado exitosamente' });
    });
  });
});

module.exports = router;

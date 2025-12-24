// scripts/migrate-carousel-support.js
require('dotenv').config();
const db = require('../db');

const TABLE = 'DBW00003';
const DB_NAME = process.env.DB_NAME;

function checkColumn(column) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) AS cnt 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `;
    db.query(sql, [DB_NAME, TABLE, column], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0].cnt > 0);
    });
  });
}

function addColumn(columnSql) {
  return new Promise((resolve, reject) => {
    db.query(columnSql, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function run() {
  try {
    if (!DB_NAME) {
      console.error('❌ DB_NAME no está definido en variables de entorno.');
      process.exit(1);
    }

    console.log('📡 Verificando tabla', TABLE, 'en base de datos', DB_NAME);

    // Check and add carousel_images column
    const hasCarouselImages = await checkColumn('carousel_images');
    if (!hasCarouselImages) {
      console.log('📤 Agregando columna carousel_images...');
      await addColumn(`
        ALTER TABLE ${TABLE} 
        ADD COLUMN carousel_images LONGTEXT NULL 
        COMMENT 'JSON array of carousel image URLs' 
        AFTER imagen_url
      `);
      console.log('✅ Columna carousel_images creada.');
    } else {
      console.log('✅ Columna carousel_images ya existe.');
    }

    // Update ENUM for tipo to include 'carousel'
    console.log('📤 Actualizando ENUM tipo para incluir carousel...');
    try {
      await addColumn(`
        ALTER TABLE ${TABLE} 
        MODIFY COLUMN tipo ENUM('info', 'success', 'warning', 'danger', 'banner', 'popup', 'carousel') 
        NOT NULL DEFAULT 'banner'
      `);
      console.log('✅ ENUM tipo actualizado con carousel.');
    } catch (err) {
      if (err.message.includes('Duplicate')) {
        console.log('⚠️ Carousel ya está en ENUM tipo.');
      } else {
        throw err;
      }
    }

    console.log('🎉 Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  }
}

run();

// scripts/migrate-anuncios-images.js
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

function checkTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) AS cnt 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    `;
    db.query(sql, [DB_NAME, TABLE], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0].cnt > 0);
    });
  });
}

function createTable() {
  return new Promise((resolve, reject) => {
    const sql = `
      CREATE TABLE ${TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tipo ENUM('info', 'success', 'warning', 'danger', 'banner', 'popup') NOT NULL DEFAULT 'banner',
        titulo VARCHAR(255),
        mensaje TEXT,
        link_url VARCHAR(500),
        imagen_url VARCHAR(500),
        activo BOOLEAN DEFAULT FALSE,
        dismissible BOOLEAN DEFAULT TRUE,
        include_pages TEXT COMMENT 'Comma-separated list of HTML pages',
        exclude_pages TEXT,
        starts_at DATETIME,
        ends_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    db.query(sql, [], (err) => {
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

    // Check if table exists
    const tableExists = await checkTable();
    if (!tableExists) {
      console.log('📤 Creando tabla', TABLE, '...');
      await createTable();
      console.log('✅ Tabla creada exitosamente.');
      process.exit(0);
      return;
    }

    console.log('✅ Tabla', TABLE, 'existe. Verificando columnas...');

    // Check and add missing columns
    const hasImagenUrl = await checkColumn('imagen_url');
    if (!hasImagenUrl) {
      console.log('📤 Agregando columna imagen_url...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN imagen_url VARCHAR(500) NULL AFTER link_url`);
      console.log('✅ Columna imagen_url creada.');
    } else {
      console.log('✅ Columna imagen_url ya existe.');
    }

    const hasInclude = await checkColumn('include_pages');
    if (!hasInclude) {
      console.log('📤 Agregando columna include_pages...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN include_pages TEXT NULL AFTER dismissible`);
      console.log('✅ Columna include_pages creada.');
    } else {
      console.log('✅ Columna include_pages ya existe.');
    }

    const hasExclude = await checkColumn('exclude_pages');
    if (!hasExclude) {
      console.log('📤 Agregando columna exclude_pages...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN exclude_pages TEXT NULL AFTER include_pages`);
      console.log('✅ Columna exclude_pages creada.');
    } else {
      console.log('✅ Columna exclude_pages ya existe.');
    }

    // Update ENUM for tipo if needed (add 'banner' and 'popup')
    console.log('📤 Actualizando ENUM tipo para incluir banner y popup...');
    try {
      await addColumn(`
        ALTER TABLE ${TABLE} 
        MODIFY COLUMN tipo ENUM('info', 'success', 'warning', 'danger', 'banner', 'popup') 
        NOT NULL DEFAULT 'banner'
      `);
      console.log('✅ ENUM tipo actualizado.');
    } catch (err) {
      if (err.message.includes('Multiple primary key')) {
        console.log('⚠️ ENUM ya incluye los valores requeridos.');
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

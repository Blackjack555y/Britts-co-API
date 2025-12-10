require('dotenv').config();
const db = require('../db');

const TABLE = 'DBW00003';
const DB_NAME = process.env.DB_NAME;

function checkColumn(column) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`;
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

    console.log('📡 Verificando columnas en', TABLE, 'base de datos', DB_NAME);

    const hasInclude = await checkColumn('include_pages');
    if (hasInclude) {
      console.log('✅ Columna include_pages ya existe.');
    } else {
      console.log('📤 Agregando columna include_pages...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN include_pages TEXT NULL AFTER ends_at`);
      console.log('✅ Columna include_pages creada.');
    }

    const hasExclude = await checkColumn('exclude_pages');
    if (hasExclude) {
      console.log('✅ Columna exclude_pages ya existe.');
    } else {
      console.log('📤 Agregando columna exclude_pages...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN exclude_pages TEXT NULL AFTER include_pages`);
      console.log('✅ Columna exclude_pages creada.');
    }

    const hasImageUrl = await checkColumn('image_url');
    if (hasImageUrl) {
      console.log('✅ Columna image_url ya existe.');
    } else {
      console.log('📤 Agregando columna image_url...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN image_url TEXT NULL AFTER link_url`);
      console.log('✅ Columna image_url creada.');
    }

    const hasImageAlt = await checkColumn('image_alt');
    if (hasImageAlt) {
      console.log('✅ Columna image_alt ya existe.');
    } else {
      console.log('📤 Agregando columna image_alt...');
      await addColumn(`ALTER TABLE ${TABLE} ADD COLUMN image_alt VARCHAR(255) NULL AFTER image_url`);
      console.log('✅ Columna image_alt creada.');
    }

    console.log('🎉 Migración completada.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  }
}

run();

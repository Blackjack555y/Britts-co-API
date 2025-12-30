// scripts/migrate-imagepopup-support.js
require('dotenv').config();
const db = require('../db');

const TABLE = 'DBW00003';
const DB_NAME = process.env.DB_NAME;

function alterEnum() {
  return new Promise((resolve, reject) => {
    const sql = `
      ALTER TABLE ${TABLE}
      MODIFY COLUMN tipo ENUM('info', 'success', 'warning', 'danger', 'banner', 'popup', 'carousel', 'imagepopup')
      NOT NULL DEFAULT 'banner'
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

    console.log('📡 Actualizando ENUM tipo para incluir imagepopup en', TABLE, 'base', DB_NAME);
    await alterEnum();
    console.log('✅ ENUM tipo actualizado con imagepopup.');
    console.log('🎉 Migración completada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  }
}

run();

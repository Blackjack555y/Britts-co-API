require('dotenv').config();
const db = require('./db');

console.log('🔍 Verifying DBW00003 schema...\n');

// Check id column
db.query(
  `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA 
   FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = 'brittsco_pagweb' AND TABLE_NAME = 'DBW00003' AND COLUMN_NAME = 'id'`,
  [],
  (err, results) => {
    if (err) {
      console.error('❌ Error checking schema:', err);
      process.exit(1);
    }

    if (results.length === 0) {
      console.error('❌ id column not found!');
      process.exit(1);
    }

    const col = results[0];
    console.log('📋 id column details:');
    console.log(`   Type: ${col.COLUMN_TYPE}`);
    console.log(`   Nullable: ${col.IS_NULLABLE}`);
    console.log(`   Default: ${col.COLUMN_DEFAULT}`);
    console.log(`   Extra: ${col.EXTRA}`);
    console.log('');

    if (col.EXTRA === 'auto_increment') {
      console.log('✅ AUTO_INCREMENT is enabled!');
      
      // Check current AUTO_INCREMENT value
      db.query(
        `SHOW TABLE STATUS LIKE 'DBW00003'`,
        [],
        (err, status) => {
          if (err) {
            console.error('❌ Error checking AUTO_INCREMENT value:', err);
            process.exit(1);
          }
          
          console.log(`✅ Next AUTO_INCREMENT value: ${status[0].Auto_increment}`);
          console.log('');
          
          // Check for any id=0 rows
          db.query('SELECT COUNT(*) as count FROM DBW00003 WHERE id = 0', [], (err, count) => {
            if (err) {
              console.error('❌ Error checking id=0 rows:', err);
              process.exit(1);
            }
            
            if (count[0].count === 0) {
              console.log('✅ No id=0 rows found (good!)');
            } else {
              console.warn(`⚠️ Found ${count[0].count} row(s) with id=0`);
            }
            
            // Check existing rows
            db.query('SELECT id, tipo, titulo FROM DBW00003 ORDER BY id', [], (err, rows) => {
              if (err) {
                console.error('❌ Error fetching rows:', err);
                process.exit(1);
              }
              
              console.log(`\n📊 Existing rows (${rows.length}):`);
              rows.forEach(row => {
                console.log(`   - id=${row.id}, tipo=${row.tipo}, titulo=${row.titulo || '(no title)'}`);
              });
              
              console.log('\n🎉 Schema verification complete!');
              process.exit(0);
            });
          });
        }
      );
    } else {
      console.error('❌ AUTO_INCREMENT is NOT enabled!');
      console.error('   Run: npm run migrate:fix-autoincrement');
      process.exit(1);
    }
  }
);

/**
 * Fix AUTO_INCREMENT for DBW00003.id column
 * Resolves: ER_DUP_ENTRY: Duplicate entry '0' for key 'PRIMARY'
 */

require('dotenv').config();
const db = require('../db');

async function fixAutoIncrement() {
  console.log('🔧 [Migration] Fixing AUTO_INCREMENT for DBW00003.id...');
  
  return new Promise((resolve, reject) => {
    // Step 1: Check current schema
    console.log('📋 Step 1: Checking current schema...');
    db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DBW00003' AND COLUMN_NAME = 'id'
    `, [], (err, cols) => {
      if (err) {
        console.error('❌ Error checking schema:', err);
        return reject(err);
      }
      
      console.log('Current id column:', cols[0]);
      
      // Step 2: Find next available ID
      console.log('📋 Step 2: Finding next available ID...');
      db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM DBW00003', [], (err2, result) => {
        if (err2) {
          console.error('❌ Error finding next ID:', err2);
          return reject(err2);
        }
        
        const nextId = result[0].next_id;
        console.log('Next available ID:', nextId);
        
        // Step 3: Check for rows with id=0
        console.log('📋 Step 3: Checking for id=0 rows...');
        db.query('SELECT * FROM DBW00003 WHERE id = 0', [], (err3, zeroRows) => {
          if (err3) {
            console.error('❌ Error checking id=0:', err3);
            return reject(err3);
          }
          
          if (zeroRows.length > 0) {
            console.log(`⚠️ Found ${zeroRows.length} row(s) with id=0. Reassigning to ${nextId}...`);
            
            db.query('UPDATE DBW00003 SET id = ? WHERE id = 0', [nextId], (err4) => {
              if (err4) {
                console.error('❌ Error updating id=0:', err4);
                return reject(err4);
              }
              
              console.log('✅ Reassigned id=0 rows to', nextId);
              proceedToAlter(nextId + 1);
            });
          } else {
            console.log('✅ No id=0 rows found');
            proceedToAlter(nextId);
          }
        });
      });
    });
    
    function proceedToAlter(autoIncrementValue) {
      // Step 4: Create backup
      console.log('📋 Step 4: Creating backup table...');
      db.query('CREATE TABLE IF NOT EXISTS DBW00003_backup AS SELECT * FROM DBW00003', [], (err5) => {
        if (err5) {
          console.warn('⚠️ Backup creation failed (may already exist):', err5.message);
        } else {
          console.log('✅ Backup table created: DBW00003_backup');
        }
        
        // Step 5: Alter table to add AUTO_INCREMENT
        console.log('📋 Step 5: Converting id to AUTO_INCREMENT...');
        db.query('ALTER TABLE DBW00003 MODIFY COLUMN id INT UNSIGNED NOT NULL AUTO_INCREMENT', [], (err6) => {
          if (err6) {
            console.error('❌ Error adding AUTO_INCREMENT:', err6);
            return reject(err6);
          }
          
          console.log('✅ id column converted to AUTO_INCREMENT');
          
          // Step 6: Set AUTO_INCREMENT counter
          console.log(`📋 Step 6: Setting AUTO_INCREMENT counter to ${autoIncrementValue}...`);
          db.query(`ALTER TABLE DBW00003 AUTO_INCREMENT = ${autoIncrementValue}`, [], (err7) => {
            if (err7) {
              console.error('❌ Error setting AUTO_INCREMENT counter:', err7);
              return reject(err7);
            }
            
            console.log(`✅ AUTO_INCREMENT counter set to ${autoIncrementValue}`);
            
            // Step 7: Final verification
            console.log('📋 Step 7: Final verification...');
            db.query('SELECT * FROM DBW00003 WHERE id = 0', [], (err8, finalCheck) => {
              if (err8) {
                console.error('❌ Error in final verification:', err8);
                return reject(err8);
              }
              
              if (finalCheck.length > 0) {
                console.error('❌ Still found id=0 rows after migration!');
                return reject(new Error('Migration incomplete: id=0 rows still exist'));
              }
              
              console.log('✅ No id=0 rows remaining');
              
              // Show current schema
              db.query(`
                SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'DBW00003' AND COLUMN_NAME = 'id'
              `, [], (err9, finalSchema) => {
                if (err9) {
                  console.error('❌ Error checking final schema:', err9);
                  return reject(err9);
                }
                
                console.log('✅ Final schema:', finalSchema[0]);
                console.log('');
                console.log('🎉 Migration completed successfully!');
                console.log('');
                console.log('Summary:');
                console.log('- id column is now AUTO_INCREMENT');
                console.log(`- AUTO_INCREMENT counter starts at ${autoIncrementValue}`);
                console.log('- No id=0 rows remain');
                console.log('- Backup table: DBW00003_backup');
                
                resolve();
              });
            });
          });
        });
      });
    }
  });
}

// Execute migration
fixAutoIncrement()
  .then(() => {
    console.log('');
    console.log('✅ Migration successful. Closing database connection...');
    process.exit(0);
  })
  .catch((err) => {
    console.error('');
    console.error('❌ Migration failed:', err);
    console.error('');
    console.error('To restore backup (if needed):');
    console.error('DROP TABLE DBW00003;');
    console.error('CREATE TABLE DBW00003 AS SELECT * FROM DBW00003_backup;');
    process.exit(1);
  });

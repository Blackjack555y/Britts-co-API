
// db.js
const mysql = require('mysql');

// Crear un pool de conexiones para manejar múltiples consultas y reconexiones
const pool = mysql.createPool({
  connectionLimit: 10, // Número máximo de conexiones simultáneas que mantiene el pool
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('📦 Pool de conexiones MySQL creado');

// Exporta una función de consulta que usa el pool
module.exports = {
  query: (sql, params, callback) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('❌ Error al obtener conexión del pool:', err);
        return callback(err, null);
      }

      console.log('🔌 Conexión MySQL obtenida del pool');

      connection.query(sql, params, (error, results) => {
        connection.release();
        console.log('✅ Conexión liberada al pool');

        if (error) {
          console.error('❌ Error en la consulta SQL:', error);
          return callback(error, null);
        }

        console.log('📄 Consulta SQL ejecutada con éxito');
        callback(null, results);
      });
    });
  }
};

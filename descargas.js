const express = require('express');
const router = express.Router();
const db = require('./db');

router.get('/descargas/:codigo', (req, res) => {
  const codigo = req.params.codigo;

  const sql = `
    SELECT DW001002 AS solucion, DW001003 AS nombre, DW001004 AS imagen, DW001005 AS programa, DW001006 AS manual
    FROM DBW00001
    WHERE DW001001 = ?
    ORDER BY DW001002
  `;

  db.query(sql, [codigo], (err, results) => {
    if (err) {
      console.error('❌ Error al consultar DBW00001:', err);
      return res.status(500).json({ error: 'Error al acceder a la base de datos.' });
    }

    const data = {};
    results.forEach(row => {
      if (!data[row.solucion]) data[row.solucion] = [];
      data[row.solucion].push({
        nombre: row.nombre,
        imagen: row.imagen,
        programa: row.programa,
        manual: row.manual
      });
    });

    res.json(data);
  });
});

module.exports = router;

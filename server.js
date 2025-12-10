require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();

// --- CORS CONFIGURADO CORRECTAMENTE ---
app.use(cors({
  origin: [
    'https://brittsco.com',
    'https://www.brittsco.com',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de multer para archivos
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Función para generar código
function generarCodigoRequerimiento() {
  const prefijo = "BRT";
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); 
  const anio = String(fecha.getFullYear()).slice(-2);

  const fechaStr = `${anio}${mes}${dia}`;

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = "";
  for (let i = 0; i < 3; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefijo}${fechaStr}${codigo}`;
}

// Ruta para procesar el formulario
app.post('/api/formulario', upload.single('archivo'), async (req, res) => {
  const {
    email,
    asunto,
    tipo,
    solucion,
    programa,
    version,
    detalle,
    contacto,
  } = req.body;

  const file = req.file;
  const codigoReq = generarCodigoRequerimiento();

  // Crear transportador
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false, // usar STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Contenido del mensaje
  const mailOptions = {
    from: `"Formulario Web" <${process.env.SMTP_FROM}>`,
    to: process.env.SMTP_TO,
    subject: `Nuevo requerimiento: ${asunto} (Código: ${codigoReq})`,
    html: `
      <h2>Nuevo requerimiento recibido</h2>
      <p><strong>Código:</strong> ${codigoReq}</p>
      <p><strong>Correo:</strong> ${email}</p>
      <p><strong>Asunto:</strong> ${asunto}</p>
      <p><strong>Tipo:</strong> ${tipo}</p>
      <p><strong>Solución:</strong> ${solucion}</p>
      <p><strong>Programa:</strong> ${programa}</p>
      <p><strong>Versión:</strong> ${version}</p>
      <p><strong>Detalle:</strong><br>${detalle}</p>
      <p><strong>Contacto:</strong> ${contacto}</p>
    `,
    attachments: file
      ? [
          {
            filename: file.originalname,
            path: file.path
          }
        ]
      : []
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Correo enviado correctamente.', codigo: codigoReq });
  } catch (err) {
    console.error('Error al enviar correo:', err);
    res.status(500).json({ message: 'Error al enviar el correo.' });
  }
});

// Servir archivos estáticos (opcional)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

const requerimientosdb = require('./requerimientosdb');
app.use('/api/requerimientosdb', requerimientosdb);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Formulario de contacto

app.post('/api/contacto', upload.single('archivo'), async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;


  const codigoContacto = generarCodigoRequerimiento(); // puedes cambiar el prefijo si quieres

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const mailOptions = {
    from: `"Contacto Web" <${process.env.SMTP_FROM}>`,
    to: process.env.SMTP_TO,
    subject: `Nuevo mensaje de contacto: ${asunto}`,
    html: `
      <h2>Nuevo mensaje desde el formulario de contacto</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Correo:</strong> ${email}</p>
      <p><strong>Asunto:</strong> ${asunto}</p>
      <p><strong>Mensaje:</strong><br>${mensaje}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Mensaje enviado correctamente.', codigo: codigoContacto });
  } catch (error) {
    console.error('Error al enviar contacto:', error);
    res.status(500).json({ message: 'Error al enviar el mensaje.' });
  }
});

const db = require('./db');
// Ruta de descargas
const descargasRoute = require('./descargas');
app.use('/', descargasRoute);

// 📣 Anuncios (banner superior)
const anuncios = require('./anuncios');
app.use('/api/anuncios', anuncios);

app.get('/api/dbw00001', (req, res) => {
  db.query('SELECT * FROM DBW00001', (err, results) => {
    if (err) {
      console.error('❌ Error:', err);  // muestra error completo
      return res.status(500).json({ error: 'Error consultando la base de datos' });
    }
    console.log('✅ Resultados:', results);  // muestra datos obtenidos
    res.json(results);
  });
});

const { verificarLogin } = require('./login'); // Asegúrate que login.js esté en la raíz o ajusta el path

app.post('/api/login', (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña son obligatorios' });
  }

  const resultado = verificarLogin(usuario, contrasena);

  if (resultado.success) {
    return res.status(200).json({
      success: true,
      codigo: resultado.codigo,
      nombre: resultado.nombre,
    });
  } else {
    return res.status(401).json({ success: false, error: resultado.error });
  }
});





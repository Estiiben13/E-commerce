const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 3001;

// Debe ser exactamente la misma clave utilizada por auth-service
const JWT_SECRET = process.env.JWT_SECRET;

// Base de datos propia del microservicio
const db = new Database('usuarios.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS perfiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT,
    direccion TEXT
  )
`);


// MIDDLEWARE PARA VALIDAR JWT

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token no proporcionado'
    });
  }

  // Esperamos: Authorization: Bearer TOKEN
  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido'
    });
  }

  const token = partes[1];

  try {
    const usuario = jwt.verify(token, JWT_SECRET);

    // Guardamos la información del usuario en la petición
    req.usuario = usuario;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}


// OBTENER PERFIL DEL USUARIO

app.get('/perfil/:usuarioId', verificarToken, (req, res) => {
  const usuarioId = Number(req.params.usuarioId);

  // Un usuario solamente puede consultar su propio perfil
  if (usuarioId !== req.usuario.id) {
    return res.status(403).json({
      error: 'No tienes permiso para consultar este perfil'
    });
  }

  const perfil = db
    .prepare('SELECT * FROM perfiles WHERE usuario_id = ?')
    .get(usuarioId);

  if (!perfil) {
    return res.status(404).json({
      error: 'Perfil no encontrado'
    });
  }

  res.json(perfil);
});


// CREAR PERFIL

app.post('/perfil', verificarToken, (req, res) => {
  const { nombre, direccion } = req.body;

  if (!nombre || !direccion) {
    return res.status(400).json({
      error: 'Nombre y dirección son obligatorios'
    });
  }

  // El ID viene del JWT, no del body enviado por el cliente
  const usuarioId = req.usuario.id;

  // Verificar si ya existe un perfil
  const existe = db
    .prepare('SELECT id FROM perfiles WHERE usuario_id = ?')
    .get(usuarioId);

  if (existe) {
    return res.status(409).json({
      error: 'El usuario ya existe'
    });
  }

  const info = db
    .prepare(
      'INSERT INTO perfiles (usuario_id, nombre, direccion) VALUES (?, ?, ?)'
    )
    .run(usuarioId, nombre, direccion);

  res.status(201).json({
    mensaje: 'Perfil creado correctamente',
    id: info.lastInsertRowid,
    usuario_id: usuarioId,
    nombre,
    direccion
  });
});


// RUTA DE PRUEBA

app.get('/', (req, res) => {
  res.json({
    servicio: 'usuarios-service',
    estado: 'activo',
    puerto: PORT
  });
});


// INICIAR SERVICIO

app.listen(PORT, () => {
  console.log(`Usuarios service corriendo en http://localhost:${PORT}`);
});
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 8080;

// La misma clave deberá estar configurada en los demás microservicios
const JWT_SECRET = process.env.JWT_SECRET;

// Base de datos propia del microservicio
const db = new Database('auth.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);


// REGISTRO DE USUARIO

app.post('/registrar', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email y password son obligatorios'
    });
  }

  // Verificar si el usuario ya existe
  const existe = db
    .prepare('SELECT id FROM usuarios WHERE email = ?')
    .get(email);

  if (existe) {
    return res.status(409).json({
      error: 'El usuario ya existe'
    });
  }

  // Encriptar la contraseña utilizando BCrypt
  const hash = bcrypt.hashSync(password, 10);

  // Guardar únicamente el hash, nunca la contraseña original
  const info = db
    .prepare(
      'INSERT INTO usuarios (email, password) VALUES (?, ?)'
    )
    .run(email, hash);

  res.status(201).json({
    mensaje: 'Usuario registrado correctamente',
    id: info.lastInsertRowid,
    email
  });
});

// LOGIN

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email y password son obligatorios'
    });
  }

  // Buscar usuario por email
  const usuario = db
    .prepare('SELECT * FROM usuarios WHERE email = ?')
    .get(email);

  // Verificar usuario y contraseña con BCrypt
  if (
    !usuario ||
    !bcrypt.compareSync(password, usuario.password)
  ) {
    return res.status(401).json({
      error: 'Credenciales inválidas'
    });
  }

  // Crear JWT
  const token = jwt.sign(
    {
      id: usuario.id,
      email: usuario.email
    },
    JWT_SECRET,
    {
      expiresIn: '2h'
    }
  );

  res.json({
    mensaje: 'Login exitoso',
    token
  });
});


// RUTA DE PRUEBA

app.get('/', (req, res) => {
  res.json({
    servicio: 'auth-service',
    estado: 'activo',
    puerto: PORT
  });
});


// INICIAR SERVICIO

app.listen(PORT, () => {
  console.log(`Auth service corriendo en http://localhost:${PORT}`);
});
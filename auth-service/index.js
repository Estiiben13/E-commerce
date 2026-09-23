const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

const PORT = 8080;
const SECRET = 'miClaveSecretaSuperSeguraP';

const db = new Database('auth.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

app.post('/registrar', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son obligatorios' });
  }

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe) return res.status(409).json({ error: 'El usuario ya existe' });

  // Nunca guardamos la contraseña en texto plano
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO usuarios (email, password) VALUES (?, ?)').run(email, hash);

  res.status(201).json({ id: info.lastInsertRowid, email });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  if (!usuario || !bcrypt.compareSync(password, usuario.password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET, { expiresIn: '2h' });
  res.json({ token });
});

app.listen(PORT, () => console.log(`Auth service corriendo en http://localhost:${PORT}`));

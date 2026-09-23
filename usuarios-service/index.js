const express = require('express');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());
const PORT = 3001;

const db = new Database('usuarios.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS perfiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    nombre TEXT,
    direccion TEXT
  )
`);

app.get('/perfil/:usuarioId', (req, res) => {
  const perfil = db.prepare('SELECT * FROM perfiles WHERE usuario_id = ?').get(req.params.usuarioId);
  if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado' });
  res.json(perfil);
});

app.post('/perfil', (req, res) => {
  const { usuario_id, nombre, direccion } = req.body;
  const info = db.prepare(
    'INSERT INTO perfiles (usuario_id, nombre, direccion) VALUES (?, ?, ?)'
  ).run(usuario_id, nombre, direccion);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.listen(PORT, () => console.log(`Usuarios service corriendo en http://localhost:${PORT}`));

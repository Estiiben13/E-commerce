const express = require('express');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());
const PORT = 3002;

const db = new Database('productos.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  )
`);

// Datos de ejemplo si la tabla está vacía
const count = db.prepare('SELECT COUNT(*) as c FROM productos').get().c;
if (count === 0) {
  const insertar = db.prepare('INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)');
  insertar.run('Camiseta', 25000, 50);
  insertar.run('Zapatos', 120000, 20);
}

app.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM productos').all());
});

app.get('/:id', (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// Usado por el servicio de Pedidos para validar y descontar stock
app.post('/:id/descontar-stock', (req, res) => {
  const { cantidad } = req.body;
  const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(req.params.id);

  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  if (producto.stock < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });

  db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(cantidad, req.params.id);
  res.json({ ok: true, stockRestante: producto.stock - cantidad });
});

app.listen(PORT, () => console.log(`Productos service corriendo en http://localhost:${PORT}`));

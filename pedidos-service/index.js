const express = require('express');
const Database = require('better-sqlite3');
const axios = require('axios');

const app = express();
app.use(express.json());
const PORT = 3003;

const PRODUCTOS_URL = 'http://localhost:3002';
const NOTIFICACIONES_URL = 'http://localhost:3004';

const db = new Database('pedidos.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    producto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    estado TEXT DEFAULT 'confirmado',
    fecha TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/comprar', async (req, res) => {
  const { usuario_id, producto_id, cantidad } = req.body;

  try {
    // 1. Comunicación síncrona: valida y descuenta stock en Productos
    await axios.post(`${PRODUCTOS_URL}/${producto_id}/descontar-stock`, { cantidad });

    // 2. Registra el pedido en su propia base de datos
    const info = db.prepare(
      'INSERT INTO pedidos (usuario_id, producto_id, cantidad) VALUES (?, ?, ?)'
    ).run(usuario_id, producto_id, cantidad);

    // 3. Comunicación asíncrona: notifica sin bloquear la respuesta al cliente
    axios.post(`${NOTIFICACIONES_URL}/notificar`, {
      usuario_id,
      mensaje: `Pedido #${info.lastInsertRowid} confirmado`
    }).catch(() => console.log('No se pudo notificar (no bloquea el pedido)'));

    res.status(201).json({ id: info.lastInsertRowid, estado: 'confirmado' });
  } catch (err) {
    const mensaje = err.response?.data?.error || 'Error al procesar el pedido';
    res.status(400).json({ error: mensaje });
  }
});

app.get('/usuario/:usuarioId', (req, res) => {
  const pedidos = db.prepare('SELECT * FROM pedidos WHERE usuario_id = ?').all(req.params.usuarioId);
  res.json(pedidos);
});

app.listen(PORT, () => console.log(`Pedidos service corriendo en http://localhost:${PORT}`));

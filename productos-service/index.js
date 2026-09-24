const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 3002;

// Debe ser exactamente la misma clave utilizada por auth-service
const JWT_SECRET = process.env.JWT_SECRET;

// Base de datos propia del microservicio
const db = new Database('productos.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  )
`);


// DATOS DE EJEMPLO

const count = db
  .prepare('SELECT COUNT(*) as c FROM productos')
  .get().c;

if (count === 0) {
  const insertar = db.prepare(
    'INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)'
  );

  insertar.run('Camiseta', 25000, 50);
  insertar.run('Zapatos', 120000, 20);
}


// MIDDLEWARE PARA VALIDAR JWT

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token no proporcionado'
    });
  }

  // Esperamos:
  // Authorization: Bearer TOKEN
  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido'
    });
  }

  const token = partes[1];

  try {
    const usuario = jwt.verify(token, JWT_SECRET);

    // Guardamos la información del usuario
    // para que esté disponible en la petición
    req.usuario = usuario;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}


// OBTENER TODOS LOS PRODUCTOS

// Esta ruta es pública porque representa
// el catálogo de la tienda.

app.get('/', (req, res) => {
  const productos = db
    .prepare('SELECT * FROM productos')
    .all();

  res.json(productos);
});


// OBTENER UN PRODUCTO

// También es una ruta pública.

app.get('/:id', (req, res) => {
  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(req.params.id);

  if (!producto) {
    return res.status(404).json({
      error: 'Producto no encontrado'
    });
  }

  res.json(producto);
});


// DESCONTAR STOCK

// Esta operación modifica la base de datos,
// por eso requiere un JWT válido.

// Esta ruta es utilizada por pedidos-service
// cuando se realiza una compra.

app.post('/:id/descontar-stock', verificarToken, (req, res) => {
  const { cantidad } = req.body;

  // Validar cantidad
  if (
    cantidad === undefined ||
    !Number.isInteger(cantidad) ||
    cantidad <= 0
  ) {
    return res.status(400).json({
      error: 'La cantidad debe ser un número entero mayor que 0'
    });
  }

  const producto = db
    .prepare('SELECT * FROM productos WHERE id = ?')
    .get(req.params.id);

  if (!producto) {
    return res.status(404).json({
      error: 'Producto no encontrado'
    });
  }

  if (producto.stock < cantidad) {
    return res.status(400).json({
      error: 'Stock insuficiente'
    });
  }

  // Descontar stock
  db.prepare(
    'UPDATE productos SET stock = stock - ? WHERE id = ?'
  ).run(cantidad, req.params.id);

  const stockRestante = producto.stock - cantidad;

  res.json({
    ok: true,
    producto_id: producto.id,
    producto: producto.nombre,
    cantidadDescontada: cantidad,
    stockRestante
  });
});


// RUTA DE PRUEBA

app.get('/servicio/info', (req, res) => {
  res.json({
    servicio: 'productos-service',
    estado: 'activo',
    puerto: PORT
  });
});


// INICIAR SERVICIO

app.listen(PORT, () => {
  console.log(
    `Productos service corriendo en http://localhost:${PORT}`
  );
});
const express = require('express');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 3003;

// Debe ser exactamente la misma clave utilizada por auth-service
const JWT_SECRET = process.env.JWT_SECRET;

// URLs de los otros microservicios
const PRODUCTOS_URL = 'http://localhost:3002';
const NOTIFICACIONES_URL = 'http://localhost:3004';


// BASE DE DATOS

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

    // Guardamos los datos del usuario en la petición
    req.usuario = usuario;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}


// REALIZAR COMPRA

app.post('/comprar', verificarToken, async (req, res) => {
  const { producto_id, cantidad } = req.body;

  // El usuario sale del JWT, no del body
  const usuario_id = req.usuario.id;

  // Validar producto
  if (!producto_id) {
    return res.status(400).json({
      error: 'El producto_id es obligatorio'
    });
  }

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

  // Obtener el token original para reenviarlo
  // a los demás microservicios
  const authorization = req.headers.authorization;

  try {

    
    // 1. COMUNICACIÓN CON PRODUCTOS
    // Comunicación síncrona:
    // pedidos espera la respuesta de productos
    // antes de continuar.

    await axios.post(
      `${PRODUCTOS_URL}/${producto_id}/descontar-stock`,
      {
        cantidad
      },
      {
        headers: {
          Authorization: authorization
        }
      }
    );

    
    // 2. REGISTRAR PEDIDO

    const info = db
      .prepare(
        `INSERT INTO pedidos
        (usuario_id, producto_id, cantidad)
        VALUES (?, ?, ?)`
      )
      .run(
        usuario_id,
        producto_id,
        cantidad
      );

    const pedidoId = info.lastInsertRowid;

    // 3. ENVIAR NOTIFICACIÓN
    // Comunicación no bloqueante:
    // el pedido ya fue registrado y no esperamos
    // que la notificación termine para responder.

    axios.post(
      `${NOTIFICACIONES_URL}/notificar`,
      {
        usuario_id,
        mensaje: `Pedido #${pedidoId} confirmado`
      },
      {
        headers: {
          Authorization: authorization
        }
      }
    ).catch(() => {
      console.log(
        'No se pudo enviar la notificación. El pedido continúa confirmado.'
      );
    });


    // 4. RESPUESTA AL CLIENTE

    res.status(201).json({
      mensaje: 'Pedido realizado correctamente',
      id: pedidoId,
      usuario_id,
      producto_id,
      cantidad,
      estado: 'confirmado'
    });

  } catch (err) {

    const mensaje =
      err.response?.data?.error ||
      'Error al procesar el pedido';

    res.status(400).json({
      error: mensaje
    });
  }
});


// CONSULTAR PEDIDOS DEL USUARIO

app.get('/usuario/:usuarioId', verificarToken, (req, res) => {
  const usuarioId = Number(req.params.usuarioId);

  // Un usuario solamente puede consultar
  // sus propios pedidos.
  if (usuarioId !== req.usuario.id) {
    return res.status(403).json({
      error: 'No tienes permiso para consultar estos pedidos'
    });
  }

  const pedidos = db
    .prepare(
      'SELECT * FROM pedidos WHERE usuario_id = ?'
    )
    .all(usuarioId);

  res.json(pedidos);
});


// RUTA DE PRUEBA


app.get('/', (req, res) => {
  res.json({
    servicio: 'pedidos-service',
    estado: 'activo',
    puerto: PORT
  });
});


// INICIAR SERVICIO

app.listen(PORT, () => {
  console.log(
    `Pedidos service corriendo en http://localhost:${PORT}`
  );
});
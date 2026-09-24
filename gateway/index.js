const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());

const PORT = 3000;

// Debe ser exactamente la misma clave utilizada
// por auth-service y los demás microservicios
const JWT_SECRET = process.env.JWT_SECRET;

// DIRECCIONES DE LOS MICROSERVICIOS

const SERVICES = {
  auth: 'http://localhost:8080',
  usuarios: 'http://localhost:3001',
  productos: 'http://localhost:3002',
  pedidos: 'http://localhost:3003',
  notificaciones: 'http://localhost:3004'
};

// RUTAS PÚBLICAS

function esRutaPublica(req) {

  // Página principal del Gateway
  if (
    req.method === 'GET' &&
    req.path === '/'
  ) {
    return true;
  }

  // Login
  if (
    req.method === 'POST' &&
    req.path === '/auth/login'
  ) {
    return true;
  }

  // Registro
  if (
    req.method === 'POST' &&
    req.path === '/auth/registrar'
  ) {
    return true;
  }

  // Catálogo completo
  if (
    req.method === 'GET' &&
    req.path === '/productos'
  ) {
    return true;
  }

  // Producto individual
  if (
    req.method === 'GET' &&
    /^\/productos\/\d+$/.test(req.path)
  ) {
    return true;
  }

  return false;
}

// MIDDLEWARE DE AUTENTICACIÓN

app.use((req, res, next) => {

  // Las rutas públicas no necesitan token
  if (esRutaPublica(req)) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Token no proporcionado'
    });
  }

  // Esperamos:
  // Authorization: Bearer TOKEN

  const partes = authHeader.split(' ');

  if (
    partes.length !== 2 ||
    partes[0] !== 'Bearer'
  ) {
    return res.status(401).json({
      error: 'Formato de token inválido'
    });
  }

  const token = partes[1];

  try {

    const usuario = jwt.verify(
      token,
      JWT_SECRET
    );

    // Guardamos el usuario autenticado
    req.usuario = usuario;

    next();

  } catch (error) {

    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
});

// ENRUTAMIENTO - AUTH

app.use(
  '/auth',
  createProxyMiddleware({
    target: SERVICES.auth,
    changeOrigin: true,
    pathRewrite: {
      '^/auth': ''
    }
  })
);

// ENRUTAMIENTO - USUARIOS

app.use(
  '/usuarios',
  createProxyMiddleware({
    target: SERVICES.usuarios,
    changeOrigin: true,
    pathRewrite: {
      '^/usuarios': ''
    }
  })
);

// ENRUTAMIENTO - PRODUCTOS

app.use(
  '/productos',
  createProxyMiddleware({
    target: SERVICES.productos,
    changeOrigin: true,
    pathRewrite: {
      '^/productos': ''
    }
  })
);

// ENRUTAMIENTO - PEDIDOS

app.use('/pedidos', (req, res, next) => {
  console.log('Gateway recibió:', req.method, req.originalUrl);
  console.log('Authorization:', req.headers.authorization ? 'SI' : 'NO');
  next();
});

app.use(
  '/pedidos',
  createProxyMiddleware({
    target: SERVICES.pedidos,
    changeOrigin: true,
    pathRewrite: {
      '^/pedidos': ''
    }
  })
);
// ENRUTAMIENTO - NOTIFICACIONES

app.use(
  '/notificaciones',
  createProxyMiddleware({
    target: SERVICES.notificaciones,
    changeOrigin: true,
    pathRewrite: {
      '^/notificaciones': ''
    }
  })
);

// RUTA DE PRUEBA DEL GATEWAY

app.get('/', (req, res) => {

  res.json({
    servicio: 'gateway',
    estado: 'activo',
    puerto: PORT,
    mensaje: 'Gateway funcionando correctamente'
  });

});

// INICIAR GATEWAY

app.listen(PORT, () => {

  console.log(
    `Gateway corriendo en http://localhost:${PORT}`
  );

});
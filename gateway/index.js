const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET = 'miClaveSecretaSuperSeguraP';

const SERVICES = {
  auth: 'http://localhost:8080',
  usuarios: 'http://localhost:3001',
  productos: 'http://localhost:3002',
  pedidos: 'http://localhost:3003',
  notificaciones: 'http://localhost:3004'
};

// Rutas que no requieren token
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registrar', '/productos'];

function esRutaPublica(path) {
  return RUTAS_PUBLICAS.some(r => path.startsWith(r));
}

// Middleware de autenticación centralizado: aquí vive la seguridad del sistema
app.use((req, res, next) => {
  if (esRutaPublica(req.path)) return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.usuario = decoded;
    next();
  });
});

// Enrutamiento hacia cada microservicio
app.use('/auth', createProxyMiddleware({ target: SERVICES.auth, changeOrigin: true, pathRewrite: { '^/auth': '' } }));
app.use('/usuarios', createProxyMiddleware({ target: SERVICES.usuarios, changeOrigin: true, pathRewrite: { '^/usuarios': '' } }));
app.use('/productos', createProxyMiddleware({ target: SERVICES.productos, changeOrigin: true, pathRewrite: { '^/productos': '' } }));
app.use('/pedidos', createProxyMiddleware({ target: SERVICES.pedidos, changeOrigin: true, pathRewrite: { '^/pedidos': '' } }));
app.use('/notificaciones', createProxyMiddleware({ target: SERVICES.notificaciones, changeOrigin: true, pathRewrite: { '^/notificaciones': '' } }));

app.listen(PORT, () => console.log(`Gateway corriendo en http://localhost:${PORT}`));

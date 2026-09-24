const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = 3004;

// Debe ser exactamente la misma clave utilizada por auth-service
const JWT_SECRET = process.env.JWT_SECRET;


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
    req.usuario = usuario;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}


// ENVIAR NOTIFICACIÓN

app.post('/notificar', verificarToken, (req, res) => {
  const { usuario_id, mensaje } = req.body;

  if (!usuario_id || !mensaje) {
    return res.status(400).json({
      error: 'usuario_id y mensaje son obligatorios'
    });
  }

  // Verificamos que la notificación
  // corresponda al usuario del JWT.
  if (Number(usuario_id) !== req.usuario.id) {
    return res.status(403).json({
      error: 'No tienes permiso para enviar esta notificación'
    });
  }

  // En un proyecto real aquí se enviaría
  // un correo electrónico, SMS, etc.
  console.log(
    `[EMAIL] Para usuario ${usuario_id}: ${mensaje}`
  );

  res.json({
    enviado: true,
    usuario_id,
    mensaje
  });
});

// RUTA DE PRUEBA

app.get('/', (req, res) => {
  res.json({
    servicio: 'notificaciones-service',
    estado: 'activo',
    puerto: PORT
  });
});

// INICIAR SERVICIO

app.listen(PORT, () => {
  console.log(
    `Notificaciones service corriendo en http://localhost:${PORT}`
  );
});
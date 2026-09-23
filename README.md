# E-commerce - Arquitectura de microservicios

## Servicios

| Servicio | Puerto | Rutas |
|---|---|---|
| Gateway | 3000 | Enruta a todos los demás, valida JWT |
| Auth | 8080 | POST /registrar, POST /login |
| Usuarios | 3001 | GET /perfil/:usuarioId, POST /perfil |
| Productos | 3002 | GET /, GET /:id, POST /:id/descontar-stock |
| Pedidos | 3003 | POST /comprar, GET /usuario/:usuarioId |
| Notificaciones | 3004 | POST /notificar |

Nota: en el diagrama original Auth aparece en Spring Boot. Aquí está en Node/Express
para que todo el equipo corra el mismo stack fácilmente. La lógica (hash de password,
emisión de JWT) es la misma; si necesitan la versión en Spring Boot para la entrega,
avisen y se las armamos aparte.

## Cómo correrlo

En una terminal por cada carpeta de servicio:

```bash
cd auth-service && npm install && npm start
cd usuarios-service && npm install && npm start
cd productos-service && npm install && npm start
cd pedidos-service && npm install && npm start
cd notificaciones-service && npm install && npm start
cd gateway && npm install && npm start
```

## Probarlo (todo pasa por el gateway, puerto 3000)

```bash
# Registrar usuario
curl -X POST http://localhost:3000/auth/registrar -H "Content-Type: application/json" \
  -d '{"email":"ana@mail.com","password":"1234"}'

# Login (devuelve el token)
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"ana@mail.com","password":"1234"}'

# Ver productos (ruta pública, no necesita token)
curl http://localhost:3000/productos

# Comprar (requiere el token del login)
curl -X POST http://localhost:3000/pedidos/comprar -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"usuario_id":1,"producto_id":1,"cantidad":2}'
```

## Puntos clave para la sustentación

- **Seguridad**: el Gateway centraliza la verificación del JWT, así ningún
  microservicio queda expuesto directamente al cliente. Las contraseñas se
  guardan con hash (bcrypt), nunca en texto plano.
- **Arquitectura**: cada servicio tiene su propia base de datos SQLite
  (independencia total, sin acoplar esquemas entre servicios).
- **Comunicación**: síncrona vía HTTP/REST para lo que bloquea el flujo
  (validar stock antes de confirmar), asíncrona (fire-and-forget) para lo
  que no debe bloquear al cliente (enviar la notificación).

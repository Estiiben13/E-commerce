const express = require('express');

const app = express();
app.use(express.json());
const PORT = 3004;

// En un proyecto real esto enviaría un email de verdad (ej. con nodemailer)
app.post('/notificar', (req, res) => {
  const { usuario_id, mensaje } = req.body;
  console.log(`[EMAIL] Para usuario ${usuario_id}: ${mensaje}`);
  res.json({ enviado: true });
});

app.listen(PORT, () => console.log(`Notificaciones service corriendo en http://localhost:${PORT}`));

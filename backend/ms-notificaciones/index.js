const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const Queue = require("bull");
require("dotenv").config();
const { metricsHandler, metricsMiddleware } = require("./src/metrics");
const { sendInvitationEmail } = require("./src/emailService");

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", metricsHandler);

// ============================================
// Configuracion PostgreSQL (db_notificaciones)
// ============================================
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "db_notificaciones",
  database: process.env.DB_NAME || "db_notificaciones",
  password: process.env.DB_PASSWORD || "password123",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// ============================================
// Configuracion Redis + Bull
// ============================================
const emailQueue = new Queue("email", {
  redis: {
    host: process.env.REDIS_HOST || "redis",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 10s, 20s
    },
  },
});

// ============================================
// Tipos de eventos soportados
// ============================================
const EVENTOS_SOPORTADOS = new Set(["USUARIO_CREADO"]);

// ============================================
// ENDPOINTS
// ============================================

// GET /health — Healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// POST /api/eventos — Recibir evento de otros MS
app.post("/api/eventos", async (req, res) => {
  const { tipo, data } = req.body;

  // Validar campos requeridos
  if (!tipo || !data) {
    return res.status(400).json({ error: "tipo y data son requeridos" });
  }

  // Validar tipo soportado
  if (!EVENTOS_SOPORTADOS.has(tipo)) {
    return res.status(400).json({ error: "Tipo no soportado" });
  }

  // Validar data segun tipo
  if (tipo === "USUARIO_CREADO" && !data.email) {
    return res.status(400).json({ error: "data.email es requerido para USUARIO_CREADO" });
  }

  try {
    // Guardar evento en BD
    const result = await pool.query(
      `INSERT INTO eventos (tipo, data, estado) VALUES ($1, $2, 'pendiente') RETURNING id`,
      [tipo, JSON.stringify(data)]
    );
    const eventoId = result.rows[0].id;

    // Encolar envio de email
    await emailQueue.add(
      "enviar-invitacion",
      {
        eventoId,
        to: data.email,
        nombre: data.nombre || "",
        token: data.token_activacion || "",
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );

    // Responder 202 Accepted (no bloquea)
    res.status(202).json({ status: "evento recibido" });
  } catch (err) {
    console.error("Error al procesar evento:", err.message);
    res.status(500).json({ error: "Error interno al procesar evento" });
  }
});

// GET /api/eventos — Listar eventos (debug/monitoreo)
app.get("/api/eventos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM eventos ORDER BY created_at DESC LIMIT 100"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// WORKER DE BULL — Procesar cola de emails
// ============================================

emailQueue.process("enviar-invitacion", async (job) => {
  const { eventoId, to, nombre, token } = job.data;

  console.log(`[Worker] Enviando email a ${to} (evento #${eventoId})`);

  // Enviar email
  const result = await sendInvitationEmail({ to, nombre, token });

  // Actualizar BD segun resultado
  if (result.success) {
    await pool.query(
      `UPDATE eventos SET estado = 'enviado', enviado_at = NOW(), intentos = intentos + 1 WHERE id = $1`,
      [eventoId]
    );

    await pool.query(
      `INSERT INTO email_logs (evento_id, para, asunto, estado)
       VALUES ($1, $2, 'Bienvenido a repoGPS — Activa tu cuenta', 'enviado')`,
      [eventoId, to]
    );

    console.log(`[Worker] Email enviado a ${to} (messageId: ${result.messageId})`);
  } else {
    // Si falla, se actualiza el intento. Bull reintenta automaticamente.
    await pool.query(
      `UPDATE eventos SET intentos = intentos + 1, error_message = $1 WHERE id = $2`,
      [result.error, eventoId]
    );

    console.error(`[Worker] Error enviando email a ${to}: ${result.error}`);

    // Si es el ultimo intento, marcar como error
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await pool.query(
        `UPDATE eventos SET estado = 'error', error_message = $1 WHERE id = $2`,
        [result.error, eventoId]
      );

      await pool.query(
        `INSERT INTO email_logs (evento_id, para, asunto, estado, error_message)
         VALUES ($1, $2, 'Bienvenido a repoGPS — Activa tu cuenta', 'fallido', $3)`,
        [eventoId, to, result.error]
      );
    } else {
      // Lanzar error para que Bull reintente
      throw new Error(result.error);
    }
  }
});

// Manejo de eventos de la cola
emailQueue.on("failed", (job, err) => {
  console.error(`[Queue] Job #${job.id} fallo:`, err.message);
});

emailQueue.on("completed", (job) => {
  console.log(`[Queue] Job #${job.id} completado`);
});

// ============================================
// Iniciar servidor
// ============================================
const PORT = parseInt(process.env.PORT || "3003");
app.listen(PORT, () => {
  console.log(`Servidor ms-notificaciones corriendo en el puerto ${PORT}`);
});

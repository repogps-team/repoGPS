const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const { metricsHandler, metricsMiddleware, eventsReceivedTotal, eventsFailedTotal } = require("./src/metrics");
const { validateEventPayload, validateQueryFilters } = require("./src/validation");
const { rateLimiter } = require("./src/rateLimiter");

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", metricsHandler);

// Pool configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "db_auditoria",
  database: process.env.DB_NAME || "db_auditoria",
  password: process.env.DB_PASSWORD || "password123",
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ============================================
// POST /api/events - Store audit event
// ============================================
app.post("/api/events", rateLimiter, async (req, res) => {
  try {
    const validated = validateEventPayload(req.body);
    const result = await pool.query(
      `INSERT INTO audit_events (
        usuario_id, usuario_nombre, usuario_email,
        accion, entidad, entidad_id, entidad_nombre,
        valor_anterior, valor_nuevo,
        ip, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        validated.usuario_id || null,
        validated.usuario_nombre || null,
        validated.usuario_email || null,
        validated.accion,
        validated.entidad,
        validated.entidad_id || null,
        validated.entidad_nombre || null,
        validated.valor_anterior ? JSON.stringify(validated.valor_anterior) : null,
        validated.valor_nuevo ? JSON.stringify(validated.valor_nuevo) : null,
        validated.ip || null,
        validated.user_agent || null,
        validated.metadata ? JSON.stringify(validated.metadata) : null,
      ]
    );
    eventsReceivedTotal.inc();
    res.status(202).json({ id: result.rows[0].id });
  } catch (err) {
    eventsFailedTotal.inc();
    console.error("[ms-auditoria] Error storing event:", err.message);
    if (err.message.includes("Invalid") || err.message.includes("Payload")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(503).json({ error: "Event storage unavailable" });
  }
});

// ============================================
// GET /api/events - Query events with filters
// ============================================
app.get("/api/events", async (req, res) => {
  try {
    const filters = validateQueryFilters(req.query);
    const where = [];
    const params = [];
    let paramIndex = 1;

    if (filters.fecha_desde) {
      params.push(filters.fecha_desde);
      where.push(`fecha >= $${paramIndex++}`);
    }
    if (filters.fecha_hasta) {
      params.push(filters.fecha_hasta);
      where.push(`fecha <= $${paramIndex++}`);
    }
    if (filters.usuario_id) {
      params.push(filters.usuario_id);
      where.push(`usuario_id = $${paramIndex++}`);
    }
    if (filters.accion) {
      params.push(filters.accion);
      where.push(`accion = $${paramIndex++}`);
    }
    if (filters.entidad) {
      params.push(filters.entidad);
      where.push(`entidad = $${paramIndex++}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_events ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const queryResult = await pool.query(
      `SELECT * FROM audit_events ${whereClause}
       ORDER BY fecha DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, filters.limit, filters.offset]
    );

    res.json({
      events: queryResult.rows,
      total,
      page: Math.floor(filters.offset / filters.limit) + 1,
      limit: filters.limit,
    });
  } catch (err) {
    console.error("[ms-auditoria] Error querying events:", err.message);
    res.status(500).json({ error: "Error querying events" });
  }
});

// ============================================
// GET /api/events/entity/:entidad/:id - Entity history
// ============================================
app.get("/api/events/entity/:entidad/:id", async (req, res) => {
  try {
    const { entidad, id } = req.params;
    const entityId = parseInt(id, 10);
    if (isNaN(entityId)) {
      return res.status(400).json({ error: "Invalid entity id" });
    }

    const result = await pool.query(
      `SELECT * FROM audit_events
       WHERE entidad = $1 AND entidad_id = $2
       ORDER BY fecha DESC`,
      [entidad, entityId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("[ms-auditoria] Error querying entity history:", err.message);
    res.status(500).json({ error: "Error querying entity history" });
  }
});

// ============================================
// GET /api/stats - Dashboard statistics
// ============================================
app.get("/api/stats", async (req, res) => {
  try {
    const [totalResult, byAccionResult, byEntidadResult, byDayResult] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM audit_events"),
      pool.query("SELECT accion, COUNT(*) as total FROM audit_events GROUP BY accion ORDER BY total DESC"),
      pool.query("SELECT entidad, COUNT(*) as total FROM audit_events GROUP BY entidad ORDER BY total DESC"),
      pool.query(
        `SELECT date_trunc('day', fecha) as day, COUNT(*) as total
         FROM audit_events
         WHERE fecha >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY 1`
      ),
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].count, 10),
      by_accion: byAccionResult.rows,
      by_entidad: byEntidadResult.rows,
      by_day: byDayResult.rows,
    });
  } catch (err) {
    console.error("[ms-auditoria] Error fetching stats:", err.message);
    res.status(500).json({ error: "Error fetching stats" });
  }
});

// Start server
const PORT = process.env.PORT || 3004;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[ms-auditoria] Servidor corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
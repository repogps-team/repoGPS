const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const {
  metricsHandler,
  metricsMiddleware,
  expedienteCreatedTotal,
  documentoUploadedTotal,
  uploadErrorsTotal,
  procesoCreatedTotal,
  etapaCreatedTotal
} = require("./src/metrics");

// Storage client for GarageHQ
const storage = require("./src/storage/garageClient");

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", metricsHandler);

// JWT Configuration (debe coincidir con ms-usuarios)
const JWT_SECRET = process.env.JWT_SECRET || "repoGPS_jwt_secret_key_2026";
const ADMIN_ROL_ID = 1;
const MS_USUARIOS_URL = process.env.MS_USUARIOS_URL || "http://ms-usuarios:3000";
const MS_MANTENEDOR_URL = process.env.MS_MANTENEDOR_URL || "http://ms-mantenedor:3001";

// Multer configuration for file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Allowed file extensions for construction documents
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.dwg', '.dxf', '.rvt', '.skp', '.ifc',
  '.csv', '.xls', '.xlsx', '.doc', '.docx',
  '.jpg', '.jpeg', '.png', '.tiff', '.tif'
]);

// Allowed MIME types for construction documents
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/vnd.dwg', 'image/x-dwg', // DWG
  'application/dxf', 'image/vnd.dxf', 'image/x-dxf', // DXF
  'application/x-rvt', 'application/vnd.autodesk.rvt', // Revit
  'application/x-sketchup', 'application/vnd.sketchup.skp', // SketchUp
  'application/x-ifc', 'application/ifc', // IFC
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/tiff'
]);

function isAllowedFile(file) {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Check extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { allowed: false, error: `Extensión no permitida: ${ext}. Solo se permiten: PDF, DWG, DXF, RVT, SKP, IFC, XLS, XLSX, DOC, DOCX, JPG, PNG, TIFF` };
  }

  // Check MIME type (allow generic image/* for unknown image types)
  if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('image/')) {
    return { allowed: false, error: `Tipo de archivo no permitido: ${mime}` };
  }

  return { allowed: true };
}

// Initialize GarageHQ storage client
try {
  storage.initGarageClient();
} catch (err) {
  console.warn('[ms-expedientes] Could not initialize GarageHQ client:', err.message);
}

// Middleware de autenticación JWT
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      rol_id: decoded.rol_id,
      area_id: decoded.area_id,
      esAdmin: decoded.rol_id === ADMIN_ROL_ID
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

// Compatibilidad de esquema: algunas BD antiguas usan etapa_proceso_id
let TAREAS_ETAPA_COLUMN = null;

async function resolveTareasEtapaColumn() {
  try {
    const result = await pool.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tareas_asignadas'
        AND column_name IN ('etapa_id', 'etapa_proceso_id')
      ORDER BY CASE column_name
        WHEN 'etapa_id' THEN 1
        WHEN 'etapa_proceso_id' THEN 2
        ELSE 99
      END
      LIMIT 1
      `
    );

    if (result.rows.length > 0) {
      TAREAS_ETAPA_COLUMN = result.rows[0].column_name;
      console.log(`[ms-expedientes] Usando columna de etapa en tareas_asignadas: ${TAREAS_ETAPA_COLUMN}`);
    } else {
      TAREAS_ETAPA_COLUMN = "etapa_id";
      console.warn("[ms-expedientes] No se encontró columna etapa_id ni etapa_proceso_id en tareas_asignadas. Se usará etapa_id por defecto.");
    }
  } catch (err) {
    // Puede fallar al iniciar si DB todavía no está lista. Reintentar en runtime.
    console.warn(`[ms-expedientes] No se pudo resolver columna de etapa al iniciar: ${err.message}. Se reintentará en runtime.`);
  }
}

async function getTareasEtapaColumn() {
  if (!TAREAS_ETAPA_COLUMN) {
    await resolveTareasEtapaColumn();
  }
  return TAREAS_ETAPA_COLUMN || "etapa_id";
}

// =====================================================
// Mirror sync helpers (mantenedor -> expedientes)
// =====================================================
async function syncMirrorTable(client, tableName, rows, columns) {
  if (!rows || rows.length === 0) return;

  const colNames = columns.join(", ");
  const insertCols = `${colNames}, fecha_sync`;

  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const baseIndex = rowIndex * (columns.length + 1);
    columns.forEach((col, colIndex) => {
      values.push(row[col] ?? null);
    });
    values.push(new Date());

    const rowPlaceholders = columns.map((_, colIndex) => `$${baseIndex + colIndex + 1}`);
    rowPlaceholders.push(`$${baseIndex + columns.length + 1}`);
    return `(${rowPlaceholders.join(", ")})`;
  });

  const updates = columns.map(col => `${col} = EXCLUDED.${col}`).join(", ");

  const query = `
    INSERT INTO ${tableName} (${insertCols})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO UPDATE SET
      ${updates},
      fecha_sync = EXCLUDED.fecha_sync
  `;

  await client.query(query, values);
}

async function syncMantenedorMirror() {
  const [contratistasRes, areasRes, disciplinasRes, categoriasRes, subtiposRes] = await Promise.all([
    fetch(`${MS_MANTENEDOR_URL}/api/contratistas`),
    fetch(`${MS_MANTENEDOR_URL}/api/areas`),
    fetch(`${MS_MANTENEDOR_URL}/api/disciplinas`),
    fetch(`${MS_MANTENEDOR_URL}/api/categorias`),
    fetch(`${MS_MANTENEDOR_URL}/api/subtipos`)
  ]);

  if (!contratistasRes.ok || !areasRes.ok || !disciplinasRes.ok || !categoriasRes.ok || !subtiposRes.ok) {
    throw new Error("No se pudo obtener datos de mantenedor");
  }

  const [contratistas, areas, disciplinas, categorias, subtipos] = await Promise.all([
    contratistasRes.json(),
    areasRes.json(),
    disciplinasRes.json(),
    categoriasRes.json(),
    subtiposRes.json()
  ]);

  const usuariosRes = await fetch(`${MS_USUARIOS_URL}/api/usuarios`);
  if (!usuariosRes.ok) {
    throw new Error("No se pudo obtener usuarios");
  }
  const usuarios = await usuariosRes.json();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await syncMirrorTable(client, "contratistas_mirror", contratistas, ["id", "razon_social", "rut", "estado_activo"]);
    await syncMirrorTable(client, "areas_mirror", areas, ["id", "contratista_id", "nombre", "estado_activo"]);
    await syncMirrorTable(client, "disciplinas_mirror", disciplinas, ["id", "area_id", "nombre", "estado_activo"]);
    await syncMirrorTable(client, "categorias_mirror", categorias, ["id", "nombre", "descripcion", "estado_activo"]);
    await syncMirrorTable(client, "subtipos_mirror", subtipos, ["id", "categoria_id", "nombre", "descripcion", "estado_activo"]);
    await syncMirrorTable(client, "usuarios_mirror", usuarios, ["id", "rol_id", "nombre_completo", "correo", "estado_activo"]);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

let mirrorSyncInProgress = false;

async function runMirrorSync() {
  if (mirrorSyncInProgress) return;
  mirrorSyncInProgress = true;
  try {
    await syncMantenedorMirror();
    console.log("[mirror-sync] Sync completada");
  } catch (err) {
    console.warn(`[mirror-sync] Error: ${err.message}`);
  } finally {
    mirrorSyncInProgress = false;
  }
}

function isMissingColumnError(err, colName) {
  const msg = (err && err.message) || "";
  return msg.includes(`column t.${colName} does not exist`) || msg.includes(`column ${colName} does not exist`);
}

const TIPOS_TAREA_VALIDOS = new Set(["revision", "aprobacion", "visacion"]);
const TIPOS_ETAPA_VALIDOS = new Set(["inicio", "desarrollo", "final"]);

function normalizarTipoTarea(tipo_tarea) {
  if (!tipo_tarea) return null;
  const normalizado = String(tipo_tarea).trim().toLowerCase();
  if (!TIPOS_TAREA_VALIDOS.has(normalizado)) {
    return null;
  }
  return normalizado;
}

function normalizarTipoEtapa(tipo_etapa) {
  if (!tipo_etapa) return null;
  const normalizado = String(tipo_etapa).trim().toLowerCase();
  if (!TIPOS_ETAPA_VALIDOS.has(normalizado)) {
    return null;
  }
  return normalizado;
}

async function validarReglasEtapa({ proceso_id, orden, tipo_etapa, tipo_tarea, rol_id }, etapaId = null) {
  const procesoIdNum = Number(proceso_id);
  const ordenNum = Number(orden);
  const rolIdNum = rol_id ? Number(rol_id) : null;

  if (!Number.isInteger(procesoIdNum) || procesoIdNum <= 0) {
    throw new Error("proceso_id inválido");
  }

  if (!Number.isInteger(ordenNum) || ordenNum <= 0) {
    throw new Error("orden debe ser un entero mayor a 0");
  }

  const tipoEtapaNormalizado = normalizarTipoEtapa(tipo_etapa);

  const tipoTareaNormalizado = tipo_tarea ? normalizarTipoTarea(tipo_tarea) : null;
  if (tipo_tarea && !tipoTareaNormalizado) {
    throw new Error("tipo_tarea inválido (use: revision, aprobacion o visacion)");
  }

  if ((tipoTareaNormalizado && !rolIdNum) || (!tipoTareaNormalizado && rolIdNum)) {
    throw new Error("tipo_tarea y rol_id deben enviarse juntos");
  }

  const procesoExiste = await pool.query(
    "SELECT id FROM procesos WHERE id = $1",
    [procesoIdNum]
  );
  if (procesoExiste.rows.length === 0) {
    throw new Error("Proceso no encontrado");
  }

  const ordenDuplicado = await pool.query(
    `SELECT id FROM etapas_proceso
     WHERE proceso_id = $1
       AND orden = $2
       AND estado_activo = true
       AND ($3::int IS NULL OR id <> $3)
     LIMIT 1`,
    [procesoIdNum, ordenNum, etapaId]
  );
  if (ordenDuplicado.rows.length > 0) {
    throw new Error("Ya existe una etapa activa con ese orden para el proceso");
  }

  // Invariante: solo 1 etapa con tipo_etapa='inicio' por proceso
  if (tipoEtapaNormalizado === 'inicio') {
    const inicioExistente = await pool.query(
      `SELECT id FROM etapas_proceso
       WHERE proceso_id = $1
         AND tipo_etapa = 'inicio'
         AND estado_activo = true
         AND ($2::int IS NULL OR id <> $2)
       LIMIT 1`,
      [procesoIdNum, etapaId]
    );
    if (inicioExistente.rows.length > 0) {
      throw new Error("Solo puede existir una etapa de tipo 'inicio' por proceso");
    }
  }

  // Invariante: solo 1 etapa con tipo_etapa='final' por proceso
  if (tipoEtapaNormalizado === 'final') {
    const finalExistente = await pool.query(
      `SELECT id FROM etapas_proceso
       WHERE proceso_id = $1
         AND tipo_etapa = 'final'
         AND estado_activo = true
         AND ($2::int IS NULL OR id <> $2)
       LIMIT 1`,
      [procesoIdNum, etapaId]
    );
    if (finalExistente.rows.length > 0) {
      throw new Error("Solo puede existir una etapa de tipo 'final' por proceso");
    }
  }

  return {
    proceso_id: procesoIdNum,
    orden: ordenNum,
    tipo_etapa: tipoEtapaNormalizado,
    tipo_tarea: tipoTareaNormalizado,
    rol_id: rolIdNum
  };
}

// Validar reglas de etapa con cliente (transaction-aware)
// Uses tipo_etapa only - DB unique indexes enforce uniqueness
async function validarReglasEtapaTransacted({ proceso_id, orden, tipo_etapa, tipo_tarea, rol_id }, etapaId = null, client) {
  const procesoIdNum = Number(proceso_id);
  const ordenNum = Number(orden);
  const rolIdNum = rol_id ? Number(rol_id) : null;

  if (!Number.isInteger(procesoIdNum) || procesoIdNum <= 0) {
    throw new Error("proceso_id inválido");
  }

  if (!Number.isInteger(ordenNum) || ordenNum <= 0) {
    throw new Error("orden debe ser un entero mayor a 0");
  }

  const tipoEtapaNormalizado = normalizarTipoEtapa(tipo_etapa);

  const tipoTareaNormalizado = tipo_tarea ? normalizarTipoTarea(tipo_tarea) : null;
  if (tipo_tarea && !tipoTareaNormalizado) {
    throw new Error("tipo_tarea inválido (use: revision, aprobacion o visacion)");
  }

  if ((tipoTareaNormalizado && !rolIdNum) || (!tipoTareaNormalizado && rolIdNum)) {
    throw new Error("tipo_tarea y rol_id deben enviarse juntos");
  }

  // Validar proceso existe
  const procesoExiste = await client.query(
    "SELECT id FROM procesos WHERE id = $1",
    [procesoIdNum]
  );
  if (procesoExiste.rows.length === 0) {
    throw new Error("Proceso no encontrado");
  }

  // Validar orden duplicado (con lock ya adquirido en el proceso)
  if (ordenNum) {
    const ordenDuplicado = await client.query(
      `SELECT id FROM etapas_proceso
       WHERE proceso_id = $1
         AND orden = $2
         AND estado_activo = true
         AND ($3::int IS NULL OR id <> $3)
       LIMIT 1`,
      [procesoIdNum, ordenNum, etapaId]
    );
    if (ordenDuplicado.rows.length > 0) {
      throw new Error("Ya existe una etapa activa con ese orden para el proceso");
    }
  }

  // DB-level unique indexes handle tipo_etapa uniqueness
  // Additional check for tipo_etapa 'inicio'
  if (tipoEtapaNormalizado === 'inicio') {
    const inicioExistente = await client.query(
      `SELECT id FROM etapas_proceso
       WHERE proceso_id = $1
         AND tipo_etapa = 'inicio'
         AND estado_activo = true
         AND ($2::int IS NULL OR id <> $2)
       LIMIT 1`,
      [procesoIdNum, etapaId]
    );
    if (inicioExistente.rows.length > 0) {
      throw new Error("Solo puede existir una etapa de tipo 'inicio' por proceso");
    }
  }

  // Additional check for tipo_etapa 'final'
  if (tipoEtapaNormalizado === 'final') {
    const finalExistente = await client.query(
      `SELECT id FROM etapas_proceso
       WHERE proceso_id = $1
         AND tipo_etapa = 'final'
         AND estado_activo = true
         AND ($2::int IS NULL OR id <> $2)
       LIMIT 1`,
      [procesoIdNum, etapaId]
    );
    if (finalExistente.rows.length > 0) {
      throw new Error("Solo puede existir una etapa de tipo 'final' por proceso");
    }
  }

  return {
    proceso_id: procesoIdNum,
    orden: ordenNum,
    tipo_etapa: tipoEtapaNormalizado,
    tipo_tarea: tipoTareaNormalizado,
    rol_id: rolIdNum
  };
}

async function getTareaConEtapa(tareaId) {
  let etapaColumn = await getTareasEtapaColumn();
  const buildQuery = () => `
    SELECT t.id, t.usuario_id, t.estado, t.expediente_id, ep.rol_id, ep.tipo_tarea
    FROM tareas_asignadas t
    INNER JOIN etapas_proceso ep ON t.${etapaColumn} = ep.id
    WHERE t.id = $1
    LIMIT 1
  `;

  try {
    const result = await pool.query(buildQuery(), [tareaId]);
    return result.rows[0] || null;
  } catch (err) {
    if (etapaColumn === "etapa_id" && isMissingColumnError(err, "etapa_id")) {
      etapaColumn = "etapa_proceso_id";
      TAREAS_ETAPA_COLUMN = etapaColumn;
      const result = await pool.query(buildQuery(), [tareaId]);
      return result.rows[0] || null;
    }
    if (etapaColumn === "etapa_proceso_id" && isMissingColumnError(err, "etapa_proceso_id")) {
      etapaColumn = "etapa_id";
      TAREAS_ETAPA_COLUMN = etapaColumn;
      const result = await pool.query(buildQuery(), [tareaId]);
      return result.rows[0] || null;
    }
    throw err;
  }
}

// Conexión a db_expedientes
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "db_expedientes",
  database: process.env.DB_NAME || "db_expedientes",
  password: process.env.DB_PASSWORD || "password123",
  port: process.env.DB_PORT || 5432,
});

// ============================================
// PROCESOS
// ============================================

app.get("/api/procesos", async (req, res) => {
  try {
    const { area_id, incluir_inactivos } = req.query;
    let query = "SELECT id, area_id, nombre, descripcion, estado_activo FROM procesos";
    let params = [];
    let conditions = [];
    
    // Por defecto solo activos, usar ?incluir_inactivos=true para ver todos
    if (incluir_inactivos !== 'true') {
      conditions.push("estado_activo = true");
    }
    
    if (area_id && area_id !== undefined && area_id !== '') {
      conditions.push("area_id = $1");
      params.push(Number(area_id));
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY id ASC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint específico para procesos por área (evita query string)
app.get("/api/procesos-por-area/:areaId", async (req, res) => {
  const { areaId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM procesos WHERE area_id = $1 AND estado_activo = true ORDER BY id ASC",
      [Number(areaId)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/procesos/area/:areaId", async (req, res) => {
  const { areaId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM procesos WHERE area_id = $1 AND estado_activo = true ORDER BY id ASC",
      [areaId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/procesos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM procesos WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/procesos", async (req, res) => {
  const { area_id, nombre, descripcion } = req.body;
  try {
    if (!area_id) {
      return res.status(400).json({ error: "area_id es obligatorio" });
    }
    
    // Validar que area_id sea un número válido
    const areaIdNum = Number(area_id);
    if (!Number.isInteger(areaIdNum) || areaIdNum <= 0) {
      return res.status(400).json({ error: "area_id debe ser un número válido" });
    }

    const result = await pool.query(
      "INSERT INTO procesos (area_id, nombre, descripcion) VALUES ($1, $2, $3) RETURNING *",
      [areaIdNum, nombre, descripcion]
    );
    procesoCreatedTotal.inc();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/procesos/:id", async (req, res) => {
  const { id } = req.params;
  const { area_id, nombre, descripcion } = req.body;
  try {
    if (!area_id) {
      return res.status(400).json({ error: "area_id es obligatorio" });
    }
    
    // Validar que area_id sea un número válido
    const areaIdNum = Number(area_id);
    if (!Number.isInteger(areaIdNum) || areaIdNum <= 0) {
      return res.status(400).json({ error: "area_id debe ser un número válido" });
    }

    const result = await pool.query(
      "UPDATE procesos SET area_id = $1, nombre = $2, descripcion = $3 WHERE id = $4 RETURNING *",
      [areaIdNum, nombre, descripcion, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/procesos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar que no haya etapas activas asociadas
    const etapasCount = await pool.query(
      "SELECT COUNT(*) FROM etapas_proceso WHERE proceso_id = $1 AND estado_activo = true",
      [id]
    );
    if (parseInt(etapasCount.rows[0].count) > 0) {
      return res.status(400).json({ error: "No se puede eliminar el proceso porque tiene etapas activas. Elimine las etapas primero." });
    }

    // Verificar que no haya expedientes activos asociados
    const expedientesCount = await pool.query(
      "SELECT COUNT(*) FROM expedientes WHERE proceso_id = $1 AND estado_activo = true",
      [id]
    );
    if (parseInt(expedientesCount.rows[0].count) > 0) {
      return res.status(400).json({ error: "No se puede eliminar el proceso porque tiene expedientes activos." });
    }

    await pool.query("UPDATE procesos SET estado_activo = false WHERE id = $1", [id]);
    res.json({ message: "Proceso eliminado lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/procesos/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE procesos SET estado_activo = $1 WHERE id = $2 RETURNING *",
      [Boolean(estado_activo), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Proceso no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ETAPAS PROCESO - with DB transaction protection
// ============================================

app.get("/api/etapas-proceso", async (req, res) => {
  try {
    const { incluir_inactivos } = req.query;
    let query = "SELECT id, proceso_id, nombre, orden, tipo_etapa, es_final, tipo_tarea, rol_id, estado_activo FROM etapas_proceso";
    let conditions = [];
    
    if (incluir_inactivos !== 'true') {
      conditions.push("estado_activo = true");
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY proceso_id, orden ASC";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etapas-proceso/proceso/:procesoId", async (req, res) => {
  const { procesoId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM etapas_proceso WHERE proceso_id = $1 AND estado_activo = true ORDER BY orden ASC",
      [procesoId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/etapas-proceso/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM etapas_proceso WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Etapa no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/etapas-proceso - with transaction and SELECT FOR UPDATE
app.post("/api/etapas-proceso", async (req, res) => {
  const { proceso_id, nombre, orden, tipo_etapa, tipo_tarea, rol_id } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock proceso rows to serialize changes
    const procesoLock = await client.query(
      "SELECT id FROM procesos WHERE id = $1 FOR UPDATE",
      [proceso_id]
    );
    if (procesoLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Proceso no encontrado" });
    }
    
    const validado = await validarReglasEtapaTransacted({ proceso_id, orden, tipo_etapa, tipo_tarea, rol_id }, null, client);
    
    const result = await client.query(
      "INSERT INTO etapas_proceso (proceso_id, nombre, orden, tipo_etapa, tipo_tarea, rol_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [validado.proceso_id, nombre, validado.orden, validado.tipo_etapa, validado.tipo_tarea, validado.rol_id]
    );
    
    await client.query('COMMIT');
    etapaCreatedTotal.inc();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    const isInvariant = err.message.includes("Solo puede existir") || err.message.includes("Ya existe una etapa activa con ese orden");
    res.status(isInvariant ? 409 : 400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/etapas-proceso/:id - with transaction and SELECT FOR UPDATE
app.put("/api/etapas-proceso/:id", async (req, res) => {
  const { id } = req.params;
  const { proceso_id, nombre, orden, tipo_etapa, tipo_tarea, rol_id } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock proceso rows to serialize changes
    const procesoLock = await client.query(
      "SELECT id FROM procesos WHERE id = $1 FOR UPDATE",
      [proceso_id]
    );
    if (procesoLock.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Proceso no encontrado" });
    }
    
    const validado = await validarReglasEtapaTransacted({ proceso_id, orden, tipo_etapa, tipo_tarea, rol_id }, Number(id), client);
    
    const result = await client.query(
      "UPDATE etapas_proceso SET proceso_id = $1, nombre = $2, orden = $3, tipo_etapa = $4, tipo_tarea = $5, rol_id = $6 WHERE id = $7 RETURNING *",
      [validado.proceso_id, nombre, validado.orden, validado.tipo_etapa, validado.tipo_tarea, validado.rol_id, id]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Etapa no encontrada" });
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    const isInvariant = err.message.includes("Solo puede existir") || err.message.includes("Ya existe una etapa activa con ese orden");
    res.status(isInvariant ? 409 : 400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/etapas-proceso/:id - with transaction and SELECT FOR UPDATE
app.delete("/api/etapas-proceso/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const etapa = await client.query("SELECT * FROM etapas_proceso WHERE id = $1", [id]);
    if (etapa.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Etapa no encontrada" });
    }
    
    const { tipo_etapa, proceso_id } = etapa.rows[0];
    
    // DB-level protection via partial unique index handles tipo_etapa uniqueness
    // Additional check: don't delete if it's the only active 'inicio' or 'final'
    if (tipo_etapa === 'inicio' || tipo_etapa === 'final') {
      const otrasEtapas = await client.query(
        `SELECT id FROM etapas_proceso 
         WHERE proceso_id = $1 AND tipo_etapa = $2 AND estado_activo = true AND id <> $3 LIMIT 1`,
        [proceso_id, tipo_etapa, id]
      );
      if (otrasEtapas.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `No se puede eliminar: debe existir al menos una etapa '${tipo_etapa}' por proceso` });
      }
    }
    
    await client.query("UPDATE etapas_proceso SET estado_activo = false WHERE id = $1", [id]);
    await client.query('COMMIT');
    res.json({ message: "Etapa eliminada lógicamente" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.patch("/api/etapas-proceso/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE etapas_proceso SET estado_activo = $1 WHERE id = $2 RETURNING *",
      [Boolean(estado_activo), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Etapa no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ejecutar sync inicial a los 30s (para esperar DB + ms-mantenedor)
if (process.env.NODE_ENV !== 'test') {
  setTimeout(runMirrorSync, 30000);
  // Reintentar cada 5 minutos para reflejar nuevas áreas/categorías
  setInterval(runMirrorSync, 5 * 60 * 1000);
}

// ============================================
// MIRROR SYNC (Mantenedor -> Expedientes)
// ============================================
app.post("/api/mantenedor/sync", authMiddleware, async (req, res) => {
  if (!req.user.esAdmin) {
    return res.status(403).json({ error: "Solo administradores pueden sincronizar" });
  }

  try {
    await syncMantenedorMirror();
    res.json({ message: "Sync completada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EXPEDIENTES
// ============================================

// GET /api/expedientes - Lista expedientes filtrados por área del usuario
app.get("/api/expedientes", authMiddleware, async (req, res) => {
  const { esAdmin, area_id } = req.user;

  try {
    let query = `
      SELECT e.*, p.nombre AS proceso_nombre, p.area_id, ep.nombre AS etapa_actual, ep.es_final, ep.tipo_etapa
      FROM expedientes e
      LEFT JOIN procesos p ON e.proceso_id = p.id
      LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
      WHERE e.estado_activo = true
    `;
    const params = [];

    // Si no es admin, filtrar por área del usuario
    if (!esAdmin && area_id) {
      params.push(area_id);
      query += ` AND p.area_id = $${params.length}`;
    }

    query += " ORDER BY e.fecha_creacion DESC";

    const result = await pool.query(query, params);

    // Agregar campo de estado basado en la etapa
    const expedientesConEstado = result.rows.map(exp => {
      let estado = 'Pendiente';
      if (exp.etapa_actual_id) {
        if (exp.tipo_etapa === 'final' || exp.es_final) {
          estado = 'Terminado';
        } else if (exp.tipo_etapa === 'desarrollo') {
          estado = 'En Desarrollo';
        } else if (exp.tipo_etapa === 'inicio') {
          estado = 'Pendiente';
        }
      }
      return { ...exp, estado };
    });

    res.json(expedientesConEstado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/expedientes/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { esAdmin, area_id } = req.user;

  try {
    let query = `
      SELECT e.*, p.nombre AS proceso_nombre, p.area_id, ep.nombre AS etapa_actual, ep.es_final, ep.tipo_etapa
      FROM expedientes e
      LEFT JOIN procesos p ON e.proceso_id = p.id
      LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
      WHERE e.id = $1
    `;
    const params = [id];

    // Si no es admin, verificar que el expediente sea de su área
    if (!esAdmin && area_id) {
      query += ` AND p.area_id = $2`;
      params.push(area_id);
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }
    const exp = result.rows[0];
    let estado = 'Pendiente';
    if (exp?.etapa_actual_id) {
      if (exp.tipo_etapa === 'final' || exp.es_final) {
        estado = 'Terminado';
      } else if (exp.tipo_etapa === 'desarrollo') {
        estado = 'En Desarrollo';
      } else if (exp.tipo_etapa === 'inicio') {
        estado = 'Pendiente';
      }
    }
    res.json({ ...exp, estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expedientes", async (req, res) => {
  const { proceso_id, disciplina_id, subtipo_id, titulo, descripcion, fecha_termino } = req.body;
  try {
    // Validar que disciplina y proceso pertenezcan a la misma área
    if (disciplina_id && proceso_id) {
      try {
        // Disciplina está en ms-mantenedor
        const disciplinaRes = await fetch(`${MS_MANTENEDOR_URL}/api/disciplinas/${disciplina_id}`);

        if (!disciplinaRes.ok) {
          return res.status(400).json({ error: "Disciplina o proceso inválido" });
        }

        const disciplina = await disciplinaRes.json();

        // Proceso está en nuestra propia DB (ms-expedientes)
        const procesoResult = await pool.query(
          "SELECT id, area_id FROM procesos WHERE id = $1 AND estado_activo = true",
          [proceso_id]
        );

        if (procesoResult.rows.length === 0) {
          return res.status(400).json({ error: "Disciplina o proceso inválido" });
        }

        const proceso = procesoResult.rows[0];

        if (!disciplina?.area_id || disciplina.area_id !== proceso.area_id) {
          return res.status(400).json({ error: "La disciplina y el proceso deben pertenecer a la misma área" });
        }
      } catch (err) {
        return res.status(500).json({ error: "No se pudo validar el área del proceso" });
      }
    }

    // Obtener la primera etapa del proceso para asignarla automáticamente
    const etapaResult = await pool.query(
      "SELECT id FROM etapas_proceso WHERE proceso_id = $1 AND estado_activo = true ORDER BY orden ASC LIMIT 1",
      [proceso_id]
    );
    
    const etapa_actual_id = etapaResult.rows[0]?.id || null;
    
    const result = await pool.query(
      `INSERT INTO expedientes (proceso_id, disciplina_id, subtipo_id, etapa_actual_id, titulo, descripcion, fecha_termino)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [proceso_id, disciplina_id, subtipo_id, etapa_actual_id, titulo, descripcion, fecha_termino || null]
    );
    documentoUploadedTotal.inc();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    uploadErrorsTotal.inc();
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  const { proceso_id, disciplina_id, subtipo_id, etapa_actual_id, titulo, descripcion, fecha_termino } = req.body;
  try {
    const result = await pool.query(
      `UPDATE expedientes SET proceso_id = $1, disciplina_id = $2, subtipo_id = $3,
       etapa_actual_id = $4, titulo = $5, descripcion = $6, fecha_termino = $7, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [proceso_id, disciplina_id, subtipo_id, etapa_actual_id, titulo, descripcion, fecha_termino || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Avanzar expediente a siguiente etapa
// Al avanzar, genera tareas automaticamente para usuarios con el rol correspondiente
// POST /api/expedientes/:id/avanzar - Avanzar expediente a siguiente etapa
app.post("/api/expedientes/:id/avanzar", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { observacion } = req.body;
  const { id: usuario_id, rol_id, esAdmin, area_id } = req.user;

  try {
    // Obtener expediente actual con JOIN a procesos para verificar área
    let expQuery = `
      SELECT e.*, p.area_id 
      FROM expedientes e 
      INNER JOIN procesos p ON e.proceso_id = p.id 
      WHERE e.id = $1
    `;
    const expParams = [id];

    // Si no es admin, verificar que el expediente sea de su área
    if (!esAdmin && area_id) {
      expQuery += ` AND p.area_id = $2`;
      expParams.push(area_id);
    }

    const expResult = await pool.query(expQuery, expParams);
    if (expResult.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    const avanzarResult = await internalAvanzarExpediente(id, usuario_id, observacion, pool, {
      skipPermisos: esAdmin,
      rolId: rol_id,
      expediente: expResult.rows[0] // ya lo consultamos para verificar área
    });

    const updated = await pool.query(`
      SELECT e.*, p.nombre AS proceso_nombre, p.area_id, ep.nombre AS etapa_actual, ep.es_final, ep.tipo_etapa
      FROM expedientes e
      LEFT JOIN procesos p ON e.proceso_id = p.id
      LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
      WHERE e.id = $1
    `, [id]);

    const exp = updated.rows[0];
    let estado = 'Pendiente';
    if (exp?.etapa_actual_id) {
      if (exp.tipo_etapa === 'final' || exp.es_final) {
        estado = 'Terminado';
      } else if (exp.tipo_etapa === 'desarrollo') {
        estado = 'En Desarrollo';
      } else if (exp.tipo_etapa === 'inicio') {
        estado = 'Pendiente';
      }
    }

    res.json({ message: "Expediente avanzado", nueva_etapa: avanzarResult.nueva_etapa, expediente: { ...exp, estado } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

// POST /api/expedientes/:id/devolver - Devolver expediente a etapa anterior
app.post("/api/expedientes/:id/devolver", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { observacion } = req.body;
  const { id: usuario_id, rol_id, esAdmin, area_id } = req.user;

  try {
    // Obtener expediente actual verificando área
    let expQuery = `
      SELECT e.*, p.area_id 
      FROM expedientes e 
      INNER JOIN procesos p ON e.proceso_id = p.id 
      WHERE e.id = $1
    `;
    const expParams = [id];

    if (!esAdmin && area_id) {
      expQuery += ` AND p.area_id = $2`;
      expParams.push(area_id);
    }

    const expResult = await pool.query(expQuery, expParams);
    if (expResult.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }
    const expediente = expResult.rows[0];

    const etapaResult = await pool.query(
      "SELECT * FROM etapas_proceso WHERE proceso_id = $1 AND orden < (SELECT orden FROM etapas_proceso WHERE id = $2) ORDER BY orden DESC LIMIT 1",
      [expediente.proceso_id, expediente.etapa_actual_id]
    );

    if (etapaResult.rows.length === 0) {
      return res.status(400).json({ error: "No hay etapas anteriores" });
    }

    const etapaAnterior = etapaResult.rows[0];

    // HU-21: Verificar que el rol tiene permiso para esta transicion (devolver)
    if (!esAdmin) {
      const permiso = await pool.query(
        `SELECT 1 FROM transiciones_permitidas
         WHERE proceso_id = $1
           AND etapa_from_id = $2
           AND etapa_to_id = $3
           AND rol_id = $4`,
        [expediente.proceso_id, expediente.etapa_actual_id, etapaAnterior.id, rol_id]
      );
      if (permiso.rows.length === 0) {
        return res.status(403).json({ error: "Tu rol no tiene permiso para ejecutar esta transicion" });
      }
    }

    await pool.query(
      "UPDATE expedientes SET etapa_actual_id = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2",
      [etapaAnterior.id, id]
    );

    await pool.query(
      "INSERT INTO historial_etapas (expediente_id, etapa_anterior_id, etapa_nueva_id, usuario_id, observacion) VALUES ($1, $2, $3, $4, $5)",
      [id, expediente.etapa_actual_id, etapaAnterior.id, usuario_id, observacion || "Devolución"]
    );

    // Cancelar tareas activas de la etapa que dejamos (pendientes o vistas)
    const etapaColumnDev = await getTareasEtapaColumn();
    await pool.query(`
      UPDATE tareas_asignadas 
      SET estado = 'rechazada', 
          observacion = COALESCE(observacion, '') || ' | Expediente devuelto a etapa anterior',
          fecha_termino = CURRENT_TIMESTAMP
      WHERE expediente_id = $1 AND ${etapaColumnDev} = $2 AND estado IN ('pendiente', 'visto')
    `, [id, expediente.etapa_actual_id]);

    // Generar tareas para la etapa a la que volvemos
    if (etapaAnterior.tipo_tarea && etapaAnterior.rol_id) {
      await generarTareasPorEtapa(id, etapaAnterior.id, pool);
    }

    const updated = await pool.query(`
      SELECT e.*, p.nombre AS proceso_nombre, p.area_id, ep.nombre AS etapa_actual, ep.es_final, ep.tipo_etapa
      FROM expedientes e
      LEFT JOIN procesos p ON e.proceso_id = p.id
      LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
      WHERE e.id = $1
    `, [id]);

    const exp = updated.rows[0];
    let estado = 'Pendiente';
    if (exp?.etapa_actual_id) {
      if (exp.tipo_etapa === 'final' || exp.es_final) {
        estado = 'Terminado';
      } else if (exp.tipo_etapa === 'desarrollo') {
        estado = 'En Desarrollo';
      } else if (exp.tipo_etapa === 'inicio') {
        estado = 'Pendiente';
      }
    }

    res.json({ message: "Expediente devuelto", etapa_anterior: etapaAnterior, expediente: { ...exp, estado } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Función compartida: rechazar expediente a etapa terminal "Rechazado"
// Devuelve { exito: true, nueva_etapa } o lanza error
async function internalRechazarExpediente(expedienteId, usuarioId, observacion, pool, options = {}) {
  const { skipPermisos = false, rolId = null } = options;

  const expResult = await pool.query("SELECT e.*, p.area_id FROM expedientes e INNER JOIN procesos p ON e.proceso_id = p.id WHERE e.id = $1", [expedienteId]);
  if (expResult.rows.length === 0) {
    throw Object.assign(new Error("Expediente no encontrado"), { statusCode: 404 });
  }
  const expediente = expResult.rows[0];

  // Buscar etapa Rechazado para este proceso
  let etapaResult = await pool.query(
    "SELECT * FROM etapas_proceso WHERE proceso_id = $1 AND LOWER(nombre) = 'rechazado' AND estado_activo = true LIMIT 1",
    [expediente.proceso_id]
  );

  let rechazadoEtapa;
  if (etapaResult.rows.length === 0) {
    const maxOrden = await pool.query(
      "SELECT COALESCE(MAX(orden), 0) + 1 AS nuevo_orden FROM etapas_proceso WHERE proceso_id = $1",
      [expediente.proceso_id]
    );
    const nuevoOrden = maxOrden.rows[0].nuevo_orden;
    const newEtapa = await pool.query(
      "INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final) VALUES ($1, 'Rechazado', $2, true) RETURNING *",
      [expediente.proceso_id, nuevoOrden]
    );
    rechazadoEtapa = newEtapa.rows[0];
  } else {
    rechazadoEtapa = etapaResult.rows[0];
  }

  // No permitir rechazar si ya está en etapa final
  const etapaActual = await pool.query("SELECT * FROM etapas_proceso WHERE id = $1", [expediente.etapa_actual_id]);
  if (etapaActual.rows.length > 0 && etapaActual.rows[0].es_final) {
    throw Object.assign(new Error("El expediente ya se encuentra en una etapa final"), { statusCode: 400 });
  }

  // HU-21: Verificar permiso si no es admin y no se saltea
  if (!skipPermisos && rolId) {
    const permiso = await pool.query(
      `SELECT 1 FROM transiciones_permitidas WHERE proceso_id = $1 AND etapa_from_id = $2 AND etapa_to_id = $3 AND rol_id = $4`,
      [expediente.proceso_id, expediente.etapa_actual_id, rechazadoEtapa.id, rolId]
    );
    if (permiso.rows.length === 0) {
      throw Object.assign(new Error("Tu rol no tiene permiso para rechazar este expediente"), { statusCode: 403 });
    }
  }

  // Actualizar expediente
  await pool.query(
    "UPDATE expedientes SET etapa_actual_id = $1, fecha_actualizacion = CURRENT_TIMESTAMP, fecha_termino = CURRENT_TIMESTAMP WHERE id = $2",
    [rechazadoEtapa.id, expedienteId]
  );

  // Registrar en historial
  await pool.query(
    "INSERT INTO historial_etapas (expediente_id, etapa_anterior_id, etapa_nueva_id, usuario_id, observacion) VALUES ($1, $2, $3, $4, $5)",
    [expedienteId, expediente.etapa_actual_id, rechazadoEtapa.id, usuarioId, observacion || "Expediente rechazado"]
  );

  return { exito: true, nueva_etapa: rechazadoEtapa };
}

// Avanzar expediente a siguiente etapa (función compartida)
async function internalAvanzarExpediente(expedienteId, usuarioId, observacion, pool, options = {}) {
  const { skipPermisos = false, rolId = null, expediente: expedienteArg = null } = options;

  let expediente = expedienteArg;
  if (!expediente) {
    const expResult = await pool.query(
      "SELECT e.*, p.area_id FROM expedientes e INNER JOIN procesos p ON e.proceso_id = p.id WHERE e.id = $1",
      [expedienteId]
    );
    if (expResult.rows.length === 0) {
      throw Object.assign(new Error("Expediente no encontrado"), { statusCode: 404 });
    }
    expediente = expResult.rows[0];
  }

  // Obtener siguiente etapa
  const etapaResult = await pool.query(
    "SELECT * FROM etapas_proceso WHERE proceso_id = $1 AND orden > (SELECT orden FROM etapas_proceso WHERE id = $2) ORDER BY orden ASC LIMIT 1",
    [expediente.proceso_id, expediente.etapa_actual_id]
  );
  if (etapaResult.rows.length === 0) {
    throw Object.assign(new Error("No hay mas etapas para avanzar"), { statusCode: 400 });
  }
  const nuevaEtapa = etapaResult.rows[0];

  // HU-21: Verificar permiso si no se saltea
  if (!skipPermisos && rolId) {
    const permiso = await pool.query(
      `SELECT 1 FROM transiciones_permitidas WHERE proceso_id = $1 AND etapa_from_id = $2 AND etapa_to_id = $3 AND rol_id = $4`,
      [expediente.proceso_id, expediente.etapa_actual_id, nuevaEtapa.id, rolId]
    );
    if (permiso.rows.length === 0) {
      throw Object.assign(new Error("Tu rol no tiene permiso para ejecutar esta transicion"), { statusCode: 403 });
    }
  }

  // Actualizar expediente
  await pool.query(
    "UPDATE expedientes SET etapa_actual_id = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $2",
    [nuevaEtapa.id, expedienteId]
  );

  // Registrar en historial
  await pool.query(
    "INSERT INTO historial_etapas (expediente_id, etapa_anterior_id, etapa_nueva_id, usuario_id, observacion) VALUES ($1, $2, $3, $4, $5)",
    [expedienteId, expediente.etapa_actual_id, nuevaEtapa.id, usuarioId, observacion || "Avance automático"]
  );

  // Generar tareas automaticamente para la nueva etapa
  if (nuevaEtapa.tipo_tarea && nuevaEtapa.rol_id) {
    await generarTareasPorEtapa(expedienteId, nuevaEtapa.id, pool);
  }

  return { exito: true, nueva_etapa: nuevaEtapa };
}

// POST /api/expedientes/:id/rechazar - Rechazar expediente (etapa terminal negativa)
app.post("/api/expedientes/:id/rechazar", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { observacion } = req.body;
  const { id: usuario_id, rol_id, esAdmin, area_id } = req.user;

  try {
    // Verificar acceso al expediente por área
    const checkResult = await pool.query(
      `SELECT e.id FROM expedientes e INNER JOIN procesos p ON e.proceso_id = p.id WHERE e.id = $1${!esAdmin && area_id ? ' AND p.area_id = $2' : ''}`,
      !esAdmin && area_id ? [id, area_id] : [id]
    );
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    // Reutilizar la función compartida
    await internalRechazarExpediente(id, usuario_id, observacion, pool, {
      skipPermisos: esAdmin,
      rolId: esAdmin ? null : rol_id
    });

    const updated = await pool.query(`
      SELECT e.*, p.nombre AS proceso_nombre, p.area_id, ep.nombre AS etapa_actual, ep.es_final, ep.tipo_etapa
      FROM expedientes e
      LEFT JOIN procesos p ON e.proceso_id = p.id
      LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
      WHERE e.id = $1
    `, [id]);

    res.json({ message: "Expediente rechazado", expediente: { ...updated.rows[0], estado: 'Rechazado' } });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

app.delete("/api/expedientes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE expedientes SET estado_activo = false WHERE id = $1", [id]);
    res.json({ message: "Expediente eliminado lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DOCUMENTOS
// ============================================

app.get("/api/documentos/expediente/:expedienteId", async (req, res) => {
  const { expedienteId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM documentos WHERE expediente_id = $1 AND estado_activo = true ORDER BY fecha_upload DESC",
      [expedienteId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/documentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM documentos WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documentos", async (req, res) => {
  const { expediente_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO documentos (expediente_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [expediente_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/documentos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE documentos SET estado_activo = false WHERE id = $1", [id]);
    res.json({ message: "Documento eliminado lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DOCUMENT UPLOAD WITH VERSIONING
// ============================================

/**
 * Upload a document with automatic versioning
 * POST /api/documentos/upload
 * Input: multipart/form-data (expediente_id, archivo, descripcion)
 */
app.post("/api/documentos/upload", authMiddleware, upload.single("archivo"), async (req, res) => {
  const { expediente_id, descripcion } = req.body;
  const usuarioId = req.user?.id;

  if (!expediente_id) {
    return res.status(400).json({ error: "expediente_id es requerido" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "archivo es requerido" });
  }

  // Validate file type (extension and MIME)
  const fileValidation = isAllowedFile(req.file);
  if (!fileValidation.allowed) {
    uploadErrorsTotal.inc();
    return res.status(400).json({ error: fileValidation.error });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify expediente exists
    const expResult = await client.query(
      "SELECT id FROM expedientes WHERE id = $1 AND estado_activo = true",
      [expediente_id]
    );
    if (expResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    // Create new document (no versioning by filename - use POST /documentos/:id/versiones instead)
    const newVersion = 1;

    // Generate GarageHQ key: {expediente_id}/{timestamp}/{nombre_original}
    const storageKey = `${expediente_id}/doc-${Date.now()}/${req.file.originalname}`;

    // Upload to GarageHQ
    let uploadResult;
    try {
      uploadResult = await storage.uploadFile(
        storageKey,
        req.file.buffer,
        { contentType: req.file.mimetype }
      );
    } catch (uploadErr) {
      console.error("[upload] GarageHQ upload failed:", uploadErr.message);
      await client.query("ROLLBACK");
      uploadErrorsTotal.inc();
      return res.status(500).json({ error: "Error al subir archivo a storage" });
    }

    // Insert into documentos table
    const insertResult = await client.query(
      `INSERT INTO documentos 
       (expediente_id, nombre_archivo, ruta_archivo, ruta_garage, tipo_mime, tamano_bytes, version, usuario_upload_id, es_version_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        expediente_id,
        req.file.originalname,
        storageKey,
        storageKey,
        req.file.mimetype,
        req.file.size,
        newVersion,
        usuarioId,
        true
      ]
    );

    const newDoc = insertResult.rows[0];

    await client.query("COMMIT");
    documentoUploadedTotal.inc();

    res.status(201).json({
      id: newDoc.id,
      expediente_id: newDoc.expediente_id,
      nombre_archivo: newDoc.nombre_archivo,
      ruta_garage: newDoc.ruta_garage,
      tipo_mime: newDoc.tipo_mime,
      tamano_bytes: newDoc.tamano_bytes,
      version: newDoc.version,
      es_version_actual: newDoc.es_version_actual,
      fecha_upload: newDoc.fecha_upload
    });
  } catch (err) {
    await client.query("ROLLBACK");
    uploadErrorsTotal.inc();
    console.error("[upload] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * Get all versions of a document
 * GET /api/documentos/:id/versiones
 */
app.get("/api/documentos/:id/versiones", async (req, res) => {
  const { id } = req.params;
  try {
    // Get current version from documentos table
    const currentDoc = await pool.query(
      "SELECT * FROM documentos WHERE id = $1",
      [id]
    );

    if (currentDoc.rows.length === 0) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    const doc = currentDoc.rows[0];

    // Get version history from documentos_version table
    const versionsResult = await pool.query(
      `SELECT id, version, ruta_garage, nombre_archivo, tipo_mime, tamano_bytes, fecha_upload, usuario_upload_id, es_version_actual
       FROM documentos_version 
       WHERE documento_id = $1 
       ORDER BY version DESC`,
      [id]
    );

    // Combine current version with history
    const versions = [
      {
        id: doc.id,
        version: doc.version,
        ruta_garage: doc.ruta_garage,
        nombre_archivo: doc.nombre_archivo,
        tipo_mime: doc.tipo_mime,
        tamano_bytes: doc.tamano_bytes,
        fecha_upload: doc.fecha_upload,
        usuario_upload_id: doc.usuario_upload_id,
        es_version_actual: doc.es_version_actual
      },
      ...versionsResult.rows
    ];

    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create a new version of an existing document
 * POST /api/documentos/:id/versiones
 * Input: multipart/form-data (archivo, descripcion)
 */
app.post("/api/documentos/:id/versiones", authMiddleware, upload.single("archivo"), async (req, res) => {
  const { id: documentoId } = req.params;
  const { descripcion } = req.body;
  const usuarioId = req.user?.id;

  if (!req.file) {
    return res.status(400).json({ error: "archivo es requerido" });
  }

  // Validate file type (extension and MIME)
  const fileValidation = isAllowedFile(req.file);
  if (!fileValidation.allowed) {
    uploadErrorsTotal.inc();
    return res.status(400).json({ error: fileValidation.error });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify document exists
    const currentDocResult = await client.query(
      "SELECT * FROM documentos WHERE id = $1 AND estado_activo = true",
      [documentoId]
    );

    if (currentDocResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    const currentDoc = currentDocResult.rows[0];
    const currentVersion = currentDoc.version || 1;

    // Get highest version number from documentos_version table
    const maxVersionResult = await client.query(
      "SELECT MAX(version) as max_version FROM documentos_version WHERE documento_id = $1",
      [documentoId]
    );
    const maxVersionFromHistory = maxVersionResult.rows[0]?.max_version || 0;
    const newVersion = Math.max(currentVersion, maxVersionFromHistory) + 1;

    // Generate GarageHQ key
    const storageKey = `${currentDoc.expediente_id}/doc-${documentoId}/v${newVersion}/${req.file.originalname}`;

    // Upload to GarageHQ
    try {
      await storage.uploadFile(
        storageKey,
        req.file.buffer,
        { contentType: req.file.mimetype }
      );
    } catch (uploadErr) {
      console.error("[upload-version] GarageHQ upload failed:", uploadErr.message);
      await client.query("ROLLBACK");
      uploadErrorsTotal.inc();
      return res.status(500).json({ error: "Error al subir archivo a storage" });
    }

    // Mark current document as not current version
    await client.query(
      "UPDATE documentos SET es_version_actual = false, version = $1 WHERE id = $2",
      [currentVersion, documentoId]
    );

    // Save current version to history (use CURRENT document's data, not the new upload)
    await client.query(
      `INSERT INTO documentos_version
       (documento_id, version, ruta_garage, nombre_archivo, tipo_mime, tamano_bytes, usuario_upload_id, es_version_actual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        documentoId,
        currentVersion,
        currentDoc.ruta_garage,
        currentDoc.nombre_archivo,
        currentDoc.tipo_mime,
        currentDoc.tamano_bytes,
        currentDoc.usuario_upload_id,
        false
      ]
    );

    // Update current document with new version data (not insert new document)
    const updatedDocResult = await client.query(
      `UPDATE documentos
       SET nombre_archivo = $1, ruta_archivo = $2, ruta_garage = $3, tipo_mime = $4, tamano_bytes = $5, version = $6, usuario_upload_id = $7, es_version_actual = true, fecha_upload = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        req.file.originalname,
        storageKey,
        storageKey,
        req.file.mimetype,
        req.file.size,
        newVersion,
        usuarioId,
        documentoId
      ]
    );

    const updatedDoc = updatedDocResult.rows[0];

    await client.query("COMMIT");
    documentoUploadedTotal.inc();

    res.status(201).json({
      id: updatedDoc.id,
      documento_id: documentoId,
      nombre_archivo: updatedDoc.nombre_archivo,
      ruta_garage: updatedDoc.ruta_garage,
      tipo_mime: updatedDoc.tipo_mime,
      tamano_bytes: updatedDoc.tamano_bytes,
      version: updatedDoc.version,
      es_version_actual: updatedDoc.es_version_actual,
      fecha_upload: updatedDoc.fecha_upload,
      mensaje: `Nueva versión ${newVersion} creada exitosamente`
    });
  } catch (err) {
    await client.query("ROLLBACK");
    uploadErrorsTotal.inc();
    console.error("[upload-version] Error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * Download a specific version of a document
 * GET /api/documentos/:id/descargar
 * GET /api/documentos/:id/descargar/:version
 */
app.get("/api/documentos/:id/descargar/:version?", async (req, res) => {
  const { id, version } = req.params;
  
  try {
    let doc;
    
    if (version) {
      // First check if it's the current version in documentos table
      const currentResult = await pool.query(
        "SELECT * FROM documentos WHERE id = $1 AND version = $2",
        [id, parseInt(version)]
      );
      
      if (currentResult.rows.length > 0) {
        doc = currentResult.rows[0];
      } else {
        // If not, check in the version history
        const versionResult = await pool.query(
          "SELECT * FROM documentos_version WHERE documento_id = $1 AND version = $2",
          [id, parseInt(version)]
        );
        
        if (versionResult.rows.length === 0) {
          return res.status(404).json({ error: "Versión no encontrada" });
        }
        
        doc = versionResult.rows[0];
      }
    } else {
      // Download current version
      const currentResult = await pool.query(
        "SELECT * FROM documentos WHERE id = $1",
        [id]
      );
      
      if (currentResult.rows.length === 0) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      doc = currentResult.rows[0];
    }

    if (!doc.ruta_garage) {
      return res.status(404).json({ error: "Archivo no encontrado en storage" });
    }

    // Get file from GarageHQ
    try {
      const fileData = await storage.downloadFile(doc.ruta_garage);
      
      // fileData is already a Buffer (from storage.downloadFile)
      res.set({
        "Content-Type": doc.tipo_mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.nombre_archivo}"`,
        "Content-Length": fileData.length,
      });
      
      res.send(fileData);
    } catch (storageErr) {
      console.error("[download] Storage error:", storageErr.message);
      return res.status(500).json({ error: "Error al descargar archivo" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete document and all its versions
 * DELETE /api/documentos/:id Completo con cascade
 */
app.delete("/api/documentos/:id Completo", async (req, res) => {
  const { id } = req.params;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Get all versions (current + history)
    const currentDoc = await client.query(
      "SELECT id, ruta_garage FROM documentos WHERE id = $1",
      [id]
    );
    
    if (currentDoc.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Documento no encontrado" });
    }
    
    // Get version history paths for deletion
    const versions = await client.query(
      "SELECT ruta_garage FROM documentos_version WHERE documento_id = $1",
      [id]
    );
    
    // Delete files from GarageHQ (current + history)
    const allPaths = [
      currentDoc.rows[0].ruta_garage,
      ...versions.rows.map(v => v.ruta_garage)
    ].filter(p => p);
    
    for (const path of allPaths) {
      try {
        await storage.deleteFile(path);
      } catch (err) {
        console.warn(`[delete] Could not delete ${path}:`, err.message);
      }
    }
    
    // Delete from database (cascade will handle documentos_version)
    await client.query(
      "UPDATE documentos SET estado_activo = false WHERE id = $1",
      [id]
    );
    
    await client.query("COMMIT");
    res.json({ message: "Documento y todas sus versiones eliminadas" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================
// HISTORIAL ETAPAS
// ============================================

app.get("/api/historial/expediente/:expedienteId", authMiddleware, async (req, res) => {
  const { expedienteId } = req.params;
  const { esAdmin, area_id } = req.user;

  try {
    // Verificar acceso al expediente
    let checkQuery = `
      SELECT e.id, p.area_id 
      FROM expedientes e 
      INNER JOIN procesos p ON e.proceso_id = p.id 
      WHERE e.id = $1
    `;
    const checkParams = [expedienteId];

    if (!esAdmin && area_id) {
      checkQuery += ` AND p.area_id = $2`;
      checkParams.push(area_id);
    }

    const checkResult = await pool.query(checkQuery, checkParams);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Expediente no encontrado" });
    }

    const result = await pool.query(`
      SELECT h.*, 
             ea.nombre AS etapa_anterior_nombre, 
             en.nombre AS etapa_nueva_nombre
      FROM historial_etapas h
      LEFT JOIN etapas_proceso ea ON h.etapa_anterior_id = ea.id
      LEFT JOIN etapas_proceso en ON h.etapa_nueva_id = en.id
      WHERE h.expediente_id = $1
      ORDER BY h.fecha_cambio DESC
    `, [expedienteId]);

    const usuarioIds = [...new Set(result.rows.map(r => r.usuario_id).filter(Boolean))];
    let usuariosMap = {};
    if (usuarioIds.length > 0) {
      try {
        const response = await fetch(`${MS_USUARIOS_URL}/api/usuarios?ids=${usuarioIds.join(',')}`);
        if (response.ok) {
          const usuarios = await response.json();
          usuariosMap = usuarios.reduce((acc, u) => {
            acc[u.id] = u;
            return acc;
          }, {});
        }
      } catch (err) {
        console.warn('[ms-expedientes] No se pudo obtener usuarios desde ms-usuarios:', err.message);
      }
    }

    const enriched = result.rows.map(row => ({
      ...row,
      usuario_nombre: usuariosMap[row.usuario_id]?.nombre_completo || usuariosMap[row.usuario_id]?.nombre || null
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// TAREAS ASIGNADAS
// ============================================

// Obtener tareas de un usuario filtradas por area y rol
// GET /api/tareas/mis-tareas?usuario_id=X&area_id=Y&rol_id=Z
app.get("/api/tareas/mis-tareas", async (req, res) => {
  const { usuario_id, area_id, rol_id } = req.query;

  if (!usuario_id) {
    return res.status(400).json({ error: "usuario_id es requerido" });
  }

  try {
    let etapaColumn = await getTareasEtapaColumn();
    const buildQuery = () => `
      SELECT DISTINCT ON (t.id)
        t.*,
        e.titulo AS expediente_titulo,
        e.fecha_creacion AS expediente_fecha,
        p.nombre AS proceso_nombre,
        p.area_id,
        ep.nombre AS etapa_nombre,
        ep.tipo_tarea
      FROM tareas_asignadas t
      INNER JOIN expedientes e ON t.expediente_id = e.id
      INNER JOIN procesos p ON e.proceso_id = p.id
      INNER JOIN etapas_proceso ep ON t.${etapaColumn} = ep.id
      WHERE t.usuario_id = $1
        AND t.estado IN ('pendiente', 'visto')
        AND e.estado_activo = true
        ${area_id ? 'AND p.area_id = $2' : ''}
        ${rol_id ? 'AND ep.rol_id = $3' : ''}
      ORDER BY t.id, t.fecha_asignacion ASC
    `;

    const params = area_id && rol_id ? [usuario_id, area_id, rol_id] : [usuario_id];

    let result;
    try {
      result = await pool.query(buildQuery(), params);
    } catch (err) {
      // fallback en caliente por drift de esquema en prod
      if (etapaColumn === "etapa_id" && isMissingColumnError(err, "etapa_id")) {
        etapaColumn = "etapa_proceso_id";
        TAREAS_ETAPA_COLUMN = etapaColumn;
        result = await pool.query(buildQuery(), params);
      } else if (etapaColumn === "etapa_proceso_id" && isMissingColumnError(err, "etapa_proceso_id")) {
        etapaColumn = "etapa_id";
        TAREAS_ETAPA_COLUMN = etapaColumn;
        result = await pool.query(buildQuery(), params);
      } else {
        throw err;
      }
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener tareas por rol y area (para bandeja)
app.get("/api/tareas/bandeja", async (req, res) => {
  const { area_id, rol_id } = req.query;

  if (!area_id || !rol_id) {
    return res.status(400).json({ error: "area_id y rol_id son requeridos" });
  }

  try {
    let etapaColumn = await getTareasEtapaColumn();
    const buildQuery = () => `
      SELECT DISTINCT ON (t.id)
        t.*,
        e.titulo AS expediente_titulo,
        e.fecha_creacion AS expediente_fecha,
        p.nombre AS proceso_nombre,
        p.area_id,
        ep.nombre AS etapa_nombre,
        ep.tipo_tarea,
        u.nombre_completo AS usuario_nombre,
        u.correo AS usuario_correo
      FROM tareas_asignadas t
      INNER JOIN expedientes e ON t.expediente_id = e.id
      INNER JOIN procesos p ON e.proceso_id = p.id
      INNER JOIN etapas_proceso ep ON t.${etapaColumn} = ep.id
      INNER JOIN db_usuarios.usuarios u ON t.usuario_id = u.id
      WHERE p.area_id = $1
        AND ep.rol_id = $2
        AND t.estado IN ('pendiente', 'visto')
        AND e.estado_activo = true
      ORDER BY t.id, t.fecha_asignacion ASC
    `;

    let result;
    try {
      result = await pool.query(buildQuery(), [area_id, rol_id]);
    } catch (err) {
      if (etapaColumn === "etapa_id" && isMissingColumnError(err, "etapa_id")) {
        etapaColumn = "etapa_proceso_id";
        TAREAS_ETAPA_COLUMN = etapaColumn;
        result = await pool.query(buildQuery(), [area_id, rol_id]);
      } else if (etapaColumn === "etapa_proceso_id" && isMissingColumnError(err, "etapa_proceso_id")) {
        etapaColumn = "etapa_id";
        TAREAS_ETAPA_COLUMN = etapaColumn;
        result = await pool.query(buildQuery(), [area_id, rol_id]);
      } else {
        throw err;
      }
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar tarea como vista
app.patch("/api/tareas/:id/visto", async (req, res) => {
  const { id } = req.params;
  const { usuario_id, rol_id } = req.body || {};

  if (!usuario_id) {
    return res.status(400).json({ error: "usuario_id es requerido" });
  }

  try {
    const tarea = await getTareaConEtapa(id);
    if (!tarea) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    if (Number(tarea.usuario_id) !== Number(usuario_id)) {
      return res.status(403).json({ error: "No autorizado para esta tarea" });
    }

    if (rol_id && tarea.rol_id && Number(rol_id) !== Number(tarea.rol_id)) {
      return res.status(403).json({ error: "Rol no autorizado para esta tarea" });
    }

    if (['completada', 'rechazada'].includes(tarea.estado)) {
      return res.status(400).json({ error: "La tarea ya fue cerrada" });
    }

    const result = await pool.query(
      "UPDATE tareas_asignadas SET estado = 'visto', fecha_visto = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar estado de tarea (completada/rechazada)
app.patch("/api/tareas/:id", async (req, res) => {
  const { id } = req.params;
  const { estado, observacion, usuario_id, rol_id } = req.body || {};

  if (!usuario_id) {
    return res.status(400).json({ error: "usuario_id es requerido" });
  }

  if (!['completada', 'rechazada'].includes(estado)) {
    return res.status(400).json({ error: "estado inválido" });
  }

  if (estado === 'rechazada' && !String(observacion || '').trim()) {
    return res.status(400).json({ error: "observacion es requerida para rechazar" });
  }

  try {
    const tarea = await getTareaConEtapa(id);
    if (!tarea) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    if (Number(tarea.usuario_id) !== Number(usuario_id)) {
      return res.status(403).json({ error: "No autorizado para esta tarea" });
    }

    if (rol_id && tarea.rol_id && Number(rol_id) !== Number(tarea.rol_id)) {
      return res.status(403).json({ error: "Rol no autorizado para esta tarea" });
    }

    if (['completada', 'rechazada'].includes(tarea.estado)) {
      return res.status(400).json({ error: "La tarea ya fue cerrada" });
    }

    // NOTA: estado ya fue validado como 'completada'|'rechazada' arriba (linea ~2043)
    // por eso fecha_termino se setea siempre a CURRENT_TIMESTAMP
    const result = await pool.query(`
      UPDATE tareas_asignadas 
      SET estado = $1, 
          fecha_termino = CURRENT_TIMESTAMP,
          observacion = COALESCE($2, observacion)
      WHERE id = $3 
      RETURNING *
    `, [estado, observacion, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tarea no encontrada" });
    }

    // HU-11/HU-12: Al completar una tarea, avanzar el expediente a la siguiente etapa
    if (estado === 'completada' && tarea.expediente_id) {
      try {
        await internalAvanzarExpediente(tarea.expediente_id, usuario_id, observacion, pool, {
          skipPermisos: true, // ya validamos que es dueño de la tarea
          rolId: null
        });
      } catch (err) {
        console.warn(`[tareas] No se pudo avanzar el expediente ${tarea.expediente_id} desde la tarea ${id}: ${err.message}`);
        // No fallar la respuesta — la tarea ya se marcó como completada
      }
    }

    // HU-12: Si se rechaza una tarea de tipo 'aprobacion', rechazar el expediente completo
    if (estado === 'rechazada' && tarea.tipo_tarea === 'aprobacion' && tarea.expediente_id) {
      try {
        await internalRechazarExpediente(tarea.expediente_id, usuario_id, observacion, pool, {
          skipPermisos: true, // ya validamos que es dueño de la tarea
          rolId: null
        });
      } catch (err) {
        console.warn(`[tareas] No se pudo rechazar el expediente ${tarea.expediente_id} desde la tarea ${id}: ${err.message}`);
        // No fallar la respuesta — la tarea ya se marcó como rechazada
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generar tareas automaticamente al cambiar de etapa
// Busca usuarios por rol+area y crea tareas_asignadas
async function generarTareasPorEtapa(expedienteId, etapaId, pool) {
  const etapaColumn = await getTareasEtapaColumn();
  // Obtener la etapa para saber que rol requiere
  const etapaResult = await pool.query(
    "SELECT * FROM etapas_proceso WHERE id = $1",
    [etapaId]
  );

  if (etapaResult.rows.length === 0) return;

  const etapa = etapaResult.rows[0];

  // Si la etapa no tiene tipo_tarea ni rol_id, no generar tareas
  if (!etapa.tipo_tarea || !etapa.rol_id) return;

  // Obtener info del expediente para saber el area
  const expResult = await pool.query(`
    SELECT e.*, p.area_id 
    FROM expedientes e 
    INNER JOIN procesos p ON e.proceso_id = p.id 
    WHERE e.id = $1
  `, [expedienteId]);

  if (expResult.rows.length === 0) return;

  const { area_id } = expResult.rows[0];

  // Buscar usuarios de esa area con ese rol
  // Conectar a db_usuarios para buscar
  try {
    // Buscar usuarios del area con el rol especificado via ms-usuarios
    const response = await fetch(`${MS_USUARIOS_URL}/api/usuarios?area_id=${area_id}&rol_id=${etapa.rol_id}`);
    if (!response.ok) return;
    const usuarios = await response.json();

    // Crear tarea para cada usuario
    for (const usuario of usuarios) {
      // Verificar si ya existe una tarea similar
      const existe = await pool.query(`
        SELECT id FROM tareas_asignadas 
        WHERE expediente_id = $1 AND ${etapaColumn} = $2 AND usuario_id = $3
      `, [expedienteId, etapaId, usuario.id]);

      if (existe.rows.length === 0) {
        await pool.query(`
          INSERT INTO tareas_asignadas (expediente_id, ${etapaColumn}, usuario_id, tipo_tarea, estado)
          VALUES ($1, $2, $3, $4, 'pendiente')
        `, [expedienteId, etapaId, usuario.id, etapa.tipo_tarea]);
      }
    }
  } finally {
    // no-op (no DB connection here)
  }
}

// ============================================
// CATEGORÍAS Y SUBTIPOS (Desde db_mantenedores - API Composition)
// ============================================

app.get("/api/categorias", async (req, res) => {
  try {
    // Obtener desde ms-mantenedor (API Composition)
    const response = await fetch(`${process.env.MS_MANTENEDOR_URL || 'http://ms-mantenedor:3001'}/api/categorias`);
    if (!response.ok) throw new Error("Error al obtener categorías");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subtipos", async (req, res) => {
  try {
    const response = await fetch(`${process.env.MS_MANTENEDOR_URL || 'http://ms-mantenedor:3001'}/api/subtipos`);
    if (!response.ok) throw new Error("Error al obtener subtipos");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// FORMULARIOS DINAMICOS (FormIO)
// ============================================

const formRoutes = require('./src/routes/forms');
app.use(formRoutes(pool, authMiddleware, MS_USUARIOS_URL));

const transicionesRoutes = require('./src/routes/transiciones');
app.use(transicionesRoutes(pool, authMiddleware));

// Servidor
const PORT = process.env.PORT || 3002;

if (process.env.NODE_ENV !== 'test') {
  resolveTareasEtapaColumn().finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ms-expedientes corriendo en el puerto ${PORT}`);
    });
  });
}

module.exports = app;

// Export internal functions for unit testing
module.exports.__unit = {
  isAllowedFile,
  normalizarTipoTarea,
  normalizarTipoEtapa,
  validarReglasEtapa,
  isMissingColumnError,
  TIPOS_TAREA_VALIDOS,
  TIPOS_ETAPA_VALIDOS,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { metricsHandler, metricsMiddleware, loginTotal, userCreatedTotal } = require("./src/metrics");

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", metricsHandler);

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || "repoGPS_jwt_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// Configuración de conexión a db_usuarios
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "db",
  database: process.env.DB_NAME || "db_usuarios",
  password: process.env.DB_PASSWORD || "password123",
  port: process.env.DB_PORT || 5432,
});

// URL del microservicio ms-mantenedor para API Composition
const MS_MANTENEDOR_URL = process.env.MS_MANTENEDOR_URL || "http://ms-mantenedor:3001";

// ============================================
// HELPERS - API Composition
// ============================================

/**
 * Obtiene un área por ID desde ms-mantenedor
 * @param {number} areaId - ID del área
 * @returns {Promise<object|null>} - El área o null si no existe
 */
async function fetchAreaById(areaId) {
  try {
    const response = await fetch(`${MS_MANTENEDOR_URL}/api/areas/${areaId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error(`Error al obtener área ${areaId}:`, err.message);
    return null;
  }
}

/**
 * Obtiene múltiples áreas por sus IDs (en paralelo)
 * @param {number[]} areaIds - Array de IDs de áreas
 * @returns {Promise<object[]>} - Array de áreas
 */
async function fetchAreasByIds(areaIds) {
  if (!areaIds || areaIds.length === 0) return [];
  const uniqueIds = [...new Set(areaIds.filter(Boolean))];
  const promises = uniqueIds.map(id => fetchAreaById(id));
  const results = await Promise.all(promises);
  return results.filter(area => area !== null);
}

// ============================================
// ENDPOINTS ROLES
// ============================================

app.get("/api/roles", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM roles WHERE estado_activo = true ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENDPOINTS USUARIOS
// ============================================

// POST /api/usuarios - Crear nuevo usuario
app.post("/api/usuarios", async (req, res) => {
  const { rol_id, area_id, nombre_completo, correo, password_hash } = req.body;

  try {
    const resultUsuario = await pool.query(
      `
      INSERT INTO usuarios (rol_id, nombre_completo, correo, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [rol_id, nombre_completo, correo, password_hash]
    );

    const nuevoUsuario = resultUsuario.rows[0];

    if (area_id) {
      await pool.query(
        `INSERT INTO usuario_area (usuario_id, area_id) VALUES ($1, $2)`,
        [nuevoUsuario.id, area_id]
      );
    }

    userCreatedTotal.inc();
    res.status(201).json(nuevoUsuario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios - Listar usuarios con API Composition
app.get("/api/usuarios", async (req, res) => {
  try {
    const { ids, area_id, rol_id } = req.query;
    const idsArray = ids ? ids.split(',').map(id => Number(id)).filter(Boolean) : [];
    const areaId = area_id ? Number(area_id) : null;
    const rolId = rol_id ? Number(rol_id) : null;

    const where = [];
    const params = [];
    if (idsArray.length > 0) {
      params.push(idsArray);
      where.push(`u.id = ANY($${params.length})`);
    }
    if (areaId) {
      params.push(areaId);
      where.push(`ua.area_id = $${params.length}`);
    }
    if (rolId) {
      params.push(rolId);
      where.push(`u.rol_id = $${params.length}`);
    }

    const result = await pool.query(`
      SELECT 
        u.id, u.nombre_completo, u.correo, u.password_hash, u.estado_activo, u.rol_id,
        r.nombre AS rol_nombre,
        array_agg(ua.area_id) FILTER (WHERE ua.area_id IS NOT NULL) AS area_ids
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_area ua ON u.id = ua.usuario_id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      GROUP BY u.id, r.nombre
      ORDER BY u.id ASC
    `, params);

    // 2. Para cada usuario, obtener los detalles de las áreas desde ms-mantenedor (API Composition)
    const usuariosConAreas = await Promise.all(
      result.rows.map(async (usuario) => {
        let areas = [];
        
        if (usuario.area_ids && usuario.area_ids.length > 0) {
          areas = await fetchAreasByIds(usuario.area_ids);
        }

        return {
          ...usuario,
          areas: areas,
          // Mantener para compatibilidad con el frontend
          area_id: areas.length > 0 ? areas[0].id : null,
          area_nombre: areas.length > 0 ? areas[0].nombre : null
        };
      })
    );

    res.json(usuariosConAreas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/:id - Obtener usuario por ID con API Composition
app.get("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        u.id, u.nombre_completo, u.correo, u.password_hash, u.estado_activo, u.rol_id,
        r.nombre AS rol_nombre,
        array_agg(ua.area_id) FILTER (WHERE ua.area_id IS NOT NULL) AS area_ids
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_area ua ON u.id = ua.usuario_id
      WHERE u.id = $1
      GROUP BY u.id, r.nombre
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = result.rows[0];
    
    // API Composition: obtener las áreas desde ms-mantenedor
    let areas = [];
    if (usuario.area_ids && usuario.area_ids.length > 0) {
      areas = await fetchAreasByIds(usuario.area_ids);
    }

    res.json({
      ...usuario,
      areas: areas,
      area_id: areas.length > 0 ? areas[0].id : null,
      area_nombre: areas.length > 0 ? areas[0].nombre : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id - Editar usuario
app.put("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { rol_id, area_id, nombre_completo, correo } = req.body;

  try {
    await pool.query("BEGIN");

    await pool.query(
      `
      UPDATE usuarios 
      SET rol_id = $1, nombre_completo = $2, correo = $3
      WHERE id = $4
      `,
      [rol_id, nombre_completo, correo, id]
    );

    if (area_id) {
      const checkArea = await pool.query(
        "SELECT id FROM usuario_area WHERE usuario_id = $1",
        [id]
      );

      if (checkArea.rows.length > 0) {
        await pool.query(
          "UPDATE usuario_area SET area_id = $1 WHERE usuario_id = $2",
          [area_id, id]
        );
      } else {
        await pool.query(
          "INSERT INTO usuario_area (usuario_id, area_id) VALUES ($1, $2)",
          [area_id, id]
        );
      }
    } else {
      await pool.query("DELETE FROM usuario_area WHERE usuario_id = $1", [id]);
    }

    await pool.query("COMMIT");
    res.json({ message: "Usuario y área actualizados correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el usuario" });
  }
});

// PATCH /api/usuarios/:id/estado - Activar/Desactivar usuario
app.patch("/api/usuarios/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    await pool.query("UPDATE usuarios SET estado_activo = $1 WHERE id = $2", [
      estado_activo,
      id,
    ]);
    res.json({ message: "Estado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/usuarios/:id/area - Asignar usuario a un área (HU-20)
// Reemplaza cualquier área anterior, garantizando 1 usuario = 1 área
app.patch("/api/usuarios/:id/area", async (req, res) => {
  const { id } = req.params;
  const { area_id } = req.body; // null = desasignar

  try {
    await pool.query("BEGIN");

    // Primero eliminar cualquier vínculo existente
    await pool.query("DELETE FROM usuario_area WHERE usuario_id = $1", [id]);

    // Si hay área_id, crear el nuevo vínculo
    if (area_id) {
      await pool.query(
        "INSERT INTO usuario_area (usuario_id, area_id) VALUES ($1, $2)",
        [id, area_id]
      );
    }

    await pool.query("COMMIT");
    res.json({ message: "Área asignada correctamente" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Error al asignar área" });
  }
});

// DELETE /api/usuarios/:id - Eliminación lógica
app.delete("/api/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE usuarios SET estado_activo = false WHERE id = $1",
      [id]
    );
    res.json({ message: "Usuario eliminado lógicamente (Desactivado)" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// MIGRACIÓN: Migrar passwords a bcrypt (comentada para pruebas)
// ============================================
async function migrarPasswords() {
  try {
    const result = await pool.query(
      `SELECT id, password_hash FROM usuarios WHERE password_hash IS NOT NULL`
    );

    let migrados = 0;
    for (const usuario of result.rows) {
      const actual = usuario.password_hash || "";
      if (!actual.startsWith("$2")) {
        const hash = await bcrypt.hash(actual, 10);
        await pool.query("UPDATE usuarios SET password_hash = $1 WHERE id = $2", [
          hash,
          usuario.id,
        ]);
        migrados += 1;
      }
    }

    console.log(`Migración de passwords completada. Usuarios migrados: ${migrados}`);
  } catch (err) {
    console.error("Error en migración de passwords:", err.message);
  }
}

// ============================================
// ENDPOINTS LOGIN/LOGOUT
// ============================================

app.post("/api/logout", (req, res) => {
  res.json({ message: "Sesión cerrada correctamente" });
});

// Endpoint de login - valida credenciales y retorna token con datos del usuario
app.post("/api/login", async (req, res) => {
  const { correo, password } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT u.id, u.nombre_completo, u.correo, u.password_hash, u.estado_activo, u.rol_id,
             r.nombre AS rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE u.correo = $1
      LIMIT 1
      `,
      [correo]
    );

    if (result.rows.length === 0) {
      loginTotal.inc({ status: "error" });
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const usuario = result.rows[0];

    if (!usuario.estado_activo) {
      loginTotal.inc({ status: "error" });
      return res.status(403).json({ error: "Usuario inactivo" });
    }

    // Verificar password con bcrypt (HU-01)
    const match = await bcrypt.compare(password, usuario.password_hash);
    if (!match) {
      loginTotal.inc({ status: "error" });
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    loginTotal.inc({ status: "success" });

    // Generar JWT con area_id
    // Obtener el área principal del usuario (primera asignada)
    let areaId = null;
    let areaNombre = null;
    try {
      const areaResult = await pool.query(
        "SELECT area_id FROM usuario_area WHERE usuario_id = $1 LIMIT 1",
        [usuario.id]
      );
      if (areaResult.rows.length > 0) {
        areaId = areaResult.rows[0].area_id;
        // Obtener nombre del área desde ms-mantenedor
        if (areaId) {
          const area = await fetchAreaById(areaId);
          if (area) {
            areaNombre = area.nombre;
          }
        }
      }
    } catch (err) {
      console.error("Error al obtener area:", err.message);
    }

    const token = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id, area_id: areaId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login exitoso",
      token,
      acceso_permitido: true,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        rol_id: usuario.rol_id,
        rol_nombre: usuario.rol_nombre,
        area_id: areaId,
        area_nombre: areaNombre,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor en puerto 3000
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Servidor ms-usuarios corriendo en el puerto ${PORT}`);
    // Ejecutar migración una vez al iniciar
    await migrarPasswords();
  });
}

module.exports = app;

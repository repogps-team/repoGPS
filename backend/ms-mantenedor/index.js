const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const { metricsHandler, metricsMiddleware } = require("./src/metrics");

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", metricsHandler);

// Conexión a db_mantenedor
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "db_mantenedor",
  database: process.env.DB_NAME || "db_mantenedor",
  password: process.env.DB_PASSWORD || "password123",
  port: process.env.DB_PORT || 5432,
});

// ============================================
// HELPERS VALIDACIÓN
// ============================================

async function validarContratistaActivo(contratistaId) {
  const result = await pool.query(
    "SELECT id FROM contratistas WHERE id = $1 AND estado_activo = true",
    [contratistaId]
  );
  return result.rows.length > 0;
}

async function validarAreaActiva(areaId) {
  const result = await pool.query(
    "SELECT id FROM areas WHERE id = $1 AND estado_activo = true",
    [areaId]
  );
  return result.rows.length > 0;
}

// ============================================
// CONTRATISTAS
// ============================================

app.get("/api/contratistas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM contratistas ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/contratistas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM contratistas WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contratista no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/contratistas", async (req, res) => {
  const { razon_social, rut } = req.body;
  
  // Validar que no existe otro contratista con el mismo RUT
  try {
    const existeRut = await pool.query(
      "SELECT id FROM contratistas WHERE rut = $1",
      [rut]
    );
    if (existeRut.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe un contratista registrado con este RUT" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const result = await pool.query(
      "INSERT INTO contratistas (razon_social, rut) VALUES ($1, $2) RETURNING *",
      [razon_social, rut]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/contratistas/:id", async (req, res) => {
  const { id } = req.params;
  const { razon_social, rut } = req.body;
  try {
    // Validar RUT único excluyendo el registro actual
    const existeRut = await pool.query(
      "SELECT id FROM contratistas WHERE rut = $1 AND id <> $2",
      [rut, id]
    );
    if (existeRut.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe un contratista registrado con este RUT" });
    }

    const result = await pool.query(
      "UPDATE contratistas SET razon_social = $1, rut = $2 WHERE id = $3 RETURNING *",
      [razon_social, rut, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contratista no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/contratistas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE contratistas SET estado_activo = false WHERE id = $1",
      [id]
    );
    res.json({ message: "Contratista eliminado lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/contratistas/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    await pool.query("UPDATE contratistas SET estado_activo = $1 WHERE id = $2", [estado_activo, id]);
    res.json({ message: "Estado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ÁREAS
// ============================================

app.get("/api/areas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.nombre, a.estado_activo, a.contratista_id, c.razon_social AS contratista_nombre 
      FROM areas a
      INNER JOIN contratistas c ON a.contratista_id = c.id
      WHERE c.estado_activo = true
      ORDER BY a.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/areas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM areas WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Área no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/areas", async (req, res) => {
  const { contratista_id, nombre } = req.body;
  try {
    if (!contratista_id) {
      return res.status(400).json({ error: "contratista_id es obligatorio" });
    }

    const contratistaActivo = await validarContratistaActivo(contratista_id);
    if (!contratistaActivo) {
      return res.status(400).json({ error: "El contratista no existe o está inactivo" });
    }

    const result = await pool.query(
      "INSERT INTO areas (contratista_id, nombre) VALUES ($1, $2) RETURNING *",
      [contratista_id, nombre]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/areas/:id", async (req, res) => {
  const { id } = req.params;
  const { contratista_id, nombre } = req.body;
  try {
    if (!contratista_id) {
      return res.status(400).json({ error: "contratista_id es obligatorio" });
    }

    const contratistaActivo = await validarContratistaActivo(contratista_id);
    if (!contratistaActivo) {
      return res.status(400).json({ error: "El contratista no existe o está inactivo" });
    }

    const result = await pool.query(
      "UPDATE areas SET contratista_id = $1, nombre = $2 WHERE id = $3 RETURNING *",
      [contratista_id, nombre, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Área no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/areas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE areas SET estado_activo = false WHERE id = $1",
      [id]
    );
    res.json({ message: "Área eliminada lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/areas/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    await pool.query("UPDATE areas SET estado_activo = $1 WHERE id = $2", [estado_activo, id]);
    res.json({ message: "Estado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Áreas por contratista
app.get("/api/areas/contratista/:contratistaId", async (req, res) => {
  const { contratistaId } = req.params;
  try {
    const result = await pool.query(`
      SELECT a.id, a.nombre, a.estado_activo, a.contratista_id, c.razon_social AS contratista_nombre 
      FROM areas a
      INNER JOIN contratistas c ON a.contratista_id = c.id
      WHERE a.contratista_id = $1 AND a.estado_activo = true AND c.estado_activo = true
      ORDER BY a.nombre ASC
    `, [contratistaId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DISCIPLINAS
// ============================================

app.get("/api/disciplinas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.nombre, d.estado_activo, d.area_id, a.nombre AS area_nombre, a.contratista_id 
      FROM disciplinas d
      INNER JOIN areas a ON d.area_id = a.id
      INNER JOIN contratistas c ON a.contratista_id = c.id
      WHERE c.estado_activo = true AND a.estado_activo = true
      ORDER BY d.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  app.get("/api/disciplinas/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM disciplinas WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Disciplina no encontrada" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/disciplinas", async (req, res) => {
    const { area_id, nombre } = req.body;
    try {
      if (!area_id) {
        return res.status(400).json({ error: "area_id es obligatorio" });
      }

      const areaActiva = await validarAreaActiva(area_id);
      if (!areaActiva) {
        return res.status(400).json({ error: "El área no existe o está inactiva" });
      }

      const result = await pool.query(
        "INSERT INTO disciplinas (area_id, nombre) VALUES ($1, $2) RETURNING *",
        [area_id, nombre]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/disciplinas/:id", async (req, res) => {
    const { id } = req.params;
    const { area_id, nombre } = req.body;
    try {
      if (!area_id) {
        return res.status(400).json({ error: "area_id es obligatorio" });
      }

      const areaActiva = await validarAreaActiva(area_id);
      if (!areaActiva) {
        return res.status(400).json({ error: "El área no existe o está inactiva" });
      }

      const result = await pool.query(
        "UPDATE disciplinas SET area_id = $1, nombre = $2 WHERE id = $3 RETURNING *",
        [area_id, nombre, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Disciplina no encontrada" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

app.delete("/api/disciplinas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE disciplinas SET estado_activo = false WHERE id = $1",
      [id]
    );
    res.json({ message: "Disciplina eliminada lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/disciplinas/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  try {
    await pool.query("UPDATE disciplinas SET estado_activo = $1 WHERE id = $2", [estado_activo, id]);
    res.json({ message: "Estado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disciplinas por área
app.get("/api/disciplinas/area/:areaId", async (req, res) => {
  const { areaId } = req.params;
  try {
    const result = await pool.query(`
      SELECT d.id, d.nombre, d.estado_activo, d.area_id, a.nombre AS area_nombre, a.contratista_id 
      FROM disciplinas d
      INNER JOIN areas a ON d.area_id = a.id
      INNER JOIN contratistas c ON a.contratista_id = c.id
      WHERE d.area_id = $1 AND d.estado_activo = true AND a.estado_activo = true AND c.estado_activo = true
      ORDER BY d.nombre ASC
    `, [areaId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// HELPERS VALIDACIÓN CATEGORÍAS/SUBTIPOS
// ============================================

async function validarCategoriaActiva(categoriaId) {
  const result = await pool.query(
    "SELECT id FROM categorias WHERE id = $1 AND estado_activo = true",
    [categoriaId]
  );
  return result.rows.length > 0;
}

// ============================================
// CATEGORÍAS
// ============================================

app.get("/api/categorias", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categorias ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM categorias WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categorias", async (req, res) => {
  const { nombre, descripcion } = req.body;
  try {
    // Validar nombre único
    const existeNombre = await pool.query(
      "SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1)",
      [nombre]
    );
    if (existeNombre.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe una categoría con este nombre" });
    }

    const result = await pool.query(
      "INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *",
      [nombre, descripcion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  try {
    // Validar nombre único excluyendo el registro actual
    const existeNombre = await pool.query(
      "SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1) AND id <> $2",
      [nombre, id]
    );
    if (existeNombre.rows.length > 0) {
      return res.status(400).json({ error: "Ya existe una categoría con este nombre" });
    }

    const result = await pool.query(
      "UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *",
      [nombre, descripcion, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categorias/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "UPDATE categorias SET estado_activo = false WHERE id = $1",
      [id]
    );
    res.json({ message: "Categoría eliminada lógicamente" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/categorias/:id/estado", async (req, res) => {
  const { id } = req.params;
  const { estado_activo } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Desactivar/activar la categoría
    await client.query("UPDATE categorias SET estado_activo = $1 WHERE id = $2", [estado_activo, id]);
    
    // Desactivar/activar todos los subtipos relacionados
    await client.query("UPDATE subtipos SET estado_activo = $1 WHERE categoria_id = $2", [estado_activo, id]);
    
    await client.query('COMMIT');
    res.json({ message: "Estado actualizado correctamente" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

  // ============================================
  // SUBTIPOS
  // ============================================

  app.get("/api/subtipos", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.id, s.nombre, s.descripcion, s.estado_activo, s.categoria_id, c.nombre AS categoria_nombre, c.estado_activo AS categoria_activa
        FROM subtipos s
        INNER JOIN categorias c ON s.categoria_id = c.id
        ORDER BY s.id ASC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/subtipos/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM subtipos WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Subtipo no encontrado" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/subtipos/categoria/:categoriaId", async (req, res) => {
    const { categoriaId } = req.params;
    try {
      const result = await pool.query(
        "SELECT * FROM subtipos WHERE categoria_id = $1 ORDER BY nombre ASC",
        [categoriaId]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/subtipos", async (req, res) => {
    const { categoria_id, nombre, descripcion } = req.body;
    try {
      // Validar que la categoría exista y esté activa
      const categoriaActiva = await validarCategoriaActiva(categoria_id);
      if (!categoriaActiva) {
        return res.status(400).json({ error: "La categoría no existe o está inactiva" });
      }

      // Validar nombre único por categoría
      const existeNombre = await pool.query(
        "SELECT id FROM subtipos WHERE LOWER(nombre) = LOWER($1) AND categoria_id = $2",
        [nombre, categoria_id]
      );
      if (existeNombre.rows.length > 0) {
        return res.status(400).json({ error: "Ya existe un subtipo con este nombre en esta categoría" });
      }

      const result = await pool.query(
        "INSERT INTO subtipos (categoria_id, nombre, descripcion) VALUES ($1, $2, $3) RETURNING *",
        [categoria_id, nombre, descripcion]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/subtipos/:id", async (req, res) => {
    const { id } = req.params;
    const { categoria_id, nombre, descripcion } = req.body;
    try {
      // Validar que la categoría exista y esté activa
      const categoriaActiva = await validarCategoriaActiva(categoria_id);
      if (!categoriaActiva) {
        return res.status(400).json({ error: "La categoría no existe o está inactiva" });
      }

      // Validar nombre único por categoría excluyendo el registro actual
      const existeNombre = await pool.query(
        "SELECT id FROM subtipos WHERE LOWER(nombre) = LOWER($1) AND categoria_id = $2 AND id <> $3",
        [nombre, categoria_id, id]
      );
      if (existeNombre.rows.length > 0) {
        return res.status(400).json({ error: "Ya existe un subtipo con este nombre en esta categoría" });
      }

      const result = await pool.query(
        "UPDATE subtipos SET categoria_id = $1, nombre = $2, descripcion = $3 WHERE id = $4 RETURNING *",
        [categoria_id, nombre, descripcion, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Subtipo no encontrado" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/subtipos/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query(
        "UPDATE subtipos SET estado_activo = false WHERE id = $1",
        [id]
      );
      res.json({ message: "Subtipo eliminado lógicamente" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/subtipos/:id/estado", async (req, res) => {
    const { id } = req.params;
    const { estado_activo } = req.body;
    try {
      await pool.query("UPDATE subtipos SET estado_activo = $1 WHERE id = $2", [estado_activo, id]);
      res.json({ message: "Estado actualizado correctamente" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Servidor
  const PORT = process.env.PORT || 3001;

  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`Servidor ms-mantenedor corriendo en el puerto ${PORT}`);
    });
  }

  module.exports = app;

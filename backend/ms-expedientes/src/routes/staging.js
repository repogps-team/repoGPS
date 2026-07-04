/**
 * Staging Routes — Carga Masiva de Documentos
 * Rutas aisladas del sistema de expedientes existente.
 * Solo se conecta al asignar documentos staging → documentos.
 */

const express = require('express');
const multer = require('multer');
const storage = require('../storage/garageClient');

module.exports = function stagingRoutes(pool, authMiddleware) {
  const router = express.Router();

  // Multer config: 100MB max por archivo, memoryStorage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
  });

  // =====================================================
  // POST /api/staging/upload — Subir archivo al staging
  // =====================================================
  router.post('/api/staging/upload', authMiddleware, upload.single('archivo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' });
      }

      const userId = req.user.id;
      const file = req.file;
      const fechaOrigen = file.originalname
        ? new Date(req.body.fecha_origen || Date.now())
        : new Date();

      // Subir a GarageHQ
      const storageKey = `staging/${userId}/${Date.now()}_${file.originalname}`;
      await storage.uploadFile(storageKey, file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
      });

      // Insertar en documentos_staging
      const result = await pool.query(
        `INSERT INTO documentos_staging
         (usuario_id, nombre_archivo, ruta_garage, tipo_mime, tamano_bytes, fecha_origen, estado)
         VALUES ($1, $2, $3, $4, $5, $6, 'completado')
         RETURNING *`,
        [userId, file.originalname, storageKey, file.mimetype, file.size, fechaOrigen]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[staging] Upload error:', err.message);
      res.status(500).json({ error: 'Error al subir archivo', detail: err.message });
    }
  });

  // =====================================================
  // POST /api/staging/upload-batch — Subir varios archivos
  // =====================================================
  router.post('/api/staging/upload-batch', authMiddleware, upload.array('archivos', 100), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se enviaron archivos' });
      }

      const userId = req.user.id;
      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const storageKey = `staging/${userId}/${Date.now()}_${file.originalname}`;
          await storage.uploadFile(storageKey, file.buffer, {
            contentType: file.mimetype || 'application/octet-stream',
          });

          const dbResult = await pool.query(
            `INSERT INTO documentos_staging
             (usuario_id, nombre_archivo, ruta_garage, tipo_mime, tamano_bytes, fecha_origen, estado)
             VALUES ($1, $2, $3, $4, $5, $6, 'completado')
             RETURNING *`,
            [userId, file.originalname, storageKey, file.mimetype, file.size, new Date()]
          );
          results.push(dbResult.rows[0]);
        } catch (fileErr) {
          errors.push({ nombre_archivo: file.originalname, error: fileErr.message });
        }
      }

      res.json({ uploaded: results.length, errors, documentos: results });
    } catch (err) {
      console.error('[staging] Batch upload error:', err.message);
      res.status(500).json({ error: 'Error en carga batch', detail: err.message });
    }
  });

  // =====================================================
  // GET /api/staging/documentos — Listar documentos del usuario
  // =====================================================
  router.get('/api/staging/documentos', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 100, search = '', sort = 'nombre_archivo', order = 'asc' } = req.query;

      const offset = (page - 1) * limit;
      const allowedSorts = ['nombre_archivo', 'tamano_bytes', 'fecha_origen', 'fecha_upload', 'estado'];
      const sortCol = allowedSorts.includes(sort) ? sort : 'nombre_archivo';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

      let whereClause = 'WHERE usuario_id = $1 AND estado_activo = true';
      const params = [userId];

      if (search) {
        params.push(`%${search}%`);
        whereClause += ` AND nombre_archivo ILIKE $${params.length}`;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM documentos_staging ${whereClause}`,
        params
      );

      params.push(limit, offset);
      const result = await pool.query(
        `SELECT id, nombre_archivo, tamano_bytes, fecha_origen, fecha_upload,
                estado, expediente_asignado_id, fecha_asignacion, tipo_mime
         FROM documentos_staging
         ${whereClause}
         ORDER BY ${sortCol} ${sortOrder}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      res.json({
        documentos: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (err) {
      console.error('[staging] List error:', err.message);
      res.status(500).json({ error: 'Error al listar documentos', detail: err.message });
    }
  });

  // =====================================================
  // DELETE /api/staging/documentos/:id — Eliminar del staging
  // =====================================================
  router.delete('/api/staging/documentos/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Obtener la key de Garage para borrar el archivo
      const doc = await pool.query(
        'SELECT ruta_garage FROM documentos_staging WHERE id = $1 AND usuario_id = $2',
        [id, userId]
      );

      if (doc.rows.length === 0) {
        return res.status(404).json({ error: 'Documento no encontrado' });
      }

      // Borrar de Garage (best-effort)
      try {
        await storage.deleteFile(doc.rows[0].ruta_garage);
      } catch (garageErr) {
        console.warn('[staging] Garage delete failed (non-fatal):', garageErr.message);
      }

      // Soft delete en DB
      await pool.query(
        'UPDATE documentos_staging SET estado_activo = false WHERE id = $1 AND usuario_id = $2',
        [id, userId]
      );

      res.json({ ok: true });
    } catch (err) {
      console.error('[staging] Delete error:', err.message);
      res.status(500).json({ error: 'Error al eliminar', detail: err.message });
    }
  });

  // =====================================================
  // POST /api/staging/documentos/delete-batch — Eliminar varios
  // =====================================================
  router.post('/api/staging/documentos/delete-batch', authMiddleware, async (req, res) => {
    try {
      const { ids } = req.body; // array de IDs
      const userId = req.user.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de IDs' });
      }

      // Obtener keys de Garage
      const docs = await pool.query(
        `SELECT id, ruta_garage FROM documentos_staging
         WHERE id = ANY($1) AND usuario_id = $2`,
        [ids, userId]
      );

      // Borrar de Garage (best-effort)
      for (const doc of docs.rows) {
        try {
          await storage.deleteFile(doc.ruta_garage);
        } catch (e) {
          console.warn(`[staging] Garage delete failed for ${doc.id}:`, e.message);
        }
      }

      // Soft delete
      await pool.query(
        `UPDATE documentos_staging SET estado_activo = false
         WHERE id = ANY($1) AND usuario_id = $2`,
        [ids, userId]
      );

      res.json({ ok: true, deleted: docs.rows.length });
    } catch (err) {
      console.error('[staging] Batch delete error:', err.message);
      res.status(500).json({ error: 'Error al eliminar', detail: err.message });
    }
  });

  // =====================================================
  // POST /api/staging/asignar-masivo — Asignar a expediente
  // El ÚNICO punto de conexión con el sistema existente.
  // =====================================================
  router.post('/api/staging/asignar-masivo', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    try {
      const { expediente_id, documentos_ids } = req.body;
      const userId = req.user.id;

      if (!expediente_id) {
        return res.status(400).json({ error: 'Se requiere expediente_id' });
      }
      if (!documentos_ids || !Array.isArray(documentos_ids) || documentos_ids.length === 0) {
        return res.status(400).json({ error: 'Se requiere documentos_ids (array)' });
      }

      // Verificar que el expediente existe
      const expCheck = await client.query(
        'SELECT id FROM expedientes WHERE id = $1',
        [expediente_id]
      );
      if (expCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Expediente no encontrado' });
      }

      await client.query('BEGIN');

      // Obtener documentos del staging que pertenecen al usuario
      const stagingDocs = await client.query(
        `SELECT id, nombre_archivo, ruta_garage, tipo_mime, tamano_bytes
         FROM documentos_staging
         WHERE id = ANY($1) AND usuario_id = $2 AND estado_activo = true`,
        [documentos_ids, userId]
      );

      if (stagingDocs.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Ningún documento válido encontrado en staging' });
      }

      const insertedDocs = [];

      // Insertar cada documento en la tabla documentos (sistema existente)
      for (const doc of stagingDocs.rows) {
        const insertResult = await client.query(
          `INSERT INTO documentos
           (expediente_id, nombre_archivo, ruta_archivo, ruta_garage, tipo_mime, tamano_bytes, version, es_version_actual)
           VALUES ($1, $2, $3, $4, $5, $6, 1, true)
           RETURNING id`,
          [expediente_id, doc.nombre_archivo, doc.ruta_garage, doc.ruta_garage, doc.tipo_mime, doc.tamano_bytes]
        );
        insertedDocs.push({ staging_id: doc.id, documento_id: insertResult.rows[0].id });
      }

      // Marcar documentos en staging como asignados
      await client.query(
        `UPDATE documentos_staging
         SET expediente_asignado_id = $1, fecha_asignacion = CURRENT_TIMESTAMP
         WHERE id = ANY($2) AND usuario_id = $3`,
        [expediente_id, documentos_ids, userId]
      );

      await client.query('COMMIT');

      res.json({
        ok: true,
        asignados: insertedDocs.length,
        expediente_id,
        documentos: insertedDocs,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[staging] Asignar masivo error:', err.message);
      res.status(500).json({ error: 'Error al asignar documentos', detail: err.message });
    } finally {
      client.release();
    }
  });

  // =====================================================
  // GET /api/staging/stats — Contadores del usuario
  // =====================================================
  router.get('/api/staging/stats', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE estado_activo = true AND expediente_asignado_id IS NULL) as pendientes,
           COUNT(*) FILTER (WHERE estado_activo = true AND expediente_asignado_id IS NOT NULL) as asignados,
           COALESCE(SUM(tamano_bytes) FILTER (WHERE estado_activo = true AND expediente_asignado_id IS NULL), 0) as total_bytes_pendientes
         FROM documentos_staging
         WHERE usuario_id = $1`,
        [userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[staging] Stats error:', err.message);
      res.status(500).json({ error: 'Error al obtener stats', detail: err.message });
    }
  });

  return router;
};

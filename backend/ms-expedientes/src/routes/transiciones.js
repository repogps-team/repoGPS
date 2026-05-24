const express = require('express');

function createTransicionesRoutes(pool, authMiddleware) {
    const router = express.Router();

    // ============================================
    // TRANSICIONES PERMITIDAS POR ROL (HU-21)
    // ============================================

    // GET /api/admin/transiciones-permitidas?proceso_id=X - Listar reglas (admin only)
    router.get('/api/admin/transiciones-permitidas', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden ver las reglas de transicion' });
        }

        const { proceso_id } = req.query;

        try {
            let query = `
                SELECT 
                    tp.id,
                    tp.proceso_id,
                    tp.etapa_from_id,
                    tp.etapa_to_id,
                    tp.rol_id,
                    tp.fecha_creacion,
                    ef.nombre AS etapa_from_nombre,
                    et.nombre AS etapa_to_nombre
                FROM transiciones_permitidas tp
                LEFT JOIN etapas_proceso ef ON tp.etapa_from_id = ef.id
                LEFT JOIN etapas_proceso et ON tp.etapa_to_id = et.id
            `;
            const params = [];

            if (proceso_id) {
                query += ' WHERE tp.proceso_id = $1';
                params.push(proceso_id);
            }

            query += ' ORDER BY tp.proceso_id, tp.etapa_from_id, tp.etapa_to_id';

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/admin/transiciones-permitidas - Crear regla (admin only)
    router.post('/api/admin/transiciones-permitidas', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden crear reglas de transicion' });
        }

        const { proceso_id, etapa_from_id, etapa_to_id, rol_id } = req.body;

        if (!proceso_id || !etapa_from_id || !etapa_to_id || !rol_id) {
            return res.status(400).json({ error: 'proceso_id, etapa_from_id, etapa_to_id y rol_id son obligatorios' });
        }

        try {
            const result = await pool.query(
                `INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id, creado_por)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [proceso_id, etapa_from_id, etapa_to_id, rol_id, req.user.id]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Esta regla de transicion ya existe' });
            }
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/admin/transiciones-permitidas/:id - Eliminar regla (admin only)
    router.delete('/api/admin/transiciones-permitidas/:id', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden eliminar reglas de transicion' });
        }

        const { id } = req.params;

        try {
            const result = await pool.query(
                'DELETE FROM transiciones_permitidas WHERE id = $1 RETURNING id',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Regla de transicion no encontrada' });
            }
            res.json({ message: 'Regla de transicion eliminada' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/transiciones/available?expediente_id=X - Transiciones disponibles para el rol del usuario
    router.get('/api/transiciones/available', authMiddleware, async (req, res) => {
        const { expediente_id } = req.query;
        const { rol_id, esAdmin, area_id } = req.user;

        if (!expediente_id) {
            return res.status(400).json({ error: 'expediente_id es obligatorio' });
        }

        try {
            // Obtener expediente actual con proceso
            let expQuery = `
                SELECT e.id, e.proceso_id, e.etapa_actual_id, p.area_id
                FROM expedientes e
                INNER JOIN procesos p ON e.proceso_id = p.id
                WHERE e.id = $1 AND e.estado_activo = true
            `;
            const expParams = [expediente_id];

            if (!esAdmin && area_id) {
                expQuery += ' AND p.area_id = $2';
                expParams.push(area_id);
            }

            const expResult = await pool.query(expQuery, expParams);
            if (expResult.rows.length === 0) {
                return res.status(404).json({ error: 'Expediente no encontrado' });
            }

            const expediente = expResult.rows[0];

            // Si es admin, devolver TODAS las transiciones posibles del proceso
            if (esAdmin) {
                const todasLasEtapas = await pool.query(
                    `SELECT e1.id AS etapa_from_id, e2.id AS etapa_to_id, e2.nombre AS etapa_to_nombre
                     FROM etapas_proceso e1
                     INNER JOIN etapas_proceso e2 ON e1.proceso_id = e2.proceso_id AND e2.orden = e1.orden + 1
                     WHERE e1.proceso_id = $1 AND e1.id = $2`,
                    [expediente.proceso_id, expediente.etapa_actual_id]
                );
                return res.json(todasLasEtapas.rows);
            }

            // Para no-admin: buscar transiciones permitidas para su rol
            const result = await pool.query(
                `SELECT 
                    tp.id,
                    tp.etapa_from_id,
                    tp.etapa_to_id,
                    tp.rol_id,
                    et.nombre AS etapa_to_nombre
                 FROM transiciones_permitidas tp
                 INNER JOIN etapas_proceso et ON tp.etapa_to_id = et.id
                 WHERE tp.proceso_id = $1
                   AND tp.etapa_from_id = $2
                   AND tp.rol_id = $3`,
                [expediente.proceso_id, expediente.etapa_actual_id, rol_id]
            );

            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

module.exports = createTransicionesRoutes;

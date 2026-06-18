const express = require('express');

function createFormRoutes(pool, authMiddleware, MS_USUARIOS_URL) {
    const router = express.Router();

    // ============================================
    // FORMULARIOS DINAMICOS (FormIO)
    // ============================================

    // POST /api/forms - Crear definicion de formulario (admin only)
    router.post('/api/forms', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden crear formularios' });
        }

        const { nombre, descripcion, schema } = req.body;

        if (!nombre || !schema) {
            return res.status(400).json({ error: 'nombre y schema son obligatorios' });
        }

        try {
            const result = await pool.query(
                'INSERT INTO form_definitions (nombre, descripcion, schema, creado_por) VALUES ($1, $2, $3, $4) RETURNING *',
                [nombre, descripcion || null, JSON.stringify(schema), req.user.id]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/forms - Listar todas las definiciones activas
    router.get('/api/forms', authMiddleware, async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, nombre, descripcion, estado_activo, creado_por, fecha_creacion, fecha_actualizacion FROM form_definitions WHERE estado_activo = true ORDER BY fecha_creacion DESC'
            );
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/forms/:id - Obtener una definicion de formulario
    router.get('/api/forms/:id', authMiddleware, async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.query(
                'SELECT * FROM form_definitions WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/forms/:id - Actualizar definicion de formulario (admin only)
    router.put('/api/forms/:id', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden editar formularios' });
        }

        const { id } = req.params;
        const { nombre, descripcion, schema } = req.body;

        if (!nombre || !schema) {
            return res.status(400).json({ error: 'nombre y schema son obligatorios' });
        }

        try {
            const result = await pool.query(
                'UPDATE form_definitions SET nombre = $1, descripcion = $2, schema = $3, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
                [nombre, descripcion || null, JSON.stringify(schema), id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/forms/:id - Soft delete (admin only)
    router.delete('/api/forms/:id', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden eliminar formularios' });
        }

        const { id } = req.params;
        try {
            const result = await pool.query(
                'UPDATE form_definitions SET estado_activo = false WHERE id = $1 RETURNING id',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado' });
            }
            res.json({ message: 'Formulario eliminado logicamente' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PATCH /api/forms/:id/estado - Toggle estado_activo (admin only)
    router.patch('/api/forms/:id/estado', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden cambiar el estado' });
        }

        const { id } = req.params;
        const { estado_activo } = req.body;

        if (estado_activo === undefined) {
            return res.status(400).json({ error: 'estado_activo es obligatorio' });
        }

        try {
            const result = await pool.query(
                'UPDATE form_definitions SET estado_activo = $1 WHERE id = $2 RETURNING id, estado_activo',
                [Boolean(estado_activo), id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/forms/:id/asignar - Asignar formulario a expediente (admin only)
    router.post('/api/forms/:id/asignar', authMiddleware, async (req, res) => {
        if (!req.user.esAdmin) {
            return res.status(403).json({ error: 'Solo administradores pueden asignar formularios' });
        }

        const { id } = req.params;
        const { expediente_id } = req.body;

        if (!expediente_id) {
            return res.status(400).json({ error: 'expediente_id es obligatorio' });
        }

        try {
            // Verificar que el formulario existe y esta activo
            const formCheck = await pool.query(
                'SELECT id FROM form_definitions WHERE id = $1 AND estado_activo = true',
                [id]
            );
            if (formCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado o inactivo' });
            }

            // Verificar que el expediente existe
            const expCheck = await pool.query(
                'SELECT id FROM expedientes WHERE id = $1 AND estado_activo = true',
                [expediente_id]
            );
            if (expCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Expediente no encontrado' });
            }

            const result = await pool.query(
                'INSERT INTO form_assignments (form_definition_id, expediente_id, creado_por) VALUES ($1, $2, $3) RETURNING *',
                [id, expediente_id, req.user.id]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'El formulario ya esta asignado a este expediente' });
            }
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/forms/expediente/:expedienteId - Obtener formularios asignados a un expediente
    router.get('/api/forms/expediente/:expedienteId', authMiddleware, async (req, res) => {
        const { expedienteId } = req.params;
        const { esAdmin, area_id } = req.user;

        try {
            // Verificar acceso al expediente (mismo patron que otros endpoints)
            let checkQuery = `
                SELECT e.id, p.area_id, ep.tipo_etapa
                FROM expedientes e
                INNER JOIN procesos p ON e.proceso_id = p.id
                LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
                WHERE e.id = $1 AND e.estado_activo = true
            `;
            const checkParams = [expedienteId];

            if (!esAdmin && area_id) {
                checkQuery += ` AND p.area_id = $2`;
                checkParams.push(area_id);
            }

            const checkResult = await pool.query(checkQuery, checkParams);
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: 'Expediente no encontrado' });
            }

            const tipoEtapa = checkResult.rows[0].tipo_etapa;
            const puedeResponder = tipoEtapa === 'desarrollo';

            // Obtener formularios asignados con info de respuestas
            const result = await pool.query(
                `SELECT 
                    fd.id,
                    fd.nombre,
                    fd.descripcion,
                    fd.estado_activo,
                    fd.fecha_creacion,
                    fd.fecha_actualizacion,
                    fa.fecha_asignacion,
                    COUNT(fr.id) AS respuestas_count
                 FROM form_assignments fa
                 INNER JOIN form_definitions fd ON fa.form_definition_id = fd.id
                 LEFT JOIN form_responses fr ON fr.formulario_id = fd.id AND fr.expediente_id = fa.expediente_id
                 WHERE fa.expediente_id = $1 AND fd.estado_activo = true
                 GROUP BY fd.id, fa.fecha_asignacion
                 ORDER BY fa.fecha_asignacion DESC`,
                [expedienteId]
            );

            const forms = result.rows.map(row => ({
                ...row,
                puede_responder: puedeResponder,
                respuestas_count: parseInt(row.respuestas_count, 10)
            }));

            res.json(forms);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/forms/:formId/responder - Enviar respuesta de formulario
    router.post('/api/forms/:formId/responder', authMiddleware, async (req, res) => {
        const { formId } = req.params;
        const { expediente_id, data } = req.body;

        if (!expediente_id || !data) {
            return res.status(400).json({ error: 'expediente_id y data son obligatorios' });
        }

        try {
            // Verificar que el formulario existe y esta activo
            const formCheck = await pool.query(
                'SELECT id FROM form_definitions WHERE id = $1 AND estado_activo = true',
                [formId]
            );
            if (formCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado o inactivo' });
            }

            // Verificar acceso al expediente y etapa actual
            let checkQuery = `
                SELECT e.id, p.area_id, ep.tipo_etapa
                FROM expedientes e
                INNER JOIN procesos p ON e.proceso_id = p.id
                LEFT JOIN etapas_proceso ep ON e.etapa_actual_id = ep.id
                WHERE e.id = $1 AND e.estado_activo = true
            `;
            const checkParams = [expediente_id];

            if (!req.user.esAdmin && req.user.area_id) {
                checkQuery += ` AND p.area_id = $2`;
                checkParams.push(req.user.area_id);
            }

            const checkResult = await pool.query(checkQuery, checkParams);
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: 'Expediente no encontrado' });
            }

            const tipoEtapa = checkResult.rows[0].tipo_etapa;

            // Solo se puede responder si la etapa es de tipo 'desarrollo'
            if (tipoEtapa !== 'desarrollo') {
                return res.status(403).json({
                    error: `El expediente no se encuentra en etapa de desarrollo (etapa actual: ${tipoEtapa || 'sin definir'})`
                });
            }

            // Verificar que el formulario este asignado al expediente
            const assignmentCheck = await pool.query(
                'SELECT id FROM form_assignments WHERE form_definition_id = $1 AND expediente_id = $2',
                [formId, expediente_id]
            );
            if (assignmentCheck.rows.length === 0) {
                return res.status(400).json({ error: 'El formulario no esta asignado a este expediente' });
            }

            // Insertar la respuesta
            const result = await pool.query(
                'INSERT INTO form_responses (formulario_id, expediente_id, usuario_id, data) VALUES ($1, $2, $3, $4) RETURNING *',
                [formId, expediente_id, req.user.id, JSON.stringify(data)]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/forms/:formId/respuestas - Obtener todas las respuestas de un formulario
    router.get('/api/forms/:formId/respuestas', authMiddleware, async (req, res) => {
        const { formId } = req.params;
        const { esAdmin, area_id } = req.user;

        try {
            // Verificar que el formulario existe
            const formCheck = await pool.query(
                'SELECT id FROM form_definitions WHERE id = $1',
                [formId]
            );
            if (formCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Formulario no encontrado' });
            }

            // Obtener respuestas con info del expediente
            let query = `
                SELECT 
                    fr.id,
                    fr.data,
                    fr.fecha_envio,
                    fr.estado,
                    fr.usuario_id,
                    fr.expediente_id,
                    e.titulo AS expediente_titulo,
                    p.area_id
                FROM form_responses fr
                INNER JOIN form_definitions fd ON fr.formulario_id = fd.id
                INNER JOIN expedientes e ON fr.expediente_id = e.id
                INNER JOIN procesos p ON e.proceso_id = p.id
                WHERE fr.formulario_id = $1
            `;
            const params = [formId];

            // Si no es admin, solo ver sus propias respuestas
            if (!esAdmin) {
                query += ` AND fr.usuario_id = $2`;
                params.push(req.user.id);
            }

            query += ` ORDER BY fr.fecha_envio DESC`;

            const result = await pool.query(query, params);

            // Enriquecer con nombre del usuario
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

    return router;
}

module.exports = createFormRoutes;

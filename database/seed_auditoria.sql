-- =============================================================
-- SEED: db_auditoria — Audit Events (~3000)
-- Ejecutar: docker exec db_auditoria psql -U postgres -d db_auditoria -f /tmp/seed_auditoria.sql
-- =============================================================

DO $$
DECLARE
    i INTEGER;
    v_accion TEXT;
    v_entidad TEXT;
    v_usr_id INTEGER;
    v_usr_nombre TEXT;
    v_fecha TIMESTAMP;
    v_ip TEXT;
    v_acciones TEXT[];
    v_entidades TEXT[];
    v_nombres TEXT[];
BEGIN
    v_acciones := ARRAY[
        'LOGIN', 'LOGOUT', 'VIEW', 'CREATE', 'UPDATE', 'DELETE',
        'UPLOAD', 'DOWNLOAD', 'ADVANCE', 'REJECT', 'ASSIGN',
        'RESPOND', 'EXPORT', 'SEARCH'
    ];
    v_entidades := ARRAY[
        'expediente', 'documento', 'tarea', 'formulario',
        'area', 'contratista', 'proceso', 'rol', 'usuario'
    ];
    v_nombres := ARRAY[
        'Admin Prueba', 'María González', 'Carlos Mendoza', 'Ana Torres',
        'Pedro Ramírez', 'Lucía Fernández', 'Jorge Castillo', 'Rosa Herrera',
        'Diego Salazar', 'Patricia Vargas', 'Fernando Ríos', 'Carmen López',
        'Andrés Morales', 'Isabel Contreras', 'Roberto Díaz', 'Verónica Silva',
        'Miguel Ángel Peña', 'Daniela Rojas', 'Sergio Muñoz', 'Valentina Cruz'
    ];

    FOR i IN 1..3000 LOOP
        v_accion := v_acciones[(i % array_length(v_acciones, 1)) + 1];
        v_entidad := v_entidades[(i % array_length(v_entidades, 1)) + 1];
        v_usr_id := 1 + (i % 20);
        v_usr_nombre := v_nombres[v_usr_id];

        -- Dispersar en últimos 365 días, más actividad en meses recientes
        v_fecha := NOW() - (((365 - (i % 300)) * 0.8 + (i % 60)) || ' days')::INTERVAL
                   + ((i % 24) || ' hours')::INTERVAL
                   + ((i % 60) || ' minutes')::INTERVAL;

        v_ip := '192.168.1.' || (10 + (i % 200));

        INSERT INTO audit_events (fecha, usuario_id, usuario_nombre,
                                   accion, entidad, entidad_id, entidad_nombre,
                                   valor_anterior, valor_nuevo, ip)
        VALUES (
            v_fecha, v_usr_id, v_usr_nombre,
            v_accion, v_entidad, 1 + (i % 200),
            v_entidad || ' #' || (1 + (i % 200)),
            CASE WHEN v_accion IN ('UPDATE', 'DELETE', 'REJECT')
                 THEN ('{"estado": "anterior"}')::JSONB ELSE NULL END,
            CASE WHEN v_accion IN ('CREATE', 'UPDATE', 'ADVANCE')
                 THEN ('{"estado": "nuevo"}')::JSONB ELSE NULL END,
            v_ip
        );
    END LOOP;
END $$;

-- Verificación
SELECT 'audit_events' AS tabla, COUNT(*) AS registros FROM audit_events
UNION ALL SELECT 'LOGIN events', COUNT(*) FROM audit_events WHERE accion = 'LOGIN'
UNION ALL SELECT 'REJECT events', COUNT(*) FROM audit_events WHERE accion = 'REJECT'
UNION ALL SELECT 'usuarios distinct', COUNT(DISTINCT usuario_id) FROM audit_events;

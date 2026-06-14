-- =============================================================
-- SEED: db_expedientes — Mirrors, Procesos, Etapas, Expedientes,
--        Documentos, Historial, Tareas, Formularios
-- Ejecutar: docker exec db_expedientes psql -U postgres -d db_expedientes -f /tmp/seed_expedientes.sql
-- =============================================================

-- =============================================================
-- 0. COLUMNAS FALTANTES (seguras, no duplican)
-- =============================================================
DO $$ BEGIN ALTER TABLE expedientes ADD COLUMN contratista_id INTEGER; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN ALTER TABLE etapas_proceso ADD COLUMN tipo_etapa VARCHAR(20); EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN ALTER TABLE historial_etapas ADD COLUMN accion VARCHAR(20); EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN ALTER TABLE historial_etapas ADD COLUMN orden INTEGER; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN ALTER TABLE form_responses ADD COLUMN completado BOOLEAN DEFAULT false; EXCEPTION WHEN duplicate_column THEN END $$;
DO $$ BEGIN ALTER TABLE form_responses RENAME COLUMN form_definition_id TO formulario_id; EXCEPTION WHEN undefined_column THEN END $$;

-- =============================================================
-- 1. MIRROR TABLES (datos hardcoded, no SELECT de otros DBs)
-- =============================================================
INSERT INTO contratistas_mirror (id, razon_social, rut, estado_activo) VALUES
(1, 'Constructora Andes SpA',   '76.123.456-K', true),
(2, 'Ingeniería Sur Ltda',      '77.234.567-L', true),
(3, 'GroupTech SAC',            '78.345.678-M', true),
(4, 'Consolidada Norte SpA',    '79.456.789-N', true),
(5, 'Servicios Integrales BP',  '80.567.890-P', true),
(6, 'Estudios Terra Ltda',      '81.678.901-Q', true),
(7, 'Constructora del Sur',     '82.789.012-R', true),
(8, 'Admin General SpA',        '83.890.123-S', true)
ON CONFLICT (id) DO UPDATE SET razon_social = EXCLUDED.razon_social;

INSERT INTO areas_mirror (id, contratista_id, nombre, estado_activo) VALUES
(1,  1, 'Ingeniería Civil',        true),
(2,  1, 'Prevención de Riesgos',   true),
(3,  2, 'Diseño Estructural',      true),
(4,  2, 'Calidad',                 true),
(5,  3, 'Desarrollo de Software',  true),
(6,  3, 'Infraestructura TI',      true),
(7,  4, 'Finanzas',                true),
(8,  4, 'Contabilidad',            true),
(9,  5, 'Logística',               true),
(10, 6, 'Estudios Geotécnicos',    true),
(11, 7, 'Obra Civil',              true),
(12, 8, 'Administración General',  true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO categorias_mirror (id, nombre, descripcion, estado_activo) VALUES
(1, 'Seguridad',    'Documentos de seguridad y prevención',  true),
(2, 'Calidad',      'Gestión de calidad ISO',                true),
(3, 'Ingeniería',   'Documentos técnicos de ingeniería',     true),
(4, 'Legal',        'Documentos legales y contractuales',    true),
(5, 'Financiero',   'Documentos contables y financieros',    true),
(6, 'Operaciones',  'Documentos operacionales',              true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO subtipos_mirror (id, categoria_id, nombre, descripcion, estado_activo) VALUES
(1,  1, 'Charla de 5 min',        'Charla diaria de seguridad',          true),
(2,  1, 'PPE',                    'Procedimientos de protección personal', true),
(3,  1, 'Informe de incidentes',  'Reporte de accidentes',               true),
(4,  2, 'Plan de calidad',        'Plan de gestión de calidad',          true),
(5,  2, 'Procedimiento ISO',      'Procedimientos según norma ISO',      true),
(6,  3, 'Planos',                 'Planos técnicos',                     true),
(7,  3, 'Estudios de suelo',      'Estudios geotécnicos',                true),
(8,  4, 'Contrato',               'Documentos contractuales',            true),
(9,  4, 'Carta garantía',         'Cartas de garantía',                  true),
(10, 5, 'Balance',                'Estados financieros',                 true),
(11, 5, 'Factura',                'Documentos de facturación',           true),
(12, 6, 'Parte diario',           'Reporte diario de obra',              true),
(13, 6, 'Bitácora',               'Registro de actividades',             true),
(14, 3, 'Memoria de cálculo',     'Cálculos estructurales',              true),
(15, 2, 'Checklist',              'Lista de verificación',               true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO usuarios_mirror (id, rol_id, nombre_completo, correo, estado_activo) VALUES
(1,  1, 'Admin Prueba',        'admin@gps.com',            true),
(2,  2, 'María González',      'maria.gonzalez@gps.com',   true),
(3,  3, 'Carlos Mendoza',      'carlos.mendoza@gps.com',   true),
(4,  4, 'Ana Torres',          'ana.torres@gps.com',       true),
(5,  5, 'Pedro Ramírez',       'pedro.ramirez@gps.com',    true),
(6,  2, 'Lucía Fernández',     'lucia.fernandez@gps.com',  true),
(7,  3, 'Jorge Castillo',      'jorge.castillo@gps.com',   true),
(8,  4, 'Rosa Herrera',        'rosa.herrera@gps.com',     true),
(9,  2, 'Diego Salazar',       'diego.salazar@gps.com',    true),
(10, 3, 'Patricia Vargas',     'patricia.vargas@gps.com',  true),
(11, 4, 'Fernando Ríos',       'fernando.rios@gps.com',    true),
(12, 5, 'Carmen López',        'carmen.lopez@gps.com',     true),
(13, 2, 'Andrés Morales',      'andres.morales@gps.com',   true),
(14, 3, 'Isabel Contreras',    'isabel.contreras@gps.com', true),
(15, 4, 'Roberto Díaz',        'roberto.diaz@gps.com',     true),
(16, 2, 'Verónica Silva',      'veronica.silva@gps.com',   true),
(17, 3, 'Miguel Ángel Peña',   'miguel.pena@gps.com',      true),
(18, 4, 'Daniela Rojas',       'daniela.rojas@gps.com',    true),
(19, 5, 'Sergio Muñoz',        'sergio.munoz@gps.com',     true),
(20, 2, 'Valentina Cruz',      'valentina.cruz@gps.com',   true)
ON CONFLICT (id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo;

INSERT INTO disciplinas_mirror (id, area_id, nombre, estado_activo) VALUES
(1,  1, 'Suelos y Cimentaciones',   true),
(2,  1, 'Estructuras',              true),
(3,  2, 'Seguridad Industrial',     true),
(4,  2, 'Medio Ambiente',           true),
(5,  3, 'Cálculo Estructural',      true),
(6,  4, 'Auditoría ISO',            true),
(7,  5, 'Backend',                  true),
(8,  5, 'Frontend',                 true),
(9,  6, 'Redes',                    true),
(10, 10, 'Perforación',             true),
(11, 11, 'Habilitación',            true),
(12, 12, 'RRHH',                    true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

-- =============================================================
-- 2. PROCESOS (IDs 4-12, los 1-3 ya existen del init)
-- =============================================================
INSERT INTO procesos (id, area_id, nombre, descripcion, estado_activo) VALUES
(4,  1, 'Diseño Estructural',        'Flujo de diseño y revisión estructural',       true),
(5,  2, 'Control de Obras',          'Seguimiento y control de avance de obra',      true),
(6,  3, 'Revisión de Planos',        'Aprobación de planos constructivos',           true),
(7,  4, 'Auditoría ISO 9001',        'Proceso de auditoría de calidad',              true),
(8,  5, 'Desarrollo ERP',            'Ciclo de vida del desarrollo de software',     true),
(9,  6, 'Infraestructura Cloud',     'Provisionamiento y mantenimiento cloud',       true),
(10, 7, 'Cierre Contable',           'Cierre mensual y trimestral',                  true),
(11, 10, 'Estudio Geotécnico',       'Perforación y análisis de suelos',             true),
(12, 11, 'Habilitación Urbanística', 'Trámites de habilitación ante la municipalidad', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
SELECT setval('procesos_id_seq', (SELECT MAX(id) FROM procesos));

-- =============================================================
-- 3. ETAPAS (solo para procesos 4-12, los 1-3 ya tienen etapas)
-- =============================================================
-- Proceso 4 (Diseño Estructural)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(4, 'Borrador',         1, false, NULL,        NULL),
(4, 'Revisión Técnica', 2, false, 'revision',  2),
(4, 'Aprobación Final', 3, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 5 (Control de Obras)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(5, 'Ingreso',      1, false, NULL,        NULL),
(5, 'Verificación', 2, false, 'revision',  2),
(5, 'Visado',       3, false, 'visacion',  4),
(5, 'Cerrado',      4, true,  NULL,        NULL)
ON CONFLICT DO NOTHING;

-- Proceso 6 (Revisión de Planos)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(6, 'Carga de Planos',  1, false, NULL,        NULL),
(6, 'Revisión',         2, false, 'revision',  2),
(6, 'Observaciones',    3, false, NULL,        NULL),
(6, 'Aprobado',         4, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 7 (Auditoría ISO)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(7, 'Planificación',    1, false, NULL,        NULL),
(7, 'Ejecución',        2, false, 'revision',  2),
(7, 'Hallazgos',        3, false, NULL,        NULL),
(7, 'Certificación',    4, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 8 (Desarrollo ERP)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(8, 'Backlog',       1, false, NULL,        NULL),
(8, 'En Desarrollo', 2, false, 'revision',  2),
(8, 'QA Testing',    3, false, 'visacion',  4),
(8, 'Deploy',        4, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 9 (Infraestructura Cloud)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(9, 'Solicitud',     1, false, NULL,        NULL),
(9, 'Revisión',      2, false, 'revision',  2),
(9, 'Aprobación',    3, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 10 (Cierre Contable)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(10, 'Preparación',   1, false, NULL,        NULL),
(10, 'Revisión',      2, false, 'revision',  2),
(10, 'Aprobación',    3, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 11 (Estudio Geotécnico)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(11, 'Perforación',    1, false, NULL,        NULL),
(11, 'Análisis',       2, false, 'revision',  2),
(11, 'Informe Final',  3, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

-- Proceso 12 (Habilitación Urbanística)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(12, 'Documentación',  1, false, NULL,        NULL),
(12, 'Revisión Legal', 2, false, 'revision',  2),
(12, 'Presentación',   3, false, 'visacion',  4),
(12, 'Aprobado',       4, true,  'aprobacion', 3)
ON CONFLICT DO NOTHING;

SELECT setval('etapas_proceso_id_seq', (SELECT MAX(id) FROM etapas_proceso));

-- =============================================================
-- 4. TIPO_ETAPA (poblar columna nueva)
-- =============================================================
UPDATE etapas_proceso SET tipo_etapa = CASE
    WHEN es_final THEN 'final'
    WHEN orden = 1 THEN 'inicio'
    ELSE 'desarrollo'
END WHERE tipo_etapa IS NULL;

-- =============================================================
-- 5. EXPEDIENTES (~200, sin IDs explícitos para evitar conflictos)
-- =============================================================
DO $$
DECLARE
    i INTEGER;
    v_proceso_id INTEGER;
    v_disciplina_id INTEGER;
    v_subtipo_id INTEGER;
    v_etapa_id INTEGER;
    v_fecha_cre TIMESTAMP;
    v_fecha_term DATE;
    v_titulos TEXT[];
BEGIN
    v_titulos := ARRAY[
        'Estudio de Suelos - Zona Norte', 'Charla Seguridad Mensual',
        'Auditoría ISO Q1', 'Revisión Planos Edificio B',
        'Control de Obra - Lote 5', 'Diseño Estructural - Puente',
        'Estudio Geotécnico - Site 3', 'Certificación Contable Q2',
        'Revisión Seguridad - Planta', 'Plan de Calidad 2026',
        'Proyecto ERP Módulo RRHH', 'Migración Cloud AWS',
        'Cierre Contable Marzo', 'Habilitación Terreno Sur',
        'Perforación - Nivel 2', 'Análisis Estructural Losa',
        'Charla PPE Equipamiento', 'Informe Incidente #45',
        'Contrato Proveedor X', 'Carta Garantía Obra Norte',
        'Balance Financiero Anual', 'Factura Proveedor Sur',
        'Parte Diario Obra 12', 'Bitácora Proyecto Alpha',
        'Memoria Cálculo Viga', 'Checklist ISO Auditoría',
        'Planos Remodelación', 'Estudio Suelos Parking',
        'Procedimiento Emergencia', 'Plan Ambiental Zona B',
        'Revisión Planos Fachada', 'Control Avance Mensual',
        'Diseño Instalaciones', 'Auditoría Seguridad IT',
        'Migración Base Datos', 'Desarrollo Módulo Finanzas',
        'Estudio Ruido Industrial', 'Certificación Energía',
        'Informe Topográfico', 'Proyecto Solar Tejado',
        'Revisión Estructural Muro', 'Charla Seguridad Octubre',
        'Cierre Trimestral Q3', 'Habilitación Local Comercial',
        'Perforación Profunda Site 7', 'Análisis Laboratorio Suelos',
        'Plan Gestión Residuos', 'Procedimiento Almacenamiento',
        'Contrato Mantención', 'Carta Compromiso Ambiental'
    ];

    FOR i IN 1..200 LOOP
        v_proceso_id := 1 + (i % 12);

        -- Mapear disciplina/subtipo según proceso
        CASE v_proceso_id
            WHEN 1  THEN v_disciplina_id := 1;  v_subtipo_id := 7;
            WHEN 2  THEN v_disciplina_id := 3;  v_subtipo_id := 1;
            WHEN 3  THEN v_disciplina_id := 6;  v_subtipo_id := 5;
            WHEN 4  THEN v_disciplina_id := 5;  v_subtipo_id := 6;
            WHEN 5  THEN v_disciplina_id := 2;  v_subtipo_id := 12;
            WHEN 6  THEN v_disciplina_id := 5;  v_subtipo_id := 6;
            WHEN 7  THEN v_disciplina_id := 6;  v_subtipo_id := 15;
            WHEN 8  THEN v_disciplina_id := 7;  v_subtipo_id := 13;
            WHEN 9  THEN v_disciplina_id := 9;  v_subtipo_id := 13;
            WHEN 10 THEN v_disciplina_id := 12; v_subtipo_id := 10;
            WHEN 11 THEN v_disciplina_id := 10; v_subtipo_id := 7;
            WHEN 12 THEN v_disciplina_id := 11; v_subtipo_id := 12;
        END CASE;

        -- Fecha de creación: dispersa en los últimos 365 días
        v_fecha_cre := NOW() - (((i * 37 + (i % 7) * 13) % 365) || ' days')::INTERVAL
                       + ((i % 24) || ' hours')::INTERVAL
                       + ((i % 60) || ' minutes')::INTERVAL;

        -- ~60% terminados, ~25% en desarrollo, ~15% pendientes
        IF i % 10 < 6 THEN
            v_fecha_term := (v_fecha_cre + ((5 + (i % 20)) || ' days')::INTERVAL)::DATE;
            SELECT ep.id INTO v_etapa_id FROM etapas_proceso ep
            WHERE ep.proceso_id = v_proceso_id AND ep.es_final = true LIMIT 1;
        ELSIF i % 10 < 8 THEN
            v_fecha_term := NULL;
            SELECT ep.id INTO v_etapa_id FROM etapas_proceso ep
            WHERE ep.proceso_id = v_proceso_id AND ep.es_final = false
            ORDER BY ep.orden DESC LIMIT 1;
        ELSE
            v_fecha_term := NULL;
            SELECT ep.id INTO v_etapa_id FROM etapas_proceso ep
            WHERE ep.proceso_id = v_proceso_id ORDER BY ep.orden LIMIT 1;
        END IF;

        INSERT INTO expedientes (proceso_id, disciplina_id, subtipo_id,
                                  etapa_actual_id, titulo, descripcion,
                                  fecha_creacion, fecha_termino, estado_activo)
        VALUES (
            v_proceso_id, v_disciplina_id, v_subtipo_id,
            v_etapa_id,
            v_titulos[(i % array_length(v_titulos, 1)) + 1] || ' #' || i,
            'Expediente generado para pruebas de dashboard',
            v_fecha_cre, v_fecha_term, true
        );
    END LOOP;
END $$;

-- Poblar contratista_id derivado del área → proceso → contratista
UPDATE expedientes e
SET contratista_id = am.contratista_id
FROM procesos p
JOIN areas_mirror am ON p.area_id = am.id
WHERE e.proceso_id = p.id AND e.contratista_id IS NULL;

-- =============================================================
-- 6. DOCUMENTOS (~800)
-- =============================================================
DO $$
DECLARE
    i INTEGER;
    v_exp_id INTEGER;
    v_mimes TEXT[];
    v_sizes INTEGER[];
    v_nombres TEXT[];
    v_mime TEXT;
    v_sz INTEGER;
    v_nombre TEXT;
    v_ext TEXT;
BEGIN
    v_mimes := ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/csv'
    ];
    v_sizes := ARRAY[51200, 128000, 256000, 512000, 1024000, 2048576, 4096000, 8192000];
    v_nombres := ARRAY[
        'informe_tecnico', 'planos', 'memoria_calculo', 'checklist',
        'contrato', 'factura', 'balance', 'presentacion',
        'foto_obra', 'bitacora', 'procedimiento', 'certificado'
    ];

    FOR i IN 1..800 LOOP
        v_exp_id := ((i - 1) % (SELECT COUNT(*) FROM expedientes)) + 1;
        v_mime := v_mimes[(i % array_length(v_mimes, 1)) + 1];
        v_sz := v_sizes[(i % array_length(v_sizes, 1)) + 1];
        v_nombre := v_nombres[(i % array_length(v_nombres, 1)) + 1];

        IF v_mime = 'application/pdf' THEN v_ext := '.pdf';
        ELSIF v_mime LIKE '%wordprocessingml%' THEN v_ext := '.docx';
        ELSIF v_mime LIKE '%spreadsheetml%' THEN v_ext := '.xlsx';
        ELSIF v_mime = 'image/jpeg' THEN v_ext := '.jpg';
        ELSIF v_mime LIKE '%presentationml%' THEN v_ext := '.pptx';
        ELSE v_ext := '.csv';
        END IF;

        INSERT INTO documentos (expediente_id, nombre_archivo, ruta_archivo,
                                 tipo_mime, tamano_bytes, fecha_upload, estado_activo)
        SELECT
            v_exp_id,
            v_nombre || '_' || i || v_ext,
            '/uploads/expedientes/' || v_exp_id || '/' || v_nombre || '_' || i || v_ext,
            v_mime,
            v_sz + (i % 50000),
            e.fecha_creacion + ((i % 30) || ' days')::INTERVAL + ((i % 24) || ' hours')::INTERVAL,
            true
        FROM expedientes e WHERE e.id = v_exp_id;
    END LOOP;
END $$;

-- =============================================================
-- 7. HISTORIAL DE ETAPAS
-- =============================================================
DO $$
DECLARE
    i INTEGER;
    v_exp RECORD;
    v_prev INTEGER;
    v_curr INTEGER;
    v_usuario INTEGER;
    v_j INTEGER;
BEGIN
    FOR v_exp IN SELECT e.id, e.proceso_id, e.fecha_creacion FROM expedientes e ORDER BY e.id LOOP
        v_prev := NULL;
        v_j := 0;
        FOR v_curr IN
            SELECT ep.id FROM etapas_proceso ep
            WHERE ep.proceso_id = v_exp.proceso_id ORDER BY ep.orden
        LOOP
            IF v_prev IS NOT NULL AND v_j < 6 THEN
                v_usuario := 1 + ((v_exp.id + v_j) % 20);
                INSERT INTO historial_etapas (expediente_id, etapa_anterior_id,
                                               etapa_nueva_id, usuario_id, fecha_cambio,
                                               observacion, accion, orden)
                VALUES (
                    v_exp.id, v_prev, v_curr, v_usuario,
                    v_exp.fecha_creacion + (v_j || ' days')::INTERVAL + ((v_j * 3) || ' hours')::INTERVAL,
                    'Movimiento de etapa ' || v_j,
                    CASE WHEN v_j % 7 = 0 THEN 'rechazar' ELSE 'avanzar' END,
                    (SELECT ep2.orden FROM etapas_proceso ep2 WHERE ep2.id = v_curr)
                );
                v_j := v_j + 1;
            END IF;
            v_prev := v_curr;
        END LOOP;
    END LOOP;
END $$;

-- =============================================================
-- 8. TAREAS ASIGNADAS (~600)
-- =============================================================
DO $$
DECLARE
    i INTEGER;
    v_exp_id INTEGER;
    v_etapa_id INTEGER;
    v_usuario INTEGER;
    v_tipo TEXT;
    v_estado TEXT;
    v_fecha_asig TIMESTAMP;
    v_fecha_fin TIMESTAMP;
    v_total_exp INTEGER;
BEGIN
    v_total_exp := (SELECT COUNT(*) FROM expedientes);

    FOR i IN 1..600 LOOP
        v_exp_id := ((i - 1) % v_total_exp) + 1;

        SELECT ep.id INTO v_etapa_id
        FROM etapas_proceso ep
        WHERE ep.proceso_id = (SELECT proceso_id FROM expedientes WHERE id = v_exp_id)
          AND ep.tipo_tarea IS NOT NULL
        ORDER BY RANDOM() LIMIT 1;

        CONTINUE WHEN v_etapa_id IS NULL;

        v_usuario := 1 + (i % 20);
        v_tipo := (ARRAY['revision', 'aprobacion', 'visacion'])[1 + (i % 3)];

        IF i % 20 < 9 THEN
            v_estado := 'completada';
            v_fecha_asig := NOW() - ((i * 2 + 10) || ' days')::INTERVAL;
            v_fecha_fin := v_fecha_asig + ((1 + (i % 5)) || ' days')::INTERVAL;
        ELSIF i % 20 < 16 THEN
            v_estado := 'pendiente';
            v_fecha_asig := NOW() - ((i % 15) || ' days')::INTERVAL;
            v_fecha_fin := NULL;
        ELSIF i % 20 < 19 THEN
            v_estado := 'visto';
            v_fecha_asig := NOW() - ((i % 20) || ' days')::INTERVAL;
            v_fecha_fin := NULL;
        ELSE
            v_estado := 'rechazada';
            v_fecha_asig := NOW() - ((i % 10) || ' days')::INTERVAL;
            v_fecha_fin := v_fecha_asig + ((i % 3) || ' days')::INTERVAL;
        END IF;

        INSERT INTO tareas_asignadas (expediente_id, etapa_id, usuario_id,
                                       tipo_tarea, estado, fecha_asignacion,
                                       fecha_visto, fecha_termino, observacion)
        VALUES (
            v_exp_id, v_etapa_id, v_usuario, v_tipo, v_estado,
            v_fecha_asig,
            CASE WHEN v_estado IN ('visto', 'completada', 'rechazada')
                 THEN v_fecha_asig + ((i % 48) || ' hours')::INTERVAL ELSE NULL END,
            v_fecha_fin,
            'Tarea de prueba #' || i
        );
    END LOOP;
END $$;

-- =============================================================
-- 9. FORMULARIOS
-- =============================================================
INSERT INTO form_definitions (id, nombre, descripcion, schema, estado_activo, creado_por) VALUES
(1, 'Checklist de Seguridad',    'Control diario de EPP y zonas', '{"components":[]}'::JSONB, true, 1),
(2, 'Encuesta de Satisfacción',  'Feedback de clientes internos', '{"components":[]}'::JSONB, true, 1),
(3, 'Formulario de Incidentes',  'Reporte de incidentes', '{"components":[]}'::JSONB, true, 2),
(4, 'Evaluación de Proveedor',   'Score de desempeño', '{"components":[]}'::JSONB, true, 3),
(5, 'Registro de Capacitación',  'Control de asistencia', '{"components":[]}'::JSONB, true, 1)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
SELECT setval('form_definitions_id_seq', (SELECT MAX(id) FROM form_definitions));

DO $$
DECLARE
    i INTEGER;
    v_total_exp INTEGER;
BEGIN
    v_total_exp := (SELECT COUNT(*) FROM expedientes);
    FOR i IN 1..200 LOOP
        INSERT INTO form_responses (formulario_id, expediente_id, usuario_id,
                                     data, fecha_envio, estado, completado)
        VALUES (
            1 + (i % 5),
            1 + ((i - 1) % v_total_exp),
            1 + (i % 20),
            ('{"completado": ' || (i % 10 < 8) || ', "respuestas": {"campo1": "valor' || i || '"}}')::JSONB,
            NOW() - ((i * 3 + 5) || ' days')::INTERVAL + ((i % 24) || ' hours')::INTERVAL,
            CASE WHEN i % 10 < 8 THEN 'completado' ELSE 'pendiente' END,
            (i % 10 < 8)
        );
    END LOOP;
END $$;

-- =============================================================
-- 10. VISTA formularios
-- =============================================================
DROP VIEW IF EXISTS formularios;
CREATE OR REPLACE VIEW formularios AS
SELECT id, nombre, descripcion, schema, estado_activo, creado_por,
       fecha_creacion, fecha_actualizacion
FROM form_definitions;

-- =============================================================
-- 11. VERIFICACIÓN
-- =============================================================
SELECT 'procesos' AS tabla, COUNT(*) AS registros FROM procesos
UNION ALL SELECT 'etapas_proceso', COUNT(*) FROM etapas_proceso
UNION ALL SELECT 'expedientes', COUNT(*) FROM expedientes
UNION ALL SELECT 'documentos', COUNT(*) FROM documentos
UNION ALL SELECT 'historial_etapas', COUNT(*) FROM historial_etapas
UNION ALL SELECT 'tareas_asignadas', COUNT(*) FROM tareas_asignadas
UNION ALL SELECT 'form_definitions', COUNT(*) FROM form_definitions
UNION ALL SELECT 'form_responses', COUNT(*) FROM form_responses
UNION ALL SELECT 'contratistas_mirror', COUNT(*) FROM contratistas_mirror
UNION ALL SELECT 'areas_mirror', COUNT(*) FROM areas_mirror
UNION ALL SELECT 'usuarios_mirror', COUNT(*) FROM usuarios_mirror
ORDER BY 1;

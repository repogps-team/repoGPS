-- =============================================================
-- SEED DATA PARA DASHBOARDS DE GRAFANA
-- Genera ~200 expedientes, ~800 documentos, ~600 tareas,
-- ~1500 historial_etapas, ~3000 audit_events
--
-- USO: copiar y pegar en psql o pgAdmin conectado a cada DB.
-- Los bloques están marcados con commentarios [DB: nombre].
-- =============================================================

-- =============================================================
-- [DB: db_mantenedor] — Catálogos
-- =============================================================

-- Contratistas (IDs 1-8)
INSERT INTO contratistas (id, razon_social, rut, estado_activo) VALUES
(1, 'Constructora Andes SpA',   '76.123.456-K', true),
(2, 'Ingeniería Sur Ltda',      '77.234.567-L', true),
(3, 'GroupTech SAC',            '78.345.678-M', true),
(4, 'Consolidada Norte SpA',    '79.456.789-N', true),
(5, 'Servicios Integrales BP',  '80.567.890-P', true),
(6, 'Estudios Terra Ltda',      '81.678.901-Q', true),
(7, 'Constructora del Sur',     '82.789.012-R', true),
(8, 'Admin General SpA',        '83.890.123-S', true)
ON CONFLICT (id) DO UPDATE SET razon_social = EXCLUDED.razon_social;

SELECT setval('contratistas_id_seq', 8);

-- Áreas (IDs 1-12)
INSERT INTO areas (id, contratista_id, nombre, estado_activo) VALUES
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

SELECT setval('areas_id_seq', 12);

-- Disciplinas (IDs 1-12)
INSERT INTO disciplinas (id, area_id, nombre, estado_activo) VALUES
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
(12, 12, ' RRHH',                   true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

SELECT setval('disciplinas_id_seq', 12);

-- Categorías (IDs 1-6)
INSERT INTO categorias (id, nombre, descripcion, estado_activo) VALUES
(1, 'Seguridad',    'Documentos de seguridad y prevención',  true),
(2, 'Calidad',      'Gestión de calidad ISO',                true),
(3, 'Ingeniería',   'Documentos técnicos de ingeniería',     true),
(4, 'Legal',        'Documentos legales y contractuales',    true),
(5, 'Financiero',   'Documentos contables y financieros',    true),
(6, 'Operaciones',  'Documentos operacionales',              true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

SELECT setval('categorias_id_seq', 6);

-- Subtipos (IDs 1-15)
INSERT INTO subtipos (id, categoria_id, nombre, descripcion, estado_activo) VALUES
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

SELECT setval('subtipos_id_seq', 15);


-- =============================================================
-- [DB: db_usuarios] — Usuarios y Roles
-- =============================================================

-- Roles (ya existen: 1=Admin, 2=Revisor, 3=Aprobador, 4=Colaborador, 5=Visador)
-- Agregamos más usuarios (IDs 2-20, el 1 ya existe)
INSERT INTO usuarios (id, rol_id, nombre_completo, correo, password_hash, estado_activo) VALUES
(2,  2, 'María González',       'maria.gonzalez@gps.com',    'hash_pw', true),
(3,  3, 'Carlos Mendoza',       'carlos.mendoza@gps.com',    'hash_pw', true),
(4,  4, 'Ana Torres',           'ana.torres@gps.com',        'hash_pw', true),
(5,  5, 'Pedro Ramírez',        'pedro.ramirez@gps.com',     'hash_pw', true),
(6,  2, 'Lucía Fernández',      'lucia.fernandez@gps.com',   'hash_pw', true),
(7,  3, 'Jorge Castillo',       'jorge.castillo@gps.com',    'hash_pw', true),
(8,  4, 'Rosa Herrera',         'rosa.herrera@gps.com',      'hash_pw', true),
(9,  2, 'Diego Salazar',        'diego.salazar@gps.com',     'hash_pw', true),
(10, 3, 'Patricia Vargas',      'patricia.vargas@gps.com',   'hash_pw', true),
(11, 4, 'Fernando Ríos',        'fernando.rios@gps.com',     'hash_pw', true),
(12, 5, 'Carmen López',         'carmen.lopez@gps.com',      'hash_pw', true),
(13, 2, 'Andrés Morales',       'andres.morales@gps.com',    'hash_pw', true),
(14, 3, 'Isabel Contreras',     'isabel.contreras@gps.com',  'hash_pw', true),
(15, 4, 'Roberto Díaz',         'roberto.diaz@gps.com',      'hash_pw', true),
(16, 2, 'Verónica Silva',       'veronica.silva@gps.com',    'hash_pw', true),
(17, 3, 'Miguel Ángel Peña',    'miguel.pena@gps.com',       'hash_pw', true),
(18, 4, 'Daniela Rojas',        'daniela.rojas@gps.com',     'hash_pw', true),
(19, 5, 'Sergio Muñoz',         'sergio.munoz@gps.com',      'hash_pw', true),
(20, 2, 'Valentina Cruz',       'valentina.cruz@gps.com',    'hash_pw', true)
ON CONFLICT (id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo;

SELECT setval('usuarios_id_seq', 20);

-- usuario_area
INSERT INTO usuario_area (usuario_id, area_id) VALUES
(1, 1), (2, 1), (2, 2), (3, 1), (4, 3), (5, 3),
(6, 4), (7, 5), (8, 5), (9, 6), (10, 7), (11, 8),
(12, 9), (13, 10), (14, 11), (15, 12), (16, 2),
(17, 3), (18, 6), (19, 7), (20, 10);


-- =============================================================
-- COLUMNAS FALTANTES (agregar ANTES de los INSERTs)
-- =============================================================

-- contratista_id en expedientes
DO $$
BEGIN
    ALTER TABLE expedientes ADD COLUMN contratista_id INTEGER;
EXCEPTION WHEN duplicate_column THEN END $$;

-- tipo_etapa en etapas_proceso
DO $$
BEGIN
    ALTER TABLE etapas_proceso ADD COLUMN tipo_etapa VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN END $$;

-- accion y orden en historial_etapas
DO $$
BEGIN
    ALTER TABLE historial_etapas ADD COLUMN accion VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$
BEGIN
    ALTER TABLE historial_etapas ADD COLUMN orden INTEGER;
EXCEPTION WHEN duplicate_column THEN END $$;

-- completado en form_responses
DO $$
BEGIN
    ALTER TABLE form_responses ADD COLUMN completado BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN END $$;

-- Renombrar form_definition_id → formulario_id
DO $$
BEGIN
    ALTER TABLE form_responses RENAME COLUMN form_definition_id TO formulario_id;
EXCEPTION WHEN undefined_column THEN END $$;


-- =============================================================
-- [DB: db_expedientes] — Catálogos mirror + Procesos + Etapas
-- =============================================================

-- Mirrors (se asume que los IDs coinciden con db_mantenedor / db_usuarios)
INSERT INTO contratistas_mirror (id, razon_social, rut, estado_activo)
SELECT id, razon_social, rut, estado_activo FROM contratistas
ON CONFLICT (id) DO UPDATE SET razon_social = EXCLUDED.razon_social;

INSERT INTO areas_mirror (id, contratista_id, nombre, estado_activo)
SELECT id, contratista_id, nombre, estado_activo FROM areas
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO disciplinas_mirror (id, area_id, nombre, estado_activo)
SELECT id, area_id, nombre, estado_activo FROM disciplinas
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO categorias_mirror (id, nombre, descripcion, estado_activo)
SELECT id, nombre, descripcion, estado_activo FROM categorias
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO subtipos_mirror (id, categoria_id, nombre, descripcion, estado_activo)
SELECT id, categoria_id, nombre, descripcion, estado_activo FROM subtipos
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO usuarios_mirror (id, rol_id, nombre_completo, correo, estado_activo)
SELECT id, rol_id, nombre_completo, correo, estado_activo FROM usuarios
ON CONFLICT (id) DO UPDATE SET nombre_completo = EXCLUDED.nombre_completo;


-- Procesos (IDs 4-12, los 1-3 ya existen)
INSERT INTO procesos (id, area_id, nombre, descripcion, estado_activo) VALUES
(4,  1, 'Diseño Estructural',       'Flujo de diseño y revisión estructural',       true),
(5,  2, 'Control de Obras',         'Seguimiento y control de avance de obra',      true),
(6,  3, 'Revisión de Planos',       'Aprobación de planos constructivos',           true),
(7,  4, 'Auditoría ISO 9001',       'Proceso de auditoría de calidad',              true),
(8,  5, 'Desarrollo ERP',           'Ciclo de vida del desarrollo de software',     true),
(9,  6, 'Infraestructura Cloud',    'Provisionamiento y mantenimiento cloud',       true),
(10, 7, 'Cierre Contable',          'Cierre mensual y trimestral',                  true),
(11, 10, 'Estudio Geotécnico',      'Perforación y análisis de suelos',             true),
(12, 11, 'Habilitación Urbanística', 'Trámites de habilitación ante la municipality', true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

SELECT setval('procesos_id_seq', 12);


-- Etapas del proceso 4 (Diseño Estructural)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(4, 'Borrador',         1, false, NULL,        NULL),
(4, 'Revisión Técnica', 2, false, 'revision',  2),
(4, 'Aprobación Final', 3, true,  'aprobacion', 3);

-- Etapas del proceso 5 (Control de Obras)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(5, 'Ingreso',      1, false, NULL,        NULL),
(5, 'Verificación', 2, false, 'revision',  2),
(5, 'Visado',       3, false, 'visacion',  4),
(5, 'Cerrado',      4, true,  NULL,        NULL);

-- Etapas del proceso 6 (Revisión de Planos)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(6, 'Carga de Planos',  1, false, NULL,        NULL),
(6, 'Revisión',         2, false, 'revision',  2),
(6, 'Observaciones',    3, false, NULL,        NULL),
(6, 'Aprobado',         4, true,  'aprobacion', 3);

-- Etapas del proceso 7 (Auditoría ISO)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(7, 'Planificación',    1, false, NULL,        NULL),
(7, 'Ejecución',        2, false, 'revision',  2),
(7, 'Hallazgos',        3, false, NULL,        NULL),
(7, 'Certificación',    4, true,  'aprobacion', 3);

-- Etapas del proceso 8 (Desarrollo ERP)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(8, 'Backlog',      1, false, NULL,        NULL),
(8, 'En Desarrollo', 2, false, 'revision',  2),
(8, 'QA Testing',   3, false, 'visacion',  4),
(8, 'Deploy',       4, true,  'aprobacion', 3);

-- Etapas del proceso 9 (Infraestructura Cloud)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(9, 'Solicitud',     1, false, NULL,        NULL),
(9, 'Revisión',      2, false, 'revision',  2),
(9, 'Aprobación',    3, true,  'aprobacion', 3);

-- Etapas del proceso 10 (Cierre Contable)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(10, 'Preparación',   1, false, NULL,        NULL),
(10, 'Revisión',      2, false, 'revision',  2),
(10, 'Aprobación',    3, true,  'aprobacion', 3);

-- Etapas del proceso 11 (Estudio Geotécnico)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(11, 'Perforación',    1, false, NULL,        NULL),
(11, 'Análisis',       2, false, 'revision',  2),
(11, 'Informe Final',  3, true,  'aprobacion', 3);

-- Etapas del proceso 12 (Habilitación Urbanística)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(12, 'Documentación',  1, false, NULL,        NULL),
(12, 'Revisión Legal', 2, false, 'revision',  2),
(12, 'Presentación',   3, false, 'visacion',  4),
(12, 'Aprobado',       4, true,  'aprobacion', 3);


-- =============================================================
-- Expedientes (~200 registros distribuidos en 12 meses)
-- =============================================================

-- Helper: generar expedientes con fechas variadas usando generate_series
DO $$
DECLARE
    i INTEGER;
    proceso_id INTEGER;
    area_id_val INTEGER;
    disciplina_id INTEGER;
    subtipo_id_val INTEGER;
    titulo_base TEXT[];
    estado_aleatorio TEXT;
    etapa_id INTEGER;
    dias_atras INTEGER;
    fecha_cre TIMESTAMP;
    fecha_term DATE;
BEGIN
    titulo_base := ARRAY[
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
        -- Seleccionar proceso al azar (1-12)
        proceso_id := 1 + (i % 12);

        -- Mapear área según proceso
        CASE proceso_id
            WHEN 1 THEN area_id_val := 1;  disciplina_id := 1;  subtipo_id_val := 7;
            WHEN 2 THEN area_id_val := 2;  disciplina_id := 3;  subtipo_id_val := 1;
            WHEN 3 THEN area_id_val := 4;  disciplina_id := 6;  subtipo_id_val := 5;
            WHEN 4 THEN area_id_val := 3;  disciplina_id := 5;  subtipo_id_val := 6;
            WHEN 5 THEN area_id_val := 1;  disciplina_id := 2;  subtipo_id_val := 12;
            WHEN 6 THEN area_id_val := 3;  disciplina_id := 5;  subtipo_id_val := 6;
            WHEN 7 THEN area_id_val := 4;  disciplina_id := 6;  subtipo_id_val := 15;
            WHEN 8 THEN area_id_val := 5;  disciplina_id := 7;  subtipo_id_val := 13;
            WHEN 9 THEN area_id_val := 6;  disciplina_id := 9;  subtipo_id_val := 13;
            WHEN 10 THEN area_id_val := 8; disciplina_id := 12; subtipo_id_val := 10;
            WHEN 11 THEN area_id_val := 10; disciplina_id := 10; subtipo_id_val := 7;
            WHEN 12 THEN area_id_val := 11; disciplina_id := 11; subtipo_id_val := 12;
        END CASE;

        -- Fecha de creación: dispersa en los últimos 365 días
        dias_atras := (i * 37 + (i % 7) * 13) % 365;
        fecha_cre := NOW() - (dias_atras || ' days')::INTERVAL
                     + ((i % 24) || ' hours')::INTERVAL
                     + ((i % 60) || ' minutes')::INTERVAL;

        -- ~60% terminados, ~25% en desarrollo, ~15% pendientes
        IF i % 10 < 6 THEN
            estado_aleatorio := 'terminado';
            fecha_term := (fecha_cre + ((5 + (i % 20)) || ' days')::INTERVAL)::DATE;
            -- Etapa final del proceso
            SELECT id INTO etapa_id FROM etapas_proceso
            WHERE proceso_id = proceso_id AND es_final = true LIMIT 1;
        ELSIF i % 10 < 8 THEN
            estado_aleatorio := 'desarrollo';
            fecha_term := NULL;
            -- Etapa intermedia
            SELECT id INTO etapa_id FROM etapas_proceso
            WHERE proceso_id = proceso_id AND es_final = false
            ORDER BY orden DESC LIMIT 1;
        ELSE
            estado_aleatorio := 'pendiente';
            fecha_term := NULL;
            -- Primera etapa
            SELECT id INTO etapa_id FROM etapas_proceso
            WHERE proceso_id = proceso_id ORDER BY orden LIMIT 1;
        END IF;

        INSERT INTO expedientes (id, proceso_id, disciplina_id, subtipo_id,
                                  etapa_actual_id, titulo, descripcion,
                                  fecha_creacion, fecha_termino, estado_activo)
        VALUES (
            i, proceso_id, disciplina_id, subtipo_id_val,
            etapa_id,
            titulo_base[(i % array_length(titulo_base, 1)) + 1] || ' #' || i,
            'Expediente generado para pruebas de dashboard — ' || estado_aleatorio,
            fecha_cre, fecha_term, true
        );
    END LOOP;

    PERFORM setval('expedientes_id_seq', 200);
END $$;

-- Poblar contratista_id derivado del área → proceso → contratista
UPDATE expedientes e
SET contratista_id = am.contratista_id
FROM procesos p
JOIN areas_mirror am ON p.area_id = am.id
WHERE e.proceso_id = p.id AND e.contratista_id IS NULL;


-- =============================================================
-- Documentos (~800 registros)
-- =============================================================

DO $$
DECLARE
    i INTEGER;
    exp_id INTEGER;
    mime_types TEXT[];
    mime TEXT;
    sizes INTEGER[];
    sz INTEGER;
    nombres_doc TEXT[];
    nombre_doc TEXT;
BEGIN
    mime_types := ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/csv'
    ];
    sizes := ARRAY[51200, 128000, 256000, 512000, 1024000, 2048576, 4096000, 8192000];
    nombres_doc := ARRAY[
        'informe_tecnico', 'planos', 'memoria_calculo', 'checklist',
        'contrato', 'factura', 'balance', 'presentacion',
        'foto_obra', 'bitacora', 'procedimiento', 'certificado'
    ];

    FOR i IN 1..800 LOOP
        exp_id := ((i - 1) % 200) + 1;
        mime := mime_types[(i % array_length(mime_types, 1)) + 1];
        sz := sizes[(i % array_length(sizes, 1)) + 1];
        nombre_doc := nombres_doc[(i % array_length(nombres_doc, 1)) + 1];

        INSERT INTO documentos (id, expediente_id, nombre_archivo, ruta_archivo,
                                 tipo_mime, tamano_bytes, fecha_upload, estado_activo)
        VALUES (
            i, exp_id,
            nombre_doc || '_' || i || CASE
                WHEN mime = 'application/pdf' THEN '.pdf'
                WHEN mime LIKE '%wordprocessingml%' THEN '.docx'
                WHEN mime LIKE '%spreadsheetml%' THEN '.xlsx'
                WHEN mime = 'image/jpeg' THEN '.jpg'
                WHEN mime LIKE '%presentationml%' THEN '.pptx'
                ELSE '.csv'
            END,
            '/uploads/expedientes/' || exp_id || '/' || nombre_doc || '_' || i || '.file',
            mime,
            sz + (i % 50000),
            (SELECT fecha_creacion FROM expedientes WHERE id = exp_id)
                + ((i % 30) || ' days')::INTERVAL
                + ((i % 24) || ' hours')::INTERVAL,
            true
        );
    END LOOP;

    PERFORM setval('documentos_id_seq', 800);
END $$;


-- =============================================================
-- Historial de etapas (~1500 registros)
-- =============================================================

DO $$
DECLARE
    i INTEGER;
    exp_id INTEGER;
    etapas RECORD;
    prev_id INTEGER;
    curr_id INTEGER;
    usuario INTEGER;
    fecha_base TIMESTAMP;
    j INTEGER;
BEGIN
    FOR i IN 1..200 LOOP
        SELECT fecha_creacion INTO fecha_base FROM expedientes WHERE id = i;

        -- Recorrer las etapas del proceso de este expediente
        prev_id := NULL;
        j := 0;
        FOR etapas IN
            SELECT ep.id, ep.orden
            FROM etapas_proceso ep
            WHERE ep.proceso_id = (SELECT proceso_id FROM expedientes WHERE id = i)
            ORDER BY ep.orden
        LOOP
            curr_id := etapas.id;
            usuario := 1 + ((i + j) % 20);

            IF prev_id IS NOT NULL THEN
                INSERT INTO historial_etapas (id, expediente_id, etapa_anterior_id,
                                               etapa_nueva_id, usuario_id, fecha_cambio, observacion)
                VALUES (
                    (i - 1) * 8 + j,
                    i, prev_id, curr_id, usuario,
                    fecha_base + (j || ' days')::INTERVAL + ((j * 3) || ' hours')::INTERVAL,
                    'Movimiento de etapa ' || j
                );
                j := j + 1;
            END IF;

            prev_id := curr_id;

            -- Limitar a 6 movimientos por expediente
            EXIT WHEN j >= 6;
        END LOOP;
    END LOOP;

    PERFORM setval('historial_etapas_id_seq', 1500);
END $$;

-- Poblar columnas nuevas en historial_etapas
UPDATE historial_etapas SET accion = 'avanzar' WHERE accion IS NULL;
UPDATE historial_etapas SET accion = 'rechazar' WHERE id % 7 = 0;
UPDATE historial_etapas h SET orden = ep.orden
FROM etapas_proceso ep WHERE h.etapa_nueva_id = ep.id AND h.orden IS NULL;


-- =============================================================
-- Tareas asignadas (~600 registros)
-- =============================================================

DO $$
DECLARE
    i INTEGER;
    exp_id INTEGER;
    etapa_id INTEGER;
    usuario INTEGER;
    tipo TEXT;
    estado TEXT;
    fecha_asig TIMESTAMP;
    fecha_fin TIMESTAMP;
BEGIN
    FOR i IN 1..600 LOOP
        exp_id := ((i - 1) % 200) + 1;

        -- Seleccionar una etapa intermedia (no primera ni última)
        SELECT ep.id INTO etapa_id
        FROM etapas_proceso ep
        WHERE ep.proceso_id = (SELECT proceso_id FROM expedientes WHERE id = exp_id)
          AND ep.tipo_tarea IS NOT NULL
        ORDER BY RANDOM() LIMIT 1;

        IF etapa_id IS NULL THEN
            CONTINUE;
        END IF;

        usuario := 1 + (i % 20);
        tipo := (ARRAY['revision', 'aprobacion', 'visacion'])[1 + (i % 3)];

        -- 45% completadas, 35% pendientes, 15% visto, 5% rechazadas
        IF i % 20 < 9 THEN
            estado := 'completada';
            fecha_asig := NOW() - ((i * 2 + 10) || ' days')::INTERVAL;
            fecha_fin := fecha_asig + ((1 + (i % 5)) || ' days')::INTERVAL;
        ELSIF i % 20 < 16 THEN
            estado := 'pendiente';
            fecha_asig := NOW() - ((i % 15) || ' days')::INTERVAL;
            fecha_fin := NULL;
        ELSIF i % 20 < 19 THEN
            estado := 'visto';
            fecha_asig := NOW() - ((i % 20) || ' days')::INTERVAL;
            fecha_fin := NULL;
        ELSE
            estado := 'rechazada';
            fecha_asig := NOW() - ((i % 10) || ' days')::INTERVAL;
            fecha_fin := fecha_asig + ((i % 3) || ' days')::INTERVAL;
        END IF;

        INSERT INTO tareas_asignadas (id, expediente_id, etapa_id, usuario_id,
                                       tipo_tarea, estado, fecha_asignacion,
                                       fecha_visto, fecha_termino, observacion)
        VALUES (
            i, exp_id, etapa_id, usuario, tipo, estado,
            fecha_asig,
            CASE WHEN estado IN ('visto', 'completada', 'rechazada')
                 THEN fecha_asig + ((i % 48) || ' hours')::INTERVAL ELSE NULL END,
            fecha_fin,
            'Tarea de prueba #' || i
        );
    END LOOP;

    PERFORM setval('tareas_asignadas_id_seq', 600);
END $$;


-- =============================================================
-- Formularios dinámicos
-- =============================================================

-- form_definitions (ya puede existir la tabla formularios; usar UPSERT)
-- Si la tabla se llama form_definitions:
INSERT INTO form_definitions (id, nombre, descripcion, schema, estado_activo, creado_por) VALUES
(1, 'Checklist de Seguridad',  'Control diario de EPP y zonas', '{"components":[]}'::JSONB, true, 1),
(2, 'Encuesta de Satisfacción', 'Feedback de clientes internos', '{"components":[]}'::JSONB, true, 1),
(3, 'Formulario de Incidentes', 'Reporte de incidentes y cuasi-accidentes', '{"components":[]}'::JSONB, true, 2),
(4, 'Evaluación de Proveedor',  'Score de desempeño de proveedores', '{"components":[]}'::JSONB, true, 3),
(5, 'Registro de Capacitación', 'Control de asistencia a capacitaciones', '{"components":[]}'::JSONB, true, 1)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;

SELECT setval('form_definitions_id_seq', 5);

-- form_responses (~200 registros)
DO $$
DECLARE
    i INTEGER;
    form_id INTEGER;
    exp_id INTEGER;
    usr_id INTEGER;
    completado BOOLEAN;
    fecha TIMESTAMP;
BEGIN
    FOR i IN 1..200 LOOP
        form_id := 1 + (i % 5);
        exp_id := 1 + ((i - 1) % 200);
        usr_id := 1 + (i % 20);
        completado := (i % 10 < 8);  -- 80% completados
        fecha := NOW() - ((i * 3 + 5) || ' days')::INTERVAL + ((i % 24) || ' hours')::INTERVAL;

        INSERT INTO form_responses (id, formulario_id, expediente_id, usuario_id,
                                     data, fecha_envio, estado)
        VALUES (
            i, form_id, exp_id, usr_id,
            ('{"completado": ' || completado || ', "respuestas": {"campo1": "valor' || i || '"}}')::JSONB,
            fecha,
            CASE WHEN completado THEN 'completado' ELSE 'pendiente' END
        );
    END LOOP;

    PERFORM setval('form_responses_id_seq', 200);
END $$;

-- Poblar completado desde estado
UPDATE form_responses SET completado = (estado = 'completado');

-- Poblar tipo_etapa en etapas_proceso
UPDATE etapas_proceso SET tipo_etapa = CASE
    WHEN es_final THEN 'final'
    WHEN orden = 1 THEN 'inicio'
    ELSE 'desarrollo'
END WHERE tipo_etapa IS NULL;


-- =============================================================
-- [DB: db_auditoria] — Audit Events (~3000 registros)
-- =============================================================

DO $$
DECLARE
    i INTEGER;
    accion TEXT;
    entidad TEXT;
    usr_id INTEGER;
    usr_nombre TEXT;
    fecha TIMESTAMP;
    ip TEXT;
    acciones TEXT[];
    entidades TEXT[];
BEGIN
    acciones := ARRAY[
        'LOGIN', 'LOGOUT', 'VIEW', 'CREATE', 'UPDATE', 'DELETE',
        'UPLOAD', 'DOWNLOAD', 'ADVANCE', 'REJECT', 'ASSIGN',
        'RESPOND', 'EXPORT', 'SEARCH'
    ];
    entidades := ARRAY[
        'expediente', 'documento', 'tarea', 'formulario',
        'area', 'contratista', 'proceso', 'rol', 'usuario'
    ];
    usr_nombre := ARRAY[
        'Admin Prueba', 'María González', 'Carlos Mendoza', 'Ana Torres',
        'Pedro Ramírez', 'Lucía Fernández', 'Jorge Castillo', 'Rosa Herrera',
        'Diego Salazar', 'Patricia Vargas', 'Fernando Ríos', 'Carmen López',
        'Andrés Morales', 'Isabel Contreras', 'Roberto Díaz', 'Verónica Silva',
        'Miguel Ángel Peña', 'Daniela Rojas', 'Sergio Muñoz', 'Valentina Cruz'
    ];

    FOR i IN 1..3000 LOOP
        accion := acciones[(i % array_length(acciones, 1)) + 1];
        entidad := entidades[(i % array_length(entidades, 1)) + 1];
        usr_id := 1 + (i % 20);

        -- Dispersar en últimos 365 días, con más actividad en meses recientes
        fecha := NOW() - (((365 - (i % 300)) * 0.8 + (i % 60)) || ' days')::INTERVAL
                 + ((i % 24) || ' hours')::INTERVAL
                 + ((i % 60) || ' minutes')::INTERVAL;

        ip := '192.168.1.' || (10 + (i % 200));

        INSERT INTO audit_events (id, fecha, usuario_id, usuario_nombre,
                                   accion, entidad, entidad_id, entidad_nombre,
                                   valor_anterior, valor_nuevo, ip)
        VALUES (
            i, fecha, usr_id, usr_nombre[usr_id],
            accion, entidad, 1 + (i % 200),
            entidad || ' #' || (1 + (i % 200)),
            CASE WHEN accion IN ('UPDATE', 'DELETE', 'REJECT')
                 THEN ('{"estado": "anterior"}')::JSONB ELSE NULL END,
            CASE WHEN accion IN ('CREATE', 'UPDATE', 'ADVANCE')
                 THEN ('{"estado": "nuevo"}')::JSONB ELSE NULL END,
            ip
        );
    END LOOP;

    PERFORM setval('audit_events_id_seq', 3000);
END $$;


-- =============================================================
-- VISTAS DE COMPATIBILIDAD
-- =============================================================

DROP VIEW IF EXISTS formularios;
CREATE OR REPLACE VIEW formularios AS
SELECT id, nombre, descripcion, schema, estado_activo, creado_por,
       fecha_creacion, fecha_actualizacion
FROM form_definitions;


-- =============================================================
-- Verificación rápida
-- =============================================================
SELECT 'db_expedientes' AS base, 'procesos' AS tabla, COUNT(*) AS registros FROM procesos
UNION ALL SELECT 'db_expedientes', 'etapas_proceso', COUNT(*) FROM etapas_proceso
UNION ALL SELECT 'db_expedientes', 'expedientes', COUNT(*) FROM expedientes
UNION ALL SELECT 'db_expedientes', 'documentos', COUNT(*) FROM documentos
UNION ALL SELECT 'db_expedientes', 'historial_etapas', COUNT(*) FROM historial_etapas
UNION ALL SELECT 'db_expedientes', 'tareas_asignadas', COUNT(*) FROM tareas_asignadas
UNION ALL SELECT 'db_expedientes', 'form_definitions', COUNT(*) FROM form_definitions
UNION ALL SELECT 'db_expedientes', 'form_responses', COUNT(*) FROM form_responses
UNION ALL SELECT 'db_expedientes', 'usuarios_mirror', COUNT(*) FROM usuarios_mirror
UNION ALL SELECT 'db_expedientes', 'contratistas_mirror', COUNT(*) FROM contratistas_mirror
UNION ALL SELECT 'db_expedientes', 'areas_mirror', COUNT(*) FROM areas_mirror
UNION ALL SELECT 'db_auditoria', 'audit_events', COUNT(*) FROM audit_events
ORDER BY 1, 2;

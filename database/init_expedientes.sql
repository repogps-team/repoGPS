-- ******************************************************
-- MICROSERVICIO: db_expedientes
-- Gestion de Workflows y Expedientes
-- ******************************************************

-- Procesos (relacion logica con areas via area_id)
CREATE TABLE procesos (
    id SERIAL PRIMARY KEY,
    area_id INTEGER NOT NULL, -- Soft FK hacia db_mantenedores.areas
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado_activo BOOLEAN DEFAULT true
);

-- Etapas de cada proceso
-- El rol_id indica que rol recibe la tarea en esa etapa
CREATE TABLE etapas_proceso (
    id SERIAL PRIMARY KEY,
    proceso_id INTEGER REFERENCES procesos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    orden INTEGER NOT NULL, -- posicion de la etapa en el flujo
    es_final BOOLEAN DEFAULT false, -- etapa final = expediente cerrado
    tipo_tarea VARCHAR(50), -- 'revision', 'aprobacion', 'visacion', NULL si no requiere tarea
    rol_id INTEGER REFERENCES db_usuarios.roles(id), -- rol que recibe la tarea en esta etapa
    estado_activo BOOLEAN DEFAULT true
);

-- Tabla central de expedientes
CREATE TABLE expedientes (
    id SERIAL PRIMARY KEY,
    proceso_id INTEGER REFERENCES procesos(id),
    disciplina_id INTEGER NOT NULL, -- Soft FK hacia db_mantenedores.disciplinas
    subtipo_id INTEGER, -- Soft FK hacia db_mantenedores.subtipos
    etapa_actual_id INTEGER REFERENCES etapas_proceso(id),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_termino DATE,
    estado_activo BOOLEAN DEFAULT true
);

-- Documentos adjuntos a expediente
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100),
    tamano_bytes INTEGER,
    fecha_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_activo BOOLEAN DEFAULT true
);

-- Historial de cambios de etapa (trazabilidad)
CREATE TABLE historial_etapas (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
    etapa_anterior_id INTEGER REFERENCES etapas_proceso(id),
    etapa_nueva_id INTEGER REFERENCES etapas_proceso(id),
    usuario_id INTEGER NOT NULL, -- Soft FK hacia db_usuarios.usuarios
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT
);

-- Tareas asignadas a usuarios por rol+area
-- Se generan automaticamente al cambiar de etapa
-- Cada usuario ve SOLO sus tareas (filtradas por rol en el query)
CREATE TABLE tareas_asignadas (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
    etapa_id INTEGER REFERENCES etapas_proceso(id), -- etapa que genero la tarea
    usuario_id INTEGER REFERENCES db_usuarios.usuarios(id), -- usuario que recibe la tarea
    tipo_tarea VARCHAR(50) NOT NULL, -- 'revision', 'aprobacion', 'visacion'
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, visto, completada, rechazada
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_visto TIMESTAMP,
    fecha_termino TIMESTAMP,
    observacion TEXT
);

-- ******************************************************
-- Datos de ejemplo iniciales
-- ******************************************************

-- Procesos de ejemplo
INSERT INTO procesos (area_id, nombre, descripcion) VALUES
(1, 'Aprobacion de Estudios', 'Flujo para aprobar estudios tecnicos'),
(1, 'Revision de Seguridad', 'Flujo de revision de documentos de seguridad'),
(2, 'Certificacion Contable', 'Flujo de certificacion de documentos contables');

-- Etapas del proceso 1 (Aprobacion de Estudios)
-- rol_id: 2=Revisor, 3=Aprobador
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(1, 'Pendiente', 1, false, NULL, NULL),
(1, 'En Revision', 2, false, 'revision', 2),
(1, 'En Aprobacion', 3, false, 'aprobacion', 3),
(1, 'Aprobado', 4, true, NULL, NULL);

-- Etapas del proceso 2 (Revision de Seguridad)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(2, 'Pendiente', 1, false, NULL, NULL),
(2, 'En Revision Tecnica', 2, false, 'revision', 2),
(2, 'Visado', 3, false, 'visacion', 4),
(2, 'Aprobado', 4, true, NULL, NULL);

-- Etapas del proceso 3 (Certificacion Contable)
INSERT INTO etapas_proceso (proceso_id, nombre, orden, es_final, tipo_tarea, rol_id) VALUES
(3, 'Pendiente', 1, false, NULL, NULL),
(3, 'En Auditoria', 2, false, 'revision', 2),
(3, 'Certificado', 3, true, 'aprobacion', 3);

-- Expedientes de ejemplo
INSERT INTO expedientes (proceso_id, disciplina_id, subtipo_id, etapa_actual_id, titulo, descripcion) VALUES
(1, 1, 7, 4, 'Estudio de Suelos - Edificio A', 'Estudio geotecnico para edificio de 5 pisos'),
(2, 2, 1, 3, 'Charla Seguridad Abril', 'Charla mensual de seguridad'),
(3, 4, 5, 2, 'Estado Financiero Q1', 'Estados financieros del primer trimestre');

-- Documentos de ejemplo
INSERT INTO documentos (expediente_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes) VALUES
(1, 'suelo_edificio_a.pdf', '/uploads/expedientes/1/suelo_edificio_a.pdf', 'application/pdf', 2048576),
(1, 'memoria_calculo.pdf', '/uploads/expedientes/1/memoria_calculo.pdf', 'application/pdf', 1024000),
(2, 'presentacion_seguridad.pptx', '/uploads/expedientes/2/presentacion.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 512000),
(3, 'balance_q1.xlsx', '/uploads/expedientes/3/balance_q1.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 256000);

-- Historial de ejemplo
INSERT INTO historial_etapas (expediente_id, etapa_anterior_id, etapa_nueva_id, usuario_id, observacion) VALUES
(1, 1, 2, 1, 'Expediente creado y en revision'),
(1, 2, 3, 1, 'Revision tecnica completada'),
(1, 3, 4, 2, 'Aprobado para construccion');

-- Tareas de ejemplo
INSERT INTO tareas_asignadas (expediente_id, etapa_id, usuario_id, tipo_tarea, estado, observacion) VALUES
(2, 3, 3, 'visacion', 'pendiente', 'Visar Charla de Seguridad Abril'),
(3, 2, 2, 'revision', 'completada', 'Auditoria completada');

-- ******************************************************
-- FORMULARIOS DINAMICOS (FormIO)
-- ******************************************************

-- Definiciones de formularios (admin crea con drag-and-drop)
CREATE TABLE form_definitions (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    schema JSONB NOT NULL,  -- FormIO form schema JSON
    estado_activo BOOLEAN DEFAULT true,
    creado_por INTEGER REFERENCES db_usuarios.usuarios(id),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asignacion de formularios a expedientes
CREATE TABLE form_assignments (
    id SERIAL PRIMARY KEY,
    form_definition_id INTEGER REFERENCES form_definitions(id) ON DELETE CASCADE,
    expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
    creado_por INTEGER REFERENCES db_usuarios.usuarios(id),
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(form_definition_id, expediente_id)
);

-- Respuestas de formularios
CREATE TABLE form_responses (
    id SERIAL PRIMARY KEY,
    form_definition_id INTEGER REFERENCES form_definitions(id) ON DELETE CASCADE,
    expediente_id INTEGER REFERENCES expedientes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES db_usuarios.usuarios(id),
    data JSONB NOT NULL,  -- FormIO submission data
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'completado'
);

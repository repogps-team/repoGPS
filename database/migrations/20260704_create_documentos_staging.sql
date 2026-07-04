-- =====================================================
-- MIGRATION: Create documentos_staging table
-- Carga masiva: zona de estadiaje para documentos
-- antes de asignarlos a un expediente
-- =====================================================

CREATE TABLE IF NOT EXISTS documentos_staging (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,           -- FK lógico hacia db_usuarios.usuarios
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_garage VARCHAR(500) NOT NULL,     -- key en GarageHQ (S3)
    tipo_mime VARCHAR(100),
    tamano_bytes BIGINT,
    fecha_origen TIMESTAMP,                -- lastModified del archivo original
    fecha_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, subiendo, completado, error
    expediente_asignado_id INTEGER,        -- NULL = sin asignar, set al asignar
    fecha_asignacion TIMESTAMP,
    estado_activo BOOLEAN DEFAULT true
);

-- Índices para query de listing y filtrado
CREATE INDEX IF NOT EXISTS idx_staging_usuario ON documentos_staging(usuario_id) WHERE estado_activo = true;
CREATE INDEX IF NOT EXISTS idx_staging_estado ON documentos_staging(estado) WHERE estado_activo = true;
CREATE INDEX IF NOT EXISTS idx_staging_nombre ON documentos_staging(nombre_archivo);

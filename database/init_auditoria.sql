CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER,
    usuario_nombre VARCHAR(100),
    usuario_email VARCHAR(100),
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id INTEGER,
    entidad_nombre VARCHAR(200),
    valor_anterior JSONB,
    valor_nuevo JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    metadata JSONB
);

-- Indexes for Grafana query patterns
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_events(fecha);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_events(usuario_id);
CREATE INDEX IF NOT EXISTS idx_accion_entidad ON audit_events(accion, entidad);
CREATE INDEX IF NOT EXISTS idx_audit_entidad_id ON audit_events(entidad, entidad_id);
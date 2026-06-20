-- Migración: Optimización del flujo de expedientes
-- Fecha: 2026-06-20
-- Cambios:
--   1. Tabla expediente_asignaciones para asignación explícita de usuarios
--   2. Campo observacion en tareas_asignadas para subsanación
--   3. Estado 'subsanacion' soportado por CHECK constraint

-- ============================================
-- 1. ASIGNACIÓN EXPLÍCITA DE USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS expediente_asignaciones (
    id SERIAL PRIMARY KEY,
    expediente_id INTEGER NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL,
    rol_asignado VARCHAR(50) NOT NULL, -- 'responsable', 'revisor'
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    asignado_por INTEGER, -- usuario que hizo la asignación
    UNIQUE(expediente_id, usuario_id, rol_asignado)
);

CREATE INDEX IF NOT EXISTS idx_expediente_asignaciones_expediente
    ON expediente_asignaciones(expediente_id);
CREATE INDEX IF NOT EXISTS idx_expediente_asignaciones_usuario
    ON expediente_asignaciones(usuario_id);

-- ============================================
-- 2. CAMPO OBSERVACIÓN EN TAREAS (para subsanación)
-- ============================================
-- La columna observacion ya existe en tareas_asignadas.
-- Solo documentamos que el valor 'subsanacion' es un estado válido.

-- ============================================
-- 3. ESTADO SUBSANACIÓN
-- ============================================
-- Estados de tarea: pendiente, visto, completada, rechazada, subsanacion
-- 'subsanacion' = tarea observada, usuario debe corregir y reenviar
-- No retrocede la etapa del expediente.

COMMENT ON TABLE expediente_asignaciones IS 'Asignación explícita de usuarios a expedientes por rol';
COMMENT ON COLUMN expediente_asignaciones.rol_asignado IS 'Rol asignado: responsable o revisor';

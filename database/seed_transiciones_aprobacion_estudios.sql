-- =============================================================
-- TRANSICIONES POR ROL — Proceso 1: Aprobación de Estudios
-- =============================================================
-- Etapas del proceso 1:
--   orden 1 = Pendiente       (etapa_id = obtener por proceso_id=1, orden=1)
--   orden 2 = En Revisión     (etapa_id = obtener por proceso_id=1, orden=2)
--   orden 3 = En Aprobación   (etapa_id = obtener por proceso_id=1, orden=3)
--   orden 4 = Aprobado        (etapa_id = obtener por proceso_id=1, orden=4)
-- Roles: 1=Admin, 2=Revisor, 3=Aprobador
-- =============================================================

-- 1. Admin puede hacer CUALQUIER transición (cortesía / override)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT
    1,
    f.id,
    t.id,
    1
FROM etapas_proceso f
CROSS JOIN etapas_proceso t
WHERE f.proceso_id = 1 AND t.proceso_id = 1
  AND f.id <> t.id
  AND f.orden < t.orden   -- solo avances para admin (los rechazos se manejan aparte)
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- 2. Revisor: Pendiente → En Revisión (iniciar revisión)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT 1, f.id, t.id, 2
FROM etapas_proceso f, etapas_proceso t
WHERE f.proceso_id = 1 AND f.orden = 1
  AND t.proceso_id = 1 AND t.orden = 2
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- 3. Revisor: En Revisión → En Aprobación (enviar a aprobar)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT 1, f.id, t.id, 2
FROM etapas_proceso f, etapas_proceso t
WHERE f.proceso_id = 1 AND f.orden = 2
  AND t.proceso_id = 1 AND t.orden = 3
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- 4. Revisor: En Revisión → Pendiente (rechazar / devolver)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT 1, f.id, t.id, 2
FROM etapas_proceso f, etapas_proceso t
WHERE f.proceso_id = 1 AND f.orden = 2
  AND t.proceso_id = 1 AND t.orden = 1
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- 5. Aprobador: En Aprobación → Aprobado (aprobar definitivamente)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT 1, f.id, t.id, 3
FROM etapas_proceso f, etapas_proceso t
WHERE f.proceso_id = 1 AND f.orden = 3
  AND t.proceso_id = 1 AND t.orden = 4
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- 6. Aprobador: En Aprobación → En Revisión (rechazar / devolver a revisión)
INSERT INTO transiciones_permitidas (proceso_id, etapa_from_id, etapa_to_id, rol_id)
SELECT 1, f.id, t.id, 3
FROM etapas_proceso f, etapas_proceso t
WHERE f.proceso_id = 1 AND f.orden = 3
  AND t.proceso_id = 1 AND t.orden = 2
ON CONFLICT (proceso_id, etapa_from_id, etapa_to_id, rol_id) DO NOTHING;

-- =============================================================
-- Verificación: ver todas las transiciones del proceso 1
-- =============================================================
SELECT
    tp.orden AS desde_orden,
    f.nombre AS desde_etapa,
    t.orden  AS hasta_orden,
    t.nombre AS hasta_etapa,
    r.id     AS rol_id,
    CASE r.id
        WHEN 1 THEN 'Administrador'
        WHEN 2 THEN 'Revisor'
        WHEN 3 THEN 'Aprobador'
    END AS rol_nombre
FROM transiciones_permitidas tp
JOIN etapas_proceso f ON f.id = tp.etapa_from_id
JOIN etapas_proceso t ON t.id = tp.etapa_to_id
LEFT JOIN roles r ON r.id = tp.rol_id
WHERE tp.proceso_id = 1
ORDER BY tp.rol_id, tp.etapa_from_id;

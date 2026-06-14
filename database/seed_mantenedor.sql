-- =============================================================
-- SEED: db_mantenedor — Catálogos
-- Ejecutar: docker exec db_mantenedor psql -U postgres -d db_mantenedor -f /tmp/seed_mantenedor.sql
-- =============================================================

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
SELECT setval('contratistas_id_seq', (SELECT MAX(id) FROM contratistas));

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
SELECT setval('areas_id_seq', (SELECT MAX(id) FROM areas));

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
(12, 12, 'RRHH',                    true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
SELECT setval('disciplinas_id_seq', (SELECT MAX(id) FROM disciplinas));

INSERT INTO categorias (id, nombre, descripcion, estado_activo) VALUES
(1, 'Seguridad',    'Documentos de seguridad y prevención',  true),
(2, 'Calidad',      'Gestión de calidad ISO',                true),
(3, 'Ingeniería',   'Documentos técnicos de ingeniería',     true),
(4, 'Legal',        'Documentos legales y contractuales',    true),
(5, 'Financiero',   'Documentos contables y financieros',    true),
(6, 'Operaciones',  'Documentos operacionales',              true)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre;
SELECT setval('categorias_id_seq', (SELECT MAX(id) FROM categorias));

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
SELECT setval('subtipos_id_seq', (SELECT MAX(id) FROM subtipos));

-- Verificación
SELECT 'contratistas' AS tabla, COUNT(*) AS registros FROM contratistas
UNION ALL SELECT 'areas', COUNT(*) FROM areas
UNION ALL SELECT 'disciplinas', COUNT(*) FROM disciplinas
UNION ALL SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL SELECT 'subtipos', COUNT(*) FROM subtipos;

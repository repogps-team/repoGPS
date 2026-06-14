-- =============================================================
-- SEED: db_usuarios — Usuarios y Roles
-- Ejecutar: docker exec db_usuarios psql -U postgres -d db_usuarios -f /tmp/seed_usuarios.sql
-- =============================================================

-- Roles ya existen (1-5). Solo agregamos usuarios (el ID 1 ya existe).
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
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

INSERT INTO usuario_area (usuario_id, area_id) VALUES
(1, 1), (2, 1), (2, 2), (3, 1), (4, 3), (5, 3),
(6, 4), (7, 5), (8, 5), (9, 6), (10, 7), (11, 8),
(12, 9), (13, 10), (14, 11), (15, 12), (16, 2),
(17, 3), (18, 6), (19, 7), (20, 10)
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'usuario_area', COUNT(*) FROM usuario_area;

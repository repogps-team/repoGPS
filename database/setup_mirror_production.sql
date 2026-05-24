-- ******************************************************
-- SQL para producción: Crear tablas espejo en db_expedientes
-- Ejecutar via: docker exec -i db_expedientes psql -U postgres -d db_expedientes < database/setup_mirror_production.sql
-- ******************************************************

CREATE TABLE IF NOT EXISTS contratistas_mirror (
    id INTEGER PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    rut VARCHAR(20) NOT NULL,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS areas_mirror (
    id INTEGER PRIMARY KEY,
    contratista_id INTEGER,
    nombre VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disciplinas_mirror (
    id INTEGER PRIMARY KEY,
    area_id INTEGER,
    nombre VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias_mirror (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subtipos_mirror (
    id INTEGER PRIMARY KEY,
    categoria_id INTEGER,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios_mirror (
    id INTEGER PRIMARY KEY,
    rol_id INTEGER,
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    estado_activo BOOLEAN DEFAULT true,
    fecha_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

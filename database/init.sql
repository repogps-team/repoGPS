CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    estado_activo BOOLEAN DEFAULT true
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER REFERENCES roles(id),
    nombre_completo VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    estado_activo BOOLEAN DEFAULT true,
    token_activacion VARCHAR(255),
    token_expira_at TIMESTAMP
);

-- Tabla usuario_area con Soft Foreign Key
-- area_id es solo INTEGER, sin restricción FK física hacia la otra DB
CREATE TABLE usuario_area (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    area_id INTEGER
);

-- Roles iniciales
INSERT INTO roles (nombre) VALUES 
('Administrador'), 
('Revisor'), 
('Aprobador'), 
('Colaborador'), 
('Visador');

INSERT INTO usuarios (rol_id, nombre_completo, correo, password_hash)
VALUES (1, 'Admin Prueba', 'admin@gps.com', '123456');
-- ******************************************************
-- MICROSERVICIO: db_notificaciones
-- Gestion de notificaciones y envio de emails
-- ******************************************************

CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',  -- pendiente | enviado | error
    intentos INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    enviado_at TIMESTAMP
);

CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER REFERENCES eventos(id),
    para VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',  -- pendiente | enviado | fallido
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    enviado_at TIMESTAMP
);

CREATE INDEX idx_eventos_tipo ON eventos(tipo);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_email_logs_estado ON email_logs(estado);

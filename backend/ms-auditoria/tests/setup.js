/**
 * Global test setup for ms-auditoria
 */
process.env.NODE_ENV = 'test';
process.env.DB_USER = 'test';
process.env.DB_HOST = 'test';
process.env.DB_NAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_PORT = 5432;
process.env.PORT = 3004;
process.env.MS_AUDITORIA_URL = 'http://localhost:3004';
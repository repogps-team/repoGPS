/**
 * Global test setup for ms-usuarios
 * Sets environment variables before any test code runs.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'repoGPS_jwt_secret_key_2026';
process.env.DB_USER = 'test';
process.env.DB_HOST = 'test';
process.env.DB_NAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_PORT = 5432;
process.env.MS_MANTENEDOR_URL = 'http://test-mantenedor:3001';

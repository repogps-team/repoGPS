/**
 * Global test setup for ms-expedientes
 * Sets environment variables before any test code runs.
 * NOTE: `jest` globals are NOT available here — env vars only.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'repoGPS_jwt_secret_key_2026';
process.env.DB_USER = 'test';
process.env.DB_HOST = 'test';
process.env.DB_NAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_PORT = 5432;
process.env.MS_USUARIOS_URL = 'http://test-usuarios:3000';
process.env.MS_MANTENEDOR_URL = 'http://test-mantenedor:3001';
process.env.GARAGE_ENDPOINT = 'http://test-garage:3900';
process.env.GARAGE_ACCESS_KEY = 'test';
process.env.GARAGE_SECRET_KEY = 'test';
process.env.GARAGE_BUCKET = 'test-bucket';

/**
 * Integration tests for /api/login and /api/logout endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  mockBcryptCompare,
  resetMockDb,
  getApp,
  mockFetchResponse,
} = require('./helpers');

describe('POST /api/login', () => {
  beforeEach(() => {
    resetMockDb();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, nombre: 'Área Test' }),
    });
  });

  test('login exitoso con credenciales válidas', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    // Query: SELECT usuario con JOIN rol
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Admin', correo: 'admin@test.com',
        password_hash: '$2b$10$hash', estado_activo: true, rol_id: 1,
        rol_nombre: 'Administrador',
      }],
      rowCount: 1,
    });
    // Query: SELECT area_id from usuario_area
    mockQuery.mockResolvedValueOnce({
      rows: [{ area_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'admin@test.com', password: 'correcta' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.acceso_permitido).toBe(true);
    expect(res.body.usuario.nombre_completo).toBe('Admin');
    expect(res.body.usuario.area_nombre).toBe('Área Test');
  });

  test('retorna 401 si el usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'noexiste@test.com', password: 'cualquiera' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Credenciales inválidas');
  });

  test('retorna 401 si la contraseña es incorrecta', async () => {
    mockBcryptCompare.mockResolvedValue(false);

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Admin', correo: 'admin@test.com',
        password_hash: '$2b$10$hash', estado_activo: true, rol_id: 1,
        rol_nombre: 'Administrador',
      }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'admin@test.com', password: 'incorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Credenciales inválidas');
  });

  test('retorna 403 si el usuario está inactivo', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Inactivo', correo: 'inactivo@test.com',
        password_hash: '$2b$10$hash', estado_activo: false, rol_id: 1,
        rol_nombre: 'Administrador',
      }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'inactivo@test.com', password: 'cualquiera' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('inactivo');
  });

  test('retorna 500 si falla la query', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'admin@test.com', password: 'test' });

    expect(res.status).toBe(500);
  });

  test('login sin área asignada (areaResult vacío)', async () => {
    mockBcryptCompare.mockResolvedValue(true);

    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Sin Area', correo: 'sinarea@test.com',
        password_hash: '$2b$10$hash', estado_activo: true, rol_id: 2,
        rol_nombre: 'Coordinador',
      }],
      rowCount: 1,
    });
    // Sin área asignada
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/login')
      .send({ correo: 'sinarea@test.com', password: 'test' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.area_id).toBeNull();
  });
});

describe('POST /api/logout', () => {
  test('retorna mensaje de éxito', async () => {
    const app = getApp();
    const res = await request(app).post('/api/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('cerrada');
  });
});

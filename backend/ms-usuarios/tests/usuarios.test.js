/**
 * Integration tests for /api/usuarios and /api/roles endpoints
 * All usuario endpoints require JWT auth middleware on certain operations
 */

const request = require('supertest');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
  mockFetchResponse,
} = require('./helpers');

describe('GET /api/roles', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de roles activos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Administrador', estado_activo: true },
        { id: 2, nombre: 'Coordinador', estado_activo: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/roles');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nombre).toBe('Administrador');
  });

  test('retorna 500 si falla la consulta', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const app = getApp();
    const res = await request(app).get('/api/roles');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('POST /api/usuarios', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('crea usuario exitosamente sin area_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, rol_id: 2, nombre_completo: 'Juan Perez', correo: 'juan@test.com', password_hash: 'hash' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/usuarios')
      .send({
        rol_id: 2,
        nombre_completo: 'Juan Perez',
        correo: 'juan@test.com',
        password_hash: 'hash123',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_completo).toBe('Juan Perez');
  });

  test('crea usuario con area_id (también inserta en usuario_area)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, rol_id: 2, nombre_completo: 'Maria', correo: 'maria@test.com', password_hash: 'hash' }],
      rowCount: 1,
    });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .post('/api/usuarios')
      .send({
        rol_id: 2,
        nombre_completo: 'Maria',
        correo: 'maria@test.com',
        password_hash: 'hash',
        area_id: 1,
      });

    expect(res.status).toBe(201);
    // Verifica que hubo dos queries: INSERT usuario + INSERT usuario_area
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  test('retorna 500 si falla la query', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const app = getApp();
    const res = await request(app)
      .post('/api/usuarios')
      .send({
        rol_id: 2,
        nombre_completo: 'Juan',
        correo: 'juan@test.com',
        password_hash: 'hash',
      });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/usuarios', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de usuarios con API Composition', async () => {
    // Mock query results
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1, nombre_completo: 'Admin', correo: 'admin@test.com',
          password_hash: 'hash', estado_activo: true, rol_id: 1,
          rol_nombre: 'Administrador', area_ids: [1, 2],
        },
        {
          id: 2, nombre_completo: 'User', correo: 'user@test.com',
          password_hash: 'hash', estado_activo: true, rol_id: 2,
          rol_nombre: 'Coordinador', area_ids: [1],
        },
      ],
      rowCount: 2,
    });

    // Mock fetch for API Composition (parallel calls)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, nombre: 'Área 1' }),
    });

    const app = getApp();
    const res = await request(app).get('/api/usuarios');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].areas).toBeDefined();
    expect(res.body[0].area_id).toBe(1);
  });

  test('filtra por area_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'User', correo: 'user@test.com',
        password_hash: 'hash', estado_activo: true, rol_id: 2,
        rol_nombre: 'Coordinador', area_ids: [2],
      }],
      rowCount: 1,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 2, nombre: 'Área 2' }),
    });

    const app = getApp();
    const res = await request(app).get('/api/usuarios?area_id=2');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery.mock.calls[0][1]).toEqual([2]);
  });

  test('filtra por rol_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Admin', correo: 'admin@test.com',
        password_hash: 'hash', estado_activo: true, rol_id: 1,
        rol_nombre: 'Administrador', area_ids: null,
      }],
      rowCount: 1,
    });

    global.fetch = jest.fn();

    const app = getApp();
    const res = await request(app).get('/api/usuarios?rol_id=1');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([1]);
  });

  test('filtra por ids (comma-separated)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    global.fetch = jest.fn();

    const app = getApp();
    const res = await request(app).get('/api/usuarios?ids=1,2,3');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([[1, 2, 3]]);
  });

  test('retorna 500 si falla la query', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const app = getApp();
    const res = await request(app).get('/api/usuarios');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/usuarios/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna usuario por ID con API Composition', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, nombre_completo: 'Admin', correo: 'admin@test.com',
        password_hash: 'hash', estado_activo: true, rol_id: 1,
        rol_nombre: 'Administrador', area_ids: [1],
      }],
      rowCount: 1,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, nombre: 'Área 1' }),
    });

    const app = getApp();
    const res = await request(app).get('/api/usuarios/1');

    expect(res.status).toBe(200);
    expect(res.body.nombre_completo).toBe('Admin');
    expect(res.body.areas).toHaveLength(1);
    expect(res.body.area_nombre).toBe('Área 1');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app).get('/api/usuarios/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrado');
  });
});

describe('PUT /api/usuarios/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('actualiza usuario con upsert de área (UPDATE existente)', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE usuarios
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // SELECT usuario_area existente
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // UPDATE usuario_area
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/usuarios/1')
      .send({
        rol_id: 1,
        nombre_completo: 'Admin Actualizado',
        correo: 'admin@test.com',
        area_id: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('actualizados');
  });

  test('actualiza usuario con INSERT de área (no existía)', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE usuarios
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // SELECT usuario_area — empty
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // INSERT usuario_area
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/usuarios/1')
      .send({
        rol_id: 1,
        nombre_completo: 'Admin',
        correo: 'admin@test.com',
        area_id: 3,
      });

    expect(res.status).toBe(200);
  });

  test('actualiza usuario sin área (elimina vinculo existente)', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE usuarios
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // DELETE usuario_area
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/usuarios/1')
      .send({
        rol_id: 1,
        nombre_completo: 'Admin',
        correo: 'admin@test.com',
        // no area_id
      });

    expect(res.status).toBe(200);
  });

  test('retorna 500 si falla la transacción', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE usuarios — fails
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    // ROLLBACK
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/usuarios/1')
      .send({ rol_id: 1, nombre_completo: 'Fail', correo: 'fail@test.com' });

    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/usuarios/:id/estado', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('activa/desactiva usuario', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .patch('/api/usuarios/1/estado')
      .send({ estado_activo: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Estado');
  });
});

describe('PATCH /api/usuarios/:id/area', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('asigna área a usuario (transaccional)', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // DELETE existing
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // INSERT new
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .patch('/api/usuarios/1/area')
      .send({ area_id: 3 });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('asignada');
  });

  test('desasigna área (sin area_id)', async () => {
    // BEGIN
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    // DELETE existing
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // No INSERT
    // COMMIT
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .patch('/api/usuarios/1/area')
      .send({}); // no area_id

    expect(res.status).toBe(200);
    // Solo DELETE sin INSERT = 3 calls: BEGIN, DELETE, COMMIT
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});

describe('DELETE /api/usuarios/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('elimina usuario lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/usuarios/1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });
});

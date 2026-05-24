/**
 * Integration tests for /api/categorias endpoints
 * PATCH estado uses transaction (client.query)
 */

const request = require('supertest');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
} = require('./helpers');

describe('GET /api/categorias', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna lista de categorías', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Categoria A', descripcion: 'Desc A', estado_activo: true },
        { id: 2, nombre: 'Categoria B', descripcion: 'Desc B', estado_activo: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/categorias');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('GET /api/categorias/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna categoría por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Categoria A', descripcion: 'Desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/categorias/1');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Categoria A');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const app = getApp();
    const res = await request(app).get('/api/categorias/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/categorias', () => {
  beforeEach(() => { resetMockDb(); });

  test('crea categoría exitosamente', async () => {
    // Validar nombre único
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Nueva Categoria', descripcion: 'Desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/categorias')
      .send({ nombre: 'Nueva Categoria', descripcion: 'Desc' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Nueva Categoria');
  });

  test('retorna 400 si el nombre ya existe (case-insensitive)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .post('/api/categorias')
      .send({ nombre: 'categoria a' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ya existe');
  });
});

describe('PUT /api/categorias/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('actualiza categoría exitosamente', async () => {
    // Validar nombre único excluyendo self
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // UPDATE
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Actualizada', descripcion: 'Nueva desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/categorias/1')
      .send({ nombre: 'Actualizada', descripcion: 'Nueva desc' });

    expect(res.status).toBe(200);
  });

  test('retorna 400 si nombre duplicado (excluyendo self)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .put('/api/categorias/1')
      .send({ nombre: 'Categoria B' });

    expect(res.status).toBe(400);
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/categorias/999')
      .send({ nombre: 'No existe' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/categorias/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('elimina categoría lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const app = getApp();
    const res = await request(app).delete('/api/categorias/1');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/categorias/:id/estado (transaccional)', () => {
  beforeEach(() => { resetMockDb(); });

  test('cambia estado y afecta subtipos (transacción)', async () => {
    // BEGIN
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE categorias
    mockClientQuery.mockResolvedValueOnce({ rowCount: 1 });
    // UPDATE subtipos
    mockClientQuery.mockResolvedValueOnce({ rowCount: 3 });
    // COMMIT
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // client.release()
    mockRelease.mockResolvedValue(undefined);

    const app = getApp();
    const res = await request(app)
      .patch('/api/categorias/1/estado')
      .send({ estado_activo: false });

    expect(res.status).toBe(200);
    expect(mockClientQuery).toHaveBeenCalledTimes(4); // BEGIN, UPDATE cat, UPDATE sub, COMMIT
  });

  test('retorna 500 si falla la transacción', async () => {
    // BEGIN
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // UPDATE categorias — fails
    mockClientQuery.mockRejectedValueOnce(new Error('DB error'));
    // ROLLBACK
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // client.release()
    mockRelease.mockResolvedValue(undefined);

    const app = getApp();
    const res = await request(app)
      .patch('/api/categorias/1/estado')
      .send({ estado_activo: false });

    expect(res.status).toBe(500);
  });
});

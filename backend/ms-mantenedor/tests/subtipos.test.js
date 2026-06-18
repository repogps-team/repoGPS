/**
 * Integration tests for /api/subtipos endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  resetMockDb,
  getApp,
} = require('./helpers');

describe('GET /api/subtipos', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna lista de subtipos con JOIN a categorias', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Subtipo A', categoria_id: 1, categoria_nombre: 'Categoria A', categoria_activa: true },
        { id: 2, nombre: 'Subtipo B', categoria_id: 1, categoria_nombre: 'Categoria A', categoria_activa: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/subtipos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].categoria_nombre).toBe('Categoria A');
  });

  test('retorna 500 si falla la consulta', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const app = getApp();
    const res = await request(app).get('/api/subtipos');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/subtipos/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna subtipo por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Subtipo A', categoria_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/subtipos/1');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Subtipo A');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const app = getApp();
    const res = await request(app).get('/api/subtipos/999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/subtipos/categoria/:categoriaId', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna subtipos por categoría', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Subtipo A', categoria_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/subtipos/categoria/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/subtipos', () => {
  beforeEach(() => { resetMockDb(); });

  test('crea subtipo exitosamente', async () => {
    // validarCategoriaActiva
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // validar nombre único por categoría
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, categoria_id: 1, nombre: 'Nuevo Subtipo', descripcion: 'Desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/subtipos')
      .send({ categoria_id: 1, nombre: 'Nuevo Subtipo', descripcion: 'Desc' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Nuevo Subtipo');
  });

  test('retorna 400 si categoría no existe o está inactiva', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/subtipos')
      .send({ categoria_id: 999, nombre: 'Invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('categoría');
  });

  test('retorna 400 si el nombre ya existe en la categoría', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // categoria activa
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }); // nombre duplicado

    const app = getApp();
    const res = await request(app)
      .post('/api/subtipos')
      .send({ categoria_id: 1, nombre: 'Subtipo A' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Ya existe');
  });
});

describe('PUT /api/subtipos/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('actualiza subtipo exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // categoria activa
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // nombre único
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, categoria_id: 1, nombre: 'Actualizado', descripcion: 'Nueva desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/subtipos/1')
      .send({ categoria_id: 1, nombre: 'Actualizado', descripcion: 'Nueva desc' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Actualizado');
  });

  test('retorna 400 si categoría no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/subtipos/1')
      .send({ categoria_id: 999, nombre: 'Test' });

    expect(res.status).toBe(400);
  });

  test('retorna 404 si subtipo no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/subtipos/999')
      .send({ categoria_id: 1, nombre: 'No existe' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/subtipos/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('elimina subtipo lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const app = getApp();
    const res = await request(app).delete('/api/subtipos/1');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/subtipos/:id/estado', () => {
  beforeEach(() => { resetMockDb(); });

  test('cambia estado del subtipo', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const app = getApp();
    const res = await request(app)
      .patch('/api/subtipos/1/estado')
      .send({ estado_activo: false });
    expect(res.status).toBe(200);
  });
});

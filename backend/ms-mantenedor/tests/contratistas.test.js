/**
 * Integration tests for /api/contratistas endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  resetMockDb,
  getApp,
} = require('./helpers');

describe('GET /api/contratistas', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna lista de contratistas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, razon_social: 'Constructora A', rut: '11.111.111-1', estado_activo: true },
        { id: 2, razon_social: 'Constructora B', rut: '22.222.222-2', estado_activo: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/contratistas');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].razon_social).toBe('Constructora A');
  });

  test('retorna 500 si falla la consulta', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));
    const app = getApp();
    const res = await request(app).get('/api/contratistas');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/contratistas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna contratista por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, razon_social: 'Constructora A', rut: '11.111.111-1', estado_activo: true }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/contratistas/1');

    expect(res.status).toBe(200);
    expect(res.body.razon_social).toBe('Constructora A');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app).get('/api/contratistas/999');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/contratistas', () => {
  beforeEach(() => { resetMockDb(); });

  test('crea contratista exitosamente', async () => {
    // Primero: validar RUT único (no existe)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // Segundo: INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, razon_social: 'Nueva Constructora', rut: '33.333.333-3', estado_activo: true }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/contratistas')
      .send({ razon_social: 'Nueva Constructora', rut: '33.333.333-3' });

    expect(res.status).toBe(201);
    expect(res.body.razon_social).toBe('Nueva Constructora');
  });

  test('retorna 400 si el RUT ya existe', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/contratistas')
      .send({ razon_social: 'Duplicado', rut: '11.111.111-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('RUT');
  });
});

describe('PUT /api/contratistas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('actualiza contratista exitosamente', async () => {
    // Validar RUT único excluyendo self
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // UPDATE
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, razon_social: 'Actualizada', rut: '11.111.111-1' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/contratistas/1')
      .send({ razon_social: 'Actualizada', rut: '11.111.111-1' });

    expect(res.status).toBe(200);
    expect(res.body.razon_social).toBe('Actualizada');
  });

  test('retorna 400 si el RUT ya existe en otro registro', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/contratistas/1')
      .send({ razon_social: 'Test', rut: '22.222.222-2' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('RUT');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/contratistas/999')
      .send({ razon_social: 'No existe', rut: '99.999.999-9' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/contratistas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('elimina contratista lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/contratistas/1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });
});

describe('PATCH /api/contratistas/:id/estado', () => {
  beforeEach(() => { resetMockDb(); });

  test('cambia estado del contratista', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .patch('/api/contratistas/1/estado')
      .send({ estado_activo: false });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Estado');
  });
});

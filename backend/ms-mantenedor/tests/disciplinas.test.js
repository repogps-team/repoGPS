/**
 * Integration tests for /api/disciplinas endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  resetMockDb,
  getApp,
} = require('./helpers');

describe('GET /api/disciplinas', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna lista de disciplinas con JOIN', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Ingeniería', area_id: 1, area_nombre: 'Área A', contratista_id: 1 },
        { id: 2, nombre: 'Arquitectura', area_id: 1, area_nombre: 'Área A', contratista_id: 1 },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/disciplinas');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].area_nombre).toBe('Área A');
  });
});

describe('GET /api/disciplinas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna disciplina por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Ingeniería', area_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/disciplinas/1');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Ingeniería');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const app = getApp();
    const res = await request(app).get('/api/disciplinas/999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/disciplinas/area/:areaId', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna disciplinas por área', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Ingeniería', area_id: 1, area_nombre: 'Área A', contratista_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/disciplinas/area/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/disciplinas', () => {
  beforeEach(() => { resetMockDb(); });

  test('crea disciplina exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // area activa
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Nueva Disciplina' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/disciplinas')
      .send({ area_id: 1, nombre: 'Nueva Disciplina' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Nueva Disciplina');
  });

  test('retorna 400 si falta area_id', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/disciplinas')
      .send({ nombre: 'Sin área' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('area_id');
  });

  test('retorna 400 si área no existe o está inactiva', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/disciplinas')
      .send({ area_id: 999, nombre: 'Invalida' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('área');
  });
});

describe('PUT /api/disciplinas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('actualiza disciplina exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // area activa
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Actualizada' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/disciplinas/1')
      .send({ area_id: 1, nombre: 'Actualizada' });

    expect(res.status).toBe(200);
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/disciplinas/999')
      .send({ area_id: 1, nombre: 'No existe' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/disciplinas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('elimina disciplina lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const app = getApp();
    const res = await request(app).delete('/api/disciplinas/1');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminada');
  });
});

describe('PATCH /api/disciplinas/:id/estado', () => {
  beforeEach(() => { resetMockDb(); });

  test('cambia estado de disciplina', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const app = getApp();
    const res = await request(app)
      .patch('/api/disciplinas/1/estado')
      .send({ estado_activo: false });
    expect(res.status).toBe(200);
  });
});

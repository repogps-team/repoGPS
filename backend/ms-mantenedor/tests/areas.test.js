/**
 * Integration tests for /api/areas endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  resetMockDb,
  getApp,
} = require('./helpers');

describe('GET /api/areas', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna lista de áreas con JOIN a contratistas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Área A', estado_activo: true, contratista_id: 1, contratista_nombre: 'Constructora A' },
        { id: 2, nombre: 'Área B', estado_activo: true, contratista_id: 1, contratista_nombre: 'Constructora A' },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/areas');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].contratista_nombre).toBe('Constructora A');
  });
});

describe('GET /api/areas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna área por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Área A', contratista_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/areas/1');

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Área A');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const app = getApp();
    const res = await request(app).get('/api/areas/999');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/areas/contratista/:contratistaId', () => {
  beforeEach(() => { resetMockDb(); });

  test('retorna áreas por contratista', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Área A', contratista_id: 1, contratista_nombre: 'Constructora A' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/areas/contratista/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/areas', () => {
  beforeEach(() => { resetMockDb(); });

  test('crea área exitosamente', async () => {
    // validarContratistaActivo
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, contratista_id: 1, nombre: 'Nueva Área' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/areas')
      .send({ contratista_id: 1, nombre: 'Nueva Área' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Nueva Área');
  });

  test('retorna 400 si falta contratista_id', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/areas')
      .send({ nombre: 'Área sin contratista' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('obligatorio');
  });

  test('retorna 400 si contratista no existe o está inactivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/areas')
      .send({ contratista_id: 999, nombre: 'Área inválida' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('contratista');
  });
});

describe('PUT /api/areas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('actualiza área exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // contratista activo
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, contratista_id: 1, nombre: 'Área Actualizada' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/areas/1')
      .send({ contratista_id: 1, nombre: 'Área Actualizada' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Área Actualizada');
  });

  test('retorna 400 si contratista no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/areas/1')
      .send({ contratista_id: 999, nombre: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('contratista');
  });

  test('retorna 404 si área no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/areas/999')
      .send({ contratista_id: 1, nombre: 'No existe' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/areas/:id', () => {
  beforeEach(() => { resetMockDb(); });

  test('elimina área lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/areas/1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminada');
  });
});

describe('PATCH /api/areas/:id/estado', () => {
  beforeEach(() => { resetMockDb(); });

  test('cambia estado del área', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .patch('/api/areas/1/estado')
      .send({ estado_activo: false });

    expect(res.status).toBe(200);
  });
});

/**
 * Integration tests for HU-21: transiciones permitidas endpoints
 */

const request = require('supertest');
const {
  mockQuery,
  resetMockDb,
  getApp,
  authHeader,
} = require('./helpers');

describe('GET /api/admin/transiciones-permitidas', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de reglas para admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          proceso_id: 1,
          etapa_from_id: 5,
          etapa_to_id: 6,
          rol_id: 2,
          etapa_from_nombre: 'Inicio',
          etapa_to_nombre: 'Desarrollo',
        },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/admin/transiciones-permitidas?proceso_id=1')
      .set(authHeader({ rol_id: 1, esAdmin: true }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].etapa_from_nombre).toBe('Inicio');
    expect(res.body[0].rol_id).toBe(2);
  });

  test('retorna 403 si no es admin', async () => {
    const app = getApp();
    const res = await request(app)
      .get('/api/admin/transiciones-permitidas')
      .set(authHeader({ rol_id: 2 }));

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Solo administradores');
  });
});

describe('POST /api/admin/transiciones-permitidas', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('crea regla exitosamente para admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_from_id: 5, etapa_to_id: 6, rol_id: 2 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/admin/transiciones-permitidas')
      .set(authHeader({ rol_id: 1, esAdmin: true }))
      .send({
        proceso_id: 1,
        etapa_from_id: 5,
        etapa_to_id: 6,
        rol_id: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.proceso_id).toBe(1);
  });

  test('retorna 400 si faltan campos', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/admin/transiciones-permitidas')
      .set(authHeader({ rol_id: 1, esAdmin: true }))
      .send({ proceso_id: 1 });

    expect(res.status).toBe(400);
  });

  test('retorna 403 si no es admin', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/admin/transiciones-permitidas')
      .set(authHeader({ rol_id: 2 }))
      .send({ proceso_id: 1, etapa_from_id: 5, etapa_to_id: 6, rol_id: 2 });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/admin/transiciones-permitidas/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('elimina regla exitosamente para admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .delete('/api/admin/transiciones-permitidas/1')
      .set(authHeader({ rol_id: 1, esAdmin: true }));

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminada');
  });

  test('retorna 404 si la regla no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .delete('/api/admin/transiciones-permitidas/999')
      .set(authHeader({ rol_id: 1, esAdmin: true }));

    expect(res.status).toBe(404);
  });
});

describe('GET /api/transiciones/available', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna transiciones disponibles para el rol del usuario', async () => {
    // Query 1: SELECT expediente
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_actual_id: 5, area_id: 1 }],
      rowCount: 1,
    });
    // Query 2: SELECT transiciones permitidas
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, etapa_from_id: 5, etapa_to_id: 6, rol_id: 2, etapa_to_nombre: 'Desarrollo' },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/transiciones/available?expediente_id=1')
      .set(authHeader({ rol_id: 2 }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].etapa_to_nombre).toBe('Desarrollo');
  });

  test('retorna lista vacia si el rol no tiene transiciones permitidas', async () => {
    // Query 1: SELECT expediente
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_actual_id: 5, area_id: 1 }],
      rowCount: 1,
    });
    // Query 2: SELECT transiciones permitidas — vacío
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .get('/api/transiciones/available?expediente_id=1')
      .set(authHeader({ rol_id: 4 }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  test('retorna 400 si falta expediente_id', async () => {
    const app = getApp();
    const res = await request(app)
      .get('/api/transiciones/available')
      .set(authHeader());

    expect(res.status).toBe(400);
  });
});

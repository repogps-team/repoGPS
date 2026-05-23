/**
 * Integration tests for /api/forms endpoints (FormIO)
 * All require JWT authentication
 */

const request = require('supertest');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
  authHeader,
} = require('./helpers');

describe('POST /api/forms (admin only)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('admin crea formulario exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Formulario 1', descripcion: 'Desc', schema: '{}' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/forms')
      .set(authHeader({ rol_id: 1 }))
      .send({ nombre: 'Formulario 1', schema: { components: [] } });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Formulario 1');
  });

  test('usuario no-admin recibe 403', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/forms')
      .set(authHeader({ rol_id: 2 }))
      .send({ nombre: 'Form', schema: {} });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Solo administradores');
  });

  test('retorna 400 si falta nombre', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/forms')
      .set(authHeader())
      .send({ schema: {} });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('nombre');
  });
});

describe('GET /api/forms', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('lista formularios activos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Form 1', estado_activo: true },
        { id: 2, nombre: 'Form 2', estado_activo: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/forms')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /api/forms/:formId/responder', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('responde formulario exitosamente', async () => {
    // Query 1: SELECT form exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // Query 2: SELECT expediente + area/tipo_etapa
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, tipo_etapa: 'desarrollo' }],
      rowCount: 1,
    });
    // Query 3: SELECT form assignment exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 });
    // Query 4: INSERT respuesta
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, form_definition_id: 1, expediente_id: 1, data: '{}', usuario_id: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/forms/1/responder')
      .set(authHeader())
      .send({
        expediente_id: 1,
        data: { campo1: 'valor1' },
      });

    expect(res.status).toBe(201);
  });

  test('retorna 403 si expediente no está en desarrollo', async () => {
    // Query 1: form exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // Query 2: expediente check — tipo_etapa = 'inicio'
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, tipo_etapa: 'inicio' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/forms/1/responder')
      .set(authHeader())
      .send({
        expediente_id: 1,
        data: {},
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('etapa de desarrollo');
  });

  test('retorna 400 si faltan campos requeridos', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/forms/1/responder')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expediente_id');
  });
});

describe('GET /api/forms/expediente/:expedienteId', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna formularios asignados a un expediente', async () => {
    // Query 1: SELECT expediente check
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, tipo_etapa: 'desarrollo' }],
      rowCount: 1,
    });
    // Query 2: SELECT forms asignados
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nombre: 'Form A', puede_responder: true, respuestas_count: '0' },
        { id: 2, nombre: 'Form B', puede_responder: true, respuestas_count: '1' },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/forms/expediente/1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('POST /api/forms/:id/asignar (admin only)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('admin asigna formulario a expediente', async () => {
    // Query 1: form exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // Query 2: expediente exists
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // Query 3: INSERT assignment
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, form_definition_id: 1, expediente_id: 1, creado_por: 1 }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/forms/1/asignar')
      .set(authHeader())
      .send({ expediente_id: 1 });

    expect(res.status).toBe(201);
  });

  test('no-admin recibe 403', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/forms/1/asignar')
      .set(authHeader({ rol_id: 2 }))
      .send({ expediente_id: 1 });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/forms/:id (admin only)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('admin actualiza formulario', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Actualizado', schema: '{}' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/forms/1')
      .set(authHeader())
      .send({ nombre: 'Actualizado', schema: { components: [] } });

    expect(res.status).toBe(200);
  });
});

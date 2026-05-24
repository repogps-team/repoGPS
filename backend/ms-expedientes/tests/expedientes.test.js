/**
 * Integration tests for /api/expedientes endpoints
 * All require JWT authentication
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
  authHeader,
  JWT_SECRET,
} = require('./helpers');

describe('GET /api/expedientes (auth)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de expedientes para admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1, proceso_id: 1, titulo: 'Exp 1',
          etapa_actual_id: 2,
          proceso_nombre: 'Proceso 1', area_id: 1,
          etapa_actual: 'Desarrollo', tipo_etapa: 'desarrollo', es_final: false,
          fecha_creacion: '2026-01-01',
        },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes')
      .set(authHeader({ rol_id: 1, esAdmin: true }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].titulo).toBe('Exp 1');
    expect(res.body[0].estado).toBe('En Desarrollo');
  });

  test('filtra por área si no es admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1, proceso_id: 1, titulo: 'Exp 1',
          proceso_nombre: 'Proceso 1', area_id: 2,
          etapa_actual: 'Inicio', tipo_etapa: 'inicio', es_final: false,
          fecha_creacion: '2026-01-01',
        },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes')
      .set(authHeader({ rol_id: 2, area_id: 2 }));

    expect(res.status).toBe(200);
    // Verifica que el query incluya filtro por area_id
    expect(mockQuery.mock.calls[0][1]).toEqual([2]);
  });

  test('retorna 401 sin token', async () => {
    const app = getApp();
    const res = await request(app).get('/api/expedientes');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Token requerido');
  });

  test('retorna 401 con token inválido', async () => {
    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes')
      .set({ Authorization: 'Bearer token-invalido' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Token inválido');
  });

  test('retorna 500 si falla la query', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes')
      .set(authHeader());

    expect(res.status).toBe(500);
  });
});

describe('GET /api/expedientes/:id (auth)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna expediente por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, proceso_id: 1, titulo: 'Exp 1',
        etapa_actual_id: 3,
        proceso_nombre: 'Proceso 1', area_id: 1,
        etapa_actual: 'Final', tipo_etapa: 'final', es_final: true,
      }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes/1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('Terminado');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .get('/api/expedientes/999')
      .set(authHeader());

    expect(res.status).toBe(404);
  });
});

describe('POST /api/expedientes', () => {
  beforeEach(() => {
    resetMockDb();
    // Mock global.fetch for API Composition
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, area_id: 1 }),
    });
  });

  test('crea expediente exitosamente', async () => {
    // Primera query: validar que proceso existe en DB local
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, area_id: 1 }], rowCount: 1 });
    // Segunda query: obtener primera etapa del proceso
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 });
    // Tercera query: INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, titulo: 'Nuevo Exp', disciplina_id: 1, subtipo_id: null }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes')
      .send({
        proceso_id: 1,
        disciplina_id: 1,
        titulo: 'Nuevo Exp',
        descripcion: 'Desc',
      });

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe('Nuevo Exp');
  });

  test('retorna 400 si disciplina y proceso tienen áreas distintas', async () => {
    // Mock fetch: solo 1 llamada a ms-mantenedor para disciplina (area_id=2)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, area_id: 2 }),
    });
    // Proceso se consulta en DB local (area_id=1) -> áreas distintas
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, area_id: 1 }], rowCount: 1 });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes')
      .send({
        proceso_id: 1,
        disciplina_id: 1,
        titulo: 'Exp conflicto',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('deben pertenecer a la misma área');
  });

  test('crea expediente sin disciplina_id', async () => {
    // No fetch calls because disciplina_id is not provided
    // Primera query: obtener primera etapa del proceso
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 });
    // Segunda query: INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, proceso_id: 1, titulo: 'Exp sin disciplina' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes')
      .send({
        proceso_id: 1,
        titulo: 'Exp sin disciplina',
      });

    expect(res.status).toBe(201);
  });
});

describe('POST /api/expedientes/:id/avanzar (auth)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('avanza expediente a siguiente etapa', async () => {
    // Query 1: SELECT expediente con JOIN a procesos
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_actual_id: 5, area_id: 1 }],
      rowCount: 1,
    });
    // Query 2: SELECT siguiente etapa
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 6, proceso_id: 1, nombre: 'Desarrollo', orden: 2, tipo_etapa: 'desarrollo', tipo_tarea: null, rol_id: null }],
      rowCount: 1,
    });
    // Query 3: UPDATE expediente
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Query 4: INSERT historial
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Query 5: SELECT expediente actualizado con JOINs
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, proceso_id: 1, etapa_actual_id: 6, titulo: 'Exp 1',
        proceso_nombre: 'Proceso 1', area_id: 1,
        etapa_actual: 'Desarrollo', tipo_etapa: 'desarrollo', es_final: false,
      }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes/1/avanzar')
      .set(authHeader())
      .send({ observacion: 'Avanzando' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Expediente avanzado');
  });

  test('retorna 403 si el usuario es colaborador (rol_id=4)', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes/1/avanzar')
      .set(authHeader({ rol_id: 4 }))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Colaborador no puede avanzar');
  });

  test('retorna 400 si no hay más etapas', async () => {
    // Query 1: SELECT expediente
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_actual_id: 10, area_id: 1 }],
      rowCount: 1,
    });
    // Query 2: SELECT siguiente etapa — no hay
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes/1/avanzar')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No hay mas etapas');
  });
});

describe('POST /api/expedientes/:id/devolver (auth)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('devuelve expediente a etapa anterior', async () => {
    // Query 1: SELECT expediente
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, etapa_actual_id: 6, area_id: 1 }],
      rowCount: 1,
    });
    // Query 2: SELECT etapa anterior
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 5, proceso_id: 1, nombre: 'Inicio', orden: 1 }],
      rowCount: 1,
    });
    // Query 3: UPDATE expediente
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Query 4: INSERT historial
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    // Query 5: SELECT expediente actualizado
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, proceso_id: 1, etapa_actual_id: 5, titulo: 'Exp 1',
        proceso_nombre: 'Proceso 1', area_id: 1,
        etapa_actual: 'Inicio', tipo_etapa: 'inicio', es_final: false,
      }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes/1/devolver')
      .set(authHeader())
      .send({ observacion: 'Corregir' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Expediente devuelto');
  });

  test('retorna 403 si colaborador intenta devolver', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/expedientes/1/devolver')
      .set(authHeader({ rol_id: 4 }))
      .send({});

    expect(res.status).toBe(403);
  });
});

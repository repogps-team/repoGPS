/**
 * Integration tests for /api/procesos and /api/etapas-proceso endpoints
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

describe('GET /api/procesos', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de procesos activos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, area_id: 1, nombre: 'Proceso 1', descripcion: 'Desc', estado_activo: true },
        { id: 2, area_id: 2, nombre: 'Proceso 2', descripcion: 'Desc 2', estado_activo: true },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/procesos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nombre).toBe('Proceso 1');
  });

  test('filtra por area_id cuando se especifica', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Proceso 1', descripcion: 'Desc', estado_activo: true }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/procesos?area_id=1');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([1]);
  });

  test('incluye inactivos con ?incluir_inactivos=true', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, area_id: 1, nombre: 'Inactivo', estado_activo: false },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/procesos?incluir_inactivos=true');

    expect(res.status).toBe(200);
    // Sin cláusula WHERE por estado_activo (solo ORDER BY)
    const query = mockQuery.mock.calls[0][0];
    expect(query).not.toContain('WHERE');
  });

  test('retorna error 500 si falla la consulta', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const app = getApp();
    const res = await request(app).get('/api/procesos');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/procesos/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna un proceso por ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Proceso 1', descripcion: 'Desc', estado_activo: true }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/procesos/1');

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Proceso 1');
  });

  test('retorna 404 si no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app).get('/api/procesos/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrado');
  });
});

describe('POST /api/procesos', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('crea un proceso exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Nuevo Proceso', descripcion: 'Desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/procesos')
      .send({ area_id: 1, nombre: 'Nuevo Proceso', descripcion: 'Desc' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Nuevo Proceso');
  });

  test('retorna 400 si falta area_id', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/procesos')
      .send({ nombre: 'Proceso sin área' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('area_id es obligatorio');
  });

  test('retorna 400 si area_id no es número válido (negativo)', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/procesos')
      .send({ area_id: -1, nombre: 'Invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('area_id debe ser un número válido');
  });
});

describe('PUT /api/procesos/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('actualiza un proceso exitosamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Actualizado', descripcion: 'Nueva desc' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .put('/api/procesos/1')
      .send({ area_id: 1, nombre: 'Actualizado', descripcion: 'Nueva desc' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Actualizado');
  });

  test('retorna 404 si el proceso no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .put('/api/procesos/999')
      .send({ area_id: 1, nombre: 'No existe', descripcion: '' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/procesos/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('elimina lógicamente si no tiene etapas ni expedientes', async () => {
    // COUNT de etapas activas
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    // COUNT de expedientes activos
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    // UPDATE
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/procesos/1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });

  test('retorna 400 si tiene etapas activas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/procesos/1');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('etapas activas');
  });

  test('retorna 400 si tiene expedientes activos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/procesos/1');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expedientes activos');
  });
});

describe('GET /api/etapas-proceso', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna lista de etapas activas', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, proceso_id: 1, nombre: 'Inicio', orden: 1, tipo_etapa: 'inicio', estado_activo: true },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/etapas-proceso');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/etapas-proceso (transaccional)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('crea etapa con transacción SELECT FOR UPDATE', async () => {
    // client.query('BEGIN')
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // client.query('SELECT ... FROM procesos ... FOR UPDATE')
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // client.query('SELECT id FROM procesos ...') — dentro de validarReglasEtapaTransacted
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // client.query('SELECT ... orden duplicado')
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // client.query('SELECT ... inicio existente')
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // client.query('INSERT INTO etapas_proceso')
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ id: 1, proceso_id: 1, nombre: 'Inicio', orden: 1, tipo_etapa: 'inicio' }],
      rowCount: 1,
    });
    // client.query('COMMIT')
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/etapas-proceso')
      .send({
        proceso_id: 1,
        nombre: 'Inicio',
        orden: 1,
        tipo_etapa: 'inicio',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Inicio');
  });

  test('retorna 409 si ya existe una etapa inicio para el proceso', async () => {
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 }); // BEGIN
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // FOR UPDATE
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // SELECT proceso (redundante)
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // orden duplicado
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 5 }], rowCount: 1 }); // inicio existente
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 }); // ROLLBACK

    const app = getApp();
    const res = await request(app)
      .post('/api/etapas-proceso')
      .send({
        proceso_id: 1,
        nombre: 'Otro Inicio',
        orden: 2,
        tipo_etapa: 'inicio',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Solo puede existir una etapa');
  });

  test('retorna 400 si proceso no existe', async () => {
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 }); // BEGIN
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // FOR UPDATE (empty)
    // ROLLBACK (tras el error)
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/etapas-proceso')
      .send({
        proceso_id: 999,
        nombre: 'Inicio',
        orden: 1,
        tipo_etapa: 'inicio',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Proceso no encontrado');
  });
});

describe('GET /api/procesos-por-area/:areaId', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna procesos por área', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, area_id: 1, nombre: 'Proceso Área 1' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/procesos-por-area/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

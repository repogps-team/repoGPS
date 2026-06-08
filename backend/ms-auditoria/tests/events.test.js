const request = require('supertest');
const { getApp, mockQuery, resetMockDb } = require('./helpers');

let app;

beforeEach(() => {
  resetMockDb();
  app = getApp();
});

describe('POST /api/events', () => {
  it('should store a valid event and return 202', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const payload = {
      accion: 'CREATE',
      entidad: 'expediente',
      usuario_id: 1,
      usuario_nombre: 'Test User',
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('should return 400 for missing accion', async () => {
    const payload = { entidad: 'expediente' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid accion/);
  });

  it('should return 400 for missing entidad', async () => {
    const payload = { accion: 'CREATE' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid entidad/);
  });

  it('should return 400 for invalid accion value', async () => {
    const payload = { accion: 'INVALID_ACTION', entidad: 'expediente' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid accion/);
  });

  it('should return 400 for invalid entidad value', async () => {
    const payload = { accion: 'CREATE', entidad: 'invalid_entity' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid entidad/);
  });

  it('should return 503 when usuario_nombre exceeds 100 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const payload = {
      accion: 'CREATE',
      entidad: 'expediente',
      usuario_nombre: 'A'.repeat(101),
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(503);
  });

  it('should return 503 when entidad_nombre exceeds 200 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const payload = {
      accion: 'CREATE',
      entidad: 'expediente',
      entidad_nombre: 'B'.repeat(201),
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(503);
  });

  it('should return 503 when ip exceeds 45 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const payload = {
      accion: 'CREATE',
      entidad: 'expediente',
      ip: 'C'.repeat(46),
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(503);
  });

  it('should return 503 on DB failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));
    const payload = {
      accion: 'CREATE',
      entidad: 'expediente',
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Event storage unavailable/);
  });

  it('should store event with all optional fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }], rowCount: 1 });
    const payload = {
      accion: 'UPDATE',
      entidad: 'documento',
      usuario_id: 5,
      usuario_nombre: 'Full User',
      usuario_email: 'user@test.com',
      entidad_id: 10,
      entidad_nombre: 'Test Document',
      valor_anterior: { state: 'old' },
      valor_nuevo: { state: 'new' },
      ip: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      metadata: { key: 'value' },
    };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('id', 2);
  });
});

describe('GET /api/events', () => {
  it('should return events with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, accion: 'CREATE' }] });
    const res = await request(app)
      .get('/api/events')
      .query({ limit: 10, offset: 0 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('events');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 10);
  });

  it('should filter by accion', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ accion: 'LOGIN' });
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });

  it('should filter by entidad', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, entidad: 'expediente' }, { id: 2, entidad: 'expediente' }] });
    const res = await request(app)
      .get('/api/events')
      .query({ entidad: 'expediente' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.events).toHaveLength(2);
  });

  it('should filter by usuario_id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, usuario_id: 42 }] });
    const res = await request(app)
      .get('/api/events')
      .query({ usuario_id: '42' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('should filter by fecha_desde and fecha_hasta', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    const res = await request(app)
      .get('/api/events')
      .query({ fecha_desde: '2026-01-01', fecha_hasta: '2026-06-01' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
  });

  it('should combine multiple filters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, accion: 'CREATE', entidad: 'expediente', usuario_id: 5 }] });
    const res = await request(app)
      .get('/api/events')
      .query({ accion: 'CREATE', entidad: 'expediente', usuario_id: '5' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('should use default limit and offset when not provided', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
    expect(res.body.page).toBe(1);
  });

  it('should clamp limit to 100 when exceeding max', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ limit: 200 });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it('should default limit to 50 for invalid limit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ limit: 'abc' });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
  });

  it('should default limit to 50 for limit < 1', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ limit: 0 });
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(50);
  });

  it('should default offset to 0 for invalid offset', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ offset: 'xyz' });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });

  it('should default offset to 0 for negative offset', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ offset: -5 });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });

  it('should remove invalid usuario_id from filters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ usuario_id: 'not_a_number' });
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
  });

  it('should calculate correct page for offset > 0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '25' }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events')
      .query({ limit: 10, offset: 10 });
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
  });

  it('should return 500 on query error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Query failed'));
    const res = await request(app)
      .get('/api/events');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error querying events/);
  });
});

describe('GET /api/events/entity/:entidad/:id', () => {
  it('should return events for a given entity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, entidad: 'expediente', entidad_id: 123 }] });
    const res = await request(app)
      .get('/api/events/entity/expediente/123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].entidad_id).toBe(123);
  });

  it('should return empty array for non-existent entity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/events/entity/expediente/999');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return 400 for invalid id', async () => {
    const res = await request(app)
      .get('/api/events/entity/expediente/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid entity id/);
  });

  it('should return 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB query failed'));
    const res = await request(app)
      .get('/api/events/entity/expediente/123');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error querying entity history/);
  });
});

describe('GET /api/stats', () => {
  it('should return statistics', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ accion: 'CREATE', total: '5' }] })
      .mockResolvedValueOnce({ rows: [{ entidad: 'expediente', total: '8' }] })
      .mockResolvedValueOnce({ rows: [{ day: '2026-06-01', total: '2' }] });
    const res = await request(app)
      .get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total', 10);
    expect(res.body.by_accion).toHaveLength(1);
    expect(res.body.by_entidad).toHaveLength(1);
    expect(res.body.by_day).toHaveLength(1);
  });

  it('should return 500 on stats query error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Stats query failed'));
    const res = await request(app)
      .get('/api/stats');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error fetching stats/);
  });
});

describe('POST /api/events validation edge cases', () => {
  it('should accept all valid accion values', async () => {
    const validAcciones = [
      'CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE',
      'LOGIN', 'LOGOUT', 'ADVANCE', 'REJECT',
      'UPLOAD', 'NEW_VERSION', 'DOWNLOAD', 'RESPOND'
    ];
    for (const accion of validAcciones) {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
      const res = await request(app)
        .post('/api/events')
        .send({ accion, entidad: 'expediente' });
      expect(res.status).toBe(202);
    }
  });

  it('should accept all valid entidad values', async () => {
    const validEntidades = [
      'usuario', 'area', 'contratista', 'disciplina', 'categoria', 'subtipo',
      'expediente', 'documento', 'formulario', 'proceso', 'etapa', 'rol'
    ];
    for (const entidad of validEntidades) {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
      const res = await request(app)
        .post('/api/events')
        .send({ accion: 'CREATE', entidad });
      expect(res.status).toBe(202);
    }
  });

  it('should accept usuario_nombre at exactly 100 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const res = await request(app)
      .post('/api/events')
      .send({
        accion: 'CREATE',
        entidad: 'expediente',
        usuario_nombre: 'A'.repeat(100),
      });
    expect(res.status).toBe(202);
  });

  it('should accept entidad_nombre at exactly 200 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const res = await request(app)
      .post('/api/events')
      .send({
        accion: 'CREATE',
        entidad: 'expediente',
        entidad_nombre: 'B'.repeat(200),
      });
    expect(res.status).toBe(202);
  });

  it('should accept ip at exactly 45 chars', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    const res = await request(app)
      .post('/api/events')
      .send({
        accion: 'CREATE',
        entidad: 'expediente',
        ip: 'C'.repeat(45),
      });
    expect(res.status).toBe(202);
  });

  it('should return 400 for accion with invalid empty string', async () => {
    const payload = { accion: '', entidad: 'expediente' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
  });

  it('should return 400 for entidad with invalid empty string', async () => {
    const payload = { accion: 'CREATE', entidad: '' };
    const res = await request(app)
      .post('/api/events')
      .send(payload);
    expect(res.status).toBe(400);
  });
});

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
});

describe('GET /api/events', () => {
  it('should return events with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
      .mockResolvedValueOnce({ rows: [{ id: 1, accion: 'CREATE' }] }); // select query
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
});

describe('GET /api/stats', () => {
  it('should return statistics', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // total
      .mockResolvedValueOnce({ rows: [{ accion: 'CREATE', total: '5' }] }) // by accion
      .mockResolvedValueOnce({ rows: [{ entidad: 'expediente', total: '8' }] }) // by entidad
      .mockResolvedValueOnce({ rows: [{ day: '2026-06-01', total: '2' }] }); // by day
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
/**
 * Integration tests for /api/documentos endpoints
 */

const request = require('supertest');
const path = require('path');
const {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
  authHeader,
} = require('./helpers');

describe('GET /api/documentos/expediente/:expedienteId', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna documentos de un expediente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, expediente_id: 1, nombre_archivo: 'doc.pdf', tipo_mime: 'application/pdf', version: 1 },
        { id: 2, expediente_id: 1, nombre_archivo: 'plano.dwg', tipo_mime: 'image/vnd.dwg', version: 1 },
      ],
      rowCount: 2,
    });

    const app = getApp();
    const res = await request(app).get('/api/documentos/expediente/1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nombre_archivo).toBe('doc.pdf');
  });
});

describe('POST /api/documentos (crear registro)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('crea registro de documento', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, expediente_id: 1, nombre_archivo: 'doc.pdf', ruta_archivo: '/path/doc.pdf' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app)
      .post('/api/documentos')
      .send({
        expediente_id: 1,
        nombre_archivo: 'doc.pdf',
        ruta_archivo: '/path/doc.pdf',
        tipo_mime: 'application/pdf',
        tamano_bytes: 1024,
      });

    expect(res.status).toBe(201);
  });
});

describe('POST /api/documentos/upload (auth + multer + Garage)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('sube un archivo PDF exitosamente', async () => {
    // BEGIN
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });
    // SELECT expediente exists
    mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // INSERT documentos
    mockClientQuery.mockResolvedValueOnce({
      rows: [{
        id: 1, expediente_id: 1, nombre_archivo: 'test.pdf',
        ruta_garage: '1/doc-123/test.pdf', tipo_mime: 'application/pdf',
        tamano_bytes: 100, version: 1, es_version_actual: true,
        fecha_upload: new Date().toISOString(),
      }],
      rowCount: 1,
    });
    // COMMIT
    mockClientQuery.mockResolvedValueOnce({ rowCount: 0 });

    const app = getApp();
    const res = await request(app)
      .post('/api/documentos/upload')
      .set(authHeader())
      .field('expediente_id', '1')
      .attach('archivo', Buffer.from('%PDF-1.4 test content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre_archivo).toBe('test.pdf');
    expect(res.body.version).toBe(1);
  });

  test('rechaza archivo con extensión no permitida', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/documentos/upload')
      .set(authHeader())
      .field('expediente_id', '1')
      .attach('archivo', Buffer.from('virus content'), {
        filename: 'virus.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Extensión no permitida');
  });

  test('retorna 400 si falta expediente_id', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/documentos/upload')
      .set(authHeader())
      .attach('archivo', Buffer.from('test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expediente_id es requerido');
  });

  test('retorna 400 si falta archivo', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/documentos/upload')
      .set(authHeader())
      .field('expediente_id', '1');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('archivo es requerido');
  });

  test('retorna 401 sin auth', async () => {
    const app = getApp();
    const res = await request(app)
      .post('/api/documentos/upload')
      .field('expediente_id', '1')
      .attach('archivo', Buffer.from('test'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/documentos/:id/versiones', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('retorna versiones del documento', async () => {
    // Query 1: SELECT documento actual
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, version: 2, ruta_garage: '/path/v2', nombre_archivo: 'v2.pdf' }],
      rowCount: 1,
    });
    // Query 2: SELECT versiones historicas
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 10, version: 1, ruta_garage: '/path/v1', nombre_archivo: 'v1.pdf' },
      ],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/documentos/1/versiones');

    expect(res.status).toBe(200);
    // Debe incluir la versión actual + las históricas
    expect(res.body).toHaveLength(2);
    expect(res.body[0].version).toBe(2); // current, orden DESC
  });
});

describe('DELETE /api/documentos/:id', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('elimina documento lógicamente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const app = getApp();
    const res = await request(app).delete('/api/documentos/1');

    expect(res.status).toBe(200);
  });
});

describe('GET /api/documentos/:id/descargar', () => {
  beforeEach(() => {
    resetMockDb();
  });

  test('descarga versión actual del documento', async () => {
    // Query: SELECT documento actual
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nombre_archivo: 'test.pdf', tipo_mime: 'application/pdf', ruta_garage: 'test-key' }],
      rowCount: 1,
    });

    const app = getApp();
    const res = await request(app).get('/api/documentos/1/descargar');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('retorna 404 si documento no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const app = getApp();
    const res = await request(app).get('/api/documentos/999/descargar');

    expect(res.status).toBe(404);
  });
});

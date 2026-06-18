/**
 * Test helpers for ms-expedientes
 * Provides shared mock setup and utility functions
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'repoGPS_jwt_secret_key_2026';

// Mock query functions — shared between tests
// These are set up fresh in each test file
const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();

function resetMockDb() {
  mockQuery.mockReset();
  mockClientQuery.mockReset();
  mockRelease.mockReset();

  // Default: empty results
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockRelease.mockResolvedValue(undefined);
}

/**
 * Get the app with all mocks applied.
 * Uses jest.doMock + jest.resetModules to ensure fresh mocks per call.
 */
function getApp() {
  jest.resetModules();

  // Mock pg.Pool
  jest.doMock('pg', () => ({
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn().mockResolvedValue({
        query: mockClientQuery,
        release: mockRelease,
      }),
    })),
  }));

  // Mock storage/garageClient
  jest.doMock('../src/storage/garageClient', () => ({
    initGarageClient: jest.fn(),
    uploadFile: jest.fn().mockResolvedValue({ ETag: '"mock-etag"' }),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    deleteFile: jest.fn().mockResolvedValue({}),
    fileExists: jest.fn().mockResolvedValue(true),
    getFileUrl: jest.fn().mockReturnValue('http://mock-url/file.pdf'),
    getS3Client: jest.fn(),
  }));

  // Mock prom-client to avoid real metric registration
  jest.doMock('prom-client', () => {
    const mockMetric = {
      inc: jest.fn(),
      dec: jest.fn(),
      set: jest.fn(),
      observe: jest.fn(),
      startTimer: jest.fn(() => jest.fn()),
      reset: jest.fn(),
    };

    const mockRegistry = {
      registerMetric: jest.fn(),
      contentType: 'text/plain',
      metrics: jest.fn().mockResolvedValue('# mock metrics'),
    };

    return {
      Registry: jest.fn(() => mockRegistry),
      Counter: jest.fn(() => ({ ...mockMetric, inc: jest.fn() })),
      Histogram: jest.fn(() => ({ ...mockMetric, startTimer: jest.fn(() => jest.fn()) })),
      collectDefaultMetrics: jest.fn(),
      register: mockRegistry,
    };
  });

  return require('../index');
}

/**
 * Create a JWT token for testing auth middleware
 */
function createAuthToken(overrides = {}) {
  return jwt.sign(
    {
      id: 1,
      rol_id: 1,      // Admin by default
      area_id: 1,
      ...overrides,
    },
    JWT_SECRET
  );
}

/**
 * Create auth header for supertest
 */
function authHeader(tokenOverrides = {}) {
  const token = createAuthToken(tokenOverrides);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Helper to set up a mock "fetch" response for API Composition calls
 */
function mockFetchResponse(data, ok = true, status = 200) {
  global.fetch.mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

module.exports = {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
  createAuthToken,
  authHeader,
  mockFetchResponse,
  JWT_SECRET,
};

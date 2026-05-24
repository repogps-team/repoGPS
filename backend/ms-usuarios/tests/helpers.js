/**
 * Test helpers for ms-usuarios
 * Provides shared mock setup and utility functions
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'repoGPS_jwt_secret_key_2026';

const mockQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockRelease = jest.fn();
const mockBcryptCompare = jest.fn();
const mockBcryptHash = jest.fn();

function resetMockDb() {
  mockQuery.mockReset();
  mockClientQuery.mockReset();
  mockRelease.mockReset();
  mockBcryptCompare.mockReset();
  mockBcryptHash.mockReset();

  // Default: empty results
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockRelease.mockResolvedValue(undefined);
  mockBcryptCompare.mockResolvedValue(true);
  mockBcryptHash.mockResolvedValue('$2b$10$mockedhash');
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

  // Mock bcrypt
  jest.doMock('bcrypt', () => ({
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
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

  // Mock src/metrics to avoid requiring real metrics module with mocked pg
  jest.doMock('../src/metrics', () => ({
    metricsHandler: (req, res) => res.send('# mock metrics'),
    metricsMiddleware: (req, res, next) => next(),
  }));

  return require('../index');
}

/**
 * Helper to set up a mock "fetch" response for API Composition calls
 */
function mockFetchResponse(data, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

module.exports = {
  mockQuery,
  mockClientQuery,
  mockRelease,
  mockBcryptCompare,
  mockBcryptHash,
  resetMockDb,
  getApp,
  mockFetchResponse,
  JWT_SECRET,
};

/**
 * Test helpers for ms-auditoria
 * Provides shared mock setup and utility functions
 */

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

  // Mock prom-client
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

  // Mock src/metrics
  jest.doMock('../src/metrics', () => ({
    metricsHandler: (req, res) => res.send('# mock metrics'),
    metricsMiddleware: (req, res, next) => next(),
    eventsReceivedTotal: { inc: jest.fn() },
    eventsFailedTotal: { inc: jest.fn() },
  }));

  return require('../index');
}

module.exports = {
  mockQuery,
  mockClientQuery,
  mockRelease,
  resetMockDb,
  getApp,
};
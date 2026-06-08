const { rateLimiter } = require('../src/rateLimiter');

function createMockReq(ip = '127.0.0.1') {
  return { ip, connection: { remoteAddress: ip } };
}

function createMockRes() {
  const res = {
    _status: null,
    _headers: {},
    _body: null,
    status(code) { res._status = code; return res; },
    json(body) { res._body = body; return res; },
    setHeader(name, value) { res._headers[name] = value; return res; },
  };
  return res;
}

describe('rateLimiter', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should call next() for first request from an IP', () => {
    const req = createMockReq('10.0.0.1');
    const res = createMockRes();
    const next = jest.fn();

    rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should set X-RateLimit-Limit header', () => {
    const req = createMockReq('10.0.0.2');
    const res = createMockRes();
    const next = jest.fn();

    rateLimiter(req, res, next);
    expect(res._headers['X-RateLimit-Limit']).toBe(1000);
  });

  it('should set X-RateLimit-Remaining header', () => {
    const req = createMockReq('10.0.0.3');
    const res = createMockRes();
    const next = jest.fn();

    rateLimiter(req, res, next);
    expect(res._headers['X-RateLimit-Remaining']).toBe(999);
  });

  it('should return 429 when limit exceeded', () => {
    const ip = '10.0.0.4';
    const req = createMockReq(ip);
    const res = createMockRes();
    const next = jest.fn();

    for (let i = 0; i < 1001; i++) {
      rateLimiter(createMockReq(ip), createMockRes(), next);
    }

    const finalRes = createMockRes();
    rateLimiter(createMockReq(ip), finalRes, jest.fn());
    expect(finalRes._status).toBe(429);
    expect(finalRes._body.error).toMatch(/Too many requests/);
  });

  it('should decrement remaining count correctly', () => {
    const ip = '10.0.0.5';
    const req1 = createMockReq(ip);
    const res1 = createMockRes();
    const next = jest.fn();

    rateLimiter(req1, res1, next);
    expect(res1._headers['X-RateLimit-Remaining']).toBe(999);

    const req2 = createMockReq(ip);
    const res2 = createMockRes();
    rateLimiter(req2, res2, next);
    expect(res2._headers['X-RateLimit-Remaining']).toBe(998);
  });

  it('should use req.ip when available', () => {
    const req = { ip: '192.168.1.100', connection: {} };
    const res = createMockRes();
    const next = jest.fn();

    rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should fall back to req.connection.remoteAddress', () => {
    const req = { ip: undefined, connection: { remoteAddress: '172.16.0.1' } };
    const res = createMockRes();
    const next = jest.fn();

    rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should reset count after window expires', () => {
    const ip = '10.0.0.6';
    const req = createMockReq(ip);
    const res = createMockRes();
    const next = jest.fn();

    // Exhaust most of the limit
    for (let i = 0; i < 999; i++) {
      rateLimiter(createMockReq(ip), createMockRes(), next);
    }

    // Mock Date.now to advance past the window
    const originalNow = Date.now;
    const futureTime = originalNow() + 61000;
    Date.now = jest.fn(() => futureTime);

    const resetReq = createMockReq(ip);
    const resetRes = createMockRes();
    rateLimiter(resetReq, resetRes, next);
    expect(resetRes._headers['X-RateLimit-Remaining']).toBe(999);

    Date.now = originalNow;
  });
});

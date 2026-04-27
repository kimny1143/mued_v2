import { describe, it, expect } from 'vitest';
import {
  apiSuccess,
  apiError,
  apiValidationError,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiRateLimitExceeded,
  apiServerError,
} from '@/lib/api-response';

// ─── apiSuccess ──────────────────────────────────────────────────────────────

describe('apiSuccess', () => {
  it('returns 200 with success:true and data', async () => {
    const res = apiSuccess({ id: 1, name: 'test' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1, name: 'test' });
    expect(body.timestamp).toBeDefined();
  });

  it('includes message when provided', async () => {
    const res = apiSuccess({ ok: true }, { message: 'Created' });
    const body = await res.json();
    expect(body.message).toBe('Created');
  });

  it('uses custom status code', async () => {
    const res = apiSuccess({}, { status: 201 });
    expect(res.status).toBe(201);
  });

  it('omits message when not provided', async () => {
    const res = apiSuccess({ x: 1 });
    const body = await res.json();
    expect(body.message).toBeUndefined();
  });
});

// ─── apiError ────────────────────────────────────────────────────────────────

describe('apiError', () => {
  it('returns 500 with success:false for string error', async () => {
    const res = apiError('Something went wrong');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Something went wrong');
  });

  it('extracts message from Error object', async () => {
    const res = apiError(new Error('DB connection failed'));
    const body = await res.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('includes code when provided', async () => {
    const res = apiError('Conflict', { code: 'CONFLICT', status: 409 });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CONFLICT');
  });

  it('includes details when provided', async () => {
    const details = { field: 'email', reason: 'invalid' };
    const res = apiError('Bad request', { details, status: 400 });
    const body = await res.json();
    expect(body.details).toEqual(details);
  });
});

// ─── convenience helpers ─────────────────────────────────────────────────────

describe('apiValidationError', () => {
  it('returns 400 with VALIDATION_ERROR code', async () => {
    const res = apiValidationError('Invalid input', { field: 'name' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).toBe('Invalid input');
    expect(body.details).toEqual({ field: 'name' });
  });
});

describe('apiUnauthorized', () => {
  it('returns 401 with UNAUTHORIZED code', async () => {
    const res = apiUnauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('accepts custom message', async () => {
    const res = apiUnauthorized('Token expired');
    const body = await res.json();
    expect(body.error).toBe('Token expired');
  });
});

describe('apiForbidden', () => {
  it('returns 403 with FORBIDDEN code', async () => {
    const res = apiForbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });
});

describe('apiNotFound', () => {
  it('returns 404 with NOT_FOUND code', async () => {
    const res = apiNotFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });
});

describe('apiRateLimitExceeded', () => {
  it('returns 429 with RATE_LIMIT_EXCEEDED code', async () => {
    const res = apiRateLimitExceeded();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('apiServerError', () => {
  it('returns 500 with INTERNAL_SERVER_ERROR code', async () => {
    const res = apiServerError('Unexpected error');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('accepts Error object', async () => {
    const res = apiServerError(new Error('Fatal failure'));
    const body = await res.json();
    expect(body.error).toBe('Fatal failure');
  });

  it('includes details when provided', async () => {
    const res = apiServerError('crash', { stack: 'trace...' });
    const body = await res.json();
    expect(body.details).toEqual({ stack: 'trace...' });
  });
});

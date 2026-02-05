import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { login, register, getAccessToken } from './authService';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock server
const server = setupServer(
  // login
  http.post('*/user/login/', async ({ request }) => {
    const { email } = await request.json() as any;

    if (email === 'fail@test.com') {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      token: 'fake-token-123',
      user: { email: 'test@test.com' }
    });
  }),

  // register
  http.post('*/user/', async ({ request }) => {
    const { email } = await request.json() as any;

    if (email === 'fail@test.com') {
      return new HttpResponse(null, { status: 409 });
    }

    return HttpResponse.json({
      token: 'fake-token-123',
      user: { email: 'test@test.com' }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('authService', () => {
  it('should successfully login and store the token', async () => {
    const result = await login('test@test.com', 'password123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('test@test.com');
    }
    expect(getAccessToken()).toBe('fake-token-123');
  });

  it('should return AUTH error on 401', async () => {
    const result = await login('fail@test.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorType).toBe('AUTH');
    }
  });

  it('should successfully register and store the token', async () => {
    const result = await register('test@test.com', 'password123');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.user.email).toBe('test@test.com');
    }
    expect(getAccessToken()).toBe('fake-token-123');
  });

  it('should return CONFLICT error on 409', async () => {
    const result = await register('fail@test.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorType).toBe('CONFLICT');
    }
  });
});

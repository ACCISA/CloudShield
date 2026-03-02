// client.test.js
// Tests for api/client.js

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

global.fetch = jest.fn();

const localStorageMock = {
  getItem: jest.fn(() => 'test-jwt-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('client.js', () => {
  function importClient() {
    jest.resetModules();
    return require('../client');
  }

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();

    localStorageMock.getItem.mockClear();
    localStorageMock.getItem.mockReturnValue('test-jwt-token');

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });

    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });
    }
  });

  describe('getToken', () => {
    it('returns jwt token from localStorage', () => {
      const { getToken } = importClient();
      expect(getToken()).toBe('test-jwt-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('jwt');
    });

    it('returns null if jwt is missing', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const { getToken } = importClient();
      expect(getToken()).toBeNull();
    });
  });

  describe('apiGet', () => {
    it('adds Authorization when token exists', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ hello: 'world' }),
      });

      const data = await apiGet('/ping');

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5050/api/ping');
      expect(opts.method).toBe('GET');
      expect(opts.headers.Authorization).toBe('Bearer test-jwt-token');
      expect(opts.headers['Content-Type']).toBeUndefined();
      expect(opts.body).toBeUndefined();
      expect(data).toEqual({ hello: 'world' });
    });

    it('does not add Authorization when token is missing', async () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      await apiGet('/noauth');
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBeUndefined();
    });

    it('merges custom headers and keeps Authorization', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });

      await apiGet('/headers', { headers: { 'X-Test': 'yes' } });
      const [, opts] = fetch.mock.calls[0];

      expect(opts.headers).toMatchObject({
        Authorization: 'Bearer test-jwt-token',
        'X-Test': 'yes',
      });
    });
  });

  describe('apiPost/apiPatch/apiDelete', () => {
    it('apiPost sets Content-Type and JSON body', async () => {
      const { apiPost } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ created: true }),
      });

      const payload = { a: 1 };
      const res = await apiPost('/things', payload);

      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe('http://localhost:5050/api/things');
      expect(opts.method).toBe('POST');
      expect(opts.headers['Content-Type']).toBe('application/json');
      expect(opts.body).toBe(JSON.stringify(payload));
      expect(res).toEqual({ created: true });
    });

    it('apiDelete does not set body/content-type by default', async () => {
      const { apiDelete } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      });

      await apiDelete('/things/1');
      const [, opts] = fetch.mock.calls[0];

      expect(opts.method).toBe('DELETE');
      expect(opts.body).toBeUndefined();
      expect(opts.headers['Content-Type']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws backend error field', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad input' }),
      });

      await expect(apiGet('/boom')).rejects.toThrow('Bad input');
    });

    it('throws backend details field', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ details: 'Forbidden' }),
      });

      await expect(apiGet('/nope')).rejects.toThrow('Forbidden');
    });

    it('falls back to HTTP <status> when json fails', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('no json');
        },
      });

      await expect(apiGet('/err')).rejects.toThrow('HTTP 500');
    });
  });

  describe('empty response handling', () => {
    it('returns null for 204', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('should not be called');
        },
      });

      await expect(apiGet('/empty')).resolves.toBeNull();
    });

    it('returns parsed json when status is not 204', async () => {
      const { apiGet } = importClient();

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ ok: true }),
      });

      await expect(apiGet('/not-empty')).resolves.toEqual({ ok: true });
    });
  });
});

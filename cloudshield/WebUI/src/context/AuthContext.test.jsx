import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext', () => {
  const originalFetch = global.fetch;
  const originalEnv = globalThis.__APP_ENV__;

  afterEach(() => {
    global.fetch = originalFetch;
    globalThis.__APP_ENV__ = originalEnv;
    jest.resetAllMocks();
  });

  const renderWithProvider = (initialState = {}) =>
    renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider initialState={initialState}>{children}</AuthProvider>
      ),
    });

  it('throws when useAuth called outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });

  it('honours disableBootstrap initial state', () => {
    const initialState = {
      disableBootstrap: true,
      accessToken: 'token123',
      currentUser: { id: 'admin', role: 'admin', org_id: 'org' },
    };
    const { result } = renderWithProvider(initialState);

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.authLoading).toBe(false);
    expect(result.current.currentUser.id).toBe('admin');
  });

  it('bootstraps successfully using env credentials', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'env-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
      });

    globalThis.__APP_ENV__ = {
      VITE_AUTH_EMAIL: 'env@example.com',
      VITE_AUTH_PASSWORD: 'secret',
    };

    const { result } = renderWithProvider();

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.accessToken).toBe('env-token');
    expect(result.current.currentUser).toMatchObject({
      id: 'user-1',
      role: 'admin',
      org_id: 'org-1',
      email: 'env@example.com',
    });
  });

  it('captures bootstrap failure as authError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Invalid credentials' }),
    });

    const initialState = {
      bootstrapEmail: 'x@example.com',
      bootstrapPassword: 'bad',
    };

    const { result } = renderWithProvider(initialState);

    await waitFor(() => expect(result.current.authError).toBe('Invalid credentials'));
    expect(result.current.accessToken).toBeNull();
    expect(result.current.authLoading).toBe(false);
  });

  it('sets helpful error when bootstrap credentials are missing', async () => {
    global.fetch = jest.fn();
    globalThis.__APP_ENV__ = {};

    const { result } = renderWithProvider();

    await waitFor(() => expect(result.current.authError).toContain('Missing bootstrap credentials'));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refreshAuth resets state and retries bootstrap', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'new-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ claims: { sub: 'user-2', role: 'employee', org_id: 'org-2' } }),
      });
    global.fetch = fetchMock;

    const initialState = {
      accessToken: 'cached-token',
      bootstrapEmail: 'user@example.com',
      bootstrapPassword: 'pass123',
    };

    const { result } = renderWithProvider(initialState);

    expect(result.current.accessToken).toBe('cached-token');
    expect(result.current.authLoading).toBe(false);

    await act(async () => {
      result.current.refreshAuth();
    });

    await waitFor(() => expect(result.current.accessToken).toBe('new-token'));
    expect(result.current.currentUser).toMatchObject({ id: 'user-2', role: 'employee', org_id: 'org-2' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.authLoading).toBe(false);
  });
});

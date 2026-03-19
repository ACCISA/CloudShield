import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';

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
        json: () => Promise.resolve({
          user: { email: 'env@example.com' },
          claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' },
        }),
      });

    globalThis.__APP_ENV__ = {
      VITE_AUTH_EMAIL: 'env@example.com',
      VITE_AUTH_PASSWORD: 'dummy-password',
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
      bootstrapPassword: 'invalid-test-password',
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
      bootstrapPassword: 'refresh-test-password',
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

  describe('Logout Functionality', () => {
    it('clears auth state on logout', async () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.accessToken).toBeNull();
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('resets auth error on logout', async () => {
      const initialState = {
        authError: 'Previous error',
        accessToken: null,
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.authError).toBe('Previous error');

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.authError).toBeNull();
    });

    it('allows re-login after logout', async () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'refresh-test-password',
      };
      const { result } = renderWithProvider(initialState);

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-2', role: 'user', org_id: 'org-2' } }),
        });

      await act(async () => {
        result.current.refreshAuth();
      });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    });

    it('clears localStorage, sessionStorage, and cookies on logout', async () => {
      localStorage.setItem('jwt', 'token123');
      localStorage.setItem('org_id', 'org-1');
      sessionStorage.setItem('temp_key', 'temp_value');
      document.cookie = 'session_id=test_cookie';

      const { result } = renderWithProvider({
        disableBootstrap: true,
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
      });

      await act(async () => {
        result.current.logout();
      });

      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(document.cookie).not.toContain('session_id=');
    });

    it('dispatches auth:logout event on logout', async () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
      const { result } = renderWithProvider({
        disableBootstrap: true,
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
      });

      await act(async () => {
        result.current.logout();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:logout' }));
      dispatchSpy.mockRestore();
    });
  });

  describe('Token Management', () => {
    it('maintains token across re-renders', () => {
      const initialState = {
        accessToken: 'persistent-token',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
      };
      const { result, rerender } = renderWithProvider(initialState);

      const firstToken = result.current.accessToken;
      rerender();
      const secondToken = result.current.accessToken;

      expect(firstToken).toBe(secondToken);
      expect(secondToken).toBe('persistent-token');
    });

    it('updates token on successful refresh', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'updated-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        });

      const initialState = {
        accessToken: 'old-token',
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await act(async () => {
        result.current.refreshAuth();
      });

      await waitFor(() => expect(result.current.accessToken).toBe('updated-token'));
    });
  });

  describe('Error Recovery', () => {
    it('recovers from temporary auth errors', async () => {
      const fetchMock = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        });

      global.fetch = fetchMock;

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authError).toBeTruthy());

      await act(async () => {
        result.current.refreshAuth();
      });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
      expect(result.current.authError).toBeNull();
    });

    it('sets appropriate error message for 401 responses', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'wrong-password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authError).toBeTruthy());
      expect(result.current.authError).toContain('Unauthorized');
    });

    it('handles server errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authError).toBeTruthy());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('User Role Management', () => {
    it('identifies admin users correctly', async () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1', email: 'admin@example.com' },
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.currentUser.role).toBe('admin');
    });

    it('identifies regular users correctly', async () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-2', role: 'user', org_id: 'org-1', email: 'user@example.com' },
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.currentUser.role).toBe('user');
    });

    it('updates role on token refresh', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        });

      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'user', org_id: 'org-1', email: 'user@example.com' },
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.currentUser.role).toBe('user');

      await act(async () => {
        result.current.refreshAuth();
      });

      await waitFor(() => expect(result.current.currentUser.role).toBe('admin'));
    });
  });

  describe('Bootstrap Loading States', () => {
    it('sets authLoading to true during bootstrap', async () => {
      global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.authLoading).toBe(true);
    });

    it('sets authLoading to false after successful bootstrap', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        });

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authLoading).toBe(false));
    });

    it('sets authLoading to false after bootstrap failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'wrong-password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authLoading).toBe(false));
      expect(result.current.authError).toBeTruthy();
    });
  });

  describe('Multiple Concurrent Operations', () => {
    it('handles simultaneous refresh calls', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token2' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ claims: { sub: 'user-1', role: 'admin', org_id: 'org-1' } }),
        });

      global.fetch = fetchMock;

      const initialState = {
        accessToken: 'old-token',
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await act(async () => {
        result.current.refreshAuth();
        result.current.refreshAuth();
      });

      await waitFor(() => expect(result.current.accessToken).toBeTruthy());
    });
  });

  describe('Edge Cases', () => {
    it('handles null currentUser gracefully', () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: null,
      };
      const { result } = renderWithProvider(initialState);

      expect(result.current.currentUser).toMatchObject({
        id: 'admin-001',
        email: 'admin@company.com',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('handles malformed server response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // Missing access_token
      });

      const initialState = {
        bootstrapEmail: 'user@example.com',
        bootstrapPassword: 'password',
      };
      const { result } = renderWithProvider(initialState);

      await waitFor(() => expect(result.current.authError).toBeTruthy());
    });

    it('preserves authentication state across hook calls', () => {
      const initialState = {
        accessToken: 'token123',
        currentUser: { id: 'user-1', role: 'admin', org_id: 'org-1' },
      };
      const { result: result1 } = renderWithProvider(initialState);
      const { result: result2 } = renderWithProvider(initialState);

      expect(result1.current.accessToken).toBe(result2.current.accessToken);
      expect(result1.current.currentUser).toEqual(result2.current.currentUser);
    });
  });
});

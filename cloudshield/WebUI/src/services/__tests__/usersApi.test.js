import { createUser, deleteUser, listUsers, updateUser } from '../usersApi';

describe('usersApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('fetches user list with query params, auth headers, and returns items array', async () => {
    const controller = new AbortController();
    const responsePayload = { items: [{ id: '1' }, { id: '2' }] };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(responsePayload)),
    });

    const result = await listUsers({ signal: controller.signal, token: 'tok123', search: 'a', limit: 10, offset: 5 });

    expect(result).toEqual(responsePayload.items);
    expect(global.fetch).toHaveBeenCalledWith('/api/users?search=a&limit=10&offset=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok123',
      },
      signal: controller.signal,
    });
  });

  it('returns empty array when payload does not include an items array', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ items: null })),
    });

    const result = await listUsers();
    expect(result).toEqual([]);
  });

  it('throws descriptive error when response not ok and payload has error message', async () => {
    const errorPayload = { error: 'Boom' };
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 418,
      text: () => Promise.resolve(JSON.stringify(errorPayload)),
    });

    await expect(listUsers()).rejects.toMatchObject({
      message: 'Boom',
      status: 418,
      payload: errorPayload,
    });
  });

  it('throws default error message when response not ok and body empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    });

    await expect(listUsers()).rejects.toMatchObject({
      message: 'Request failed with 500',
      status: 500,
      payload: null,
    });
  });

  it('sends delete request with optional reason', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ message: 'deleted' })),
      });

    const first = await deleteUser('user-1', { reason: 'cleanup', token: 'tok123' });
    expect(first).toBeNull();
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/users/user-1', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok123',
      },
      body: JSON.stringify({ reason: 'cleanup' }),
    });

    const result = await deleteUser('user-2');
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/users/user-2', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: undefined,
    });
    expect(result).toEqual({ message: 'deleted' });
  });

  it('creates a user via POST', async () => {
    const payload = { email: 'a@example.com', full_name: 'A User', password: 'Secret12!', role: 'employee' };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: () => Promise.resolve(JSON.stringify({ user_id: 'user-123' })),
    });

    const result = await createUser(payload, { token: 'tok123' });

    expect(global.fetch).toHaveBeenCalledWith('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok123',
      },
      body: JSON.stringify(payload),
    });

    expect(result).toEqual({ user_id: 'user-123' });
  });

  it('throws when create user returns error payload', async () => {
    const payload = { email: 'a@example.com', full_name: 'A User', password: 'Secret12!', role: 'employee' };
    const errorPayload = { error: 'User limit reached' };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve(JSON.stringify(errorPayload)),
    });

    await expect(createUser(payload, { token: 'tok123' })).rejects.toMatchObject({
      message: 'User limit reached',
      status: 403,
      payload: errorPayload,
    });
  });

  it('throws default message when create user fails without body', async () => {
    const payload = { email: 'a@example.com', full_name: 'A User', password: 'Secret12!', role: 'employee' };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    });

    await expect(createUser(payload)).rejects.toMatchObject({
      message: 'Request failed with 500',
      status: 500,
      payload: null,
    });
  });

  // --- THESE TESTS ARE NOW CORRECTLY INSIDE THE DESCRIBE BLOCK ---

  it('updates a user via PATCH', async () => {
    const payload = { full_name: 'Updated Name', role: 'admin' };
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ user_id: 'user-123', ...payload })),
    });

    const result = await updateUser('user-123', payload, { token: 'tok123' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users/user-123',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );

    expect(result).toEqual({ user_id: 'user-123', ...payload });
  });

  it('throws descriptive error when update fails', async () => {
    const payload = { role: 'invalid_role' };
    const errorPayload = { error: 'Invalid role provided' };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify(errorPayload)),
    });

    await expect(updateUser('user-123', payload, { token: 'tok123' })).rejects.toMatchObject({
      message: 'Invalid role provided',
      status: 400,
      payload: errorPayload,
    });
  });

  it('encodes the user ID in update request', async () => {
    const payload = { full_name: 'Test' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{}'),
    });

    await updateUser('user/123', payload, { token: 'tok123' });

    expect(global.fetch).toHaveBeenCalledWith('/api/users/user%2F123', expect.anything());
  });

});

const API_PREFIX = '/api';

function buildHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function listUsers({ signal, token } = {}) {
  const response = await fetch(`${API_PREFIX}/users`, {
    method: 'GET',
    headers: buildHeaders(token),
    signal,
  });

  const data = await parseResponse(response);
  return Array.isArray(data?.items) ? data.items : [];
}
 
export async function deleteUser(userId, { reason, token } = {}) {
  const response = await fetch(`${API_PREFIX}/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
    body: reason ? JSON.stringify({ reason }) : undefined,
  });

  return parseResponse(response);
}

const API_PREFIX = '/api';

function buildHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(
      payload?.error || `Request failed with ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function listUsers({
  signal,
  token,
  search = "",
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  params.set("search", search);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const response = await fetch(`${API_PREFIX}/users?${params.toString()}`, {
    method: "GET",
    headers: buildHeaders(token),
    signal,
  });

  const data = await parseResponse(response);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function deleteUser(userId, { reason, token } = {}) {
  const response = await fetch(
    `${API_PREFIX}/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: buildHeaders(token),
      body: reason ? JSON.stringify({ reason }) : undefined,
    }
  );

  return parseResponse(response);
}

export async function createUser(user, { token } = {}) {
  const response = await fetch(`${API_PREFIX}/users`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(user),
  });

  return parseResponse(response);
}

export async function updateUser(userId, payload, { token } = {}) {
  const response = await fetch(`${API_PREFIX}/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH', 
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}
/**
 * API functions for file shares
 */

const API_BASE = "/api";

/**
 * Fetch all file shares for an organization
 */
export async function fetchFileShares(orgId) {
  const res = await fetch(`${API_BASE}/file_shares?org_id=${orgId}`);
  if (!res.ok) throw new Error(`Failed to fetch shares: ${res.statusText}`);
  const data = await res.json();
  return data.shares || [];
}

/**
 * Create a new file share (dispatches async job)
 */
export async function createFileShare({ orgId, name, users, groups, description, maxSize }) {
  const body = {
    org_id: orgId,
    share_name: name,
    users: users || [],
    groups: groups || [],
  };
  
  // Only include optional fields if they have values
  if (description) body.description = description;
  if (maxSize) body.max_size = parseInt(maxSize, 10); // Store as GB (just the number user entered)

  const res = await fetch(`${API_BASE}/task/dc/create_file_share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create share: ${res.statusText}`);
  return await res.json();
}

/**
 * Update file share metadata
 */
export async function updateFileShare(orgId, shareName, updates) {
  console.log("updateFileShare API call:", { orgId, shareName, updates });
  const res = await fetch(`${API_BASE}/file_shares/${orgId}/${shareName}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update share: ${res.statusText}`);
  const result = await res.json();
  console.log("updateFileShare API response:", result);
  return result;
}

/**
 * Delete a file share (dispatches async job)
 */
export async function deleteFileShare(orgId, shareName) {
  const res = await fetch(`${API_BASE}/task/dc/delete_file_share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      org_id: orgId,
      share_name: shareName,
    }),
  });
  if (!res.ok) throw new Error(`Failed to delete share: ${res.statusText}`);
  return await res.json();
}

/**
 * Fetch all users for an organization
 */
export async function fetchUsers(orgId) {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${API_BASE}/organizations/${orgId}/users`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.statusText}`);
  const data = await res.json();
  return data.items || [];
}

/**
 * Fetch access groups (security groups) for assigning to file shares
 */
export async function fetchGroups(orgId) {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${API_BASE}/access-groups`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch access groups: ${res.statusText}`);
  const data = await res.json();
  return data.access_groups || [];
}

/**
 * Transform backend shares to frontend tree structure
 * Backend returns flat list, frontend expects nested tree
 */
export function transformSharesToTree(shares) {
  return shares.map((item) => {
    const share = item.share;
    const usersArray = Array.isArray(share.users) ? share.users : [];
    return {
      id: share.id || share.name,
      name: share.name,
      kind: share.kind || "file",
      updated_at: share.updated_at,
      users: usersArray, // Keep the actual array
      usersCount: usersArray.length, // Add count for display
      groups: share.groups || [],
      description: share.description,
      owner: share.owner,
      current_size: share.current_size,
      max_size: share.max_size,
      drive: share.drive,
      // Backend doesn't support folders yet, so no children
      children: share.kind === "folder" ? [] : undefined,
    };
  });
}

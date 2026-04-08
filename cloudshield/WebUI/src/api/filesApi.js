/**
 * API functions for file shares
 */

import { apiGet, apiPatch, apiPost } from "./client";

async function readApiData(response) {
  if (!response) return {};
  if (typeof response.json === "function") {
    return response.json();
  }
  return response;
}

function normalizeJobStatusPayload(data = {}) {
  const resultStatus = String(data?.result?.status || "").toLowerCase();
  let status = data?.status;

  if (status === "finished") {
    status = ["failed", "unknown", "share_not_found"].includes(resultStatus)
      ? "failed"
      : "succeeded";
  } else if (status === "failed") {
    status = "failed";
  } else if (["started", "queued", "deferred"].includes(status)) {
    status = "running";
  }

  if (!status) {
    if (["failed", "unknown", "share_not_found"].includes(resultStatus)) {
      status = "failed";
    } else if (resultStatus === "success") {
      status = "succeeded";
    } else {
      status = "running";
    }
  }

  const progressMessage =
    typeof data?.progress === "string" ? data.progress : "";

  return {
    ...data,
    status,
    message:
      data?.message ||
      data?.result?.message ||
      data?.error ||
      progressMessage ||
      "",
  };
}

/**
 * Fetch all file shares for an organization
 */
export async function fetchFileShares(orgId) {
  const response = await apiGet(`/file_shares?org_id=${encodeURIComponent(orgId)}`);
  const data = await readApiData(response);
  return data.shares || [];
}

/**
 * Create a new file share (dispatches async job)
 */
export async function createFileShare({
  orgId,
  name,
  users,
  groups,
  description,
  maxSize,
}) {
  const body = {
    org_id: orgId,
    share_name: name,
    users: users || [],
    groups: groups || [],
  };

  // Only include optional fields if they have values
  if (description) body.description = description;
  if (maxSize) body.max_size = parseInt(maxSize, 10); // Store as GB (just the number user entered)

  const response = await apiPost("/task/dc/create_file_share", body);
  return readApiData(response);
}

/**
 * Fetch background job status for async file-share operations
 */
export async function fetchJobStatus(jobId) {
  try {
    const response = await apiGet(`/status/${encodeURIComponent(jobId)}`);
    const data = await readApiData(response);
    return normalizeJobStatusPayload(data);
  } catch (error) {
    if (error?.status === 404) {
      return {
        status: "running",
        message: "Task is still starting.",
        progress: "queued",
      };
    }
    throw error;
  }
}

/**
 * Update file share metadata
 */
export async function updateFileShare(orgId, shareName, updates) {
  const response = await apiPatch(
    `/file_shares/${encodeURIComponent(orgId)}/${encodeURIComponent(shareName)}`,
    updates,
  );
  const result = await readApiData(response);
  return result;
}

/**
 * Delete a file share (dispatches async job)
 */
export async function deleteFileShare(orgId, shareName) {
  const response = await apiPost("/task/dc/delete_file_share", {
    org_id: orgId,
    share_name: shareName,
  });
  return readApiData(response);
}

/**
 * Fetch all users for an organization
 * @param {string} orgId - Organization ID
 * @param {boolean} summary - If true, returns only essential fields (for dropdowns/selection)
 */
export async function fetchUsers(orgId, summary = true) {
  const url = summary
    ? `/organizations/${encodeURIComponent(orgId)}/users?summary=1`
    : `/organizations/${encodeURIComponent(orgId)}/users`;
  const response = await apiGet(url);
  const data = await readApiData(response);
  return data.items || [];
}

/**
 * Fetch access groups (security groups) for assigning to file shares
 * @param {string} orgId - Organization ID (not currently used by backend, but kept for consistency)
 * @param {boolean} summary - If true, returns member_count instead of full members_info
 */
export async function fetchGroups(orgId, summary = true) {
  void orgId; // Kept in signature for call-site consistency.
  const url = summary
    ? "/access-groups?summary=1"
    : "/access-groups";
  const response = await apiGet(url);
  const data = await readApiData(response);
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

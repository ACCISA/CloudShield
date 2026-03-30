/*
Custom hook to fetch organization metrics like user count, workstation count, etc.
This abstracts away the API call and state management for these metrics, making it easy to use in any component (e.g. DashboardPage) without duplicating code.
Usage:
const { stats, loading, error } = useOrgMetrics();
stats will be an object like { users: 10, workstations: 5, groups: 2, shares: 3 }
loading is a boolean indicating if the data is still being fetched
error will contain any error that occurred during fetching
*/

import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

function getStoredOrgId() {
  try {
    return localStorage.getItem("org_id");
  } catch {
    return null;
  }
}

async function fetchScopedWorkstationCount(orgId) {
  if (!orgId) return null;

  const paths = [
    `/workstations/templates?org_id=${encodeURIComponent(orgId)}`,
    `/workstations?org_id=${encodeURIComponent(orgId)}`,
  ];

  for (const path of paths) {
    try {
      const response = await apiGet(path);
      const data = await response.json();
      const items = Array.isArray(data)
        ? data
        : data.templates || data.items || data.workstations || [];
      return Array.isArray(items) ? items.length : 0;
    } catch (error) {
      if (error?.status === 404 || error?.status === 405) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

export function useOrgMetrics() {
  const [stats, setStats] = useState({
    users: 0,
    workstations: 0,
    groups: 0,
    shares: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    const handleInvalidate = (event) => {
      const patchedWorkstations = event?.detail?.workstations;
      if (typeof patchedWorkstations === "number") {
        setStats((prev) => ({
          ...prev,
          workstations: patchedWorkstations,
        }));
      }

      if (event?.detail?.skipRefetch) {
        return;
      }

      setRefetchKey((k) => k + 1);
    };
    window.addEventListener("metrics:invalidate", handleInvalidate);
    return () =>
      window.removeEventListener("metrics:invalidate", handleInvalidate);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const _raw = await apiGet("/organizations/me/metrics"); // { stats: { users, workstations, access_groups, shares } }
        const res = await _raw.json();
        const orgId = getStoredOrgId();
        let workstationCount = res.stats?.workstations ?? 0;

        try {
          const scopedCount = await fetchScopedWorkstationCount(orgId);
          if (typeof scopedCount === "number") {
            workstationCount = scopedCount;
          }
        } catch {
          // Fall back to metrics payload if workstation-specific source is unavailable.
        }

        if (!mounted) return;

        setStats({
          users: res.stats?.users ?? 0,
          workstations: workstationCount,
          groups: res.stats?.access_groups ?? 0, // mapping happens once here
          shares: res.stats?.shares ?? 0,
        });
      } catch (e) {
        if (!mounted) return;
        setError(e);
        setStats({ users: 0, workstations: 0, groups: 0, shares: 0 });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [refetchKey]);

  return { stats, loading, error };
}

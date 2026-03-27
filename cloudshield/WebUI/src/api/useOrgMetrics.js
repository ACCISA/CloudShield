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
    const handleInvalidate = () => setRefetchKey((k) => k + 1);
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

        if (!mounted) return;

        setStats({
          users: res.stats?.users ?? 0,
          workstations: res.stats?.workstations ?? 0,
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

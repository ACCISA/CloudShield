import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5050";
const WORKSTATIONS_URL = `${API_BASE_URL}/api/workstations/assigned`;

type Workstation = {
  id?: string;
  _id?: string;
  name?: string;
  status?: string;
  ip?: string;
  last_seen?: string;
  assigned_user?: string;
};

type WorkstationsResponse = {
  items?: Workstation[];
  workstations?: Workstation[];
  data?: Workstation[];
};

const statusStyles: Record<string, string> = {
  online: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  offline: "bg-slate-500/15 text-slate-200 border-slate-400/40",
  busy: "bg-amber-500/15 text-amber-200 border-amber-500/40",
};

const resolveItems = (payload: unknown): Workstation[] => {
  if (Array.isArray(payload)) return payload as Workstation[];
  if (payload && typeof payload === "object") {
    const typed = payload as WorkstationsResponse;
    return typed.items || typed.workstations || typed.data || [];
  }
  return [];
};

export default function WorkstationsPage() {
  const [items, setItems] = useState<Workstation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const authSnapshot = window.authStore?.loadAuth();
  const storedAuth = (() => {
    if (authSnapshot?.accessToken) {
      return authSnapshot;
    }
    const raw = localStorage.getItem("cloudshield.auth");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as {
        accessToken?: string;
        tokenType?: string;
        expiresAt?: number;
        email?: string;
      };
    } catch {
      return undefined;
    }
  })();

  const tokenType = storedAuth?.tokenType || "Bearer";
  const accessToken = storedAuth?.accessToken;
  const tokenExpired = storedAuth?.expiresAt
    ? Date.now() > storedAuth.expiresAt
    : false;

  useEffect(() => {
    let isMounted = true;

    const fetchWorkstations = async () => {
      if (!accessToken) {
        setError("Missing access token. Please sign in.");
        setIsLoading(false);
        return;
      }

      if (tokenExpired) {
        setError("Session expired. Please sign in again.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(WORKSTATIONS_URL, {
          headers: {
            Authorization: `${tokenType} ${accessToken}`,
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          const message = payload?.error || "Failed to load workstations.";
          throw new Error(message);
        }

        const rows = resolveItems(payload);
        if (isMounted) {
          setItems(rows);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Unexpected error.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchWorkstations();

    return () => {
      isMounted = false;
    };
  }, [accessToken, tokenExpired, tokenType, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const handleLogout = () => {
    window.authStore?.clearAuth();
    localStorage.removeItem("cloudshield.auth");
    window.dispatchEvent(new Event("auth-changed"));
  };

  const listItems = useMemo(() => {
    return items.map((item) => {
      const key = item.id || item._id || item.name || "workstation";
      const status = (item.status || "offline").toLowerCase();
      const badgeClass = statusStyles[status] || statusStyles.offline;
      return { ...item, key, status, badgeClass };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return listItems;
    return listItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const id = (item.id || item._id || "").toLowerCase();
      return name.includes(query) || id.includes(query);
    });
  }, [listItems, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search workstations"
                className="w-full rounded-xl border border-white/10 bg-[#0f0f0f] py-2 pl-9 pr-3 text-sm text-white/80 placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
              Display
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#101010] text-white/70 transition hover:bg-white/10"
              aria-label="Refresh"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Logout
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#101010] px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Create
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
            Loading workstations...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-6 text-sm text-red-200">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
            No assigned workstations found.
          </div>
        )}

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
            {filteredItems.map((item, index) => {
              const isBusy = item.status === "busy";
              const actionClasses = isBusy
                ? "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20";
              const actionLabel = isBusy ? "Disconnect" : "Connect";
              const statusDot = isBusy ? "bg-red-500" : "bg-emerald-500";
              const usersCount = (item as { users_count?: number }).users_count;
              const currentUser = item.assigned_user || "—";
              const lastUsed = item.last_seen || "—";
              const workstationId = item.id || item._id || "—";

              return (
                <div
                  key={item.key}
                  className={`flex flex-col gap-4 border-b border-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between ${
                    index === filteredItems.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/10 bg-[#0f0f0f] text-white"
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#0f0f0f]" />
                      <div>
                        <div className="text-sm font-semibold text-white/90">
                          {item.name || "Workstation"}
                        </div>
                        <div className="text-xs text-white/50">
                          ↳ {workstationId}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 text-xs text-white/60">
                      <div>
                        <div className="text-[11px] uppercase text-white/40">
                          Users
                        </div>
                        <div className="text-sm text-white/80">
                          {typeof usersCount === "number" ? usersCount : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-white/40">
                          Current
                        </div>
                        <div className="text-sm text-white/80">
                          {currentUser}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-white/40">
                          Last used
                        </div>
                        <div className="text-sm text-white/80">{lastUsed}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${actionClasses}`}
                      onClick={() => {
                        console.log("Connect clicked", item);
                      }}
                    >
                      {actionLabel}
                    </button>
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#101010] text-white/60 transition hover:bg-white/10"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

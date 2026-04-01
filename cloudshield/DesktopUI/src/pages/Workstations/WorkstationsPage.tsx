import { useEffect, useMemo, useState } from "react";
import type { ElectronResult } from "../../models/ElectronResult";
import type {
  WorkstationTemplate,
  Workstation,
} from "../../models/Workstations";
import WorkstationService from "../../services/WorkstationService";
import SearchField from "../../components/common/SearchField";
import DisplayButton from "../../components/common/DisplayButton";
import RefreshButton from "../../components/common/RefreshButton";
import DisplayIcon from "../../components/common/DisplayIcon";
import EmptyState from "../../components/common/EmptyState";
import Panel from "../../components/common/Panel";
import OrgService from "../../services/OrgService";
import { deriveUsername } from "../../utils/usernameUtil";
import { decodeJwtClaims } from "../../utils/jwtLocalStorage";
import { getSessionPassword } from "../../utils/passwordMemory";

const BYPASS_AUTH_VPN =
  (import.meta.env.VITE_DESKTOP_BYPASS_AUTH ??
    (import.meta.env.DEV ? "true" : "false")) === "true";
export default function WorkstationsPage() {
  const [templateItems, setTemplateItems] = useState<WorkstationTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [layout, setLayout] = useState<"list" | "icons">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingWorkstations, setIsLoadingWorkstations] =
    useState<boolean>(false);
  const [selectedWorkstation, setSelectedWorkstation] =
    useState<Workstation | null>(null);
  const [rdpStatus, setRdpStatus] = useState<string | null>(null);
  const [rdpPID, setRdpPID] = useState<number | undefined>(undefined);
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

  const accessToken = storedAuth?.accessToken;
  const tokenExpired = storedAuth?.expiresAt
    ? Date.now() > storedAuth.expiresAt
    : false;

  useEffect(() => {
    let isMounted = true;

    const fetchWorkstationTemplates = async () => {
      if (!BYPASS_AUTH_VPN && !accessToken) {
        setError("Missing access token. Please sign in.");
        setIsLoadingTemplates(false);
        return;
      }

      if (!BYPASS_AUTH_VPN && tokenExpired) {
        setError("Session expired. Please sign in again.");
        setIsLoadingTemplates(false);
        return;
      }

      try {
        setIsLoadingTemplates(true);
        setError(null);

        const response = await WorkstationService.getWorkstationTemplates();

        if (isMounted) {
          setTemplateItems(response);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Unexpected error.";
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTemplates(false);
        }
      }
    };

    fetchWorkstationTemplates();

    return () => {
      isMounted = false;
    };
  }, [accessToken, tokenExpired, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const handleLogout = () => {
    window.authStore?.clearAuth();
    localStorage.removeItem("cloudshield.auth");
    window.dispatchEvent(new Event("auth-changed"));
  };

  const killRDP = async () => {
    if (rdpPID) {
      await window.electronAPI?.killProcess(rdpPID);
    }
  };

  const handleConnect = async () => {
    if (!selectedWorkstation) return;
    if (!window.electronAPI?.runXfreerdp) {
      setRdpStatus("Error: Electron API not available");
      return;
    }

    const ip = (selectedWorkstation.ipv4_address || "").trim();
    if (!ip) {
      setRdpStatus("Error: Workstation IP is missing");
      return;
    }

    const org = await OrgService.getOrganization();
    const domain = org.domain_name;
    // Extract username from JWT claims
    let username = "";
    if (accessToken) {
      const claims = decodeJwtClaims(accessToken);
      username = deriveUsername(claims);
    }
    const rdpPassword = getSessionPassword();
    if (rdpPassword == null) {
      throw new Error("RDP Pass not set");
    }
    let rdpUsername = `${domain}\\${username}`;

    try {
      setRdpStatus("Launching RDP client...");
      const result = (await window.electronAPI.runXfreerdp(
        rdpUsername,
        rdpPassword,
        ip,
      )) as ElectronResult;
      setRdpStatus(`Connected! (PID: ${result.pid ?? "-"})`);
      setRdpPID(result.pid);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setRdpStatus(`Error: ${message}`);
    }
  };

  const listItems = useMemo(() => {
    return templateItems.map((item) => {
      const key = `${item.org_id || "org"}-${item.name || "template"}`;
      const description = (
        item.description || "(No Description)"
      ).toLowerCase();
      return { ...item, key, description };
    });
  }, [templateItems]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return listItems;
    return listItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const id = (item.description || "").toLowerCase();
      const software = (
        item.software.map((s) => s.name).join(", ") || ""
      ).toLowerCase();
      return (
        name.includes(query) || id.includes(query) || software.includes(query)
      );
    });
  }, [listItems, searchQuery]);

  const handleTemplateUse = async (template_id: string) => {
    try {
      setIsLoadingWorkstations(true);
      const workstation =
        await WorkstationService.assignWorkStation(template_id);
      setSelectedWorkstation(workstation);
    } finally {
      setIsLoadingWorkstations(false);
    }
  };

  const handleTemplateDisconnect = async () => {
    try {
      setIsLoadingWorkstations(true);
      await WorkstationService.releaseWorkStation();
      setSelectedWorkstation(null);
      setRdpStatus(null);
      killRDP();
    } finally {
      setIsLoadingWorkstations(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex min-w-max flex-1 flex-nowrap items-center gap-3">
            <SearchField
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search workstation templates"
              className="w-90 shrink-0"
            />
            <DisplayButton
              layout={layout}
              onLayoutChange={setLayout}
              className="shrink-0"
            />
          </div>
          <div className="flex min-w-max flex-nowrap items-center gap-3">
            <RefreshButton onClick={handleRefresh} className="shrink-0" />
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>

        {isLoadingTemplates && (
          <Panel className="bg-white/5 px-5 py-6 text-sm text-white/70 shadow-none">
            Loading workstation templates...
          </Panel>
        )}

        {!isLoadingTemplates && error && (
          <Panel className="border-red-500/40 bg-red-500/10 px-5 py-6 text-sm text-red-200">
            {error}
          </Panel>
        )}

        {!isLoadingTemplates && !error && filteredItems.length === 0 && (
          <EmptyState
            message="No assigned workstation templates found."
            description="Workstation templates will appear here once they are assigned."
          />
        )}

        {!isLoadingTemplates && !error && filteredItems.length > 0 && (
          <>
            {layout === "list" && (
              <div className="flex items-center justify-between px-5 pt-2">
                <span className="text-[0.85rem] text-white/70">
                  Name/Number
                </span>
                <div className="w-24" />
              </div>
            )}

            <Panel className="-mt-3.75">
              {layout === "list" ? (
                <div data-testid="workstations-list-view">
                  {filteredItems.map((item, index) => {
                    const actionClasses = item.is_ready
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100";
                    const actionLabel = item.is_ready ? "Connect" : "Not Ready";
                    const templateId = item.org_id || "—";

                    return (
                      <div
                        key={item.key}
                        className={`flex flex-col gap-4 border-b border-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between ${
                          index === filteredItems.length - 1 ? "border-b-0" : ""
                        }`}
                      >
                        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
                          <div className="flex items-center gap-3">
                            <DisplayIcon
                              type="workstation"
                              data={item}
                              size="medium"
                            />
                            <div>
                              <div className="text-sm font-semibold text-white/90">
                                {item.name || "Workstation"}
                              </div>
                              <div className="text-xs text-white/50">
                                ↳ {templateId}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={!item.is_ready}
                            onClick={() => handleTemplateUse(item._id)}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${actionClasses}`}
                          >
                            {actionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  data-testid="workstations-icons-view"
                  className="grid gap-4 p-5 sm:grid-cols-2"
                >
                  {filteredItems.map((item) => {
                    const actionClasses = item.is_ready
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100";
                    const actionLabel = item.is_ready ? "Connect" : "Not Ready";
                    const templateId = item.org_id || "—";

                    return (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-white/8 bg-white/2 p-4"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white/90">
                                {item.name || "Workstation"}
                              </div>
                              <div className="truncate text-xs text-white/50">
                                ↳ {templateId}
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!item.is_ready}
                          onClick={() => handleTemplateUse(item._id)}
                          className={`mt-4 w-full rounded-full border px-4 py-2 text-xs font-semibold transition ${actionClasses}`}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </>
        )}

        {!isLoadingWorkstations && !selectedWorkstation && (
          <Panel className="px-5 py-6">
            <h1>Not connected to a workstation</h1>
          </Panel>
        )}
        {isLoadingWorkstations && (
          <Panel className="px-5 py-6">
            <h1>Searching for workstations...</h1>
            <svg
              className="mt-4 h-8 w-8 animate-spin text-white/70"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-30"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-90"
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          </Panel>
        )}

        {selectedWorkstation && !isLoadingWorkstations && (
          <Panel className="px-5 py-6">
            <h1>Connected to workstation {selectedWorkstation.ipv4_address}</h1>
            <p className="mt-2 text-sm text-white/70">
              You are now connected to your workstation. Use the options below
              to manage your connection or access additional features.
            </p>
            {rdpStatus && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                {rdpStatus}
              </div>
            )}
            <div className="flex gap-5">
              <button
                onClick={() => {
                  handleConnect();
                }}
                className="mt-4 rounded-lg border border-white/10 bg-[#101010] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Launch RDP
              </button>
              <button
                onClick={() => {
                  handleTemplateDisconnect();
                }}
                className="mt-4 rounded-lg border border-white/10 bg-[#A41010] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

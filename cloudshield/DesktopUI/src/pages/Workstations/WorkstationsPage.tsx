import { useEffect, useMemo, useState } from "react";
import RDPOpenVPNCard from "../RDPOpvenVPN/RDPOpenVPNCard";
import type { ElectronResult } from "../../models/ElectronResult";
import type {
  WorkstationTemplate,
  Workstation,
} from "../../models/Workstations";
import WorkstationService from "../../services/WorkstationService";
import SoftwarePopup from "./SoftwarePopup";
import SearchIcon from "../../assets/icons8-search.svg";


export default function WorkstationsPage() {
  const [templateItems, setTemplateItems] = useState<WorkstationTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSoftwareIndex, setHoveredSoftwareIndex] = useState<
    number | null
  >(null);
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
      if (!accessToken) {
        setError("Missing access token. Please sign in.");
        setIsLoadingTemplates(false);
        return;
      }

      if (tokenExpired) {
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
    //TODO: Get creds from Domain Controller
    const rdpUsername = "demo";
    const rdpPassword = "demo";

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

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                <img src={SearchIcon} alt="Search" className="h-4 w-4" />
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search workstation templates"
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

        {isLoadingTemplates && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
            Loading workstation templates...
          </div>
        )}

        {!isLoadingTemplates && error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-6 text-sm text-red-200">
            {error}
          </div>
        )}

        {!isLoadingTemplates && !error && filteredItems.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
            No assigned workstation templates found.
          </div>
        )}

        {!isLoadingTemplates && !error && filteredItems.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
            {filteredItems.map((item, index) => {
              const actionClasses = item.is_ready
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                : "border-amber-500/40 bg-amber-500/10 text-amber-100";
              const actionLabel = item.is_ready ? "Use" : "Not Ready";
              const statusDot = item.is_ready
                ? "bg-emerald-500"
                : "bg-amber-500";
              const softwareCount = item.software?.length ?? 0;
              const accessGroupCount = item.access_groups?.length ?? 0;
              const readyLabel = item.is_ready ? "Ready" : "Unavailable";
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
                          ↳ {templateId}
                        </div>
                        <div className="text-xs text-white/40">
                          {item.description || "No description"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 text-xs text-white/60">
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredSoftwareIndex(index)}
                        onMouseLeave={() => setHoveredSoftwareIndex(null)}
                      >
                        <div className="text-[11px] uppercase text-white/40">
                          Software
                        </div>
                        <div className="text-sm text-white/80">
                          {softwareCount}
                        </div>
                        {hoveredSoftwareIndex === index &&
                          softwareCount > 0 && (
                            <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-white/10 bg-[#0f0f0f] p-3 text-xs text-white/80 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
                              <SoftwarePopup softwares={item.software} />
                            </div>
                          )}
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-white/40">
                          Access groups
                        </div>
                        <div className="text-sm text-white/80">
                          {accessGroupCount}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase text-white/40">
                          Status
                        </div>
                        <div className="text-sm text-white/80">
                          {readyLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!item.is_ready}
                      onClick={async () => {
                        setIsLoadingWorkstations(true);
                        const workstationspool =
                          await WorkstationService.getWorkstations();
                        // For demo purposes, we just select the first workstation from the pool
                        const workstation = workstationspool[0] || null;
                        setSelectedWorkstation(workstation);
                        setIsLoadingWorkstations(false);
                      }}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${actionClasses}`}
                    >
                      {actionLabel}
                    </button>
                    <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoadingWorkstations && !selectedWorkstation && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] px-5 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
            <h1>Not connected to a workstation</h1>
          </div>
        )}
        {isLoadingWorkstations && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] px-5 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
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
          </div>
        )}

        {selectedWorkstation && !isLoadingWorkstations && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] px-5 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
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
                  setSelectedWorkstation(null);
                  setRdpStatus(null);
                  killRDP();
                }}
                className="mt-4 rounded-lg border border-white/10 bg-[#A41010] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

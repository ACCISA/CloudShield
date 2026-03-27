import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import WorkstationList from "../components/workstations/WorkstationList.jsx";
import WorkstationModal from "../components/workstations/WorkstationModal.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import SearchField from "../components/common/SearchField/SearchField.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import CreateWorkstationIcon from "../assets/CreateWorkstationIcon.jsx";
import { WORKSTATION_FILTERS } from "../config/filterConfigs.js";
import { useClickLogger } from "../hooks/useClickLogger";
import { useThemeColors } from "../hooks/useThemeColors.js";
import { trackButton } from "../lib/analytics";
import DisplayIcon from "../components/common/DisplayIcon/DisplayIcon.jsx";
import IconSelectionBar from "../components/common/IconSelectionBar.jsx";
import EditButton from "../components/common/EditButton/EditButton.jsx";
import EditIcon from "../assets/EditIcon.jsx";
import TrashIcon from "../assets/TrashIcon.jsx";
import StatusButton from "../components/common/StatusButton/StatusButton.jsx";
import ActiveIcon from "../assets/ActiveIcon.jsx";
import EmptyState from "../components/common/EmptyState/EmptyState.jsx";
import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";
import TableSkeleton from "../components/table/TableSkeleton.jsx";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";
import { safeAsync } from "../lib/safeAsync";
import { getUserErrorMessage } from "../lib/errors";
import { sharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";
import { fetchWorkstations } from "../utils/modalHelpers.jsx";
import { apiGet, apiPost } from "../api/client.js";

const styles = {
  ...managementToolbarStyles,
  listWrapper: { flex: 1, minHeight: 0 },
  errorBanner: { padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "rgba(213, 22, 22, 0.12)", color: "text.primary", fontSize: "0.9rem" },
  ...sharedIconViewStyles,
  iconStatusRow: { marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
};

const TRACKED_WORKSTATIONS_KEY = "tracked_workstation_creations";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isFailedProgress = (progress) => {
  const normalized = (progress || "").toLowerCase();
  return (
    normalized === "failed" ||
    normalized === "org not found" ||
    normalized === "template not found" ||
    normalized === "image not ready" ||
    normalized.startsWith("failed")
  );
};

const getIconStatusColors = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "connected") {
    return { outerColor: "#1F381F", innerColor: "#04C40A" };
  }
  if (normalized === "provisioning") {
    return { outerColor: "#3F2A08", innerColor: "#F0B429" };
  }
  return { outerColor: "#381F1F", innerColor: "#ff5252" };
};

const readTrackedWorkstations = () => {
  try {
    const raw = localStorage.getItem(TRACKED_WORKSTATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read tracked workstation jobs:", error);
    return [];
  }
};

const writeTrackedWorkstations = (entries) => {
  try {
    localStorage.setItem(TRACKED_WORKSTATIONS_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to persist tracked workstation jobs:", error);
  }
};

const mergeWorkstationRows = (serverRows, trackedEntries) => {
  const merged = [...serverRows];

  trackedEntries.forEach(({ row }) => {
    if (!row) return;

    const index = merged.findIndex(
      (existing) =>
        existing.id === row.id ||
        (row.name && existing.name === row.name),
    );

    if (index >= 0) {
      merged[index] = { ...merged[index], ...row };
    } else {
      merged.unshift(row);
    }
  });

  return merged;
};

export const createWorkstation = async (payload) => {
  try {
    const orgId = localStorage.getItem("org_id");
    const res = await apiPost(`/workstations/templates`, {
      org_id: orgId,
      name: payload.name,
      description: payload.description || "",
      software: (payload.software || []).map((item) => item._id || item.id),
      access_groups: (payload.access_groups || []).map((item) => item._id || item.id),
      members: (payload.members || []).map((item) => item._id || item.id),
    });
    return await res.json();
  } catch (e) { console.error(e); return null; }
};

export default function WorkstationsPage() {
  const location = useLocation();
  const withClickLog = useClickLogger({ page: "workstations" });
  const themeColors = useThemeColors();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");
  const [showUsersCol, setShowUsersCol] = useState(true);
  const [showCurrentCol, setShowCurrentCol] = useState(true);
  const [showLastUsedCol, setShowLastUsedCol] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeFilters, setActiveFilters] = useState({ status: new Set(), hasUsers: new Set() });
  const [openModal, setOpenModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setTrackedEntries = useCallback((updater) => {
    const nextEntries =
      typeof updater === "function" ? updater(readTrackedWorkstations()) : updater;
    writeTrackedWorkstations(nextEntries);
    return nextEntries;
  }, []);

  const loadRows = useCallback(async () => {
    const orgId = localStorage.getItem("org_id");
    const token = localStorage.getItem("jwt");
    const serverRows = await fetchWorkstations(orgId, token);
    const trackedEntries = readTrackedWorkstations();
    setRows(mergeWorkstationRows(serverRows, trackedEntries));
  }, []);

  useEffect(() => {
    if (location.state?.openModal) { setOpenModal(true); setEditRow(null); window.history.replaceState({}, document.title); }
  }, [location]);

  useEffect(() => {
    const loadWorkstations = async () => {
      setLoading(true);
      await loadRows();
      setLoading(false);
    };
    loadWorkstations();
  }, [loadRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = rows;

    if (q) {
      data = data.filter((r) => {
        return [r.name].some((v) => (v || "").toLowerCase().includes(q));
      });
    }

    if (activeFilters.status?.size > 0) data = data.filter((r) => activeFilters.status.has(r.status));
    if (activeFilters.hasUsers?.has("activeUsers")) data = data.filter((r) => (r.usersCount ?? 0) > 0);

    return data;
  }, [rows, search, activeFilters]);

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((w) => selectedIds.has(w.id));
    const allAreSelected = filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id));
    return { allVisibleSelected: allAreSelected, isIndeterminate: hasSelected && !allAreSelected };
  }, [filtered, selectedIds]);

  const toggleSelect = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleSelectAllVisible = () => {
    const hasSelected = filtered.some((w) => selectedIds.has(w.id));
    const allAreSelected = filtered.length > 0 && filtered.every((w) => selectedIds.has(w.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (hasSelected && !allAreSelected) { filtered.forEach((w) => next.delete(w.id)); }
      else if (!hasSelected) { filtered.forEach((w) => next.add(w.id)); }
      else { filtered.forEach((w) => next.delete(w.id)); }
      return next;
    });
  };

  const handleFilterChange = (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const groupFilters = new Set(prev[groupId] || new Set());
      if (isActive) groupFilters.add(value); else groupFilters.delete(value);
      newFilters[groupId] = groupFilters;
      return newFilters;
    });
  };

  const pollCreateJob = useCallback(async (jobId, rowId) => {
    while (true) {
      try {
        const res = await apiGet(`/status/${encodeURIComponent(jobId)}`);
        const job = await res.json();
        const jobStatus = (job.status || "").toLowerCase();

        if (jobStatus === "queued" || jobStatus === "started") {
          setRows((prev) =>
            prev.map((row) =>
              row.id === rowId ? { ...row, status: "provisioning", online: false } : row,
            ),
          );
          setTrackedEntries((entries) =>
            entries.map((entry) =>
              entry.jobId === jobId
                ? { ...entry, row: { ...entry.row, status: "provisioning", online: false } }
                : entry,
            ),
          );
          await sleep(2000);
          continue;
        }

        if (jobStatus === "failed" || isFailedProgress(job.progress)) {
          setRows((prev) =>
            prev.map((row) =>
              row.id === rowId ? { ...row, status: "failed", online: false } : row,
            ),
          );
          setTrackedEntries((entries) =>
            entries.map((entry) =>
              entry.jobId === jobId
                ? { ...entry, row: { ...entry.row, status: "failed", online: false } }
                : entry,
            ),
          );
          return;
        }

        if (jobStatus === "finished") {
          const templateId =
            job?.result?.result?.template_id ||
            job?.result?.template_id ||
            null;

          setRows((prev) =>
            prev.map((row) =>
              row.id === rowId
                ? {
                    ...row,
                    id: templateId || row.id,
                    status: "connected",
                    online: true,
                  }
                : row,
            ),
          );
          setTrackedEntries((entries) =>
            entries.map((entry) =>
              entry.jobId === jobId
                ? {
                    ...entry,
                    row: {
                      ...entry.row,
                      id: templateId || entry.row.id,
                      status: "connected",
                      online: true,
                    },
                  }
                : entry,
            ),
          );
          return;
        }

        await sleep(2000);
      } catch (err) {
        console.error("Failed to poll workstation creation job:", err);
        await sleep(2000);
      }
    }
  }, [setTrackedEntries]);

  useEffect(() => {
    const trackedEntries = readTrackedWorkstations();
    trackedEntries
      .filter((entry) => entry?.jobId && entry?.row?.status === "provisioning")
      .forEach((entry) => {
        pollCreateJob(entry.jobId, entry.row.id);
      });
  }, [pollCreateJob]);

  const handleCreate = async (payload) => {
    const newRow = {
      id: `ws-${Date.now()}`,
      name: payload.name,
      strength: payload.description || "",
      usersCount: payload.members?.length || 0,
      users: payload.members || [],
      currentUser: payload.members?.[0] || null,
      status: "provisioning",
      online: false,
      groups: payload.access_groups || [],
      software: payload.software || [],
    };

    setRows((prev) => [newRow, ...prev]);

    const created = await createWorkstation(payload);
    if (!created) {
      setRows((prev) => prev.filter((row) => row.id !== newRow.id));
      return;
    }

    if (created.job_id) {
      setTrackedEntries((entries) => [
        ...entries.filter((entry) => entry.jobId !== created.job_id),
        { jobId: created.job_id, row: newRow },
      ]);
      pollCreateJob(created.job_id, newRow.id);
    }
  };

  const handleEditSave = (id, changes) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              ...changes,
              users: changes.members ?? r.users,
              groups: changes.access_groups ?? r.groups,
              usersCount: changes.members?.length ?? r.usersCount,
              currentUser: changes.members?.[0] ?? r.currentUser,
            }
          : r,
      ),
    );
  const handleDelete = (id) => {
    if (!window.confirm("Delete this workstation?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTrackedEntries((entries) => entries.filter((entry) => entry.row?.id !== id));
  };
  
  const handleRefresh = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      await safeAsync(async () => {
        await loadRows();
      });
    } catch (err) { setError(getUserErrorMessage(err)); } finally { setLoading(false); }
  }, [loadRows]);

  const selectedCount = useMemo(() => filtered.filter((r) => selectedIds.has(r.id)).length, [filtered, selectedIds]);

  return (
    <PageShell>
      <div style={styles.pageContent}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField value={search} onChange={(value) => setSearch(value)} placeholder="Search workstations" showIcon={true} style={styles.searchField} />
            <DisplayButton layout={layout} onLayoutChange={setLayout} columnToggles={{ columns: [{ key: "showUsers", label: "Users", checked: showUsersCol }, { key: "showCurrent", label: "Current", checked: showCurrentCol }, { key: "showLastUsed", label: "Last Used", checked: showLastUsedCol }], onToggle: (c) => { if (c === "showUsers") setShowUsersCol((p) => !p); if (c === "showCurrent") setShowCurrentCol((p) => !p); if (c === "showLastUsed") setShowLastUsedCol((p) => !p); } }} />
            <FilterButton filterGroups={WORKSTATION_FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
          </div>

          <div style={styles.rightActions}>
            {layout === "list" && selectedCount > 0 && (
              <div style={styles.selectionSummary}>
                <span style={styles.selectionSummaryCount}>{selectedCount} selected</span>
                <button
                  type="button"
                  style={styles.clearSelectionButton}
                  onClick={() => setSelectedIds(new Set())}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      styles.clearSelectionButtonHoverBackground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      styles.clearSelectionButtonIdleBackground;
                  }}
                >
                  Clear selection
                </button>
              </div>
            )}
            <RefreshButton onClick={withClickLog({ name: "workstations/refresh", control: "refresh_button" })(handleRefresh)} />
            <CreateButton icon={<CreateWorkstationIcon color={themeColors.text} />} buttonText="Create" onClick={() => { setEditRow(null); setOpenModal(true); }} />
          </div>
        </div>

        {error && <div role="alert" style={styles.errorBanner}>{error}</div>}

        <div style={styles.contentSurface}>
          {/* Clean Conditional Rendering */}
          {loading ? (
            <TableSurface>
              <TableSkeleton rows={8} cols={5} />
            </TableSurface>
          ) : layout === "list" ? (
            <TableSurface>
              <div style={styles.listWrapper}>
                <WorkstationList
                  rows={filtered} onEdit={(r) => { setEditRow(r); setOpenModal(true); }} onDelete={handleDelete} onToggleStatus={undefined}
                  selectedIds={selectedIds} allVisibleSelected={allVisibleSelected} isIndeterminate={isIndeterminate} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAllVisible}
                  showUsers={showUsersCol} showCurrent={showCurrentCol} showLastUsed={showLastUsedCol}
                />
              </div>
            </TableSurface>
          ) : (
            <div style={styles.iconsWrapper}>
              <IconSelectionBar styles={styles} allVisibleSelected={allVisibleSelected} isIndeterminate={isIndeterminate} onToggleSelectAll={toggleSelectAllVisible} selectedCount={selectedCount} />
              <div style={styles.iconsGrid}>
                {filtered.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", margin: "32px 0" }}>
                    <EmptyState message="No workstations found" description="Try adjusting your search or filters, or create a new workstation." />
                  </div>
		              ) : (
		                filtered.map((row) => {
		                  const selected = selectedIds.has(row.id);
		                  const currentUser =
                        row.currentUser && typeof row.currentUser === "object"
                          ? row.currentUser
                          : Array.isArray(row.users) && row.users.length > 0 && typeof row.users[0] === "object"
                            ? row.users[0]
                            : null;
                    const statusColors = getIconStatusColors(row.status);

		                  return (
		                    <div key={row.id} style={{ ...styles.iconCard, ...(selected ? styles.iconCardSelected : {}) }}>
	                      <div style={styles.iconCardHeader}>
	                        <Checkbox checked={selected} onChange={() => toggleSelect(row.id)} />
                        <EditButton menuItems={[{ icon: <EditIcon width={15} height={16} color={themeColors.text} />, label: "edit workstation", color: themeColors.text, onClick: () => { setEditRow(row); setOpenModal(true); } }, { icon: <TrashIcon width={12} height={14} color="#D51616" />, label: "delete workstation", color: "#D51616", onClick: () => handleDelete(row.id) }]} />
                      </div>
	                      <div style={styles.iconTitle}>
	                        <DisplayIcon type="workstation" data={row} size="small" />
	                        <div style={styles.iconTitleText}>
	                          <span style={styles.iconName}>{row.name}</span>
	                          {row.code ? <span style={styles.iconSub}>↳ {row.code}</span> : null}
	                        </div>
	                      </div>
                      {showUsersCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Users</span><span style={styles.iconMetaValue}>{row.usersCount ?? row.users?.length ?? 0}</span></div>}
                      {showCurrentCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Current</span><span style={styles.iconMetaValue}>{currentUser ? <DisplayIcon type="user" data={currentUser} size="small" /> : "—"}</span></div>}
                      {showLastUsedCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Last Used</span><span style={styles.iconMetaValue}>{row.lastUsed || "—"}</span></div>}
	                      
	                      <div style={styles.iconStatusRow}>
	                        <StatusButton status={row.status} />
	                        <ActiveIcon width={12} height={12} outerColor={statusColors.outerColor} innerColor={statusColors.innerColor} />
	                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          )}
        </div>

        {openModal && <WorkstationModal open={openModal} onClose={() => { setOpenModal(false); setEditRow(null); }} workstationData={editRow} onSubmit={(p) => { if (editRow) handleEditSave(editRow.id, p); else handleCreate(p); setOpenModal(false); setEditRow(null); }} onDelete={editRow ? () => { handleDelete(editRow.id); setOpenModal(false); setEditRow(null); } : undefined} />}
      </div>
    </PageShell>
  );
}

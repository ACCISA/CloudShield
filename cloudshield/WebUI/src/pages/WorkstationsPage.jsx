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
import { safeAsync } from "../lib/safeAsync";
import { getUserErrorMessage } from "../lib/errors";
import { sharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";
import { fetchWorkstations } from "../utils/modalHelpers.jsx";
import { createWorkstation } from "../services/workstationsApi.js";

const styles = {
  ...managementToolbarStyles,
  listWrapper: { flex: 1, minHeight: 0 },
  errorBanner: { padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "rgba(213, 22, 22, 0.12)", color: "text.primary", fontSize: "0.9rem" },
  ...sharedIconViewStyles,
  iconStatusRow: { marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
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

  useEffect(() => {
    if (location.state?.openModal) { setOpenModal(true); setEditRow(null); window.history.replaceState({}, document.title); }
  }, [location]);

  useEffect(() => {
    const loadWorkstations = async () => {
      setLoading(true);
      const orgId = localStorage.getItem("org_id");
      const token = localStorage.getItem("jwt");
      const data = await fetchWorkstations(orgId, token);
      setRows(data);
      setLoading(false);
    };
    loadWorkstations();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = rows;

    if (q) {
      data = data.filter((r) => {
        const currentUserName = r.currentUser ? typeof r.currentUser === "string" ? r.currentUser : `${r.currentUser.firstName || ""} ${r.currentUser.lastName || ""}`.trim() : "";
        return [r.name, r.code, currentUserName].some((v) => (v || "").toLowerCase().includes(q));
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

  const handleCreate = async (payload) => {
    const newRow = { id: `ws-${Date.now()}`, name: payload.name, code: payload.code || "WS-NEW", usersCount: payload.users?.length || 0, users: payload.users || [], currentUser: payload.users?.[0] || null, lastUsed: "—", status: "disconnected", groups: payload.groups || [] };
    const created = await createWorkstation(payload.orgId, payload.name, payload.ip, payload.groups);
    if (created) setRows((prev) => [newRow, ...prev]);
  };

  const handleEditSave = (id, changes) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...changes, usersCount: changes.users?.length ?? r.usersCount } : r));
  const handleDelete = (id) => { if (window.confirm("Delete this workstation?")) setRows((prev) => prev.filter((r) => r.id !== id)); };
  const handleToggleStatus = (id) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: r.status === "connected" ? "disconnected" : "connected" } : r));
  
  const handleRefresh = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      await safeAsync(async () => {
        const orgId = localStorage.getItem("org_id"); const token = localStorage.getItem("jwt");
        setRows(await fetchWorkstations(orgId, token));
      });
    } catch (err) { setError(getUserErrorMessage(err)); } finally { setLoading(false); }
  }, []);

  const selectedCount = useMemo(() => filtered.filter((r) => selectedIds.has(r.id)).length, [filtered, selectedIds]);

  return (
    <PageShell>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField value={search} onChange={(value) => setSearch(value)} placeholder="Search workstations" showIcon={true} style={{ flex: "1 1 200px", minWidth: "200px", maxWidth: "680px", width: "100%" }} />
            <DisplayButton layout={layout} onLayoutChange={setLayout} columnToggles={{ columns: [{ key: "showUsers", label: "Users", checked: showUsersCol }, { key: "showCurrent", label: "Current", checked: showCurrentCol }, { key: "showLastUsed", label: "Last Used", checked: showLastUsedCol }], onToggle: (c) => { if (c === "showUsers") setShowUsersCol((p) => !p); if (c === "showCurrent") setShowCurrentCol((p) => !p); if (c === "showLastUsed") setShowLastUsedCol((p) => !p); } }} />
            <FilterButton filterGroups={WORKSTATION_FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
          </div>

          <div style={styles.rightActions}>
            {layout === "list" && selectedCount > 0 && (
              <div style={styles.selectionSummary}>
                <span style={styles.selectionSummaryCount}>{selectedCount} selected</span>
                <button type="button" style={styles.clearSelectionButton} onClick={() => setSelectedIds(new Set())}>Clear selection</button>
              </div>
            )}
            <RefreshButton onClick={withClickLog({ name: "workstations/refresh", control: "refresh_button" })(handleRefresh)} />
            <CreateButton icon={<CreateWorkstationIcon color={themeColors.text} />} buttonText="Create" onClick={() => { setEditRow(null); setOpenModal(true); }} />
          </div>
        </div>

        {error && <div role="alert" style={styles.errorBanner}>{error}</div>}

        {/* Clean Conditional Rendering */}
        {loading ? (
          <TableSurface>
            <TableSkeleton rows={8} cols={5} />
          </TableSurface>
        ) : layout === "list" ? (
          <TableSurface>
            <div style={styles.listWrapper}>
              <WorkstationList
                rows={filtered} onEdit={(r) => { setEditRow(r); setOpenModal(true); }} onDelete={handleDelete} onToggleStatus={handleToggleStatus}
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
                  const currentUser = row.currentUser && row.currentUser !== "—" ? (typeof row.currentUser === "string" ? { firstName: row.currentUser.split(" ")[0], lastName: row.currentUser.split(" ")[1] || "" } : row.currentUser) : null;

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
                          <span style={styles.iconSub}>↳ {row.code}</span>
                        </div>
                      </div>
                      {showUsersCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Users</span><span style={styles.iconMetaValue}>{row.usersCount ?? row.users?.length ?? 0}</span></div>}
                      {showCurrentCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Current</span><span style={styles.iconMetaValue}>{currentUser ? <DisplayIcon type="user" data={currentUser} size="small" /> : "—"}</span></div>}
                      {showLastUsedCol && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Last Used</span><span style={styles.iconMetaValue}>{row.lastUsed || "—"}</span></div>}
                      
                      <div style={styles.iconStatusRow}>
                        <StatusButton status={row.status} onClick={() => handleToggleStatus(row.id)} />
                        <ActiveIcon width={12} height={12} outerColor={row.status === "connected" ? "#1F381F" : "#381F1F"} innerColor={row.status === "connected" ? "#04C40A" : "#ff5252"} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {openModal && <WorkstationModal open={openModal} onClose={() => { setOpenModal(false); setEditRow(null); }} workstationData={editRow} onSubmit={(p) => { if (editRow) handleEditSave(editRow.id, p); else handleCreate(p); setOpenModal(false); setEditRow(null); }} onDelete={editRow ? () => { handleDelete(editRow.id); setOpenModal(false); setEditRow(null); } : undefined} />}
      </div>
    </PageShell>
  );
}

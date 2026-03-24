import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";

import GroupsList from "../components/groups/GroupsList.jsx";
import GroupsModal from "../components/groups/GroupsModal.jsx";
import { createFilterChangeHandler } from "../utils/filterHelpers.js";
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";

import SearchField from "../components/common/SearchField/SearchField.jsx";
import CreateButton from "../components/common/CreateButton/CreateButton.jsx";
import RefreshButton from "../components/common/RefreshButton/RefreshButton.jsx";
import DisplayButton from "../components/common/DisplayButton/DisplayButton.jsx";
import FilterButton from "../components/common/FilterButton/FilterButton.jsx";
import CreateGroupIcon from "../assets/CreateGroupIcon.jsx";
import UploadFileIcon from "../assets/UploadFileIcon.jsx";
import { apiDelete, apiGet, apiPatch, apiPost, apiUploadFile } from "../api/client.js";
import DisplayIcon from "../components/common/DisplayIcon/DisplayIcon.jsx";
import IconSelectionBar from "../components/common/IconSelectionBar.jsx";
import EditButton from "../components/common/EditButton/EditButton.jsx";
import EditIcon from "../assets/EditIcon.jsx";
import TrashIcon from "../assets/TrashIcon.jsx";
import { sharedIconViewStyles } from "../components/common/styles/iconViewStyles.js";
import { managementToolbarStyles } from "../components/common/styles/managementToolbarStyles.js";

import PageShell from "../components/layout/PageShell.jsx";
import TableSurface from "../components/table/TableSurface.jsx";
import TableSkeleton from "../components/table/TableSkeleton.jsx";
import { safeAsync } from "../lib/safeAsync.js";
import { formatShares } from "../lib/format.js";

const TOAST_BG_COLORS = {
  error: "#d32f2f",
  warning: "#ed6c02",
  info: "#0288d1",
  success: "#2e7d32",
};

const CustomToast = ({ msg, type, onClose }) => {
  if (!msg) return null;

  const toastStyles = {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    padding: "12px 24px",
    borderRadius: "12px",
    backgroundColor: TOAST_BG_COLORS[type] ?? TOAST_BG_COLORS.success,
    color: "#fff",
    fontSize: "1rem",
    boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      style={toastStyles}
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Close notification"
    >
      {msg}
    </div>
  );
};

CustomToast.propTypes = {
  msg: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["success", "error", "info", "warning"]),
  onClose: PropTypes.func.isRequired,
};

CustomToast.defaultProps = {
  type: "success",
};

const styles = {
  ...managementToolbarStyles,
  ...sharedIconViewStyles,
};

export default function GroupsPage() {
  const location = useLocation();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("list");

  const [activeFilters, setActiveFilters] = useState({ size: new Set() });

  const [showUsers, setShowUsers] = useState(true);
  const [showWorkstations, setShowWorkstations] = useState(true);
  const [showFiles, setShowFiles] = useState(true);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const csvInputRef = useRef(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  useEffect(() => {
    if (location.state?.openModal) {
      setModalOpen(true);
      setEditingGroup(null);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const openToast = (msg, type = "success") => {
    setToast({ open: true, msg, type });
    setTimeout(() => setToast((p) => ({ ...p, open: false })), 2500);
  };

  const runWithErrorToast = (action) =>
    safeAsync(action, {
      toast: {
        error: (msg) => openToast(msg, "error"),
      },
    });

  const safeSplitName = (fullName) => {
    const raw = (fullName || "").trim();
    if (!raw) return { firstName: "Unknown", lastName: "" };
    const parts = raw.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  };

  const mapApiGroupToUi = (g) => {
    const membersInfo = Array.isArray(g.members_info) ? g.members_info : [];
    const users = membersInfo.map((u) => {
      const { firstName, lastName } = safeSplitName(u.full_name || u.name || "");
      return {
        id: u._id, _id: u._id, email: u.email, firstName, lastName,
        title: u.role || "", role: u.role, org_id: u.org_id,
        status: u.status, created_at: u.created_at, updated_at: u.updated_at,
        profileImage: u.profile_image || null,
      };
    });

    const wsIds = Array.isArray(g.workstations) ? g.workstations : [];
    const wsObjects = wsIds.map((x) => ({ id: x, name: x, online: false, ipAddress: "" }));

    const shareIds = Array.isArray(g.file_shares) ? g.file_shares : [];
    const filesCount = shareIds.length;

    return {
      id: g._id || g.id, _id: g._id || g.id,
      name: g.group_name || "", description: g.description || "",
      image: g.group_image || null,
      users, memberCount: Array.isArray(g.members) ? g.members.length : users.length,
      workstations: wsObjects, workstationIds: wsIds,
      files: filesCount, filesDisplay: formatShares(filesCount), fileShareIds: shareIds,
      type: "Custom", createdDate: g.created_at, updatedDate: g.updated_at,
      members_missing: g.members_missing || [],
    };
  };

  const fetchGroups = async () => {
    setLoading(true);
    try {
      await safeAsync(
        async () => {
          const res = await apiGet("/access-groups");
          const data = await res.json();
          const apiGroups = Array.isArray(data.access_groups) ? data.access_groups : [];
          setGroups(apiGroups.map(mapApiGroupToUi));
        },
        { toast: { error: (msg) => openToast(msg, "error") }, minDelay: 0 }
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const filtered = useMemo(() => {
    let out = [...groups];
    const q = search.trim().toLowerCase();

    if (q) {
      out = out.filter((g) =>
        [g.name, g.description].some((v) => (v || "").toLowerCase().includes(q)) || selectedIds.has(g._id)
      );
    }

    out.sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
      if (typeof va === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return out;
  }, [groups, search, activeFilters, sortField, sortDir, selectedIds]);

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = filtered.some((g) => selectedIds.has(g._id));
    const allAreSelected = filtered.length > 0 && filtered.every((g) => selectedIds.has(g._id));
    return { allVisibleSelected: allAreSelected, isIndeterminate: hasSelected && !allAreSelected };
  }, [filtered, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelectAll = !allVisibleSelected;
      for (const g of filtered) {
        if (shouldSelectAll) next.add(g._id);
        else next.delete(g._id);
      }
      return next;
    });
  };

  const handleFilterChange = createFilterChangeHandler(setActiveFilters);

  const handleOpenCreateModal = () => { setEditingGroup(null); setModalOpen(true); };
  const handleOpenEditModal = (group) => { setEditingGroup(group); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setEditingGroup(null); };

  const normalizeIds = (items) => {
    const list = Array.isArray(items) ? items : [];
    const seen = new Set();
    const out = [];
    for (const it of list) {
      const id = it && (it.id || it._id) ? String(it.id || it._id) : "";
      if (id && !seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out;
  };

  const handleSubmitGroup = async (groupData) => {
    const payload = {
      group_name: groupData.name,
      description: groupData.description,
      group_image: groupData.image || null,
      members: normalizeIds(groupData.users),
      workstations: normalizeIds(groupData.workstations),
      file_shares: normalizeIds(groupData.files),
    };

    try {
      await safeAsync(
        async () => {
          if (editingGroup) await apiPatch(`/access-groups/${editingGroup.id}`, payload);
          else await apiPost("/access-groups", payload);
        },
        { toast: { error: (msg) => openToast(msg, "error") }, minDelay: 0 }
      );
      openToast(editingGroup ? "Group updated successfully" : "Group created successfully");
      await fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    try {
      await safeAsync(async () => { await apiDelete(`/access-groups/${groupId}`); }, { toast: { error: (msg) => openToast(msg, "error") }, minDelay: 0 });
      openToast("Group deleted");
      await fetchGroups();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    setCsvImporting(true);

    try {
      const result = await apiUploadFile("/access-groups/import-csv", file);
      const created = result.created || 0;
      const errorCount = result.errors?.length || 0;

      if (created > 0) {
        openToast(
          `Successfully imported ${created} group(s)${errorCount > 0 ? ` (${errorCount} warnings)` : ""}`,
          "success"
        );
        fetchGroups();
      } else if (errorCount > 0) {
        const firstError = result.errors[0];
        openToast(`Import failed: ${firstError.error || firstError.warning || "Unknown error"}`, "error");
      } else {
        openToast("No groups imported", "info");
      }

      if (result.errors?.length > 0) {
        console.warn("CSV import errors:", result.errors);
      }
    } catch (error) {
      openToast(error.message || "CSV import failed", "error");
    } finally {
      setCsvImporting(false);
    }
  };

  const handleCsvButtonClick = () => {
    csvInputRef.current?.click();
  };

  const selectedCount = useMemo(() => filtered.filter((g) => selectedIds.has(g._id)).length, [filtered, selectedIds]);
  const clearSelection = useCallback(() => { setSelectedIds(new Set()); }, []);

  const loadingOverlayStyle = {
    position: "absolute",
    inset: 0,
    padding: 16,
    background: "rgba(13, 13, 13, 0.55)",
    backdropFilter: "blur(2px)",
    zIndex: 2,
    pointerEvents: "none",
  };

  const getGroupMenuItems = (group) => [
    { icon: <EditIcon width={15} height={16} color="#1a1a1a" />, label: "edit group", color: "#1a1a1a", onClick: () => handleOpenEditModal(group) },
    { icon: <TrashIcon width={12} height={14} color="#D51616" />, label: "delete group", color: "#D51616", onClick: () => handleDeleteGroup(group.id) },
  ];

  return (
    <PageShell>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 24, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField value={search} onChange={setSearch} placeholder="Search groups" showIcon={true} style={{ flex: "1 1 200px", minWidth: "200px", maxWidth: "680px", width: "100%" }} />
            <DisplayButton
              layout={layout} onLayoutChange={setLayout}
              columnToggles={{
                columns: [
                  { key: "showUsers", label: "Users", checked: showUsers },
                  { key: "showWorkstations", label: "Workstations", checked: showWorkstations },
                  { key: "showFiles", label: "Shares", checked: showFiles },
                ],
                onToggle: (col) => {
                  if (col === "showUsers") setShowUsers((p) => !p);
                  if (col === "showWorkstations") setShowWorkstations((p) => !p);
                  if (col === "showFiles") setShowFiles((p) => !p);
                },
              }}
            />
            <FilterButton filterGroups={[{ id: "size", label: "Group Size", type: "checkbox", options: [{ value: "small", label: "Small (≤5)" }, { value: "medium", label: "Medium (6-20)" }, { value: "large", label: "Large (>20)" }] }]} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
          </div>

          <div style={styles.rightActions}>
            {layout === "list" && selectedCount > 0 && (
              <div style={styles.selectionSummary}>
                <span style={styles.selectionSummaryCount}>{selectedCount} selected</span>
                <button type="button" style={styles.clearSelectionButton} onClick={clearSelection}>Clear selection</button>
              </div>
            )}
            <RefreshButton onClick={fetchGroups} />
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              style={{ display: "none" }}
            />
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleCsvButtonClick}
                disabled={csvImporting}
                data-testid="import-csv-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  padding: "10px 14px",
                  cursor: csvImporting ? "not-allowed" : "pointer",
                }}
              >
                <UploadFileIcon width={16} height={16} color="#fff" />
                {csvImporting ? "Importing..." : "Import CSV"}
              </button>
              <button
                type="button"
                aria-label="CSV format help"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "18px",
                  height: "18px",
                  padding: 0,
                  border: "none",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onClick={() => setShowCsvHelp(!showCsvHelp)}
                onMouseEnter={() => setShowCsvHelp(true)}
                onMouseLeave={() => setShowCsvHelp(false)}
              >
                ?
              </button>
              {showCsvHelp && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    padding: "12px 16px",
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    whiteSpace: "pre-line",
                    zIndex: 1000,
                    minWidth: "360px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <strong>CSV Format:</strong>{"\n"}
                  group_name,description,member_emails,workstations{"\n\n"}
                  <strong>Columns:</strong>{"\n"}
                  - member_emails: semicolon-separated{"\n"}
                  - workstations: semicolon-separated (optional){"\n\n"}
                  <strong>Example:</strong>{"\n"}
                  Engineering,Dev team,john@co.com;jane@co.com,WS01;WS02
                </div>
              )}
            </div>
            <CreateButton icon={<CreateGroupIcon width={24} height={24} color="#fff" />} buttonText="Create" onClick={handleOpenCreateModal} />
          </div>
        </div>

        <TableSurface>
          <div style={{ position: "relative", height: "100%", minHeight: 0 }}>
            {layout === "list" ? (
              <GroupsList
                rows={filtered}
                showUsers={showUsers}
                showWorkstations={showWorkstations}
                showFiles={showFiles}
                selectedIds={selectedIds}
                allVisibleSelected={allVisibleSelected}
                isIndeterminate={isIndeterminate}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAllVisible}
                onEdit={handleOpenEditModal}
                onDelete={handleDeleteGroup}
              />
            ) : (
              <div style={{ height: "100%", minHeight: 0 }}>
                <div style={styles.iconsWrapper}>
                  <IconSelectionBar
                    styles={styles}
                    allVisibleSelected={allVisibleSelected}
                    isIndeterminate={isIndeterminate}
                    onToggleSelectAll={toggleSelectAllVisible}
                    selectedCount={selectedCount}
                  />
                  <div style={styles.iconsGrid}>
                    {filtered.length === 0 ? (
                      <div style={{ gridColumn: "1 / -1", margin: "32px 0", textAlign: "center", opacity: 0.8 }}>
                        No groups found
                      </div>
                    ) : (
                      filtered.map((group) => {
                        const selected = selectedIds.has(group._id);
                        return (
                          <div key={group.id} style={{ ...styles.iconCard, ...(selected ? styles.iconCardSelected : {}) }}>
                            <div style={styles.iconCardHeader}>
                              <Checkbox checked={selected} onChange={() => toggleSelect(group._id)} />
                              <EditButton menuItems={getGroupMenuItems(group)} />
                            </div>
                            <div style={styles.iconTitle}>
                              <DisplayIcon type="group" data={group} size="small" />
                              <div style={styles.iconTitleText}>
                                <span style={styles.iconName}>{group.name}</span>
                                <span style={styles.iconSub}>↳ {group.description || "—"}</span>
                              </div>
                            </div>
                            {showUsers && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Users</span><span style={styles.iconMetaValue}>{group.memberCount ?? group.users?.length ?? 0}</span></div>}
                            {showWorkstations && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Workstations</span><span style={styles.iconMetaValue}>{group.workstations?.length ?? 0}</span></div>}
                            {showFiles && <div style={styles.iconMetaRow}><span style={styles.iconMetaLabel}>Shares</span><span style={styles.iconMetaValue}>{group.files ?? 0}</span></div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div style={loadingOverlayStyle}>
                <TableSkeleton rows={8} cols={5} />
              </div>
            )}
          </div>
        </TableSurface>
      </div>

      <GroupsModal open={modalOpen} onClose={handleCloseModal} groupData={editingGroup} onSubmit={handleSubmitGroup} onDelete={handleDeleteGroup} onRefresh={fetchGroups} />
      {toast.open && (
        <CustomToast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast({ ...toast, open: false })}
        />
      )}
    </PageShell>
  );
}
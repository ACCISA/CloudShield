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
import Checkbox from "../components/common/Checkbox/Checkbox.jsx";
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
import Pagination from "../components/common/Pagination/Pagination.jsx";
import Toast, { useToast } from "../components/common/Toast/Toast.jsx";
import { apiDelete, apiPatch, apiPost } from "../api/client.js";

const styles = {
  ...managementToolbarStyles,
  listWrapper: { flex: 1, minHeight: 0 },
  errorBanner: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "rgba(213, 22, 22, 0.12)",
    color: "text.primary",
    fontSize: "0.9rem",
  },
  ...sharedIconViewStyles,
  iconStatusRow: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
};

const syncWorkstationMetrics = (count, options = {}) => {
  globalThis.dispatchEvent(
    new CustomEvent("metrics:invalidate", {
      detail: {
        workstations: count,
        skipRefetch: options.skipRefetch ?? true,
      },
    }),
  );
};

const buildWorkstationTemplateBody = (orgId, payload) => ({
  ...(orgId ? { org_id: orgId } : {}),
  name: payload.name,
  description: payload.description,
  software: (payload.software || []).map((item) => item.id || item._id || item),
  access_groups: (payload.access_groups || []).map(
    (item) => item.id || item._id || item,
  ),
  members: (payload.members || []).map((item) => item.id || item._id || item),
});

const getWorkstationMutationPath = (workstationId, source = "template") =>
  source === "workstation"
    ? `/workstations/${encodeURIComponent(workstationId)}`
    : `/workstations/templates/${encodeURIComponent(workstationId)}`;

export const createWorkstationTemplate = async (orgId, payload) => {
  try {
    const res = await apiPost(
      "/workstations/templates",
      buildWorkstationTemplateBody(orgId, payload),
    );
    return res?.json ? await res.json() : null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const updateWorkstationTemplate = async (
  templateId,
  payload,
) => {
  const res = await apiPatch(
    `/workstations/templates/${encodeURIComponent(templateId)}`,
    buildWorkstationTemplateBody(null, payload),
  );
  return res?.json ? res.json() : null;
};

export const deleteWorkstationTemplate = async (templateId, options = {}) => {
  const source = options.source || "template";
  await apiDelete(getWorkstationMutationPath(templateId, source));
  return null;
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
  const [activeFilters, setActiveFilters] = useState({
    status: new Set(),
    hasUsers: new Set(),
  });
  const [openModal, setOpenModal] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast, showToast, hideToast } = useToast(6000);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (location.state?.openModal) {
      setOpenModal(true);
      setEditRow(null);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const loadWorkstations = async () => {
      setLoading(true);
      const orgId = localStorage.getItem("org_id");
      const token = localStorage.getItem("jwt");
      const data = await fetchWorkstations(orgId, token);
      setRows(data);
      syncWorkstationMetrics(data.length);
      setLoading(false);
    };
    loadWorkstations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeFilters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = rows;

    if (q) {
      data = data.filter((r) => {
        const currentUserName = r.currentUser
          ? typeof r.currentUser === "string"
            ? r.currentUser
            : `${r.currentUser.firstName || ""} ${r.currentUser.lastName || ""}`.trim()
          : "";
        return [r.name, r.code, currentUserName].some((v) =>
          (v || "").toLowerCase().includes(q),
        );
      });
    }

    if (activeFilters.status?.size > 0)
      data = data.filter((r) => activeFilters.status.has(r.status));
    if (activeFilters.hasUsers?.has("activeUsers"))
      data = data.filter((r) => (r.usersCount ?? 0) > 0);

    return data;
  }, [rows, search, activeFilters]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * 10;
    return filtered.slice(start, start + 10);
  }, [filtered, currentPage]);

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const hasSelected = pagedRows.some((w) => selectedIds.has(w.id));
    const allAreSelected =
      pagedRows.length > 0 && pagedRows.every((w) => selectedIds.has(w.id));
    return {
      allVisibleSelected: allAreSelected,
      isIndeterminate: hasSelected && !allAreSelected,
    };
  }, [pagedRows, selectedIds]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllVisible = () => {
    const hasSelected = pagedRows.some((w) => selectedIds.has(w.id));
    const allAreSelected =
      pagedRows.length > 0 && pagedRows.every((w) => selectedIds.has(w.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (hasSelected && !allAreSelected) {
        pagedRows.forEach((w) => next.delete(w.id));
      } else if (!hasSelected) {
        pagedRows.forEach((w) => next.add(w.id));
      } else {
        pagedRows.forEach((w) => next.delete(w.id));
      }
      return next;
    });
  };

  const handleFilterChange = (groupId, value, isActive) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      const groupFilters = new Set(prev[groupId] || new Set());
      if (isActive) groupFilters.add(value);
      else groupFilters.delete(value);
      newFilters[groupId] = groupFilters;
      return newFilters;
    });
  };

  const handleCreate = async (payload) => {
    const orgId = localStorage.getItem("org_id");
    const created = await createWorkstationTemplate(orgId, payload);
    if (created) {
      const newRow = {
        id: created.job_id || `ws-${Date.now()}`,
        source: "template",
        name: payload.name,
        code: "WS-NEW",
        strength: payload.description || "",
        description: payload.description || "",
        usersCount: payload.members?.length || 0,
        users: payload.members || [],
        members: (payload.members || []).map((member) => member.id || member._id || member),
        groups: payload.access_groups || [],
        software: payload.software || [],
        currentUser: payload.members?.[0] || null,
        lastUsed: "—",
        status: "provisioning",
      };
      let nextCount = 0;
      setRows((prev) => {
        const next = [newRow, ...prev];
        nextCount = next.length;
        return next;
      });
      syncWorkstationMetrics(nextCount);
    }
    return Boolean(created);
  };

  const handleEditSave = async (row, changes) => {
    await updateWorkstationTemplate(row.id, changes);
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              name: changes.name ?? r.name,
              strength: changes.description ?? r.strength,
              description: changes.description ?? r.description,
              desktopBackground:
                changes.desktopBackground ?? r.desktopBackground,
              wallpaper: changes.wallpaper ?? r.wallpaper,
              image: changes.image ?? r.image,
              members:
                changes.members?.map(
                  (member) => member.id || member._id || member,
                ) ?? r.members,
              users: changes.members ?? r.users,
              usersCount: changes.members?.length ?? r.usersCount,
              currentUser:
                changes.members && changes.members.length > 0
                  ? changes.members[0]
                  : changes.members
                    ? null
                    : r.currentUser,
              groups: changes.access_groups ?? r.groups,
              software: changes.software ?? r.software,
            }
          : r,
      ),
    );
  };
  const handleDelete = async (rowOrId) => {
    if (!window.confirm("Delete this workstation?")) return false;

    const row =
      typeof rowOrId === "object"
        ? rowOrId
        : rows.find((item) => item.id === rowOrId) || { id: rowOrId };

    await deleteWorkstationTemplate(row.id, { source: row.source });
    let nextCount = 0;
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== row.id);
      nextCount = next.length;
      return next;
    });
    syncWorkstationMetrics(nextCount);
    return true;
  };
  const handleToggleStatus = (id) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: r.status === "connected" ? "disconnected" : "connected",
            }
          : r,
      ),
    );

  const handleRefresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      await safeAsync(async () => {
        const orgId = localStorage.getItem("org_id");
        const token = localStorage.getItem("jwt");
        const nextRows = await fetchWorkstations(orgId, token);
        setRows(nextRows);
        syncWorkstationMetrics(nextRows.length);
      });
    } catch (err) {
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedCount = useMemo(
    () => filtered.filter((r) => selectedIds.has(r.id)).length,
    [filtered, selectedIds],
  );

  return (
    <PageShell>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          gap: 24,
          minHeight: 0,
        }}
      >
        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.leftActions}>
            <SearchField
              value={search}
              onChange={(value) => setSearch(value)}
              placeholder="Search workstations"
              showIcon={true}
              style={{
                flex: "1 1 200px",
                minWidth: "200px",
                maxWidth: "680px",
                width: "100%",
              }}
            />
            <DisplayButton
              layout={layout}
              onLayoutChange={setLayout}
              columnToggles={{
                columns: [
                  { key: "showUsers", label: "Users", checked: showUsersCol },
                  {
                    key: "showCurrent",
                    label: "Current",
                    checked: showCurrentCol,
                  },
                  {
                    key: "showLastUsed",
                    label: "Last Used",
                    checked: showLastUsedCol,
                  },
                ],
                onToggle: (c) => {
                  if (c === "showUsers") setShowUsersCol((p) => !p);
                  if (c === "showCurrent") setShowCurrentCol((p) => !p);
                  if (c === "showLastUsed") setShowLastUsedCol((p) => !p);
                },
              }}
            />
            <FilterButton
              filterGroups={WORKSTATION_FILTERS}
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
            />
          </div>

          <div style={styles.rightActions}>
            <RefreshButton
              onClick={withClickLog({
                name: "workstations/refresh",
                control: "refresh_button",
              })(handleRefresh)}
            />
            <CreateButton
              icon={<CreateWorkstationIcon color={themeColors.text} />}
              buttonText="Create"
              onClick={() => {
                setEditRow(null);
                setOpenModal(true);
              }}
            />
          </div>
        </div>

        {error && (
          <div role="alert" style={styles.errorBanner}>
            {error}
          </div>
        )}

        {/* Clean Conditional Rendering */}
        {loading ? (
          <TableSurface>
            <TableSkeleton rows={8} cols={5} />
          </TableSurface>
        ) : layout === "list" ? (
          <>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  ...styles.selectionSummaryCount,
                  position: "absolute",
                  top: "-2px",
                  left: 0,
                  visibility: selectedCount > 0 ? "visible" : "hidden",
                }}
              >
                {selectedCount} selected
              </span>
              <TableSurface>
                <div style={styles.listWrapper}>
                  <WorkstationList
                    rows={pagedRows}
                    onEdit={(r) => {
                      setEditRow(r);
                      setOpenModal(true);
                    }}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    selectedIds={selectedIds}
                    allVisibleSelected={allVisibleSelected}
                    isIndeterminate={isIndeterminate}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAllVisible}
                    showUsers={showUsersCol}
                    showCurrent={showCurrentCol}
                    showLastUsed={showLastUsedCol}
                  />
                </div>
              </TableSurface>
            </div>
            <Pagination
              totalItems={filtered.length}
              itemsPerPage={10}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              itemLabel="workstations"
            />
          </>
        ) : (
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
                <div style={{ gridColumn: "1 / -1", margin: "32px 0" }}>
                  <EmptyState
                    message="No workstations found"
                    description="Try adjusting your search or filters, or create a new workstation."
                  />
                </div>
              ) : (
                filtered.map((row) => {
                  const selected = selectedIds.has(row.id);
                  const currentUser =
                    row.currentUser && row.currentUser !== "—"
                      ? typeof row.currentUser === "string"
                        ? {
                            firstName: row.currentUser.split(" ")[0],
                            lastName: row.currentUser.split(" ")[1] || "",
                          }
                        : row.currentUser
                      : null;

                  return (
                    <div
                      key={row.id}
                      style={{
                        ...styles.iconCard,
                        ...(selected ? styles.iconCardSelected : {}),
                      }}
                    >
                      <div style={styles.iconCardHeader}>
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleSelect(row.id)}
                        />
                        <EditButton
                          menuItems={[
                            {
                              icon: (
                                <EditIcon
                                  width={15}
                                  height={16}
                                  color={themeColors.text}
                                />
                              ),
                              label: "edit workstation",
                              color: themeColors.text,
                              onClick: () => {
                                setEditRow(row);
                                setOpenModal(true);
                              },
                            },
                            {
                              icon: (
                                <TrashIcon
                                  width={12}
                                  height={14}
                                  color="#D51616"
                                />
                              ),
                              label: "delete workstation",
                              color: "#D51616",
                                onClick: () => handleDelete(row),
                            },
                          ]}
                        />
                      </div>
                      <div style={styles.iconTitle}>
                        <DisplayIcon
                          type="workstation"
                          data={row}
                          size="small"
                        />
                        <div style={styles.iconTitleText}>
                          <span style={styles.iconName}>{row.name}</span>
                          <span style={styles.iconSub}>↳ {row.code}</span>
                        </div>
                      </div>
                      {showUsersCol && (
                        <div style={styles.iconMetaRow}>
                          <span style={styles.iconMetaLabel}>Users</span>
                          <span style={styles.iconMetaValue}>
                            {row.usersCount ?? row.users?.length ?? 0}
                          </span>
                        </div>
                      )}
                      {showCurrentCol && (
                        <div style={styles.iconMetaRow}>
                          <span style={styles.iconMetaLabel}>Current</span>
                          <span style={styles.iconMetaValue}>
                            {currentUser ? (
                              <DisplayIcon
                                type="user"
                                data={currentUser}
                                size="small"
                              />
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                      )}
                      {showLastUsedCol && (
                        <div style={styles.iconMetaRow}>
                          <span style={styles.iconMetaLabel}>Last Used</span>
                          <span style={styles.iconMetaValue}>
                            {row.lastUsed || "—"}
                          </span>
                        </div>
                      )}

                      <div style={styles.iconStatusRow}>
                        <StatusButton
                          status={row.status}
                          onClick={() => handleToggleStatus(row.id)}
                        />
                        <ActiveIcon
                          width={12}
                          height={12}
                          outerColor={
                            row.status === "connected" ? "#1F381F" : "#381F1F"
                          }
                          innerColor={
                            row.status === "connected" ? "#04C40A" : "#ff5252"
                          }
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {openModal && (
          <WorkstationModal
            open={openModal}
            onClose={() => {
              setOpenModal(false);
              setEditRow(null);
            }}
            workstationData={editRow}
            onSubmit={async (p) => {
              try {
                if (editRow) {
                  await handleEditSave(editRow, p);
                  showToast("Workstation updated");
                  globalThis.dispatchEvent(new Event("metrics:invalidate"));
                } else {
                  const created = await handleCreate(p);
                  if (!created) throw new Error("Failed to save workstation");

                  showToast("Workstation template queued — provisioning in background");
                  globalThis.dispatchEvent(new Event("metrics:invalidate"));
                }
              } catch (error) {
                showToast("Failed to save workstation", "error");
              }
            }}
            onDelete={
              editRow
                ? async () => {
                    try {
                      await handleDelete(editRow);
                      setOpenModal(false);
                      setEditRow(null);
                      showToast("Workstation deleted");
                      globalThis.dispatchEvent(new Event("metrics:invalidate"));
                    } catch (error) {
                      showToast("Failed to delete workstation", "error");
                    }
                  }
                : undefined
            }
          />
        )}
        <Toast
          msg={toast.msg}
          type={toast.type}
          open={toast.open}
          onClose={hideToast}
        />
      </div>
    </PageShell>
  );
}

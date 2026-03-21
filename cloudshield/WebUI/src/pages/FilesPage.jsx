import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../hooks/useThemeColors.js";
import SearchField from "../components/common/SearchField/SearchField";
import DisplayButton from "../components/common/DisplayButton/DisplayButton";
import RefreshButton from "../components/common/RefreshButton/RefreshButton";
import CreateButton from "../components/common/CreateButton/CreateButton";
import Checkbox from "../components/common/Checkbox/Checkbox";
import EditButton from "../components/common/EditButton/EditButton";
import EditIcon from "../assets/EditIcon";
import TrashIcon from "../assets/TrashIcon";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import { useClickLogger } from "../hooks/useClickLogger";
import { trackButton } from "../lib/analytics";

import FileShareWizardModal from "../components/files/FileShareWizardModal";
import AvatarPill from "../components/files/AvatarPill";
import FolderPlusIcon from "../assets/FolderPlusIcon";

import PageShell from "../components/layout/PageShell";
import TableSurface from "../components/table/TableSurface";
import TableSkeleton from "../components/table/TableSkeleton";
import { getUserErrorMessage } from "../lib/errors";
import { safeAsync } from "../lib/safeAsync";
import { formatShares } from "../lib/format";

import {
  createFileShare,
  updateFileShare,
  deleteFileShare,
  fetchUsers,
  fetchGroups,
  fetchFileShares,
  transformSharesToTree,
} from "../api/filesApi";

import {
  NODE_KIND,
  formatDateTime,
  buildIndex,
  toggleSelectCascade,
  toggleSelectAllInView,
  filterTreeByQuery,
  collectFolderIds,
  flattenVisibleTree,
} from "../components/files/FileHelper";

const Chevron = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    style={{
      transform: open ? "rotate(90deg)" : "rotate(0deg)",
      transition: "transform 0.15s ease",
      opacity: 0.75,
      flex: "0 0 auto",
    }}
    fill="currentColor"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

Chevron.propTypes = {
  open: PropTypes.bool,
};

Chevron.defaultProps = {
  open: false,
};

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#E8EAED">
    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#9AA0A6">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z" />
  </svg>
);

function StorageCell({ currentSize, maxSize }) {
  const max =
    typeof maxSize === "number"
      ? maxSize
      : typeof maxSize === "string"
        ? Number.parseFloat(maxSize)
        : null;
  const current = Math.max(0, Number(currentSize || 0));

  if (!Number.isFinite(max) || max <= 0) {
    return (
      <div className="storageCell" aria-label="Storage usage">
        <div className="storageMiniLabel">{formatShares(0)}</div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div
      className="storageCell"
      aria-label={`Storage usage ${current} of ${max} GB`}
    >
      <div className="storageMiniValue">
        {current} / {max} GB
      </div>
      <div className="storageMiniBar">
        <div className="storageMiniFill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

StorageCell.propTypes = {
  currentSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  maxSize: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

StorageCell.defaultProps = {
  currentSize: 0,
  maxSize: null,
};

/**
 * Main file shares management page for viewing, creating, editing, and deleting organization file shares.
 * Displays shares in list or icon view with search, selection, and real-time operation tracking.
 * Implements non-blocking async operations with polling for create/delete completion.
 */
export default function FilesPage() {
  const { currentUser } = useAuth();
  const withClickLog = useClickLogger({ page: "files" });
  const themeColors = useThemeColors();

  // Get orgId from currentUser or localStorage
  const orgId = useMemo(() => {
    try {
      const stored = localStorage.getItem("org_id");
      console.log("localStorage org_id:", stored);
      if (stored) return stored;
    } catch (e) {
      console.error("Error reading localStorage:", e);
    }

    const finalOrgId = currentUser?.org_id || "default-org";

    return finalOrgId;
  }, [currentUser]);

  const [layout, setLayout] = useState("list");

  const [tree, setTree] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Lookup maps for enriching hover cards
  const [userLookup, setUserLookup] = useState(new Map());
  const [groupLookup, setGroupLookup] = useState(new Map());

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());

  const [isUploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingShares, setDeletingShares] = useState(new Set()); // Track which shares are being deleted
  const [creatingShares, setCreatingShares] = useState(new Set()); // Track which shares are being created

  const location = useLocation();

  // Open modal if navigated from dashboard
  useEffect(() => {
    if (location.state?.openModal) {
      setUploadOpen(true);
      setEditTarget(null);
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Fetch user data for enriching hover cards
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await safeAsync(() => fetchUsers(orgId));
        const lookup = new Map();
        usersData.forEach((user) => {
          const email = user.email || "";
          const emailPrefix = email.includes("@") ? email.split("@")[0] : "";
          const fullName = user.full_name || user.name || "";
          const normalized = {
            id: String(user._id || user.id || ""),
            username: fullName || email,
            email,
            full_name: fullName,
            role: user.role,
            active: user.active !== undefined ? user.active : true,
          };
          if (normalized.username) lookup.set(normalized.username, normalized);
          if (email) lookup.set(email, normalized);
          if (normalized.full_name) lookup.set(normalized.full_name, normalized);
          if (emailPrefix) lookup.set(emailPrefix, normalized);
        });
        setUserLookup(lookup);
      } catch (err) {
        console.error("Failed to load users for hover cards:", err);
      }
    };
    loadUsers();
  }, [orgId]);

  // Fetch group data for enriching hover cards
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsData = await safeAsync(() => fetchGroups(orgId));
        const lookup = new Map();
        groupsData.forEach((group) => {
          const groupName = group.group_name || group.name || "";
          const normalized = {
            id: String(group._id || group.id || ""),
            name: groupName,
            group_name: groupName,
            description: group.description,
            group_image: group.group_image,
            member_count: (group.members_info || group.members || []).length,
            members: group.members || [],
            workstations: group.workstations || [],
            file_shares: group.file_shares || [],
            created_at: group.created_at,
          };
          if (normalized.name) {
            lookup.set(normalized.name, normalized);
          }
        });
        setGroupLookup(lookup);
      } catch (err) {
        console.error("Failed to load groups for hover cards:", err);
      }
    };
    loadGroups();
  }, [orgId]);

  // Safe-guard index building: ensure tree is an array if buildIndex expects one
  const index = useMemo(() => {
    // If tree is null or invalid, return empty map
    if (!tree) return new Map();
    // If buildIndex expects array but we have object (and logic wasn't fixed in FileHelper), wrap it or fix input
    // Assuming buildIndex iterates over the input:
    return buildIndex(tree);
  }, [tree]);
  // Helper function to ensure value is always an array
  const ensureArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string")
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };

  const fetchTree = useCallback(
    async ({ initial = false } = {}) => {
      if (initial) {
        setIsInitialLoading(true);
      }

      setLoadError("");
      console.log("fetchTree - Starting fetch with orgId:", orgId);

      try {
        const shares = await safeAsync(() => fetchFileShares(orgId));
        const nodes = transformSharesToTree(shares);
        console.log("fetchTree - Extracted shares:", nodes);
        setTree(Array.isArray(nodes) ? nodes : []);
      } catch (e) {
        console.error("fetchTree - Failed to fetch files:", e);
        setLoadError(getUserErrorMessage(e));
      } finally {
        if (initial) {
          setIsInitialLoading(false);
        }
      }
    },
    [orgId],
  );

  // Handle creating a new file share
  const handleCreateShare = useCallback(
    async (data) => {
      try {
        // Add to creating state
        setCreatingShares((prev) => new Set(prev).add(data.shareName));

        // Send create request
        const result = await createFileShare({
          orgId,
          name: data.shareName,
          users: data.users,
          groups: data.groups,
          description: data.description,
          maxSize: data.maxSize,
        });
        console.log("Create job queued:", result);

        // Close modal immediately so user can continue working
        setUploadOpen(false);

        // Poll for the new share to appear - check every 2 seconds for up to 30 seconds
        let attempts = 0;
        const maxAttempts = 15;

        const pollInterval = setInterval(async () => {
          attempts++;

          // Fetch current shares to check if new one exists
          const currentShares = await fetchFileShares(orgId);
          const shareExists = currentShares?.some(
            (s) => s.share?.name === data.shareName,
          );

          if (shareExists) {
            // Share created successfully - refresh UI
            clearInterval(pollInterval);
            setCreatingShares((prev) => {
              const newSet = new Set(prev);
              newSet.delete(data.shareName);
              return newSet;
            });
            await fetchTree();
            console.log(`File share "${data.shareName}" created successfully!`);
          } else if (attempts >= maxAttempts) {
            // Timeout - give up polling but still refresh
            clearInterval(pollInterval);
            setCreatingShares((prev) => {
              const newSet = new Set(prev);
              newSet.delete(data.shareName);
              return newSet;
            });
            await fetchTree();
            alert(
              `File share "${data.shareName}" is taking longer than expected to create. Please refresh if it doesn't appear.`,
            );
          }
        }, 2000);
      } catch (err) {
        console.error("Failed to create share:", err);
        setCreatingShares((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.shareName);
          return newSet;
        });
        alert(`Failed to create share: ${getUserErrorMessage(err)}`);
      }
    },
    [orgId, fetchTree],
  );

  // Handle editing a file share
  const handleEditShare = useCallback(
    async (data) => {
      try {
        await updateFileShare(orgId, editTarget.name, {
          users: data.users,
          groups: data.groups,
          description: data.description,
          max_size: data.maxSize ? parseInt(data.maxSize, 10) : undefined, // Store as GB
        });
        console.log("Share updated");
        setEditTarget(null);
        // Refresh the list
        fetchTree();
        alert("File share updated successfully!");
      } catch (err) {
        console.error("Failed to update share:", err);
        alert(`Failed to update share: ${getUserErrorMessage(err)}`);
      }
    },
    [orgId, editTarget, fetchTree],
  );

  // Handle deleting a file share
  const handleDeleteShare = useCallback(async () => {
    if (!editTarget) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${editTarget.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteFileShare(orgId, editTarget.name);
      console.log("Share deleted");
      setEditTarget(null);
      // Refresh the list
      fetchTree();
      alert("File share deleted successfully!");
    } catch (err) {
      console.error("Failed to delete share:", err);
      alert(`Failed to delete share: ${getUserErrorMessage(err)}`);
    }
  }, [orgId, editTarget, fetchTree]);

  // Trigger fetch on mount
  useEffect(() => {
    fetchTree({ initial: true });
  }, [fetchTree]);

  const listFilteredTree = useMemo(() => {
    if (layout !== "list") return tree;
    const filtered = filterTreeByQuery(tree, searchQuery);
    console.log("listFilteredTree - filtered:", filtered);
    return filtered;
  }, [tree, searchQuery, layout]);

  const effectiveExpanded = useMemo(() => {
    if (layout !== "list") return expanded;
    if (!searchQuery.trim()) return expanded;

    const auto = collectFolderIds(listFilteredTree);
    return new Set([...expanded, ...auto]);
  }, [expanded, listFilteredTree, searchQuery, layout]);

  const listVisibleRows = useMemo(() => {
    if (layout !== "list") return [];
    const rows = flattenVisibleTree(listFilteredTree, effectiveExpanded);
    console.log("listVisibleRows - rows:", rows);
    console.log("listVisibleRows - rows.length:", rows?.length);
    return rows;
  }, [listFilteredTree, effectiveExpanded, layout]);

  const listVisibleIds = useMemo(
    () => listVisibleRows.map((r) => r.node.id),
    [listVisibleRows],
  );

  const iconRows = useMemo(() => {
    if (layout !== "icons") return [];
    const filtered = filterTreeByQuery(tree, searchQuery);
    const expandedAll = collectFolderIds(filtered);
    return flattenVisibleTree(filtered, expandedAll);
  }, [layout, tree, searchQuery]);

  const iconVisibleIds = useMemo(
    () => iconRows.map(({ node }) => node.id),
    [iconRows],
  );

  const selectedIconCount = useMemo(
    () => iconVisibleIds.filter((id) => selectedIds.has(id)).length,
    [iconVisibleIds, selectedIds],
  );

  const selectedListCount = useMemo(
    () => listVisibleIds.filter((id) => selectedIds.has(id)).length,
    [listVisibleIds, selectedIds],
  );

  const { allVisibleSelected, isIndeterminate } = useMemo(() => {
    const ids = layout === "list" ? listVisibleIds : iconVisibleIds;
    const hasSelected = ids.some((id) => selectedIds.has(id));
    const allAreSelected =
      ids.length > 0 && ids.every((id) => selectedIds.has(id));
    return {
      allVisibleSelected: allAreSelected,
      isIndeterminate: hasSelected && !allAreSelected,
    };
  }, [layout, listVisibleIds, iconVisibleIds, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      toggleSelectCascade({ id, index, selectedIds: prev }),
    );
  };

  const toggleSelectAllVisible = () => {
    trackButton("files/list/select-all", { page: "files", layout });
    const ids = layout === "list" ? listVisibleIds : iconVisibleIds;
    const hasSelected = ids.some((id) => selectedIds.has(id));
    const allAreSelected =
      ids.length > 0 && ids.every((id) => selectedIds.has(id));

    if (hasSelected && !allAreSelected) {
      // Indeterminate state - deselect all
      setSelectedIds(new Set());
    } else {
      // Use existing toggleSelectAllInView for select all / deselect all
      setSelectedIds((prev) =>
        toggleSelectAllInView({ ids, selectedIds: prev }),
      );
    }
  };

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleExpand = (id) => {
    trackButton("files/list/toggle-folder", { page: "files", id });
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEdit = (node) => setEditTarget(node);

  // Direct delete without opening edit modal
  const handleDirectDelete = useCallback(
    async (node) => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${node.name}"? This action cannot be undone.`,
      );
      if (!confirmed) return;

      try {
        // Mark this share as being deleted (shows spinner)
        setDeletingShares((prev) => new Set(prev).add(node.name));

        // Send delete request and get job ID
        const result = await deleteFileShare(orgId, node.name);
        console.log("Delete job queued:", result);

        // Poll for completion - check every 2 seconds for up to 30 seconds
        let attempts = 0;
        const maxAttempts = 15;

        const pollInterval = setInterval(async () => {
          attempts++;

          // Refresh to check if share is gone
          const currentShares = await fetchFileShares(orgId);
          const shareStillExists = currentShares?.some(
            (s) => s.share?.name === node.name,
          );

          if (!shareStillExists) {
            // Share is deleted - refresh UI and remove from deleting state
            clearInterval(pollInterval);
            setDeletingShares((prev) => {
              const newSet = new Set(prev);
              newSet.delete(node.name);
              return newSet;
            });
            await fetchTree();
          } else if (attempts >= maxAttempts) {
            // Timeout - give up polling but still refresh
            clearInterval(pollInterval);
            setDeletingShares((prev) => {
              const newSet = new Set(prev);
              newSet.delete(node.name);
              return newSet;
            });
            await fetchTree();
            alert(
              "Delete is taking longer than expected. Please refresh if the share is still visible.",
            );
          }
        }, 2000);
      } catch (err) {
        console.error("Failed to delete share:", err);
        setDeletingShares((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.name);
          return newSet;
        });
        alert(`Failed to delete share: ${getUserErrorMessage(err)}`);
      }
    },
    [orgId, fetchTree],
  );

  const handleLayoutChange = (next) => {
    trackButton("files/display/toggle", {
      page: "files",
      layout: next,
      control: "display_button",
    });
    setLayout(next);
  };

  const renderList = () => (
    <>
      <div className="tableHeaders">
        <div className="header">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={toggleSelectAllVisible}
            style={
              !allVisibleSelected && !isIndeterminate
                ? {
                    border: "2px solid rgba(255, 255, 255, 0.5)",
                    backgroundColor: "transparent",
                  }
                : undefined
            }
          />
          <div>Name</div>
          <div className="metaHeader">Date Modified</div>
          <div className="storageHeader">Storage</div>
          <div className="usersHeader">Users</div>
          <div className="groupsHeader">Groups</div>
          <div />
        </div>
      </div>

      <div className="table">
        <div className="tableRows">
          {listVisibleRows.map(({ node, depth }, index) => {
            const isFolder = node.kind === NODE_KIND.FOLDER;
            const isOpen = effectiveExpanded.has(node.id);

            return (
              <React.Fragment key={node.id}>
                <div
                  className="row"
                  style={
                    deletingShares.has(node.name)
                      ? { opacity: 0.5, pointerEvents: "none" }
                      : {}
                  }
                >
                  <Checkbox
                    checked={selectedIds.has(node.id)}
                    onChange={() => toggleSelect(node.id)}
                  />

                  <div className="nameCell">
                    <div className="nameInner" style={{ paddingLeft: depth * 18 }}>
                      {isFolder ? (
                        <button
                          type="button"
                          className="chevBtn"
                          onClick={() => toggleExpand(node.id)}
                          aria-label={isOpen ? "Collapse folder" : "Expand folder"}
                        >
                          <Chevron open={isOpen} />
                        </button>
                      ) : null}

                      <span className="iconWrap">
                        {isFolder ? <FolderIcon /> : <FileIcon />}
                      </span>

                      <div className="nameTextWrap">
                        <div className="nameLine">
                          <span className="nameText">{node.name}</span>
                          {node.kind === NODE_KIND.FILE && node.size ? (
                            <span className="sizeText">{node.size}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="meta">{formatDateTime(node.updated_at)}</div>

                  <StorageCell
                    currentSize={node.current_size}
                    maxSize={node.max_size}
                  />

                  <div className="groups">
                    <AvatarPill
                      items={Array.from(new Set(ensureArray(node.users))).map(
                        (username) =>
                          userLookup.get(username) || { username, id: username },
                      )}
                      type="user"
                      maxVisible={3}
                    />
                  </div>

                  <div className="groups">
                    <AvatarPill
                      items={ensureArray(node.groups).map(
                        (groupName) =>
                          groupLookup.get(groupName) || {
                            name: groupName,
                            id: groupName,
                          },
                      )}
                      type="group"
                      maxVisible={3}
                    />
                  </div>

                  <EditButton
                    menuItems={[
                      {
                        icon: <EditIcon width={15} height={16} color={themeColors.text} />,
                        label: "edit share",
                        color: themeColors.text,
                        onClick: () => openEdit(node),
                      },
                      {
                        icon: <TrashIcon width={12} height={14} color="#D51616" />,
                        label: "delete share",
                        color: "#D51616",
                        onClick: () => handleDirectDelete(node),
                      },
                    ]}
                  />
                </div>
                {index !== listVisibleRows.length - 1 ? (
                  <div className="rowDivider" />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );

  const renderIcons = () => (
    <>
      <div className="iconsSelectionBar">
        <div className="iconsSelectionLeft">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={isIndeterminate}
            onChange={toggleSelectAllVisible}
          />
          <button
            type="button"
            className="iconsSelectAllButton"
            onClick={toggleSelectAllVisible}
          >
            {allVisibleSelected || isIndeterminate
              ? "Clear selection"
              : "Select all"}
          </button>
        </div>
        <div className="iconsSelectedCount">{selectedIconCount} selected</div>
      </div>

      <div className="iconsGrid">
        {iconRows.map(({ node }) => {
          const isFolder = node.kind === NODE_KIND.FOLDER;
          const isSelected = selectedIds.has(node.id);
          const users = Array.from(new Set(ensureArray(node.users))).map(
            (username) => userLookup.get(username) || { username, id: username },
          );
          const groups = ensureArray(node.groups).map((groupName) => {
            return groupLookup.get(groupName) || {
              name: groupName,
              id: groupName,
            };
          });
          const maxSize = Number.parseFloat(node.max_size);
          const hasStorage =
            Number.isFinite(maxSize) &&
            maxSize > 0;
          const currentSize = Number(node.current_size || 0);

          const handleKeyDown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openEdit(node);
            }
          };
          const stopEventPropagation = (e) => {
            e.stopPropagation();
          };

          return (
            <div
              key={node.id}
              className={`iconTile ${isSelected ? "selected" : ""}`}
              onClick={() => openEdit(node)}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={0}
              aria-label={`${node.name} ${isFolder ? "folder" : "file"}`}
            >
              <div className="tileHeader">
                <div
                  className="tileSelect"
                  onClick={stopEventPropagation}
                  onKeyDown={stopEventPropagation}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelect(node.id)}
                    style={
                      !isSelected
                        ? {
                            border: "2px solid var(--text-primary)",
                            backgroundColor: "transparent",
                          }
                        : undefined
                    }
                  />
                </div>

                <div
                  className="tileActions"
                  onClick={stopEventPropagation}
                  onKeyDown={stopEventPropagation}
                >
                  <EditButton
                    menuItems={[
                      {
                        icon: <EditIcon width={15} height={16} color={themeColors.text} />,
                        label: "edit share",
                        color: themeColors.text,
                        onClick: () => openEdit(node),
                      },
                      {
                        icon: <TrashIcon width={12} height={14} color="#D51616" />,
                        label: "delete share",
                        color: "#D51616",
                        onClick: () => handleDirectDelete(node),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="iconTitle">
                <span className="iconKindWrap">
                  {isFolder ? <FolderIcon /> : <FileIcon />}
                </span>
                <div className="iconTitleText">
                  <div className="iconName" title={node.name}>
                    {node.name}
                  </div>
                  <div className="iconSub">
                    {formatDateTime(node.updated_at)}
                  </div>
                </div>
              </div>

              <div className="iconStorageLine">
                <span className="iconMetaLabel">Storage</span>
                <span className="iconMetaValue">
                  {hasStorage ? `${currentSize} / ${maxSize} GB` : formatShares(0)}
                </span>
              </div>

              <div className="iconAvatarsLine">
                <span className="iconMetaLabel">Users</span>
                <AvatarPill items={users} type="user" maxVisible={2} />
              </div>

              <div className="iconAvatarsLine">
                <span className="iconMetaLabel">Groups</span>
                <AvatarPill items={groups} type="group" maxVisible={2} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderMainContent = () => {
    if (isInitialLoading) {
      return <TableSkeleton rows={8} cols={6} />;
    }

    return layout === "list" ? renderList() : renderIcons();
  };



  return (
    <PageShell>
      <div className="filesPage">
        <div className="toolbar">
        <div className="leftTools">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files"
            showIcon={true}
            style={{
              flex: "0 1 420px",
              minWidth: "220px",
              maxWidth: "420px",
              width: "auto",
            }}
          />
          <DisplayButton
            layout={layout}
            onLayoutChange={handleLayoutChange}
          />
        </div>

        <div className="rightTools">
          {layout === "list" && selectedListCount > 0 && (
            <div className="selectionSummary">
              <span className="selectionSummaryCount">
                {selectedListCount} selected
              </span>
              <button
                type="button"
                className="clearSelectionButton"
                onClick={clearSelection}
              >
                Clear selection
              </button>
            </div>
          )}
          <RefreshButton
            onClick={withClickLog({
              name: "files/toolbar/refresh",
              control: "refresh_button",
            })(fetchTree)}
          />
          <CreateButton
            icon={<FolderPlusIcon width={16} height={16} color="var(--text-primary)" />}
            buttonText="Create"
            onClick={withClickLog({
              name: "files/toolbar/open-upload",
              control: "upload_button",
            })(() => setUploadOpen(true))}
          />
        </div>
      </div>

      {/* Subtle notification banner for operations in progress */}
      {(creatingShares.size > 0 || deletingShares.size > 0) && (
        <div className="operationBanner">
          <CircularProgress size={14} style={{ color: "#4f8cff" }} />
          <span>
            {creatingShares.size > 0 &&
              `Creating ${Array.from(creatingShares).join(", ")}...`}
            {creatingShares.size > 0 && deletingShares.size > 0 && " • "}
            {deletingShares.size > 0 &&
              `Deleting ${Array.from(deletingShares).join(", ")}...`}
          </span>
        </div>
      )}

        {loadError ? (
          <div className="filesErrorBanner" role="alert">
            {loadError}
          </div>
        ) : null}

        <div className="contentSurface">
          <TableSurface>
            {renderMainContent()}
          </TableSurface>
        </div>

      {/* New Wizard Modal for Create */}
      <FileShareWizardModal
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleCreateShare}
      />

      {/* New Wizard Modal for Edit */}
      <FileShareWizardModal
        isOpen={!!editTarget}
        file={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditShare}
        onDelete={handleDeleteShare}
      />

      <style>{`
        .filesPage {
          padding: 0;
          color: var(--text-primary);
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .contentSurface {
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
        }

        .filesErrorBanner {
          flex-shrink: 0;
          border: 1px solid rgba(255, 107, 107, 0.25);
          background: rgba(255, 107, 107, 0.08);
          color: #ffd7d7;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 0.9rem;
        }

        /* Top bar */
        .topBar {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 14px;
        }
        .title { font-size: 18px; font-weight: 650; letter-spacing: -0.2px; }
        .subtitle { font-size: 12px; opacity: 0.6; margin-top: 4px; }

        .storagePill {
          min-width: 220px;
          background: var(--action-hover);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .storageText { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .storageLabel { font-size: 12px; opacity: 0.7; }
        .storageValue { font-size: 12px; opacity: 0.85; }
        .storageBar { height: 6px; background: var(--border-light); border-radius: 999px; overflow: hidden; }
        .storageFill { height: 100%; background: #4f8cff; border-radius: 999px; }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          flex-shrink: 0;
          margin-bottom: 0;
        }
        .leftTools,
        .rightTools {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .leftTools {
          flex: 1 1 auto;
          min-width: 0;
        }
        .rightTools {
          flex: 0 0 auto;
        }
        .selectionSummary {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .selectionSummaryCount {
          font-size: 12px;
          color: var(--text-primary);
          opacity: 0.75;
          white-space: nowrap;
        }
        .clearSelectionButton {
          border: 1px solid var(--border);
          background: var(--lightOverlaySubtle);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          line-height: 1;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
        }
        .clearSelectionButton:hover {
          background: var(--action-hover);
        }

        /* Operation banner - subtle notification */
        .operationBanner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          margin-bottom: 12px;
          background: rgba(79, 140, 255, 0.08);
          border: 1px solid rgba(79, 140, 255, 0.15);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-primary);
          opacity: 0.85;
        }

        /* LIST (Tree) */
        .tableHeaders {
          display: grid;
          align-items: center;
          gap: 12px;
          padding: 24px 32px 4px 32px;
          position: sticky;
          top: 0;
          background-color: var(--bg-primary);
          z-index: 10;
          flex-shrink: 0;
        }

        .table {
          border-radius: 18px;
          border: 1px solid var(--border);
          background-color: var(--bg-primary);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          padding: 16px;
          overflow: hidden;
        }
        .tableRows {
          padding: 0 8px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .header, .row {
          display: grid;
          grid-template-columns: 40px 2.1fr 1.2fr 1.3fr 0.7fr 1.2fr 44px;
          padding: 12px 8px;
          align-items: center;
          column-gap: 12px;
          min-width: 0;
        }
        .header {
          font-size: 0.85rem;
          opacity: 0.7;
          color: var(--text-primary);
          font-weight: 400;
          position: static;
          background-color: transparent;
          z-index: auto;
          border-radius: 0;
          padding: 0;
        }
        .header > div {
          font-size: 0.85rem;
          font-weight: 400;
        }
        .row {
          border-radius: 12px;
          position: relative;
        }
        .row:hover {
          background: var(--action-hover);
        }
        .rowDivider {
          border-top: 1px solid var(--border-light);
          margin: 0 8px;
        }

        .storageCell {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .storageMiniValue,
        .storageMiniLabel {
          font-size: 11px;
          opacity: 0.8;
          white-space: nowrap;
        }
        .storageMiniBar {
          height: 4px;
          background: var(--border-light);
          border-radius: 999px;
          overflow: hidden;
          max-width: 140px;
        }
        .storageMiniFill {
          height: 100%;
          background: #4f8cff;
          border-radius: 999px;
        }

        .nameCell { min-width: 0; }
        .nameInner {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .iconWrap { display: inline-flex; }
        .nameTextWrap { min-width: 0; }
        .nameLine {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .nameText {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .sizeText { font-size: 12px; opacity: 0.6; white-space: nowrap; flex: 0 0 auto; }

        .chevBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
        }
        .chevBtn:hover { background: var(--action-hover); }
        .chevSpacer { display: inline-block; width: 28px; height: 28px; }

        .meta {
          font-size: 0.9rem;
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .groups { display: flex; flex-wrap: wrap; gap: 6px; }
        .groups span {
          background: var(--action-hover);
          border: 1px solid var(--border-light);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
          opacity: 0.85;
        }

        /* ICONS VIEW */
        .iconsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }
        .iconsSelectionBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          margin-bottom: 12px;
        }
        .iconsSelectionLeft {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .iconsSelectAllButton {
          border: 1px solid var(--border);
          background: var(--action-hover);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          line-height: 1;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
        }
        .iconsSelectAllButton:hover {
          background: var(--lightOverlay);
        }
        .iconsSelectedCount {
          font-size: 12px;
          opacity: 0.75;
        }
        .iconTile {
          position: relative;
          border: 1px solid var(--border-light);
          background: rgba(0,0,0,0.15);
          border-radius: 14px;
          padding: 14px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          cursor: pointer;
          min-width: 0;
        }
        .iconTile.selected {
          border-color: var(--border);
          background: var(--action-hover);
        }
        .iconTile:hover { background: var(--lightOverlaySubtle); }
        .tileHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 28px;
          gap: 8px;
        }
        .tileSelect {
          display: inline-flex;
          align-items: center;
        }
        .tileActions {
          display: inline-flex;
          align-items: center;
        }
        .iconKindWrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 50%;
          background: var(--bg-secondary);
          opacity: 0.9;
        }
        .iconKindWrap svg {
          width: 16px;
          height: 16px;
        }
        .iconTitle {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .iconTitleText {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .iconName {
          font-weight: 600;
          line-height: 1.15;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .iconSub {
          font-size: 0.85rem;
          opacity: 0.85;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .iconStorageLine,
        .iconAvatarsLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          font-size: 0.85rem;
        }
        .iconMetaLabel {
          opacity: 0.68;
          white-space: nowrap;
        }
        .iconMetaValue {
          opacity: 0.9;
          white-space: nowrap;
        }

        /* Responsive */
        
        /* Delete spinner - subtle, in place of edit button */
        .deleteSpinner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 900px) {
          .toolbar {
            align-items: stretch;
          }

          .leftTools,
          .rightTools {
            width: 100%;
          }
        }

        @media (max-width: 820px) {
          .topBar { flex-direction: column; align-items: stretch; }
          .storagePill { width: 100%; }
          .iconsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

          .tableHeaders {
            padding: 20px 30px 4px 30px;
          }

          .table {
            border-radius: 12px;
            padding: 12px;
          }

          /* List: hide columns on mobile */
          .row .meta,
          .row .groups,
          .storageCell,
          .storageHeader,
          .metaHeader,
          .usersHeader,
          .groupsHeader { display: none; }

          .header, .row { grid-template-columns: 40px 1fr 44px; }
        }
        @media (max-width: 520px) {
          .tableHeaders {
            padding: 16px 20px 4px 20px;
          }
          .iconsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
      </div>
    </PageShell>
  );
}

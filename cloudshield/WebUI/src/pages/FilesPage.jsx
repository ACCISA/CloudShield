import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";
import SearchField from "../components/common/SearchField/SearchField";
import DisplayButton from "../components/common/DisplayButton/DisplayButton";
import RefreshButton from "../components/common/RefreshButton/RefreshButton";
import CreateButton from "../components/common/CreateButton/CreateButton";
import Checkbox from "../components/common/Checkbox/Checkbox";
import EditButton from "../components/common/EditButton/EditButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import { useClickLogger } from "../hooks/useClickLogger";
import { trackButton } from "../lib/analytics";

import FileShareWizardModal from "../components/files/FileShareWizardModal";
import AvatarPill from "../components/files/AvatarPill";
import FolderPlusIcon from "../assets/FolderPlusIcon";

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
  HARD_CODED_TREE,
  NODE_KIND,
  formatDateTime,
  buildIndex,
  toggleSelectCascade,
  toggleSelectAllInView,
  filterTreeByQuery,
  collectFolderIds,
  flattenVisibleTree,
  getFolderChildrenByStack,
  getBreadcrumbNodes,
  resolveFolderByPath,
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
  const max = typeof maxSize === "number" ? maxSize : null;
  const current = Math.max(0, Number(currentSize || 0));

  if (!max || max <= 0) {
    return (
      <div className="storageCell" aria-label="Storage usage">
        <div className="storageMiniLabel">-</div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="storageCell" aria-label={`Storage usage ${current} of ${max} GB`}>
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
  
  // Use a fallback to prevent crash on initial render if HARD_CODED_TREE is valid
  // If HARD_CODED_TREE causes issues, initialize as []
  const [tree, setTree] = useState(HARD_CODED_TREE || []);
  
  // Lookup maps for enriching hover cards
  const [userLookup, setUserLookup] = useState(new Map());
  const [groupLookup, setGroupLookup] = useState(new Map());
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [cwdStack, setCwdStack] = useState([]);
  const [pathMode, setPathMode] = useState(false);
  const [pathValue, setPathValue] = useState("");
  const pathInputRef = useRef(null);

  const [isUploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deletingShares, setDeletingShares] = useState(new Set()); // Track which shares are being deleted
  const [creatingShares, setCreatingShares] = useState(new Set()); // Track which shares are being created

  // Fetch user data for enriching hover cards
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers(orgId);
        const lookup = new Map();
        usersData.forEach(user => {
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
          // Keep lookups simple and aligned with the DB shape.
          if (normalized.username) lookup.set(normalized.username, normalized);
          if (email) lookup.set(email, normalized);
          if (normalized.full_name) lookup.set(normalized.full_name, normalized);
          // Legacy fallback: some shares store email prefixes like "samir".
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
        const groupsData = await fetchGroups(orgId);
        const lookup = new Map();
        groupsData.forEach(group => {
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
          // Map by name for lookup
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
    if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // --- CORRECTED FETCH LOGIC ---
  const fetchTree = useCallback(async () => {
    console.log("fetchTree - Starting fetch with orgId:", orgId);
    try {
      const shares = await fetchFileShares(orgId);
      const nodes = transformSharesToTree(shares);
      console.log("fetchTree - Extracted shares:", nodes);
      setTree(nodes);
    } catch (e) {
      console.error("fetchTree - Failed to fetch files:", e);
    }
  }, [orgId]);

  // Handle creating a new file share
  const handleCreateShare = useCallback(async (data) => {
    try {
      // Add to creating state
      setCreatingShares(prev => new Set(prev).add(data.shareName));
      
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
        const shareExists = currentShares?.some(s => s.share?.name === data.shareName);
        
        if (shareExists) {
          // Share created successfully - refresh UI
          clearInterval(pollInterval);
          setCreatingShares(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.shareName);
            return newSet;
          });
          await fetchTree();
          console.log(`File share "${data.shareName}" created successfully!`);
        } else if (attempts >= maxAttempts) {
          // Timeout - give up polling but still refresh
          clearInterval(pollInterval);
          setCreatingShares(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.shareName);
            return newSet;
          });
          await fetchTree();
          alert(`File share "${data.shareName}" is taking longer than expected to create. Please refresh if it doesn't appear.`);
        }
      }, 2000);
      
    } catch (err) {
      console.error("Failed to create share:", err);
      setCreatingShares(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.shareName);
        return newSet;
      });
      alert(`Failed to create share: ${err.message}`);
    }
  }, [orgId, fetchTree]);

  // Handle editing a file share
  const handleEditShare = useCallback(async (data) => {
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
      alert(`Failed to update share: ${err.message}`);
    }
  }, [orgId, editTarget, fetchTree]);

  // Handle deleting a file share
  const handleDeleteShare = useCallback(async () => {
    if (!editTarget) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${editTarget.name}"? This action cannot be undone.`);
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
      alert(`Failed to delete share: ${err.message}`);
    }
  }, [orgId, editTarget, fetchTree]);

  // Trigger fetch on mount
  useEffect(() => {
    fetchTree();
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

  const listVisibleIds = useMemo(() => listVisibleRows.map((r) => r.node.id), [listVisibleRows]);

  const breadcrumb = useMemo(() => getBreadcrumbNodes(index, cwdStack), [index, cwdStack]);
  const cwdItems = useMemo(
    () => (layout === "icons" ? getFolderChildrenByStack(tree, index, cwdStack) : []),
    [tree, index, cwdStack, layout]
  );

  const iconItems = useMemo(() => {
    if (layout !== "icons") return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cwdItems;
    return cwdItems.filter((n) => (n.name || "").toLowerCase().includes(q));
  }, [cwdItems, searchQuery, layout]);

  const iconVisibleIds = useMemo(() => iconItems.map((n) => n.id), [iconItems]);

  const allVisibleSelected = useMemo(() => {
    const ids = layout === "list" ? listVisibleIds : iconVisibleIds;
    return ids.length > 0 && ids.every((id) => selectedIds.has(id));
  }, [layout, listVisibleIds, iconVisibleIds, selectedIds]);


  const toggleSelect = (id) => {
    setSelectedIds((prev) => toggleSelectCascade({ id, index, selectedIds: prev }));
  };

  const toggleSelectAllVisible = () => {
    trackButton("files/list/select-all", { page: "files", layout });
    const ids = layout === "list" ? listVisibleIds : iconVisibleIds;
    setSelectedIds((prev) => toggleSelectAllInView({ ids, selectedIds: prev }));
  };

  const toggleExpand = (id) => {
    trackButton("files/list/toggle-folder", { page: "files", id });
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openFolder = (id) => {
    trackButton("files/nav/open-folder", { page: "files", id });
    const node = index.get(id);
    if (!node || node.kind !== NODE_KIND.FOLDER) return;
    setCwdStack((s) => [...s, id]);
    setSelectedIds(new Set());
  };

  const goUp = () => {
    trackButton("files/nav/up", { page: "files" });
    setCwdStack((s) => s.slice(0, -1));
  };
  const goToCrumb = (idx) => {
    trackButton("files/nav/crumb", { page: "files", idx });
    setCwdStack((s) => s.slice(0, idx + 1));
  };

  const openEdit = (node) => setEditTarget(node);

  // Direct delete without opening edit modal
  const handleDirectDelete = useCallback(async (node) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${node.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      // Mark this share as being deleted (shows spinner)
      setDeletingShares(prev => new Set(prev).add(node.name));
      
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
        const shareStillExists = currentShares?.some(s => s.share?.name === node.name);
        
        if (!shareStillExists) {
          // Share is deleted - refresh UI and remove from deleting state
          clearInterval(pollInterval);
          setDeletingShares(prev => {
            const newSet = new Set(prev);
            newSet.delete(node.name);
            return newSet;
          });
          await fetchTree();
        } else if (attempts >= maxAttempts) {
          // Timeout - give up polling but still refresh
          clearInterval(pollInterval);
          setDeletingShares(prev => {
            const newSet = new Set(prev);
            newSet.delete(node.name);
            return newSet;
          });
          await fetchTree();
          alert("Delete is taking longer than expected. Please refresh if the share is still visible.");
        }
      }, 2000);
      
    } catch (err) {
      console.error("Failed to delete share:", err);
      setDeletingShares(prev => {
        const newSet = new Set(prev);
        newSet.delete(node.name);
        return newSet;
      });
      alert(`Failed to delete share: ${err.message}`);
    }
  }, [orgId, fetchTree]);

  const submitPath = (e) => {
    e.preventDefault();
    const { ok, stack } = resolveFolderByPath(tree, pathValue);
    if (!ok) return;
    trackButton("files/nav/path-go", { page: "files" });
    setCwdStack(stack);
    setPathMode(false);
  };

  const handleLayoutChange = (next) => {
    const resolved = next === "cards" ? "list" : next;
    trackButton("files/display/toggle", { page: "files", layout: resolved, control: "display_button" });
    setLayout(resolved);
  };


  const renderList = () => (
    <div className="table">
      <div className="header">
        <Checkbox checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
        <div>Name</div>
        <div className="metaHeader">Date Modified</div>
        <div className="storageHeader">Storage</div>
        <div className="usersHeader">Users</div>
        <div className="groupsHeader">Groups</div>
        <div />
      </div>

      {listVisibleRows.map(({ node, depth }) => {
        const isFolder = node.kind === NODE_KIND.FOLDER;
        const isOpen = effectiveExpanded.has(node.id);

        return (
          <div 
            className="row" 
            key={node.id}
            style={deletingShares.has(node.name) ? { opacity: 0.5, pointerEvents: 'none' } : {}}
          >
            <Checkbox checked={selectedIds.has(node.id)} onChange={() => toggleSelect(node.id)} />

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
                ) : (
                  <span className="chevSpacer" />
                )}

                <span className="iconWrap">{isFolder ? <FolderIcon /> : <FileIcon />}</span>

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

            <StorageCell currentSize={node.current_size} maxSize={node.max_size} />

            <div className="groups">
              <AvatarPill 
                items={Array.from(new Set(ensureArray(node.users))).map(username => 
                  userLookup.get(username) || { username, id: username }
                )} 
                type="user" 
                maxVisible={3} 
              />
            </div>

            <div className="groups">
              <AvatarPill 
                items={ensureArray(node.groups).map(groupName => 
                  groupLookup.get(groupName) || { name: groupName, id: groupName }
                )} 
                type="group" 
                maxVisible={3} 
              />
            </div>

            <EditButton
              menuItems={[
                { label: isFolder ? "Edit folder" : "Edit file", onClick: () => openEdit(node) },
                { label: isFolder ? "Delete folder" : "Delete file", color: "#ff3b30", onClick: () => handleDirectDelete(node) },
              ]}
            />
          </div>
        );
      })}
    </div>
  );

  const renderIcons = () => (
    <>
      <div className="pathBar">
        <button className={`navBtn ${cwdStack.length === 0 ? "disabled" : ""}`} onClick={goUp}>
          ←
        </button>

        {!pathMode ? (
          <div className="crumbs">
            <button className={`crumb ${cwdStack.length === 0 ? "active" : ""}`} onClick={() => setCwdStack([])}>
              Root
            </button>
            {breadcrumb.map((c, i) => (
              <React.Fragment key={c.id}>
                <span className="crumbSep">›</span>
                <button className={`crumb ${i === breadcrumb.length - 1 ? "active" : ""}`} onClick={() => goToCrumb(i)}>
                  {c.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <form onSubmit={submitPath} className="pathForm">
            <input
              ref={pathInputRef}
              className="pathInput"
              value={pathValue}
              onChange={(e) => setPathValue(e.target.value)}
              placeholder="Type a path like /sales_docs/policies"
            />
            <button className="pathGo" type="submit">Go</button>
            <button
              className="pathCancel"
              type="button"
              onClick={() => {
                trackButton("files/nav/path-cancel", { page: "files" });
                setPathMode(false);
              }}
            >
              Cancel
            </button>
          </form>
        )}

        <button
          className="pathShortcut"
          onClick={() => {
            trackButton("files/nav/path-mode", { page: "files" });
            setPathMode(true);
          }}
          title="Quick jump (Cmd/Ctrl+L)"
        >
          Path
        </button>
      </div>

      <div className="iconsGrid">
        {iconItems.map((node) => {
          const isFolder = node.kind === NODE_KIND.FOLDER;
          const isSelected = selectedIds.has(node.id);

          const handleKeyDown = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleSelect(node.id);
            }
          };

          return (
            <div
              key={node.id}
              className={`iconTile ${isSelected ? "selected" : ""}`}
              onClick={() => toggleSelect(node.id)}
              onDoubleClick={() => (isFolder ? openFolder(node.id) : openEdit(node))}
              onKeyDown={handleKeyDown}
              role="button"
              tabIndex={0}
              aria-label={`${node.name} ${isFolder ? "folder" : "file"}`}
            >
              <div className={`tileCheck ${isSelected ? "show" : ""}`}>
                <Checkbox checked={isSelected} onChange={() => toggleSelect(node.id)} />
              </div>

              <div className="iconBig">{isFolder ? <FolderIcon /> : <FileIcon />}</div>

              <div className="iconName" title={node.name}>{node.name}</div>

              <div className="iconSub">
                {node.kind === NODE_KIND.FILE && node.size ? node.size : node.kind}
              </div>

              {/* Show directory path ONLY in icons view, when not in root */}
              <div className="iconPath" title={breadcrumb.map((b) => b.name).join(" / ")}>
                {breadcrumb.length === 0 ? "Root" : breadcrumb.map((b) => b.name).join(" / ")}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="filesPage">
      {/* StoragePill temporarily hidden until global storage is defined */}
      {/* <StoragePill usedGB={62} totalGB={100} /> */}

      <div className="toolbar">
        <div className="leftTools">
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search files"
            showIcon={true}
            style={{
              flex: "1 1 260px",
              minWidth: "260px",
              maxWidth: "680px",
              width: "100%",
            }}
          />
          <DisplayButton
            layout={layout}
            onLayoutChange={handleLayoutChange}
            style={{ minWidth: 120 }}
          />
        </div>

        <div className="rightTools">
          <RefreshButton
            onClick={withClickLog({ name: "files/toolbar/refresh", control: "refresh_button" })(fetchTree)}
          />
          <CreateButton
            icon={<FolderPlusIcon width={16} height={16} color="#fff" />}
            buttonText="New Share"
            onClick={withClickLog({ name: "files/toolbar/open-upload", control: "upload_button" })(() =>
              setUploadOpen(true)
            )}
          />
        </div>
      </div>

      {/* Subtle notification banner for operations in progress */}
      {(creatingShares.size > 0 || deletingShares.size > 0) && (
        <div className="operationBanner">
          <CircularProgress size={14} style={{ color: '#4f8cff' }} />
          <span>
            {creatingShares.size > 0 && `Creating ${Array.from(creatingShares).join(', ')}...`}
            {creatingShares.size > 0 && deletingShares.size > 0 && ' • '}
            {deletingShares.size > 0 && `Deleting ${Array.from(deletingShares).join(', ')}...`}
          </span>
        </div>
      )}

      {layout === "list" && renderList()}
      {layout === "icons" && renderIcons()}

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
        .filesPage { padding: 0; color: #fff; }

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
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .storageText { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .storageLabel { font-size: 12px; opacity: 0.7; }
        .storageValue { font-size: 12px; opacity: 0.85; }
        .storageBar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; }
        .storageFill { height: 100%; background: #4f8cff; border-radius: 999px; }

        /* Toolbar */
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .leftTools, .rightTools {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .leftTools {
          flex: 1 1 auto;
          min-width: 0;
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
          color: rgba(255, 255, 255, 0.85);
        }

        /* LIST (Tree) */
        .table {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,0.15);
        }
        .header, .row {
          display: grid;
          grid-template-columns: 40px 2.1fr 1.2fr 1.3fr 0.7fr 1.2fr 44px;
          padding: 12px 12px;
          align-items: center;
          column-gap: 10px;
        }
        .header {
          font-size: 12px;
          opacity: 0.65;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .row { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .row:last-child { border-bottom: none; }

        .storageHeader { opacity: 0.75; }
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
          background: rgba(255,255,255,0.1);
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
          font-weight: 550;
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
          color: rgba(255,255,255,0.85);
          cursor: pointer;
        }
        .chevBtn:hover { background: rgba(255,255,255,0.06); }
        .chevSpacer { display: inline-block; width: 28px; height: 28px; }

        .meta {
          font-size: 13px;
          opacity: 0.72;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .groups { display: flex; flex-wrap: wrap; gap: 6px; }
        .groups span {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
          opacity: 0.85;
        }

        /* ICONS (Finder) */
        .pathBar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.15);
          border-radius: 12px;
          margin-bottom: 14px;
        }
        .navBtn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #fff;
          cursor: pointer;
        }
        .navBtn.disabled { opacity: 0.35; cursor: not-allowed; }

        .crumbs { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
        .crumbSep { opacity: 0.45; }
        .crumb {
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .crumb.active { color: #fff; font-weight: 650; }

        .pathShortcut {
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.85);
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
        }
        .pathForm { display: flex; gap: 8px; align-items: center; flex: 1; }
        .pathInput {
          flex: 1;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .pathGo, .pathCancel {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          color: #fff;
          cursor: pointer;
        }
        .pathGo { background: rgba(79,140,255,0.18); border-color: rgba(79,140,255,0.35); }

        .iconsGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }
        .iconTile {
          position: relative;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.15);
          border-radius: 14px;
          padding: 14px;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: pointer;
        }
        .iconTile:hover { background: rgba(255,255,255,0.03); }
        .iconTile.selected { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }

        /* checkbox appears on hover or when selected */
        .tileCheck {
          position: absolute;
          top: 10px;
          left: 10px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .iconTile:hover .tileCheck,
        .tileCheck.show {
          opacity: 1;
        }

        .iconBig { transform: scale(1.35); transform-origin: left center; margin-top: 16px; }
        .iconName {
          font-weight: 650;
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .iconSub, .iconPath {
          font-size: 12px;
          opacity: 0.6;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Responsive */
        @media (max-width: 1100px) {
          .iconsGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        
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
        
        @media (max-width: 820px) {
          .topBar { flex-direction: column; align-items: stretch; }
          .storagePill { width: 100%; }
          .iconsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

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
          .iconsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
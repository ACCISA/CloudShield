import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import SearchField from "../components/common/SearchField/SearchField";
import DisplayButton from "../components/common/DisplayButton/DisplayButton";
import RefreshButton from "../components/common/RefreshButton/RefreshButton";
import CreateButton from "../components/common/CreateButton/CreateButton";
import Checkbox from "../components/common/Checkbox/Checkbox";
import EditButton from "../components/common/EditButton/EditButton";

import UploadFileModal from "../components/files/UploadFileModal";
import EditFileModal from "../components/files/EditFileModal";

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

function StoragePill({ usedGB = 62, totalGB = 100 }) {
  const pct = Math.min(100, Math.max(0, (usedGB / totalGB) * 100));
  return (
    <div className="storagePill" aria-label="Storage usage">
      <div className="storageText">
        <span className="storageLabel">Storage</span>
        <span className="storageValue">
          {usedGB}GB / {totalGB}GB
        </span>
      </div>
      <div className="storageBar">
        <div className="storageFill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FilesPage({ orgId = "test_drive_allocation" }) {
  const [layout, setLayout] = useState("list");
  const [tree, setTree] = useState(HARD_CODED_TREE);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [cwdStack, setCwdStack] = useState([]);
  const [pathMode, setPathMode] = useState(false);
  const [pathValue, setPathValue] = useState("");
  const pathInputRef = useRef(null);

  const [isUploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const index = useMemo(() => buildIndex(tree), [tree]);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/file_shares?org_id=${orgId}`);
      const data = await res.json();

    } catch (e) {
      console.error("Failed to fetch files:", e);
    }
  }, [orgId]);

  const listFilteredTree = useMemo(() => {
    if (layout !== "list") return tree;
    return filterTreeByQuery(tree, searchQuery);
  }, [tree, searchQuery, layout]);

  const effectiveExpanded = useMemo(() => {
    if (layout !== "list") return expanded;
    if (!searchQuery.trim()) return expanded;

    const auto = collectFolderIds(listFilteredTree);
    return new Set([...expanded, ...auto]);
  }, [expanded, listFilteredTree, searchQuery, layout]);

  const listVisibleRows = useMemo(() => {
    if (layout !== "list") return [];
    return flattenVisibleTree(listFilteredTree, effectiveExpanded);
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
    const ids = layout === "list" ? listVisibleIds : iconVisibleIds;
    setSelectedIds((prev) => toggleSelectAllInView({ ids, selectedIds: prev }));
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openFolder = (id) => {
    const node = index.get(id);
    if (!node || node.kind !== NODE_KIND.FOLDER) return;
    setCwdStack((s) => [...s, id]);
    setSelectedIds(new Set());
  };

  const goUp = () => setCwdStack((s) => s.slice(0, -1));
  const goToCrumb = (idx) => setCwdStack((s) => s.slice(0, idx + 1));

  const openEdit = (node) => setEditTarget(node);

//web shortcut handlers, does not work for now
//   useEffect(() => {
//     const onKey = (e) => {
//       const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
//       if (layout === "icons" && isCmdL) {
//         e.preventDefault();
//         setPathMode(true);
//         const currentPath = "/" + breadcrumb.map((b) => b.name).join("/");
//         setPathValue(currentPath === "/" ? "" : currentPath);
//         setTimeout(() => pathInputRef.current?.focus(), 0);
//       }
//       if (e.key === "Escape") setPathMode(false);
//       if (layout === "icons" && e.key === "Backspace" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
//         if (cwdStack.length > 0) {
//           e.preventDefault();
//           goUp();
//         }
//       }
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [layout, breadcrumb, cwdStack.length]);

  const submitPath = (e) => {
    e.preventDefault();
    const { ok, stack } = resolveFolderByPath(tree, pathValue);
    if (!ok) return;
    setCwdStack(stack);
    setPathMode(false);
  };


  const renderList = () => (
    <div className="table">
      <div className="header">
        <Checkbox checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
        <div>Name</div>
        <div>Date Modified</div>
        <div>Kind</div>
        <div>Users</div>
        <div>Groups</div>
        <div />
      </div>

      {listVisibleRows.map(({ node, depth }) => {
        const isFolder = node.kind === NODE_KIND.FOLDER;
        const isOpen = effectiveExpanded.has(node.id);

        return (
          <div className="row" key={node.id}>
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
            <div className="meta">{node.kind}</div>
            <div className="meta">{node.users ?? "—"}</div>

            <div className="groups">
              {(node.groups || []).slice(0, 3).map((g) => (
                <span key={g}>{g}</span>
              ))}
              {(node.groups || []).length > 3 ? <span>+{node.groups.length - 3}</span> : null}
            </div>

            <EditButton
              menuItems={[
                { label: isFolder ? "Edit folder" : "Edit file", onClick: () => openEdit(node) },
                { label: isFolder ? "Delete folder" : "Delete file", color: "#ff3b30", onClick: () => openEdit(node) },
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
            <button className="pathCancel" type="button" onClick={() => setPathMode(false)}>Cancel</button>
          </form>
        )}

        <button className="pathShortcut" onClick={() => setPathMode(true)} title="Quick jump (Cmd/Ctrl+L)">
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
            } else if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              isFolder ? openFolder(node.id) : openEdit(node);
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
      <div className="topBar">
        <div className="titleBlock">
          <div className="title">Files</div>
          <div className="subtitle">Browse and manage your organization files</div>
        </div>
        <StoragePill usedGB={62} totalGB={100} />
      </div>

      <div className="toolbar">
        <div className="leftTools">
          <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search files" />
          <DisplayButton
            layout={layout}
            onLayoutChange={(next) => setLayout(next === "cards" ? "list" : next)} // prevent cards
            style={{ minWidth: 120 }}
          />
        </div>

        <div className="rightTools">
          <RefreshButton onClick={fetchTree} />
          <CreateButton buttonText="Upload" onClick={() => setUploadOpen(true)} />
        </div>
      </div>

      {layout === "list" && renderList()}
      {layout === "icons" && renderIcons()}

      <UploadFileModal
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={() => setUploadOpen(false)}
      />

      <EditFileModal
        isOpen={!!editTarget}
        file={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={() => setEditTarget(null)}
        onDelete={() => setEditTarget(null)}
      />

      <style>{`
        .filesPage { padding: 20px; color: #fff; }

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

        /* LIST (Tree) */
        .table {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(0,0,0,0.15);
        }
        .header, .row {
          display: grid;
          grid-template-columns: 40px 2.2fr 1.4fr 0.8fr 0.7fr 1.2fr 44px;
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
        @media (max-width: 820px) {
          .topBar { flex-direction: column; align-items: stretch; }
          .storagePill { width: 100%; }
          .iconsGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

          /* List: hide columns on mobile */
          .header div:nth-child(3),
          .header div:nth-child(4),
          .header div:nth-child(5),
          .header div:nth-child(6),
          .row .meta:nth-of-type(1),
          .row .meta:nth-of-type(2),
          .row .meta:nth-of-type(3),
          .row .groups { display: none; }

          .header, .row { grid-template-columns: 40px 1fr 44px; }
        }
        @media (max-width: 520px) {
          .iconsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </div>
  );
}
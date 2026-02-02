export const NODE_KIND = { FOLDER: "folder", FILE: "file" };

export const HARD_CODED_TREE = [];

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${date} at ${time}`;
}


export function buildIndex(tree) {
  const index = new Map();
  (function walk(nodes) {
    (nodes || []).forEach((n) => {
      index.set(n.id, n);
      if (n.kind === NODE_KIND.FOLDER) walk(n.children || []);
    });
  })(tree);
  return index;
}


export function collectDescendantIds(node, acc = []) {
  if (!node) return acc;
  acc.push(node.id);
  if (node.kind === NODE_KIND.FOLDER) {
    (node.children || []).forEach((c) => collectDescendantIds(c, acc));
  }
  return acc;
}

// Folder selection cascades to descendants.
// Selecting a child does NOT select the parent.
export function toggleSelectCascade({ id, index, selectedIds }) {
  const node = index.get(id);
  if (!node) return selectedIds;

  const next = new Set(selectedIds);

  if (node.kind === NODE_KIND.FOLDER) {
    const ids = collectDescendantIds(node);
    const isSelecting = !next.has(id);
    ids.forEach((cid) => {
      if (isSelecting) next.add(cid);
      else next.delete(cid);
    });
    return next;
  }

  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function toggleSelectAllInView({ ids, selectedIds }) {
  const next = new Set(selectedIds);
  const all = ids.length > 0 && ids.every((id) => next.has(id));
  ids.forEach((id) => {
    if (all) next.delete(id);
    else next.add(id);
  });
  return next;
}


// Filter tree by search query while preserving hierarchy.
// - If folder matches: keep folder + all children
// - Else keep folder only if any child matches (with filtered children)
export function filterTreeByQuery(nodes, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return nodes || [];

  const matches = (name) => (name || "").toLowerCase().includes(q);

  return (nodes || [])
    .map((node) => {
      if (node.kind === NODE_KIND.FILE) return matches(node.name) ? node : null;

      // folder
      if (matches(node.name)) return node;

      const filteredChildren = filterTreeByQuery(node.children || [], q);
      if (filteredChildren.length > 0) return { ...node, children: filteredChildren };

      return null;
    })
    .filter(Boolean);
}

// Collect folder ids from a tree (used to auto-expand during search)
export function collectFolderIds(nodes, acc = new Set()) {
  (nodes || []).forEach((n) => {
    if (n.kind === NODE_KIND.FOLDER) {
      acc.add(n.id);
      collectFolderIds(n.children || [], acc);
    }
  });
  return acc;
}

// Flatten visible rows depending on expanded state.
export function flattenVisibleTree(nodes, expandedSet, depth = 0, out = []) {
  (nodes || []).forEach((n) => {
    out.push({ node: n, depth });
    if (n.kind === NODE_KIND.FOLDER && expandedSet.has(n.id)) {
      flattenVisibleTree(n.children || [], expandedSet, depth + 1, out);
    }
  });
  return out;
}

export function getFolderChildrenByStack(tree, index, stack) {
  if (!stack || stack.length === 0) return tree || [];
  const currentId = stack[stack.length - 1];
  const node = index.get(currentId);
  if (!node || node.kind !== NODE_KIND.FOLDER) return [];
  return node.children || [];
}

export function getBreadcrumbNodes(index, stack) {
  return (stack || []).map((id) => index.get(id)).filter(Boolean);
}

export function resolveFolderByPath(tree, pathString) {
  const raw = (pathString || "").trim();
  if (!raw) return { ok: true, stack: [] };

  const parts = raw.replace(/^\/+/, "").split("/").filter(Boolean);
  let nodes = tree;
  const stack = [];

  for (const part of parts) {
    const next = (nodes || []).find(
      (n) => n.kind === NODE_KIND.FOLDER && n.name.toLowerCase() === part.toLowerCase()
    );
    if (!next) return { ok: false, stack: [], error: `Folder not found: ${part}` };
    stack.push(next.id);
    nodes = next.children || [];
  }

  return { ok: true, stack };
}
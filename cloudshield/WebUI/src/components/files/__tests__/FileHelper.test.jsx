import {
  NODE_KIND,
  HARD_CODED_TREE,
  formatDateTime,
  buildIndex,
  collectDescendantIds,
  toggleSelectCascade,
  toggleSelectAllInView,
  filterTreeByQuery,
  collectFolderIds,
  flattenVisibleTree,
  getFolderChildrenByStack,
  getBreadcrumbNodes,
  resolveFolderByPath,
} from '../FileHelper';

const sampleTree = [
  {
    id: 'f-sales',
    kind: NODE_KIND.FOLDER,
    name: 'sales_docs',
    children: [
      {
        id: 'f-policies',
        kind: NODE_KIND.FOLDER,
        name: 'policies',
        children: [
          {
            id: 'file-policy-docx',
            kind: NODE_KIND.FILE,
            name: 'security_policies.docx',
          },
        ],
      },
      {
        id: 'file-xlsx',
        kind: NODE_KIND.FILE,
        name: 'sales_numbers.excl',
      },
    ],
  },
  {
    id: 'file-docx',
    kind: NODE_KIND.FILE,
    name: 'sales_docs.docx',
  },
];

describe('FileHelper', () => {
  describe('NODE_KIND', () => {
    it('should have correct node kind constants', () => {
      expect(NODE_KIND.FOLDER).toBe('folder');
      expect(NODE_KIND.FILE).toBe('file');
    });
  });

  describe('HARD_CODED_TREE', () => {
    it('is currently an empty placeholder tree', () => {
      expect(Array.isArray(HARD_CODED_TREE)).toBe(true);
      expect(HARD_CODED_TREE).toEqual([]);
    });

    it('can be flattened without errors', () => {
      expect(flattenVisibleTree(HARD_CODED_TREE, new Set())).toEqual([]);
    });
  });

  describe('formatDateTime', () => {
    it('should format valid ISO date string', () => {
      const result = formatDateTime('2025-06-13T23:25:00Z');
      expect(result).toBeTruthy();
      expect(result).toContain('at');
    });

    it('should return dash for null input', () => {
      expect(formatDateTime(null)).toBe('—');
    });

    it('should return dash for undefined input', () => {
      expect(formatDateTime(undefined)).toBe('—');
    });

    it('should return dash for empty string', () => {
      expect(formatDateTime('')).toBe('—');
    });

    it('should format date with correct locale', () => {
      const result = formatDateTime('2025-01-01T12:30:00Z');
      expect(result).toMatch(/\d+\/\d+\/\d+\s+at\s+\d+:\d+/);
    });
  });

  describe('buildIndex', () => {
    it('should create a map from tree', () => {
      const index = buildIndex(sampleTree);
      expect(index instanceof Map).toBe(true);
    });

    it('should index root elements', () => {
      const index = buildIndex(sampleTree);
      expect(index.has('f-sales')).toBe(true);
      expect(index.has('file-docx')).toBe(true);
    });

    it('should index nested children', () => {
      const index = buildIndex(sampleTree);
      expect(index.has('f-policies')).toBe(true);
      expect(index.has('file-xlsx')).toBe(true);
    });

    it('should handle empty tree', () => {
      const index = buildIndex([]);
      expect(index instanceof Map).toBe(true);
      expect(index.size).toBe(0);
    });

    it('should handle null tree', () => {
      const index = buildIndex(null);
      expect(index instanceof Map).toBe(true);
      expect(index.size).toBe(0);
    });

    it('should map node ids to node objects', () => {
      const index = buildIndex(sampleTree);
      const node = index.get('f-sales');
      expect(node.name).toBe('sales_docs');
      expect(node.kind).toBe(NODE_KIND.FOLDER);
    });
  });

  describe('collectDescendantIds', () => {
    it('should collect all descendant ids including self', () => {
      const folder = sampleTree.find(n => n.id === 'f-sales');
      const descendants = collectDescendantIds(folder);
      expect(descendants).toContain('f-sales');
      expect(descendants).toContain('f-policies');
      expect(descendants).toContain('file-xlsx');
    });

    it('should return array with single id for file', () => {
      const file = sampleTree.find(n => n.id === 'file-docx');
      const descendants = collectDescendantIds(file);
      expect(descendants).toEqual(['file-docx']);
    });

    it('should handle null node', () => {
      const result = collectDescendantIds(null, []);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should use provided accumulator', () => {
      const acc = ['existing-id'];
      const folder = sampleTree.find(n => n.id === 'f-sales');
      const descendants = collectDescendantIds(folder, acc);
      expect(descendants).toContain('existing-id');
      expect(descendants).toContain('f-sales');
    });
  });

  describe('toggleSelectCascade', () => {
    it('should select folder and all descendants', () => {
      const index = buildIndex(sampleTree);
      const result = toggleSelectCascade({ id: 'f-sales', index, selectedIds: new Set() });
      expect(result.has('f-sales')).toBe(true);
      expect(result.has('f-policies')).toBe(true);
      expect(result.has('file-xlsx')).toBe(true);
    });

    it('should deselect folder and all descendants', () => {
      const index = buildIndex(sampleTree);
      const initial = new Set(['f-sales', 'f-policies', 'file-xlsx']);
      const result = toggleSelectCascade({ id: 'f-sales', index, selectedIds: initial });
      expect(result.has('f-sales')).toBe(false);
      expect(result.has('f-policies')).toBe(false);
    });

    it('should toggle single file', () => {
      const index = buildIndex(sampleTree);
      const result = toggleSelectCascade({ id: 'file-docx', index, selectedIds: new Set() });
      expect(result.has('file-docx')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('should handle invalid id', () => {
      const index = buildIndex(sampleTree);
      const result = toggleSelectCascade({ id: 'invalid-id', index, selectedIds: new Set() });
      expect(result.size).toBe(0);
    });

    it('should not select parent when selecting child', () => {
      const index = buildIndex(sampleTree);
      const result = toggleSelectCascade({ id: 'file-xlsx', index, selectedIds: new Set() });
      expect(result.has('file-xlsx')).toBe(true);
      expect(result.has('f-sales')).toBe(false);
    });
  });

  describe('toggleSelectAllInView', () => {
    it('should select all visible ids', () => {
      const ids = ['id1', 'id2', 'id3'];
      const result = toggleSelectAllInView({ ids, selectedIds: new Set() });
      expect(result.size).toBe(3);
      ids.forEach(id => expect(result.has(id)).toBe(true));
    });

    it('should deselect all when all are selected', () => {
      const ids = ['id1', 'id2', 'id3'];
      const selectedIds = new Set(ids);
      const result = toggleSelectAllInView({ ids, selectedIds });
      expect(result.size).toBe(0);
    });

    it('should handle empty id list', () => {
      const result = toggleSelectAllInView({ ids: [], selectedIds: new Set() });
      expect(result.size).toBe(0);
    });

    it('should preserve other selections', () => {
      const ids = ['id1', 'id2'];
      const selectedIds = new Set(['id3', 'id4']);
      const result = toggleSelectAllInView({ ids, selectedIds });
      expect(result.has('id3')).toBe(true);
      expect(result.has('id4')).toBe(true);
      expect(result.has('id1')).toBe(true);
      expect(result.has('id2')).toBe(true);
    });
  });

  describe('filterTreeByQuery', () => {
    it('should return all nodes for empty query', () => {
      const result = filterTreeByQuery(sampleTree, '');
      expect(result.length).toBe(sampleTree.length);
    });

    it('should filter by file name', () => {
      const result = filterTreeByQuery(sampleTree, 'sales_numbers');
      expect(result.length).toBeGreaterThan(0);
      const flatResult = [];
      const flatten = (nodes) => {
        nodes.forEach(n => {
          flatResult.push(n);
          if (n.children) flatten(n.children);
        });
      };
      flatten(result);
      expect(flatResult.some(n => n.name === 'sales_numbers.excl')).toBe(true);
    });

    it('should filter by folder name', () => {
      const result = filterTreeByQuery(sampleTree, 'sales_docs');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const result1 = filterTreeByQuery(sampleTree, 'SALES');
      const result2 = filterTreeByQuery(sampleTree, 'sales');
      expect(result1.length).toBe(result2.length);
    });

    it('should keep folders with matching children', () => {
      const result = filterTreeByQuery(sampleTree, 'policies');
      const folder = result.find(n => n.id === 'f-sales');
      expect(folder).toBeDefined();
      expect(folder.children.length).toBeGreaterThan(0);
    });

    it('should return empty for non-matching query', () => {
      const result = filterTreeByQuery(HARD_CODED_TREE, 'nonexistent');
      expect(result.length).toBe(0);
    });

    it('should handle null tree', () => {
      const result = filterTreeByQuery(null, 'query');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('collectFolderIds', () => {
    it('should collect all folder ids', () => {
      const result = collectFolderIds(sampleTree);
      expect(result instanceof Set).toBe(true);
      expect(result.has('f-sales')).toBe(true);
      expect(result.has('f-policies')).toBe(true);
    });

    it('should not include file ids', () => {
      const result = collectFolderIds(sampleTree);
      expect(result.has('file-docx')).toBe(false);
      expect(result.has('file-xlsx')).toBe(false);
    });

    it('should handle empty tree', () => {
      const result = collectFolderIds([]);
      expect(result instanceof Set).toBe(true);
      expect(result.size).toBe(0);
    });

    it('should use provided accumulator', () => {
      const acc = new Set(['existing-id']);
      const result = collectFolderIds(sampleTree, acc);
      expect(result.has('existing-id')).toBe(true);
      expect(result.has('f-sales')).toBe(true);
    });
  });

  describe('flattenVisibleTree', () => {
    it('should flatten with default expansion', () => {
      const expanded = new Set();
      const result = flattenVisibleTree(sampleTree, expanded);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should expand nested folders', () => {
      const expanded = new Set(['f-sales']);
      const result = flattenVisibleTree(sampleTree, expanded);
      const ids = result.map(r => r.node.id);
      expect(ids).toContain('f-policies');
      expect(ids).toContain('file-xlsx');
    });

    it('should include depth information', () => {
      const expanded = new Set(['f-sales']);
      const result = flattenVisibleTree(sampleTree, expanded);
      expect(result[0].depth).toBe(0);
      const nestedRow = result.find(r => r.node.id === 'f-policies');
      expect(nestedRow.depth).toBe(1);
    });

    it('should not expand collapsed folders', () => {
      const expanded = new Set();
      const result = flattenVisibleTree(sampleTree, expanded);
      const ids = result.map(r => r.node.id);
      expect(ids).toContain('f-sales');
      expect(ids).not.toContain('f-policies');
    });

    it('should handle empty tree', () => {
      const result = flattenVisibleTree([], new Set());
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getFolderChildrenByStack', () => {
    it('should return root children for empty stack', () => {
      const index = buildIndex(sampleTree);
      const result = getFolderChildrenByStack(sampleTree, index, []);
      expect(result).toBe(sampleTree);
    });

    it('should return folder children for valid stack', () => {
      const index = buildIndex(sampleTree);
      const result = getFolderChildrenByStack(sampleTree, index, ['f-sales']);
      const names = result.map(n => n.name);
      expect(names).toContain('policies');
      expect(names).toContain('sales_numbers.excl');
    });

    it('should return empty for invalid stack', () => {
      const index = buildIndex(sampleTree);
      const result = getFolderChildrenByStack(sampleTree, index, ['invalid-id']);
      expect(result).toEqual([]);
    });

    it('should handle file in stack', () => {
      const index = buildIndex(sampleTree);
      const result = getFolderChildrenByStack(sampleTree, index, ['file-docx']);
      expect(result).toEqual([]);
    });

    it('should handle null stack', () => {
      const index = buildIndex(sampleTree);
      const result = getFolderChildrenByStack(sampleTree, index, null);
      expect(result).toBe(sampleTree);
    });
  });

  describe('getBreadcrumbNodes', () => {
    it('should return breadcrumb nodes for stack', () => {
      const index = buildIndex(sampleTree);
      const result = getBreadcrumbNodes(index, ['f-sales', 'f-policies']);
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('sales_docs');
      expect(result[1].name).toBe('policies');
    });

    it('should return empty for empty stack', () => {
      const index = buildIndex(sampleTree);
      const result = getBreadcrumbNodes(index, []);
      expect(result).toEqual([]);
    });

    it('should filter out invalid ids', () => {
      const index = buildIndex(sampleTree);
      const result = getBreadcrumbNodes(index, ['f-sales', 'invalid-id', 'f-policies']);
      expect(result.length).toBe(2);
    });

    it('should handle null stack', () => {
      const index = buildIndex(sampleTree);
      const result = getBreadcrumbNodes(index, null);
      expect(result).toEqual([]);
    });
  });

  describe('resolveFolderByPath', () => {
    it('should resolve valid path', () => {
      const result = resolveFolderByPath(sampleTree, '/sales_docs/policies');
      expect(result.ok).toBe(true);
      expect(result.stack).toEqual(['f-sales', 'f-policies']);
    });

    it('should return ok with empty stack for empty path', () => {
      const result = resolveFolderByPath(sampleTree, '');
      expect(result.ok).toBe(true);
      expect(result.stack).toEqual([]);
    });

    it('should handle path without leading slash', () => {
      const result = resolveFolderByPath(sampleTree, 'sales_docs');
      expect(result.ok).toBe(true);
      expect(result.stack).toEqual(['f-sales']);
    });

    it('should be case insensitive', () => {
      const result = resolveFolderByPath(sampleTree, '/SALES_DOCS');
      expect(result.ok).toBe(true);
      expect(result.stack).toEqual(['f-sales']);
    });

    it('should return error for invalid path', () => {
      const result = resolveFolderByPath(sampleTree, '/invalid/path');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Folder not found');
    });

    it('should return error for file in path', () => {
      const result = resolveFolderByPath(sampleTree, '/sales_docs.docx');
      expect(result.ok).toBe(false);
    });

    it('should handle trailing slashes', () => {
      const result = resolveFolderByPath(sampleTree, '/sales_docs/');
      expect(result.ok).toBe(true);
      expect(result.stack).toEqual(['f-sales']);
    });

    it('should handle null tree', () => {
      const result = resolveFolderByPath(null, '/sales_docs');
      expect(result.ok).toBe(false);
    });
  });
});

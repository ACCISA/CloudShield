/**
 * Tests for filesApi.js
 */

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage before importing the module
const localStorageMock = {
  getItem: jest.fn(() => 'test-jwt-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

import {
  fetchFileShares,
  createFileShare,
  updateFileShare,
  deleteFileShare,
  fetchUsers,
  fetchGroups,
  transformSharesToTree,
} from '../filesApi';

describe('filesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockReset();
    localStorageMock.getItem.mockClear();
    localStorageMock.getItem.mockReturnValue('test-jwt-token');
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });
    }
  });

  describe('fetchFileShares', () => {
    it('should fetch file shares successfully', async () => {
      const mockShares = [
        { share: { id: '1', name: 'Share1', users: [], groups: [] } },
        { share: { id: '2', name: 'Share2', users: [], groups: [] } },
      ];
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ shares: mockShares }),
      });

      const result = await fetchFileShares('org123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/file_shares?org_id=org123'),
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer test-jwt-token' },
        })
      );
      expect(result).toEqual(mockShares);
    });

    it('should return empty array when no shares exist', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await fetchFileShares('org123');

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
      });

      await expect(fetchFileShares('org123')).rejects.toThrow(
        'Not Found'
      );
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchFileShares('org123')).rejects.toThrow('Network error');
    });
  });

  describe('createFileShare', () => {
    it('should create file share with all fields', async () => {
      const mockResponse = { job_id: 'job123', status: 'queued' };
      const shareData = {
        orgId: 'org123',
        name: 'NewShare',
        users: ['user1', 'user2'],
        groups: ['group1'],
        description: 'Test share',
        maxSize: '100',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await createFileShare(shareData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/task/dc/create_file_share'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: 'org123',
            share_name: 'NewShare',
            users: ['user1', 'user2'],
            groups: ['group1'],
            description: 'Test share',
            max_size: 100,
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create file share with only required fields', async () => {
      const mockResponse = { job_id: 'job123', status: 'queued' };
      const shareData = {
        orgId: 'org123',
        name: 'NewShare',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await createFileShare(shareData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/task/dc/create_file_share'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: 'org123',
            share_name: 'NewShare',
            users: [],
            groups: [],
          }),
        })
      );
    });

    it('should handle empty users and groups arrays', async () => {
      const mockResponse = { job_id: 'job123' };
      const shareData = {
        orgId: 'org123',
        name: 'NewShare',
        users: [],
        groups: [],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await createFileShare(shareData);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.users).toEqual([]);
      expect(callBody.groups).toEqual([]);
    });

    it('should parse maxSize as integer', async () => {
      const shareData = {
        orgId: 'org123',
        name: 'NewShare',
        maxSize: '250',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await createFileShare(shareData);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.max_size).toBe(250);
      expect(typeof callBody.max_size).toBe('number');
    });

    it('should not include optional fields when not provided', async () => {
      const shareData = {
        orgId: 'org123',
        name: 'NewShare',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await createFileShare(shareData);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody).not.toHaveProperty('description');
      expect(callBody).not.toHaveProperty('max_size');
    });

    it('should throw error when creation fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      });

      await expect(
        createFileShare({ orgId: 'org123', name: 'NewShare' })
      ).rejects.toThrow('Bad Request');
    });
  });

  describe('updateFileShare', () => {
    // Mock console.log to avoid cluttering test output
    let consoleLogSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should update file share successfully', async () => {
      const mockResponse = { share: { name: 'Share1', description: 'Updated' } };
      const updates = { description: 'Updated description' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await updateFileShare('org123', 'Share1', updates);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/file_shares/org123/Share1'),
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should log API call details', async () => {
      const updates = { description: 'New desc' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await updateFileShare('org123', 'Share1', updates);

      expect(consoleLogSpy).toHaveBeenCalledWith('updateFileShare API call:', {
        orgId: 'org123',
        shareName: 'Share1',
        updates,
      });
    });

    it('should log API response', async () => {
      const mockResponse = { success: true };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await updateFileShare('org123', 'Share1', {});

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'updateFileShare API response:',
        mockResponse
      );
    });

    it('should handle updating multiple fields', async () => {
      const updates = {
        description: 'New description',
        max_size: 500,
        users: ['user1', 'user2', 'user3'],
        groups: ['group1'],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await updateFileShare('org123', 'Share1', updates);

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody).toEqual(updates);
    });

    it('should throw error when update fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      await expect(
        updateFileShare('org123', 'Share1', { description: 'test' })
      ).rejects.toThrow('Forbidden');
    });

    it('should handle special characters in share name', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await updateFileShare('org123', 'Share With Spaces', {});

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/file_shares/org123/Share%20With%20Spaces'),
        expect.any(Object)
      );
    });
  });

  describe('deleteFileShare', () => {
    it('should delete file share successfully', async () => {
      const mockResponse = { job_id: 'job456', status: 'queued' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await deleteFileShare('org123', 'Share1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/task/dc/delete_file_share'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-jwt-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: 'org123',
            share_name: 'Share1',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when deletion fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
      });

      await expect(deleteFileShare('org123', 'Share1')).rejects.toThrow(
        'Internal Server Error'
      );
    });

    it('should handle share names with special characters', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await deleteFileShare('org123', 'Share-With-Dashes');

      const callBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(callBody.share_name).toBe('Share-With-Dashes');
    });
  });

  describe('fetchUsers', () => {
    it('should fetch users with summary by default', async () => {
      const mockUsers = [
        { id: '1', username: 'user1', full_name: 'User One' },
        { id: '2', username: 'user2', full_name: 'User Two' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockUsers }),
      });

      const result = await fetchUsers('org123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/organizations/org123/users?summary=1'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
      expect(result).toEqual(mockUsers);
    });

    it('should fetch users without summary when specified', async () => {
      const mockUsers = [{ id: '1', username: 'user1', details: 'full' }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockUsers }),
      });

      const result = await fetchUsers('org123', false);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/organizations/org123/users'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users exist', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await fetchUsers('org123');

      expect(result).toEqual([]);
    });

    it('should include JWT token from localStorage', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      await fetchUsers('org123');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('jwt');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
    });

    it('should throw error when fetch fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });

      await expect(fetchUsers('org123')).rejects.toThrow('Unauthorized');
    });
  });

  describe('fetchGroups', () => {
    it('should fetch groups with summary by default', async () => {
      const mockGroups = [
        { id: '1', name: 'Group1', member_count: 5 },
        { id: '2', name: 'Group2', member_count: 10 },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_groups: mockGroups }),
      });

      const result = await fetchGroups('org123');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/access-groups?summary=1'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
      expect(result).toEqual(mockGroups);
    });

    it('should fetch groups without summary when specified', async () => {
      const mockGroups = [
        {
          id: '1',
          name: 'Group1',
          members_info: [{ username: 'user1' }, { username: 'user2' }],
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_groups: mockGroups }),
      });

      const result = await fetchGroups('org123', false);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/access-groups'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
      expect(result).toEqual(mockGroups);
    });

    it('should return empty array when no groups exist', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await fetchGroups('org123');

      expect(result).toEqual([]);
    });

    it('should include JWT token from localStorage', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_groups: [] }),
      });

      await fetchGroups('org123');

      expect(localStorageMock.getItem).toHaveBeenCalledWith('jwt');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        })
      );
    });

    it('should return empty array when access groups are unavailable', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
      });

      await expect(fetchGroups('org123')).resolves.toEqual([]);
    });
  });

  describe('transformSharesToTree', () => {
    it('should transform basic shares correctly', () => {
      const shares = [
        {
          share: {
            id: '1',
            name: 'Share1',
            kind: 'file',
            users: ['user1', 'user2'],
            groups: ['group1'],
            updated_at: '2026-01-01',
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result).toEqual([
        {
          id: '1',
          name: 'Share1',
          kind: 'file',
          updated_at: '2026-01-01',
          users: ['user1', 'user2'],
          usersCount: 2,
          groups: ['group1'],
          description: undefined,
          owner: undefined,
          current_size: undefined,
          max_size: undefined,
          drive: undefined,
          children: undefined,
        },
      ]);
    });

    it('should handle shares with all fields', () => {
      const shares = [
        {
          share: {
            id: '1',
            name: 'Share1',
            kind: 'file',
            users: ['user1'],
            groups: [],
            description: 'Test share',
            owner: 'admin',
            current_size: 1024,
            max_size: 5120,
            drive: 'C:',
            updated_at: '2026-01-01',
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0]).toMatchObject({
        id: '1',
        name: 'Share1',
        kind: 'file',
        users: ['user1'],
        usersCount: 1,
        groups: [],
        description: 'Test share',
        owner: 'admin',
        current_size: 1024,
        max_size: 5120,
        drive: 'C:',
      });
    });

    it('should add children array for folder kind', () => {
      const shares = [
        {
          share: {
            name: 'Folder1',
            kind: 'folder',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].children).toEqual([]);
      expect(result[0].kind).toBe('folder');
    });

    it('should not add children for file kind', () => {
      const shares = [
        {
          share: {
            name: 'File1',
            kind: 'file',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].children).toBeUndefined();
    });

    it('should use name as id when id is missing', () => {
      const shares = [
        {
          share: {
            name: 'Share1',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].id).toBe('Share1');
    });

    it('should default kind to file when not specified', () => {
      const shares = [
        {
          share: {
            name: 'Share1',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].kind).toBe('file');
    });

    it('should handle non-array users gracefully', () => {
      const shares = [
        {
          share: {
            name: 'Share1',
            users: null,
          },
        },
        {
          share: {
            name: 'Share2',
            users: undefined,
          },
        },
        {
          share: {
            name: 'Share3',
            users: 'not-an-array',
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].users).toEqual([]);
      expect(result[0].usersCount).toBe(0);
      expect(result[1].users).toEqual([]);
      expect(result[1].usersCount).toBe(0);
      expect(result[2].users).toEqual([]);
      expect(result[2].usersCount).toBe(0);
    });

    it('should default groups to empty array when missing', () => {
      const shares = [
        {
          share: {
            name: 'Share1',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].groups).toEqual([]);
    });

    it('should transform multiple shares', () => {
      const shares = [
        {
          share: {
            id: '1',
            name: 'Share1',
            users: ['user1'],
          },
        },
        {
          share: {
            id: '2',
            name: 'Share2',
            users: ['user2', 'user3'],
          },
        },
        {
          share: {
            id: '3',
            name: 'Share3',
            users: [],
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result).toHaveLength(3);
      expect(result[0].usersCount).toBe(1);
      expect(result[1].usersCount).toBe(2);
      expect(result[2].usersCount).toBe(0);
    });

    it('should handle empty shares array', () => {
      const result = transformSharesToTree([]);
      expect(result).toEqual([]);
    });

    it('should preserve original users array', () => {
      const usersArray = ['user1', 'user2'];
      const shares = [
        {
          share: {
            name: 'Share1',
            users: usersArray,
          },
        },
      ];

      const result = transformSharesToTree(shares);

      expect(result[0].users).toBe(usersArray); // Same reference
      expect(result[0].users).toEqual(['user1', 'user2']);
    });
  });
});

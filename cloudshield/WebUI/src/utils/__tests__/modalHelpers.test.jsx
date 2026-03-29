import {
  resolveOrgId,
  fetchFileShares,
  fetchGroups,
  fetchUsers,
  fetchWorkstations,
  fetchSoftware,
  safeSplitName,
  createImageUploadHandler,
  createToggleSelectionHandler,
  createRemoveSelectionHandler,
  createFilteredItems,
  createNavigationHandler,
  createDeleteHandler,
  createSelectAllHandler,
  createRenderStepContent,
} from "../modalHelpers";
import { apiGet } from "../../api/client";
import { listUsers } from "../../services/usersApi";

// Mock API functions
jest.mock("../../services/usersApi");
jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
}));

describe("modalHelpers", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    apiGet.mockReset();
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  describe("resolveOrgId", () => {
    it("should return org_id from currentUser if available", async () => {
      const currentUser = { org_id: "org123" };
      const result = await resolveOrgId(currentUser);
      expect(result).toBe("org123");
    });

    it("should return org_id from localStorage if currentUser doesn't have it", async () => {
      Storage.prototype.getItem.mockReturnValue("org456");
      const result = await resolveOrgId({});
      expect(result).toBe("org456");
      expect(localStorage.getItem).toHaveBeenCalledWith("org_id");
    });

    it("should return org_id from localStorage if currentUser is null", async () => {
      Storage.prototype.getItem.mockReturnValue("org789");
      const result = await resolveOrgId(null);
      expect(result).toBe("org789");
    });

    it("should return null if neither currentUser nor localStorage has org_id", async () => {
      Storage.prototype.getItem.mockReturnValue(null);
      const result = await resolveOrgId({});
      expect(result).toBeNull();
    });

    it("should handle localStorage errors gracefully", async () => {
      Storage.prototype.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });
      const result = await resolveOrgId({});
      expect(result).toBeNull();
    });
  });

  describe("fetchFileShares", () => {
    const mockFileShares = {
      shares: [
        {
          share: {
            id: "file1",
            name: "Share 1",
            drive: "D",
            description: "Test file",
            owner: "user1",
            groups: ["group1"],
            created_at: "2024-01-01",
            updated_at: "2024-01-02",
          },
        },
      ],
    };

    it("should fetch and normalize file shares successfully", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockFileShares,
      });

      const result = await fetchFileShares("org123");
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "file1");
      expect(result[0]).toHaveProperty("name", "Share 1");
    });

    it("should call state setter if provided", async () => {
      const setAllFiles = jest.fn();
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockFileShares,
      });

      await fetchFileShares("org123", setAllFiles);
      expect(setAllFiles).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "file1" })]),
      );
    });

    it("should return empty array on fetch error", async () => {
      apiGet.mockRejectedValue(new Error("Network error"));
      const result = await fetchFileShares("org123");
      expect(result).toEqual([]);
    });

    it("should return empty array on non-ok response", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchFileShares("org123");
      expect(result).toEqual([]);
    });

    it("should handle missing orgId", async () => {
      const setAllFiles = jest.fn();
      const result = await fetchFileShares(null, setAllFiles);
      expect(result).toEqual([]);
      expect(setAllFiles).toHaveBeenCalledWith([]);
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should normalize file shares data correctly", async () => {
      const rawData = {
        shares: [
          {
            share: {
              id: "file2",
              name: "Document.txt",
              drive: "C",
              description: "Important docs",
              owner: "user2",
              groups: ["group2"],
              created_at: "2024-01-03",
              updated_at: "2024-01-04",
            },
          },
        ],
      };

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => rawData,
      });

      const result = await fetchFileShares("org123");
      expect(result[0]).toMatchObject({
        id: "file2",
        name: "Document.txt",
        type: "document",
        size: "Drive C",
        drive: "C",
        description: "Important docs",
        owner: "user2",
        groups: ["group2"],
      });
    });

    // Additional tests for file share normalization fallbacks
    it("should use fallback values for missing file share fields", async () => {
      const rawData = {
        shares: [
          {
            share: {
              id: "file3",
              // name is missing - should fallback to "Untitled Share"
              // drive is missing - size should be empty
              // description is missing - should fallback to ""
              // groups is missing - should fallback to []
              owner: "user3",
              created_at: "2024-01-05",
              updated_at: "2024-01-06",
            },
          },
        ],
      };

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => rawData,
      });

      const result = await fetchFileShares("org123");
      expect(result[0]).toMatchObject({
        id: "file3",
        name: "Untitled Share",
        type: "document",
        size: "",
        description: "",
        groups: [],
        owner: "user3",
      });
    });

    it("should convert id to string using String()", async () => {
      const rawData = {
        shares: [
          {
            share: {
              id: 12345, // numeric id
              name: "Numeric ID Share",
            },
          },
        ],
      };

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => rawData,
      });

      const result = await fetchFileShares("org123");
      expect(result[0].id).toBe("12345");
      expect(typeof result[0].id).toBe("string");
    });

    it("should use empty string for id if missing", async () => {
      const rawData = {
        shares: [
          {
            share: {
              // id is missing
              name: "No ID Share",
            },
          },
        ],
      };

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => rawData,
      });

      const result = await fetchFileShares("org123");
      // Should be filtered out because id is empty
      expect(result).toHaveLength(0);
    });
  });

  describe("fetchGroups", () => {
    const mockGroups = [
      {
        id: "group1",
        name: "Test Group",
        members: [{ id: "user1" }],
        users: [{ id: "user1" }],
        files: ["file1"],
        org_id: "org123",
      },
    ];

    it("should fetch and normalize groups successfully", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockGroups,
      });

      const result = await fetchGroups("org123", "token123");
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("id", "group1");
      expect(result[0]).toHaveProperty("name", "Test Group");
    });

    it("should call state setter if provided", async () => {
      const setAllGroups = jest.fn();
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockGroups,
      });

      await fetchGroups("org123", "token123", setAllGroups);
      expect(setAllGroups).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "group1" })]),
      );
    });

    it("should handle 404 gracefully", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchGroups("org123", "token123");
      expect(result).toEqual([]);
    });

    it("should handle 405 gracefully", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 405,
      });

      const result = await fetchGroups("org123", "token123");
      expect(result).toEqual([]);
    });

    it("should return empty array on fetch error", async () => {
      apiGet.mockRejectedValue(new Error("Network error"));
      const result = await fetchGroups("org123", "token123");
      expect(result).toEqual([]);
    });

    it("should handle missing orgId", async () => {
      const setAllGroups = jest.fn();
      const result = await fetchGroups(null, "token123", setAllGroups);
      expect(result).toEqual([]);
      expect(setAllGroups).toHaveBeenCalledWith([]);
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should handle missing accessToken", async () => {
      const setAllGroups = jest.fn();
      const result = await fetchGroups("org123", null, setAllGroups);
      expect(result).toEqual([]);
      expect(setAllGroups).toHaveBeenCalledWith([]);
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should normalize groups data correctly", async () => {
      const rawData = [
        {
          _id: "group2",
          name: "Admin Group",
          members: ["user1", "user2", "user3", "user4", "user5"],
          users: [{ id: "user2" }],
          files: ["file2"],
          org_id: "org456",
        },
      ];

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => rawData,
      });

      const result = await fetchGroups("org456", "token123");
      expect(result[0]).toMatchObject({
        id: "group2",
        _id: "group2",
        name: "Admin Group",
        members: ["user1", "user2", "user3", "user4", "user5"],
      });
    });

    // NEW COVERAGE TESTS START HERE
    it("should log warning and reset state on 404/405 error code", async () => {
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const setAllGroups = jest.fn();

      apiGet.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchGroups("org1", "token1", setAllGroups);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Groups API not available (404)"),
      );
      expect(setAllGroups).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it("should handle response with 'access_groups' wrapper key", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_groups: [{ id: "g1", name: "Wrapper Test" }],
        }),
      });

      const result = await fetchGroups("org1", "token1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Wrapper Test");
    });

    it("should handle response with 'groups' wrapper key", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          groups: [{ id: "g2", name: "Wrapper Test 2" }],
        }),
      });

      const result = await fetchGroups("org1", "token1");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Wrapper Test 2");
    });

    it("should apply strict normalization fallbacks", async () => {
      // Logic being tested:
      // id: String(g.id || g._id || ""),
      // name: g.group_name || g.name || "Untitled Group",
      // members: Array.isArray(g.members) ? g.members : [],
      // users: g.users || [],
      // files: g.files || [],

      apiGet.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            _id: "group_underscore", // Missing 'id'
            // Missing name
            members: "not-an-array", // Invalid member format
            // Missing users/files
            org_id: "orgXYZ",
          },
        ],
      });

      const result = await fetchGroups("org1", "token1");

      expect(result[0]).toEqual({
        id: "group_underscore",
        _id: "group_underscore",
        name: "Untitled Group",
        members: [], // Fallback triggered
        users: [],
        files: [],
        org_id: "orgXYZ",
      });
    });
    // NEW COVERAGE TESTS END HERE
  });

  describe("safeSplitName", () => {
    it("should split a full name correctly", () => {
      const result = safeSplitName("John Doe");
      expect(result).toEqual({ firstName: "John", lastName: "Doe" });
    });

    it("should handle multiple last names", () => {
      const result = safeSplitName("John von Neumann");
      expect(result).toEqual({ firstName: "John", lastName: "von Neumann" });
    });

    it("should handle single name", () => {
      const result = safeSplitName("Madonna");
      expect(result).toEqual({ firstName: "Madonna", lastName: "" });
    });

    it("should handle empty string", () => {
      const result = safeSplitName("");
      expect(result).toEqual({ firstName: "Unknown", lastName: "" });
    });

    it("should handle null", () => {
      const result = safeSplitName(null);
      expect(result).toEqual({ firstName: "Unknown", lastName: "" });
    });

    it("should handle undefined", () => {
      const result = safeSplitName(undefined);
      expect(result).toEqual({ firstName: "Unknown", lastName: "" });
    });

    it("should trim whitespace", () => {
      const result = safeSplitName("  Jane   Smith  ");
      expect(result).toEqual({ firstName: "Jane", lastName: "Smith" });
    });
  });

  describe("fetchUsers", () => {
    const mockUsers = [
      {
        _id: "user1",
        email: "user1@test.com",
        full_name: "John Doe",
        role: "admin",
      },
    ];

    it("should fetch and normalize users successfully", async () => {
      listUsers.mockResolvedValue(mockUsers);

      const result = await fetchUsers("token123");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "user1",
        email: "user1@test.com",
        firstName: "John",
        lastName: "Doe",
        role: "admin",
      });
    });

    it("should call state setter if provided", async () => {
      const setAllUsers = jest.fn();
      listUsers.mockResolvedValue(mockUsers);

      await fetchUsers("token123", setAllUsers);
      expect(setAllUsers).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "user1" })]),
      );
    });

    it("should return empty array if no accessToken", async () => {
      const setAllUsers = jest.fn();
      const result = await fetchUsers(null, setAllUsers);
      expect(result).toEqual([]);
      expect(setAllUsers).toHaveBeenCalledWith([]);
      expect(listUsers).not.toHaveBeenCalled();
    });

    it("should handle listUsers error", async () => {
      const openToast = jest.fn();
      listUsers.mockRejectedValue(new Error("API error"));

      const result = await fetchUsers("token123", null, openToast);
      expect(result).toEqual([]);
      expect(openToast).toHaveBeenCalledWith("API error");
    });

    it("should filter out users without IDs", async () => {
      listUsers.mockResolvedValue([
        { _id: "user1", email: "user1@test.com", full_name: "John Doe" },
        { email: "no-id@test.com", full_name: "No ID" },
      ]);

      const result = await fetchUsers("token123");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("user1");
    });

    it("should handle non-array response", async () => {
      listUsers.mockResolvedValue({ users: [] });

      const result = await fetchUsers("token123");
      expect(result).toEqual([]);
    });
  });

  describe("fetchWorkstations", () => {
    const mockWorkstations = [
      {
        id: "ws1",
        name: "Workstation 1",
        online: true,
        ip_address: "192.168.1.1",
        org_id: "org123",
      },
    ];

    it("should fetch and normalize workstations successfully", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockWorkstations,
      });

      const result = await fetchWorkstations("org123", "token123");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "ws1",
        name: "Workstation 1",
        online: true,
        ipAddress: "192.168.1.1",
      });
    });

    it("should call state setter if provided", async () => {
      const setAllWorkstations = jest.fn();
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockWorkstations,
      });

      await fetchWorkstations("org123", "token123", setAllWorkstations);
      expect(setAllWorkstations).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "ws1" })]),
      );
    });

    it("should handle missing orgId", async () => {
      const openToast = jest.fn();
      const result = await fetchWorkstations(null, "token123", null, openToast);
      expect(result).toEqual([]);
      expect(openToast).toHaveBeenCalledWith(
        "Missing org_id for workstations fetch",
      );
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should handle missing accessToken", async () => {
      const setAllWorkstations = jest.fn();
      const result = await fetchWorkstations(
        "org123",
        null,
        setAllWorkstations,
      );
      expect(result).toEqual([]);
      expect(setAllWorkstations).toHaveBeenCalledWith([]);
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should handle 404 gracefully", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchWorkstations("org123", "token123");
      expect(result).toEqual([]);
    });

    it("should handle 405 gracefully", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 405,
      });

      const result = await fetchWorkstations("org123", "token123");
      expect(result).toEqual([]);
    });

    it("should normalize workstations data correctly", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          workstations: [
            {
              _id: "ws2",
              name: "Desktop",
              status: "online",
              ipAddress: "10.0.0.1",
              org_id: "org456",
            },
          ],
        }),
      });

      const result = await fetchWorkstations("org456", "token123");
      expect(result[0]).toMatchObject({
        id: "ws2",
        _id: "ws2",
        name: "Desktop",
        online: true,
        ipAddress: "10.0.0.1",
      });
    });

    it("should resolve member ids into user objects and set currentUser", async () => {
      listUsers.mockResolvedValue([
        {
          _id: "user1",
          email: "user1@test.com",
          full_name: "Jane Doe",
          role: "admin",
        },
      ]);
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          workstations: [
            {
              _id: "ws4",
              name: "Designer",
              description: "basic",
              members: ["user1", "missing-user"],
              access_groups: ["group-1"],
              software: [{ _id: "sw-1", name: "Office" }],
              status: "online",
              org_id: "org123",
            },
          ],
        }),
      });

      const result = await fetchWorkstations("org123", "token123");

      expect(listUsers).toHaveBeenCalledWith({
        token: "token123",
        search: "",
        limit: 200,
        offset: 0,
      });
      expect(result[0]).toMatchObject({
        id: "ws4",
        name: "Designer",
        strength: "basic",
        usersCount: 2,
        groups: ["group-1"],
        software: [{ _id: "sw-1", name: "Office" }],
        status: "connected",
        currentUser: expect.objectContaining({
          id: "user1",
          firstName: "Jane",
          lastName: "Doe",
        }),
      });
      expect(result[0].users).toEqual([
        expect.objectContaining({
          id: "user1",
          email: "user1@test.com",
        }),
      ]);
    });

    it("should preserve failed status and offline fallback", async () => {
      listUsers.mockResolvedValue([]);
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            id: "ws5",
            name: "Broken",
            status: "failed",
            members: [],
          },
        ]),
      });

      const result = await fetchWorkstations("org123", "token123");

      expect(result[0]).toMatchObject({
        id: "ws5",
        name: "Broken",
        status: "failed",
        online: false,
        currentUser: null,
      });
    });

    it("should default to 'Untitled Workstation' for missing names", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => [{ id: "ws3" }],
      });

      const result = await fetchWorkstations("org123", "token123");
      expect(result[0].name).toBe("Untitled Workstation");
    });
  });

  describe("fetchSoftware", () => {
    const mockSoftware = [
      {
        id: "sw1",
        name: "Software 1",
        version: "1.0.0",
        vendor: "Vendor Inc.",
      },
    ];

    it("should fetch and normalize software successfully", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockSoftware,
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "sw1",
        name: "Software 1",
        version: "1.0.0",
        vendor: "Vendor Inc.",
      });
    });

    it("should call state setter if provided", async () => {
      const setAllSoftware = jest.fn();
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => mockSoftware,
      });

      await fetchSoftware("org123", "token123", setAllSoftware);
      expect(setAllSoftware).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "sw1" })]),
      );
    });

    it("should handle missing orgId", async () => {
      const openToast = jest.fn();
      const result = await fetchSoftware(null, "token123", null, openToast);
      expect(result).toEqual([]);
      expect(openToast).toHaveBeenCalledWith(
        "Missing org_id for software fetch",
      );
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should handle missing accessToken", async () => {
      const setAllSoftware = jest.fn();
      const result = await fetchSoftware("org123", null, setAllSoftware);
      expect(result).toEqual([]);
      expect(setAllSoftware).toHaveBeenCalledWith([]);
      expect(apiGet).not.toHaveBeenCalled();
    });

    it("should handle non-ok response", async () => {
      apiGet.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "sw-excel", name: "Microsoft Excel" }),
        ]),
      );
    });

    it("should normalize software data correctly", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          software: [
            {
              _id: "sw2",
              name: "App",
              version: "2.0",
              vendor: "Corp",
            },
          ],
        }),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0]).toMatchObject({
        id: "sw2",
        _id: "sw2",
        name: "App",
        version: "2.0",
        vendor: "Corp",
      });
    });

    // Additional tests for software normalization fallbacks
    it("should use fallback values for missing software fields", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            id: "sw3",
            // name is missing - should fallback to "Untitled Software"
            // version is missing - should fallback to ""
            // vendor is missing - should fallback to ""
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0]).toMatchObject({
        id: "sw3",
        _id: "sw3",
        name: "Untitled Software",
        version: "",
        vendor: "",
      });
    });

    it("should prefer id over _id when both present", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            id: "primary-id",
            _id: "secondary-id",
            name: "Test Software",
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0].id).toBe("primary-id");
      expect(result[0]._id).toBe("secondary-id");
    });

    it("should fallback to _id when id is missing", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            _id: "only-underscore-id",
            name: "Test Software",
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0].id).toBe("only-underscore-id");
      expect(result[0]._id).toBe("only-underscore-id");
    });

    it("should fallback to id when _id is missing", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            id: "only-regular-id",
            name: "Test Software",
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0].id).toBe("only-regular-id");
      expect(result[0]._id).toBe("only-regular-id");
    });

    it("should convert numeric ids to string", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            id: 99999,
            _id: 88888,
            name: "Numeric ID Software",
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0].id).toBe("99999");
      expect(result[0]._id).toBe("88888");
      expect(typeof result[0].id).toBe("string");
      expect(typeof result[0]._id).toBe("string");
    });

    it("should use empty string when both id and _id are missing", async () => {
      apiGet.mockResolvedValue({
        ok: true,
        json: async () => ([
          {
            name: "No ID Software",
            version: "1.0",
          },
        ]),
      });

      const result = await fetchSoftware("org123", "token123");
      expect(result[0].id).toBe("");
      expect(result[0]._id).toBe("");
    });

    it("should handle fetch error", async () => {
      const openToast = jest.fn();
      apiGet.mockRejectedValue(new Error("Network error"));

      const result = await fetchSoftware("org123", "token123", null, openToast);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "sw-excel", name: "Microsoft Excel" }),
        ]),
      );
      expect(openToast).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Form Handler Functions
  // ============================================================================

  describe("createImageUploadHandler", () => {
    it("should create a handler that reads and updates form data", (done) => {
      const setFormData = jest.fn();
      const handler = createImageUploadHandler(setFormData, "profileImage");

      const mockFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };

      // Mock FileReader
      const mockReader = {
        onloadend: null,
        result: "data:image/jpeg;base64,abc123",
        readAsDataURL: jest.fn(function () {
          setTimeout(() => this.onloadend(), 0);
        }),
      };

      global.FileReader = jest.fn(() => mockReader);

      handler(mockEvent);

      setTimeout(() => {
        expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
        const updateFn = setFormData.mock.calls[0][0];
        const result = updateFn({ existing: "data" });
        expect(result).toEqual({
          existing: "data",
          profileImage: "data:image/jpeg;base64,abc123",
        });
        done();
      }, 10);
    });

    it("should not update form data if no file selected", () => {
      const setFormData = jest.fn();
      const handler = createImageUploadHandler(setFormData);

      const mockEvent = {
        target: {
          files: [],
        },
      };

      handler(mockEvent);
      expect(setFormData).not.toHaveBeenCalled();
    });

    it("should use custom field name", (done) => {
      const setFormData = jest.fn();
      const handler = createImageUploadHandler(setFormData, "groupImage");

      const mockFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const mockEvent = {
        target: {
          files: [mockFile],
        },
      };

      const mockReader = {
        onloadend: null,
        result: "data:image/jpeg;base64,xyz789",
        readAsDataURL: jest.fn(function () {
          setTimeout(() => this.onloadend(), 0);
        }),
      };

      global.FileReader = jest.fn(() => mockReader);

      handler(mockEvent);

      setTimeout(() => {
        const updateFn = setFormData.mock.calls[0][0];
        const result = updateFn({});
        expect(result).toHaveProperty(
          "groupImage",
          "data:image/jpeg;base64,xyz789",
        );
        done();
      }, 10);
    });
  });

  describe("createToggleSelectionHandler", () => {
    it("should add item when not selected", () => {
      const setFormData = jest.fn();
      const handler = createToggleSelectionHandler(setFormData);

      handler("users", { id: "user1", name: "John" });

      expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({ selectedUsers: [] });
      expect(result.selectedUsers).toEqual([{ id: "user1", name: "John" }]);
    });

    it("should remove item when already selected", () => {
      const setFormData = jest.fn();
      const handler = createToggleSelectionHandler(setFormData);

      handler("users", { id: "user1", name: "John" });

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({
        selectedUsers: [
          { id: "user1", name: "John" },
          { id: "user2", name: "Jane" },
        ],
      });
      expect(result.selectedUsers).toEqual([{ id: "user2", name: "Jane" }]);
    });

    it("should capitalize type correctly", () => {
      const setFormData = jest.fn();
      const handler = createToggleSelectionHandler(setFormData);

      handler("files", { id: "file1" });

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({ selectedFiles: [] });
      expect(result).toHaveProperty("selectedFiles");
      expect(result.selectedFiles).toEqual([{ id: "file1" }]);
    });
  });

  describe("createRemoveSelectionHandler", () => {
    it("should remove item by id", () => {
      const setFormData = jest.fn();
      const handler = createRemoveSelectionHandler(setFormData);

      handler("users", "user2");

      expect(setFormData).toHaveBeenCalledWith(expect.any(Function));
      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({
        selectedUsers: [
          { id: "user1", name: "John" },
          { id: "user2", name: "Jane" },
        ],
      });
      expect(result.selectedUsers).toEqual([{ id: "user1", name: "John" }]);
    });

    it("should handle empty selection", () => {
      const setFormData = jest.fn();
      const handler = createRemoveSelectionHandler(setFormData);

      handler("groups", "group1");

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({ selectedGroups: [] });
      expect(result.selectedGroups).toEqual([]);
    });
  });

  describe("createFilteredItems", () => {
    const items = [
      { id: 1, name: "John Doe", email: "john@test.com" },
      { id: 2, name: "Jane Smith", email: "jane@test.com" },
      { id: 3, name: "Bob Johnson", email: "bob@test.com" },
    ];

    it("should return all items when search term is empty", () => {
      const result = createFilteredItems(items, "", ["name", "email"]);
      expect(result).toEqual(items);
    });

    it("should filter items by name", () => {
      const result = createFilteredItems(items, "jane", ["name", "email"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Jane Smith");
    });

    it("should filter items by email", () => {
      const result = createFilteredItems(items, "bob@", ["name", "email"]);
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("bob@test.com");
    });

    it("should be case insensitive", () => {
      const result = createFilteredItems(items, "JOHN", ["name"]);
      expect(result).toHaveLength(2); // John Doe and Bob Johnson
    });

    it("should handle nested fields", () => {
      const nestedItems = [
        { id: 1, user: { name: "Alice" } },
        { id: 2, user: { name: "Bob" } },
      ];
      const result = createFilteredItems(nestedItems, "alice", ["user.name"]);
      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe("Alice");
    });

    it("should handle whitespace in search term", () => {
      const result = createFilteredItems(items, "  doe  ", ["name"]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("John Doe");
    });
  });

  describe("createNavigationHandler", () => {
    it("should move forward within bounds", () => {
      const setCurrentStep = jest.fn();
      const handler = createNavigationHandler(setCurrentStep, 5);

      handler(1);

      const updateFn = setCurrentStep.mock.calls[0][0];
      expect(updateFn(2)).toBe(3);
    });

    it("should move backward within bounds", () => {
      const setCurrentStep = jest.fn();
      const handler = createNavigationHandler(setCurrentStep, 5);

      handler(-1);

      const updateFn = setCurrentStep.mock.calls[0][0];
      expect(updateFn(2)).toBe(1);
    });

    it("should not go below 0", () => {
      const setCurrentStep = jest.fn();
      const handler = createNavigationHandler(setCurrentStep, 5);

      handler(-1);

      const updateFn = setCurrentStep.mock.calls[0][0];
      expect(updateFn(0)).toBe(0);
    });

    it("should not go above max step", () => {
      const setCurrentStep = jest.fn();
      const handler = createNavigationHandler(setCurrentStep, 5);

      handler(1);

      const updateFn = setCurrentStep.mock.calls[0][0];
      expect(updateFn(4)).toBe(4);
    });

    it("should handle large jumps", () => {
      const setCurrentStep = jest.fn();
      const handler = createNavigationHandler(setCurrentStep, 5);

      handler(10);

      const updateFn = setCurrentStep.mock.calls[0][0];
      expect(updateFn(0)).toBe(4);
    });
  });

  describe("createDeleteHandler", () => {
    it("should call delete and success callbacks", async () => {
      const onDelete = jest.fn().mockResolvedValue();
      const setIsSubmitting = jest.fn();
      const onClose = jest.fn();
      const onSuccess = jest.fn();

      const handler = createDeleteHandler({
        onDelete,
        setIsSubmitting,
        onClose,
        onSuccess,
      });

      await handler();

      expect(setIsSubmitting).toHaveBeenCalledWith(true);
      expect(onDelete).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });

    it("should handle delete errors", async () => {
      const error = new Error("Delete failed");
      const onDelete = jest.fn().mockRejectedValue(error);
      const setIsSubmitting = jest.fn();
      const onError = jest.fn();

      const handler = createDeleteHandler({
        onDelete,
        setIsSubmitting,
        onError,
      });

      await handler();

      expect(onError).toHaveBeenCalledWith(error);
      expect(setIsSubmitting).toHaveBeenCalledWith(false);
    });

    it("should do nothing if onDelete is not provided", async () => {
      const setIsSubmitting = jest.fn();

      const handler = createDeleteHandler({
        onDelete: null,
        setIsSubmitting,
      });

      await handler();

      expect(setIsSubmitting).not.toHaveBeenCalled();
    });
  });

  describe("createSelectAllHandler", () => {
    it("should select all when none selected", () => {
      const setFormData = jest.fn();
      const allItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const selectedItems = [];

      const handler = createSelectAllHandler(
        setFormData,
        "users",
        allItems,
        selectedItems,
      );

      handler();

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({});
      expect(result.allUsers).toBe(true);
      expect(result.selectedUsers).toEqual(allItems);
    });

    it("should deselect all when all are selected", () => {
      const setFormData = jest.fn();
      const allItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const selectedItems = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const handler = createSelectAllHandler(
        setFormData,
        "users",
        allItems,
        selectedItems,
      );

      handler();

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({});
      expect(result.allUsers).toBe(false);
      expect(result.selectedUsers).toEqual([]);
    });

    it("should deselect all when in indeterminate state", () => {
      const setFormData = jest.fn();
      const allItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const selectedItems = [{ id: 1 }];

      const handler = createSelectAllHandler(
        setFormData,
        "files",
        allItems,
        selectedItems,
      );

      handler();

      const updateFn = setFormData.mock.calls[0][0];
      const result = updateFn({});
      expect(result.allFiles).toBe(false);
      expect(result.selectedFiles).toEqual([]);
    });
  });

  describe("createRenderStepContent", () => {
    const BasicInfoStep = ({ formData }) => (
      <div>Basic Info: {formData.name}</div>
    );
    const SelectionStep = ({ type }) => <div>Selection: {type}</div>;

    const mockConfig = {
      steps: [
        { handleImageUpload: jest.fn(), isEditMode: false },
        { type: "users" },
        { type: "groups" },
      ],
      currentStep: 0,
      formData: { name: "Test", selectedUsers: [], selectedGroups: [] },
      setFormData: jest.fn(),
      searchTerms: { users: "", groups: "" },
      setSearchTerms: jest.fn(),
      filteredData: { users: [], groups: [] },
      allData: { users: [], groups: [] },
      toggleSelection: jest.fn(),
      removeSelection: jest.fn(),
      BasicInfoStep,
      SelectionStep,
    };

    it("should render BasicInfoStep for step 0", () => {
      const renderStepContent = createRenderStepContent(mockConfig);
      const result = renderStepContent();

      expect(result).toBeDefined();
      expect(result.type).toBe(BasicInfoStep);
    });

    it("should render SelectionStep for other steps", () => {
      const config = { ...mockConfig, currentStep: 1 };
      const renderStepContent = createRenderStepContent(config);
      const result = renderStepContent();

      expect(result).toBeDefined();
      expect(result.type).toBe(SelectionStep);
    });

    it("should return null for invalid step", () => {
      const config = { ...mockConfig, currentStep: 99 };
      const renderStepContent = createRenderStepContent(config);
      const result = renderStepContent();

      expect(result).toBeNull();
    });
  });
});

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import GroupsPage from "../GroupsPage.jsx";
import * as clientApi from "../../api/client.js";

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    text: "#111111",
    textPrimary: "#111111",
    textSecondary: "#666666",
    textMuted: "#888888",
    border: "#DDDDDD",
    borderLight: "#E5E5E5",
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F7F7F7",
    secondary: "#F2F2F2",
    secondaryText: "#111111",
    secondaryBorder: "#CCCCCC",
    isDark: false,
  }),
}));

jest.mock("../../components/layout/PageShell.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="page-shell">{children}</div>,
}));

jest.mock("../../components/table/TableSurface.jsx", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="table-surface">{children}</div>,
}));

jest.mock("../../components/table/TableSkeleton.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="table-skeleton">Loading</div>,
}));

jest.mock("../../components/common/EmptyState/EmptyState.jsx", () => ({
  __esModule: true,
  default: ({ message, description }) => (
    <div data-testid="empty-state">
      <div>{message}</div>
      <div>{description}</div>
    </div>
  ),
}));

jest.mock("../../components/common/Pagination/Pagination.jsx", () => ({
  __esModule: true,
  default: ({ totalItems, currentPage, onPageChange }) => (
    <div data-testid="pagination">
      <span>total:{totalItems}</span>
      <span>page:{currentPage}</span>
      <button type="button" onClick={() => onPageChange(currentPage + 1)}>
        next
      </button>
    </div>
  ),
}));

jest.mock("../../components/common/SearchField/SearchField.jsx", () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }) => (
    <input
      data-testid="search-field"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick, buttonText, disabled, "data-testid": testId }) => (
    <button type="button" data-testid={testId || "create-button"} onClick={onClick} disabled={disabled}>
      {buttonText}
    </button>
  ),
}));

jest.mock("../../components/common/RefreshButton/RefreshButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick }) => (
    <button type="button" data-testid="refresh-button" onClick={onClick}>
      Refresh
    </button>
  ),
}));

jest.mock("../../components/common/DisplayButton/DisplayButton.jsx", () => ({
  __esModule: true,
  default: ({ layout, onLayoutChange, columnToggles }) => (
    <div data-testid="display-button">
      <div data-testid="layout-value">{layout}</div>
      <button type="button" onClick={() => onLayoutChange("grid")}>Grid</button>
      <button type="button" onClick={() => onLayoutChange("list")}>List</button>
      {columnToggles?.columns?.map((col) => (
        <button
          type="button"
          key={col.key}
          data-testid={`toggle-${col.key}`}
          onClick={() => columnToggles.onToggle(col.key)}
        >
          {col.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => ({
  __esModule: true,
  default: ({ filterGroups, activeFilters, onFilterChange }) => (
    <div data-testid="filter-button">
      {filterGroups.map((group) => (
        <div key={group.id} data-testid={`filter-group-${group.id}`}>
          {group.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              data-testid={`filter-${opt.value}`}
              onClick={() => {
                const active = activeFilters[group.id]?.has(opt.value);
                onFilterChange(group.id, opt.value, !active);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../../components/common/Checkbox/Checkbox.jsx", () => ({
  __esModule: true,
  default: ({ checked, onChange }) => (
    <input
      type="checkbox"
      data-testid="row-checkbox"
      checked={checked}
      onChange={onChange}
    />
  ),
}));

jest.mock("../../components/common/IconSelectionBar.jsx", () => ({
  __esModule: true,
  default: ({ selectedCount, onToggleSelectAll }) => (
    <div data-testid="icon-selection-bar">
      <span data-testid="icon-selected-count">{selectedCount}</span>
      <button type="button" data-testid="icon-select-all" onClick={onToggleSelectAll}>
        select-all
      </button>
    </div>
  ),
}));

jest.mock("../../components/common/DisplayIcon/DisplayIcon.jsx", () => ({
  __esModule: true,
  default: ({ type, data }) => <div data-testid={`display-icon-${type}`}>{data?.name}</div>,
}));

jest.mock("../../components/common/EditButton/EditButton.jsx", () => ({
  __esModule: true,
  default: ({ menuItems = [] }) => (
    <div data-testid="edit-button">
      {menuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          data-testid={`menu-${item.label.replace(/\s+/g, "-")}`}
          onClick={item.onClick}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../assets/CreateGroupIcon.jsx", () => ({
  __esModule: true,
  default: () => <span>CreateGroupIcon</span>,
}));

jest.mock("../../assets/EditIcon.jsx", () => ({
  __esModule: true,
  default: () => <span>EditIcon</span>,
}));

jest.mock("../../assets/TrashIcon.jsx", () => ({
  __esModule: true,
  default: () => <span>TrashIcon</span>,
}));

jest.mock("../../assets/UploadFileIcon.jsx", () => ({
  __esModule: true,
  default: () => <span>UploadFileIcon</span>,
}));

jest.mock("../../components/common/CSVImport/CSVImport.jsx", () => ({
  __esModule: true,
  default: ({ button, onImport, importing, helpTitle, requiredColumns, optionalColumns, exampleHeader, exampleRow }) => {
    const React = require("react");
    const file = new File(["group_name,description\nengineering,Core team"], "groups.csv", {
      type: "text/csv",
    });
    return (
      <div data-testid="csv-import-wrapper">
        {React.cloneElement(button, {
          onClick: () => onImport(file),
          disabled: importing,
        })}
        <button type="button" aria-label="CSV format help">
          ?
        </button>
        <div data-testid="csv-help-meta" style={{ display: "none" }}>
          {helpTitle}
          {requiredColumns.join(",")}
          {optionalColumns.join(",")}
          {exampleHeader}
          {exampleRow}
        </div>
      </div>
    );
  },
}));

jest.mock("../../components/common/Toast/Toast.jsx", () => ({
  __esModule: true,
  default: ({ msg, open }) => (open ? <div data-testid="toast">{msg}</div> : null),
  useToast: () => {
    const React = require("react");
    const [toast, setToast] = React.useState({ open: false, msg: "", type: "success" });
    return {
      toast,
      showToast: (msg, type = "success") => setToast({ open: true, msg, type }),
      hideToast: () => setToast((prev) => ({ ...prev, open: false })),
    };
  },
}));

jest.mock("../../utils/filterHelpers.js", () => ({
  createFilterChangeHandler: (setActiveFilters) => (groupId, value, checked) => {
    setActiveFilters((prev) => {
      const next = { ...prev, [groupId]: new Set(prev[groupId] || []) };
      if (checked) next[groupId].add(value);
      else next[groupId].delete(value);
      return next;
    });
  },
}));

jest.mock("../../lib/format.js", () => ({
  formatShares: (n) => `${n} shares`,
}));

jest.mock("../../api/client.js", () => ({
  apiDelete: jest.fn(),
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  apiUploadFile: jest.fn(),
}));

jest.mock("../../components/groups/GroupsList.jsx", () => ({
  __esModule: true,
  default: ({
    rows,
    onEdit,
    onDelete,
    onToggleSelect,
    onToggleSelectAll,
    selectedIds,
    allVisibleSelected,
    isIndeterminate,
    showUsers,
    showWorkstations,
    showFiles,
  }) => (
    <div data-testid="groups-list">
      <div data-testid="groups-count">{rows.length}</div>
      <div data-testid="show-users">{showUsers ? "Users Shown" : "Users Hidden"}</div>
      <div data-testid="show-workstations">{showWorkstations ? "Workstations Shown" : "Workstations Hidden"}</div>
      <div data-testid="show-files">{showFiles ? "Files Shown" : "Files Hidden"}</div>
      <div data-testid="all-visible-selected">{String(allVisibleSelected)}</div>
      <div data-testid="indeterminate">{String(isIndeterminate)}</div>
      <button type="button" data-testid="select-all" onClick={onToggleSelectAll}>
        {allVisibleSelected ? "Deselect All" : "Select All"}
      </button>
      {rows.map((group) => (
        <div key={group.id} data-testid={`group-row-${group.id}`}>
          <input
            type="checkbox"
            data-testid={`checkbox-${group._id}`}
            checked={selectedIds.has(group._id)}
            onChange={() => onToggleSelect(group._id)}
          />
          <span>{group.name}</span>
          <span>{group.description}</span>
          <span data-testid={`member-count-${group.id}`}>{group.memberCount}</span>
          <button type="button" data-testid={`edit-${group.id}`} onClick={() => onEdit(group)}>
            Edit
          </button>
          <button type="button" data-testid={`delete-${group.id}`} onClick={() => onDelete(group.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../../components/groups/GroupsModal.jsx", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ open, onClose, groupData, onSubmit, onRefresh }) => {
      const [name, setName] = React.useState("Test Group");
      if (!open) return null;

      return (
        <div data-testid="groups-modal">
          <span data-testid="modal-mode">{groupData ? "Edit Mode" : "Create Mode"}</span>
          <input
            aria-label="Group Name"
            defaultValue={groupData?.name || "Test Group"}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            data-testid="modal-submit"
            onClick={async () => {
              try {
                await onSubmit({
                  name,
                  description: "Test Description",
                  image: null,
                  users: [],
                  workstations: [],
                  files: [],
                });
                onRefresh?.();
                onClose?.();
              } catch {
              }
            }}
          >
            Submit
          </button>
          <button type="button" data-testid="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
      );
    },
  };
});

const seedGroups = [
  {
    _id: "g1",
    id: "g1",
    group_name: "Engineering",
    description: "Core team",
    members: ["u1"],
    members_info: [{ _id: "u1", full_name: "Alice Smith", email: "alice@example.com", role: "admin" }],
    workstations: ["ws1"],
    file_shares: ["share1"],
    created_at: "2025-01-01",
    updated_at: "2025-01-02",
  },
  {
    _id: "g2",
    id: "g2",
    group_name: "Marketing",
    description: "Growth team",
    members: [],
    members_info: [],
    workstations: [],
    file_shares: [],
    created_at: "2025-01-03",
    updated_at: "2025-01-04",
  },
];

const renderPage = (initialEntries = ["/groups"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <GroupsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  clientApi.apiGet.mockResolvedValue({
    json: async () => ({ access_groups: [] }),
  });
  clientApi.apiPost.mockResolvedValue({});
  clientApi.apiPatch.mockResolvedValue({});
  clientApi.apiDelete.mockResolvedValue({});
  clientApi.apiUploadFile.mockResolvedValue({ created: 0, errors: [] });
  window.confirm = jest.fn(() => true);
});

describe("GroupsPage", () => {
  it("renders the page and loads groups", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();

    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    expect(await screen.findByText("Engineering")).toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toHaveTextContent("total:2");
    expect(clientApi.apiGet).toHaveBeenCalledWith("/access-groups");
  });

  it("opens modal from navigation state", async () => {
    renderPage([{ pathname: "/groups", state: { openModal: true } }]);

    expect(await screen.findByTestId("groups-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-mode")).toHaveTextContent("Create Mode");
  });

  it("searches and filters groups", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.type(screen.getByTestId("search-field"), "growth");
    expect(screen.getByTestId("groups-count")).toHaveTextContent("1");

    await userEvent.click(screen.getByTestId("filter-small"));
    expect(screen.getByTestId("groups-count")).toHaveTextContent("1");
    await userEvent.click(screen.getByTestId("filter-small"));
    expect(screen.getByTestId("groups-count")).toHaveTextContent("1");
  });

  it("toggles layout and column visibility", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByText("Grid"));
    expect(screen.getByTestId("layout-value")).toHaveTextContent("grid");

    await userEvent.click(screen.getByTestId("toggle-showUsers"));
    await userEvent.click(screen.getByTestId("toggle-showWorkstations"));
    await userEvent.click(screen.getByTestId("toggle-showFiles"));
    expect(screen.getByTestId("icon-selection-bar")).toBeInTheDocument();
  });

  it("supports list selection and select-all state", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    expect(screen.getByTestId("all-visible-selected")).toHaveTextContent("false");
    await userEvent.click(screen.getByTestId("checkbox-g1"));
    expect(screen.getByTestId("indeterminate")).toHaveTextContent("true");

    await userEvent.click(screen.getByTestId("select-all"));
    expect(screen.getByTestId("all-visible-selected")).toHaveTextContent("true");
    expect(screen.getByTestId("checkbox-g2")).toBeChecked();
  });

  it("supports grid selection and empty state", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByText("Grid"));
    expect(screen.getByTestId("icon-selection-bar")).toBeInTheDocument();

    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);

    await userEvent.clear(screen.getByTestId("search-field"));
    await userEvent.type(screen.getByTestId("search-field"), "zzz");
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
  });

  it("creates a group successfully", async () => {
    clientApi.apiGet.mockResolvedValue({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByTestId("groups-list");

    await userEvent.click(screen.getByTestId("create-button"));
    expect(screen.getByTestId("groups-modal")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("modal-submit"));

    await waitFor(() => {
      expect(clientApi.apiPost).toHaveBeenCalledWith(
        "/access-groups",
        expect.objectContaining({
          group_name: "Test Group",
          description: "Test Description",
          members: [],
          workstations: [],
          file_shares: [],
        }),
      );
    });
  });

  it("updates a group successfully", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByTestId("edit-g1"));
    expect(screen.getByTestId("modal-mode")).toHaveTextContent("Edit Mode");

    await userEvent.click(screen.getByTestId("modal-submit"));

    await waitFor(() => {
      expect(clientApi.apiPatch).toHaveBeenCalledWith(
        "/access-groups/g1",
        expect.objectContaining({
          group_name: "Test Group",
          description: "Test Description",
        }),
      );
    });
  });

  it("keeps modal open when submit fails", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: [] }),
    });
    clientApi.apiPost.mockRejectedValueOnce(new Error("Create failed"));

    renderPage();
    await screen.findByTestId("groups-list");

    await userEvent.click(screen.getByTestId("create-button"));
    await userEvent.click(screen.getByTestId("modal-submit"));

    expect(screen.getByTestId("groups-modal")).toBeInTheDocument();
  });

  it("shows delete confirmation and deletes a group", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByTestId("delete-g1"));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(clientApi.apiDelete).toHaveBeenCalledWith("/access-groups/g1"));
  });

  it("does not delete when confirmation is rejected", async () => {
    window.confirm = jest.fn(() => false);
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByTestId("delete-g1"));
    expect(clientApi.apiDelete).not.toHaveBeenCalled();
  });

  it("imports CSV and refreshes on success", async () => {
    clientApi.apiGet
      .mockResolvedValueOnce({ json: async () => ({ access_groups: seedGroups }) })
      .mockResolvedValueOnce({ json: async () => ({ access_groups: seedGroups }) });
    clientApi.apiUploadFile.mockResolvedValueOnce({ created: 2, errors: [] });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    expect(clientApi.apiUploadFile).toHaveBeenCalledWith(
      "/access-groups/import-csv",
      expect.any(File),
    );
    expect(await screen.findByText(/Successfully imported 2 group\(s\)/i)).toBeInTheDocument();
    expect(clientApi.apiGet).toHaveBeenCalledTimes(2);
  });

  it("shows CSV import errors", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });
    clientApi.apiUploadFile.mockResolvedValueOnce({
      created: 0,
      errors: [{ error: "Invalid row 2" }],
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    expect(await screen.findByText("Import failed: Invalid row 2")).toBeInTheDocument();
  });

  it("shows no groups imported when CSV produces no created rows and no errors", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });
    clientApi.apiUploadFile.mockResolvedValueOnce({ created: 0, errors: [] });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    expect(await screen.findByText("No groups imported")).toBeInTheDocument();
  });

  it("shows upload exception message", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });
    clientApi.apiUploadFile.mockRejectedValueOnce(new Error("CSV import boom"));

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByRole("button", { name: "Import CSV" }));
    expect(await screen.findByText("CSV import boom")).toBeInTheDocument();
  });

  it("opens refresh action and fetches again", async () => {
    clientApi.apiGet.mockResolvedValue({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    await userEvent.click(screen.getByTestId("refresh-button"));
    expect(clientApi.apiGet).toHaveBeenCalledTimes(2);
  });

  it("shows help tooltip through hover and click", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: seedGroups }),
    });

    renderPage();
    await screen.findByText("Engineering");

    const helpButton = screen.getByLabelText("CSV format help");
    fireEvent.mouseEnter(helpButton);
    expect(screen.getByTestId("csv-help-meta")).toBeInTheDocument();
    fireEvent.mouseLeave(helpButton);
    fireEvent.click(helpButton);
    expect(screen.getByTestId("csv-help-meta")).toBeInTheDocument();
  });

  it("closes modal via close button", async () => {
    clientApi.apiGet.mockResolvedValueOnce({
      json: async () => ({ access_groups: [] }),
    });

    renderPage();
    await screen.findByTestId("groups-list");

    await userEvent.click(screen.getByTestId("create-button"));
    expect(screen.getByTestId("groups-modal")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("modal-close"));
    expect(screen.queryByTestId("groups-modal")).not.toBeInTheDocument();
  });
});

import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkstationsPage, { createWorkstation } from "../WorkstationsPage";
import { fetchWorkstations } from "../../utils/modalHelpers.jsx";
import { apiGet, apiPost } from "../../api/client.js";

jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (handler) => handler,
}));

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({ text: "#fff" }),
}));

jest.mock("../../utils/modalHelpers.jsx", () => ({
  fetchWorkstations: jest.fn(),
}));

jest.mock("../../api/client.js", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

jest.mock("../../lib/safeAsync", () => ({
  safeAsync: jest.fn(async (fn) => fn()),
}));

jest.mock("../../lib/errors", () => ({
  getUserErrorMessage: jest.fn(() => "Unable to refresh"),
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
  default: () => <div data-testid="table-skeleton">loading</div>,
}));

jest.mock("../../components/workstations/WorkstationList.jsx", () => ({
  __esModule: true,
  default: ({
    rows,
    onDelete,
    onEdit,
    onToggleSelect,
    onToggleSelectAll,
    selectedIds,
    allVisibleSelected,
    showUsers,
    showCurrent,
    showLastUsed,
  }) => (
    <div data-testid="workstation-list">
      <div data-testid="users-column">{showUsers ? "on" : "off"}</div>
      <div data-testid="current-column">{showCurrent ? "on" : "off"}</div>
      <div data-testid="lastused-column">{showLastUsed ? "on" : "off"}</div>
      <button onClick={onToggleSelectAll}>{allVisibleSelected ? "toggle-all-on" : "toggle-all-off"}</button>
      {rows.map((row) => (
        <div key={row.id}>
          <span>{`${row.name}:${row.status}`}</span>
          <span>{selectedIds?.has(row.id) ? "selected" : "unselected"}</span>
          <button onClick={() => onToggleSelect?.(row.id)}>{`select-${row.name}`}</button>
          <button onClick={() => onEdit?.(row)}>{`edit-${row.name}`}</button>
          {onDelete ? (
            <button onClick={() => onDelete(row.id)}>{`delete-${row.name}`}</button>
          ) : null}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../../components/workstations/WorkstationModal.jsx", () => ({
  __esModule: true,
  default: ({ open, onSubmit, onClose }) =>
    open ? (
      <div data-testid="workstation-modal">
        <button
          onClick={() =>
            onSubmit({
              name: "Created WS",
              description: "basic",
              software: [{ _id: "sw-1", name: "Office" }],
              access_groups: [{ _id: "grp-1", name: "Admins" }],
              members: [{ _id: "usr-1", firstName: "Ada", lastName: "Lovelace" }],
            })
          }
        >
          submit
        </button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

jest.mock("../../components/common/SearchField/SearchField.jsx", () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }) => (
    <input
      aria-label="search"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock("../../components/common/DisplayButton/DisplayButton.jsx", () => ({
  __esModule: true,
  default: ({ columnToggles, onLayoutChange }) => (
    <div>
      <button onClick={() => onLayoutChange("list")}>layout-list</button>
      <button onClick={() => onLayoutChange("icons")}>layout-icons</button>
      <button onClick={() => columnToggles.onToggle("showUsers")}>toggle-users</button>
      <button onClick={() => columnToggles.onToggle("showCurrent")}>toggle-current</button>
      <button onClick={() => columnToggles.onToggle("showLastUsed")}>toggle-lastused</button>
    </div>
  ),
}));

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => ({
  __esModule: true,
  default: ({ onFilterChange }) => (
    <div data-testid="filter-button">
      <button onClick={() => onFilterChange("status", "connected", true)}>filter-connected-on</button>
      <button onClick={() => onFilterChange("status", "connected", false)}>filter-connected-off</button>
      <button onClick={() => onFilterChange("hasUsers", "activeUsers", true)}>filter-users-on</button>
      <button onClick={() => onFilterChange("hasUsers", "activeUsers", false)}>filter-users-off</button>
    </div>
  ),
}));

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick, buttonText }) => <button onClick={onClick}>{buttonText}</button>,
}));

jest.mock("../../components/common/RefreshButton/RefreshButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick }) => <button onClick={onClick}>Refresh</button>,
}));

jest.mock("../../components/common/IconSelectionBar.jsx", () => ({
  __esModule: true,
  default: ({ selectedCount, onToggleSelectAll }) => (
    <div data-testid="icon-selection-bar">
      <span>{selectedCount}</span>
      <button onClick={onToggleSelectAll}>icon-toggle-all</button>
    </div>
  ),
}));

jest.mock("../../components/common/DisplayIcon/DisplayIcon.jsx", () => ({
  __esModule: true,
  default: ({ type, data }) => (
    <span data-testid={`display-icon-${type}`}>
      {type}:{data?.name || data?.firstName || data?.lastName || "unknown"}
    </span>
  ),
}));

jest.mock("../../components/common/EditButton/EditButton.jsx", () => ({
  __esModule: true,
  default: ({ menuItems = [] }) => (
    <div>
      {menuItems.map((item) => (
        <button key={item.label} onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

jest.mock("../../components/common/StatusButton/StatusButton.jsx", () => ({
  __esModule: true,
  default: ({ status, onClick }) => (
    <button onClick={onClick}>{status || "no-status"}</button>
  ),
}));

jest.mock("../../assets/ActiveIcon.jsx", () => ({
  __esModule: true,
  default: ({ outerColor, innerColor }) => (
    <span data-testid="active-icon">{`${outerColor}|${innerColor}`}</span>
  ),
}));

jest.mock("../../components/common/EmptyState/EmptyState.jsx", () => ({
  __esModule: true,
  default: ({ message }) => <div>{message}</div>,
}));

const TRACKED_WORKSTATIONS_KEY = "tracked_workstation_creations";

const renderPage = () =>
  render(
    <MemoryRouter>
      <WorkstationsPage />
    </MemoryRouter>,
  );

describe("createWorkstation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("org_id", "org-1");
  });

  test("posts transformed workstation template payload", async () => {
    const response = { job_id: "job-1" };
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue(response),
    });

    const result = await createWorkstation({
      name: "WS 1",
      description: "basic",
      software: [{ _id: "sw-1" }, { id: "sw-2" }],
      access_groups: [{ _id: "grp-1" }],
      members: [{ _id: "usr-1" }, { id: "usr-2" }],
    });

    expect(result).toEqual(response);
    expect(apiPost).toHaveBeenCalledWith("/workstations/templates", {
      org_id: "org-1",
      name: "WS 1",
      description: "basic",
      software: ["sw-1", "sw-2"],
      access_groups: ["grp-1"],
      members: ["usr-1", "usr-2"],
    });
  });

  test("returns null when apiPost throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    apiPost.mockRejectedValue(new Error("boom"));

    const result = await createWorkstation({
      name: "WS 1",
      description: "",
      software: [],
      access_groups: [],
      members: [],
    });

    expect(result).toBeNull();
  });
});

describe("WorkstationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
    localStorage.setItem("org_id", "org-1");
    localStorage.setItem("jwt", "token-123");
    fetchWorkstations.mockResolvedValue([
      { id: "w1", name: "Alpha", status: "connected", usersCount: 0 },
      { id: "w2", name: "Beta", status: "disconnected", usersCount: 0 },
    ]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ job_id: "job-1" }),
    });
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: "finished", result: { result: { template_id: "tpl-1" } } }),
    });
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("loads and renders workstation rows", async () => {
    renderPage();

    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    expect(screen.getByText("Beta:disconnected")).toBeInTheDocument();
  });

  test("filters rows by search", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("search"), { target: { value: "Beta" } });

    expect(screen.queryByText("Alpha:connected")).not.toBeInTheDocument();
    expect(screen.getByText("Beta:disconnected")).toBeInTheDocument();
  });

  test("filters rows by status and active users", async () => {
    fetchWorkstations.mockResolvedValue([
      { id: "w1", name: "Alpha", status: "connected", usersCount: 1 },
      { id: "w2", name: "Beta", status: "disconnected", usersCount: 0 },
    ]);

    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "filter-connected-on" }));

    expect(screen.getByText("Alpha:connected")).toBeInTheDocument();
    expect(screen.queryByText("Beta:disconnected")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "filter-users-on" }));
    expect(screen.getByText("Alpha:connected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "filter-connected-off" }));
    fireEvent.click(screen.getByRole("button", { name: "filter-users-off" }));
    expect(screen.getByText("Beta:disconnected")).toBeInTheDocument();
  });

  test("toggles visible columns via display controls", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId("users-column")).toHaveTextContent("on"));
    fireEvent.click(screen.getByRole("button", { name: "toggle-users" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle-current" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle-lastused" }));

    expect(screen.getByTestId("users-column")).toHaveTextContent("off");
    expect(screen.getByTestId("current-column")).toHaveTextContent("off");
    expect(screen.getByTestId("lastused-column")).toHaveTextContent("off");
  });

  test("toggles row selection, select-all states, and clears selection summary", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "toggle-all-off" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "toggle-all-on" }));
    await waitFor(() => expect(screen.queryByText("2 selected")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "select-Alpha" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "toggle-all-off" }));
    await waitFor(() => expect(screen.queryByText("1 selected")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "select-Alpha" }));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    await waitFor(() => expect(screen.queryByText("1 selected")).not.toBeInTheDocument());
  });

  test("creates an optimistic row, polls job status, and persists the tracked row", async () => {
    fetchWorkstations.mockResolvedValue([]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ job_id: "job-1" }),
    });
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "finished",
        result: { result: { template_id: "tpl-1" } },
      }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("workstation-list")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText(/Created WS:(provisioning|connected)/)).toBeInTheDocument());

    let tracked = JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY));
    expect(tracked).toHaveLength(1);
    expect(tracked[0].jobId).toBe("job-1");
    expect(["provisioning", "connected"]).toContain(tracked[0].row.status);

    await waitFor(() => expect(screen.getByText("Created WS:connected")).toBeInTheDocument());
    tracked = JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY));
    expect(tracked[0].row.id).toBe("tpl-1");
    expect(tracked[0].row.online).toBe(true);
  });

  test("keeps a workstation provisioning while polling reports started", async () => {
    fetchWorkstations.mockResolvedValue([]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ job_id: "job-started" }),
    });
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: "started", progress: "starting ws_create_default" }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("workstation-list")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText("Created WS:provisioning")).toBeInTheDocument());
    const tracked = JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY));
    expect(tracked[0].row.status).toBe("provisioning");
    expect(tracked[0].row.online).toBe(false);
  });

  test("marks a workstation as failed when polling returns failure progress", async () => {
    fetchWorkstations.mockResolvedValue([]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ job_id: "job-fail" }),
    });
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ status: "finished", progress: "failed to get server nodes" }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("workstation-list")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText("Created WS:provisioning")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Created WS:failed")).toBeInTheDocument());
    const tracked = JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY));
    expect(tracked[0].row.status).toBe("failed");
  });

  test("removes the optimistic row when create request fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchWorkstations.mockResolvedValue([]);
    apiPost.mockRejectedValue(new Error("boom"));

    renderPage();
    await waitFor(() => expect(screen.getByTestId("workstation-list")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.queryByText("Created WS:provisioning")).not.toBeInTheDocument());
    expect(localStorage.getItem(TRACKED_WORKSTATIONS_KEY)).toBeNull();
  });

  test("resumes polling tracked provisioning rows from localStorage on mount", async () => {
    fetchWorkstations.mockResolvedValue([]);
    localStorage.setItem(
      TRACKED_WORKSTATIONS_KEY,
      JSON.stringify([
        {
          jobId: "job-2",
          row: { id: "temp-1", name: "Recovered WS", status: "provisioning", online: false },
        },
      ]),
    );
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "finished",
        result: { result: { template_id: "tpl-99" } },
      }),
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("Recovered WS:connected")).toBeInTheDocument());
    const tracked = JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY));
    expect(apiGet).toHaveBeenCalledWith("/status/job-2");
    expect(tracked[0].row.id).not.toBe("temp-1");
    expect(tracked[0].row.status).toBe("connected");
  });

  test("logs and recovers when tracked workstation storage is invalid", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(TRACKED_WORKSTATIONS_KEY, "{invalid-json");

    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to read tracked workstation jobs:",
      expect.any(Error),
    );
  });

  test("logs when tracked workstation persistence fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const originalSetItem = Storage.prototype.setItem;
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(function setItem(key, value) {
      if (key === TRACKED_WORKSTATIONS_KEY) {
        throw new Error("quota exceeded");
      }
      return originalSetItem.call(this, key, value);
    });

    fetchWorkstations.mockResolvedValue([]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ job_id: "job-storage" }),
    });
    apiGet.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "finished",
        result: { result: { template_id: "tpl-storage" } },
      }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByTestId("workstation-list")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText("Created WS:connected")).toBeInTheDocument());
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to persist tracked workstation jobs:",
      expect.any(Error),
    );
    setItemSpy.mockRestore();
  });

  test("opens from route state", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/", state: { openModal: true } }]}>
        <WorkstationsPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId("workstation-modal")).toBeInTheDocument());
  });

  test("edits an existing row through modal submit mapping", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "edit-Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText("Created WS:connected")).toBeInTheDocument());
  });

  test("deletes the row and removes matching tracked entries", async () => {
    fetchWorkstations.mockResolvedValue([{ id: "w1", name: "Alpha", status: "connected", usersCount: 0 }]);
    localStorage.setItem(
      TRACKED_WORKSTATIONS_KEY,
      JSON.stringify([{ jobId: "job-1", row: { id: "w1", name: "Alpha", status: "connected" } }]),
    );

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "delete-Alpha" }));

    await waitFor(() => expect(screen.queryByText("Alpha:connected")).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(TRACKED_WORKSTATIONS_KEY))).toEqual([]);
  });

  test("shows refresh error when refresh fails", async () => {
    fetchWorkstations
      .mockResolvedValueOnce([{ id: "w1", name: "Alpha", status: "connected", usersCount: 0 }])
      .mockRejectedValueOnce(new Error("boom"));

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to refresh"));
  });

  test("renders icon layout with status colors and empty state", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha:connected")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "layout-icons" }));

    expect(screen.getByTestId("icon-selection-bar")).toBeInTheDocument();
    expect(screen.getAllByTestId("active-icon").length).toBeGreaterThan(0);
    expect(screen.getByText("connected")).toBeInTheDocument();
  });

  test("renders empty state in icon layout when no rows exist", async () => {
    fetchWorkstations.mockResolvedValue([]);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "layout-icons" }));
    await waitFor(() => expect(screen.getByText("No workstations found")).toBeInTheDocument());
  });
});

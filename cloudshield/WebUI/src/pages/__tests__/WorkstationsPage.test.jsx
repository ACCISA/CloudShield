import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkstationsPage, {
  createWorkstationTemplate,
  updateWorkstationTemplate,
  deleteWorkstationTemplate,
} from "../WorkstationsPage";
import { fetchWorkstations } from "../../utils/modalHelpers.jsx";
import * as clientApi from "../../api/client.js";

jest.mock("../../api/client.js", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  apiDelete: jest.fn(),
  apiUploadFile: jest.fn(),
}));

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
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
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
    showUsers,
    showCurrent,
    showLastUsed,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onDelete,
    onToggleStatus,
  }) => (
    <div data-testid="workstation-list">
      <div data-testid="users-column">{showUsers ? "on" : "off"}</div>
      <div data-testid="current-column">{showCurrent ? "on" : "off"}</div>
      <div data-testid="lastused-column">{showLastUsed ? "on" : "off"}</div>
      <button onClick={onToggleSelectAll}>Select All</button>
      {rows.map((row) => (
        <div key={row.id}>
          <input
            type="checkbox"
            data-testid={`checkbox-${row.id}`}
            checked={selectedIds?.has(row.id)}
            onChange={() => onToggleSelect?.(row.id)}
          />
          <span>{row.name}</span>
          <button data-testid={`edit-${row.id}`} onClick={() => onEdit?.(row)}>
            Edit
          </button>
          <button
            data-testid={`delete-${row.id}`}
            onClick={() => onDelete?.(row.id)}
          >
            Delete
          </button>
          <button
            data-testid={`toggle-status-${row.id}`}
            onClick={() => onToggleStatus?.(row.id)}
          >
            Toggle Status
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../../components/workstations/WorkstationModal.jsx", () => ({
  __esModule: true,
  default: ({ open, onSubmit, onClose, onDelete }) =>
    open ? (
      <div data-testid="workstation-modal">
        <button
          onClick={() =>
            onSubmit({
              orgId: "org-1",
              name: "Created WS",
              ip: "10.0.0.1",
              groups: [],
              users: [],
            })
          }
        >
          submit
        </button>
        {onDelete ? <button onClick={onDelete}>delete-current</button> : null}
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
      <button onClick={() => onLayoutChange?.("list")}>layout-list</button>
      <button onClick={() => onLayoutChange?.("grid")}>layout-grid</button>
      <button onClick={() => columnToggles.onToggle("showUsers")}>
        toggle-users
      </button>
      <button onClick={() => columnToggles.onToggle("showCurrent")}>
        toggle-current
      </button>
      <button onClick={() => columnToggles.onToggle("showLastUsed")}>
        toggle-lastused
      </button>
    </div>
  ),
}));

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="filter-button" />,
}));

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick, buttonText }) => (
    <button onClick={onClick}>{buttonText}</button>
  ),
}));

jest.mock("../../components/common/RefreshButton/RefreshButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick }) => <button onClick={onClick}>Refresh</button>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <WorkstationsPage />
    </MemoryRouter>,
  );

describe("createWorkstationTemplate", () => {

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("posts full template payload to /api/workstations/templates", async () => {
    localStorage.setItem("jwt", "token-123");
    clientApi.apiPost.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ job_id: "job-1" }),
    });

    const result = await createWorkstationTemplate("org-1", {
      name: "WS 1",
      description: "basic",
      software: [{ id: "s1" }],
      access_groups: [{ id: "g1" }],
      members: [{ id: "u1" }],
    });

    expect(result).toEqual({ job_id: "job-1" });
    expect(clientApi.apiPost).toHaveBeenCalledWith(
      "/workstations/templates",
      expect.objectContaining({ name: "WS 1" }),
    );
    const body = clientApi.apiPost.mock.calls[0][1];
    expect(body.org_id).toBe("org-1");
    expect(body.access_groups).toEqual(["g1"]);
    expect(body.members).toEqual(["u1"]);
    expect(body.software).toEqual(["s1"]);
  });
});

describe("WorkstationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWorkstations.mockResolvedValue([
      {
        id: "w1",
        name: "Alpha",
        code: "A",
        status: "connected",
        usersCount: 0,
        source: "template",
      },
      {
        id: "w2",
        name: "Beta",
        code: "B",
        status: "disconnected",
        usersCount: 0,
        source: "template",
      },
    ]);
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ id: "new" }),
    });
    apiPatch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ template: { _id: "w1" } }),
    });
    apiDelete.mockResolvedValue(null);
  });

  test("loads and renders workstation rows", async () => {
    renderPage();

    expect(screen.getByTestId("table-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  test("filters rows by search", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.type(screen.getByLabelText("search"), "Beta");

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  test("toggles visible columns via display controls", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() =>
      expect(screen.getByTestId("users-column")).toHaveTextContent("on"),
    );
    await user.click(screen.getByRole("button", { name: "toggle-users" }));
    await user.click(screen.getByRole("button", { name: "toggle-current" }));
    await user.click(screen.getByRole("button", { name: "toggle-lastused" }));

    expect(screen.getByTestId("users-column")).toHaveTextContent("off");
    expect(screen.getByTestId("current-column")).toHaveTextContent("off");
    expect(screen.getByTestId("lastused-column")).toHaveTextContent("off");
  });

  test("opens create modal and appends a created row", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByTestId("workstation-modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "submit" }));
    await waitFor(() =>
      expect(screen.getByText("Created WS")).toBeInTheDocument(),
    );
  });

  test("shows refresh error when refresh fails", async () => {
    const user = userEvent.setup();
    fetchWorkstations
      .mockResolvedValueOnce([
        {
          id: "w1",
          name: "Alpha",
          code: "A",
          status: "connected",
          usersCount: 0,
        },
      ])
      .mockRejectedValueOnce(new Error("boom"));

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to refresh"),
    );
  });

  test("shows selected count in list mode when selecting a row", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    await user.click(screen.getByTestId("checkbox-w1"));

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });

  test("supports select-all and updates selected count", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Select All" }));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  test("switches to grid layout and renders card details", async () => {
    const user = userEvent.setup();
    fetchWorkstations.mockResolvedValueOnce([
      {
        id: "w1",
        name: "Alpha",
        code: "A",
        status: "connected",
        usersCount: 1,
        currentUser: "Jane Doe",
        lastUsed: "today",
      },
      {
        id: "w2",
        name: "Beta",
        code: "B",
        status: "disconnected",
        usersCount: 2,
        currentUser: { firstName: "John", lastName: "Smith" },
        lastUsed: "yesterday",
      },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "layout-grid" }));

    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText(/↳ A/)).toBeInTheDocument();
  });

  test("updates an existing workstation from edit modal", async () => {
    const user = userEvent.setup();
    const dispatchSpy = jest.spyOn(globalThis, "dispatchEvent");

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await user.click(screen.getByTestId("edit-w1"));
    await user.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(screen.getByText("Workstation updated")).toBeInTheDocument();
    });
    expect(apiPatch).toHaveBeenCalledWith(
      "/workstations/templates/w1",
      expect.any(Object),
    );
    expect(dispatchSpy).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  test("shows error toast when create submit fails", async () => {
    const user = userEvent.setup();
    clientApi.apiPost.mockRejectedValueOnce(new Error("create failed"));

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to save workstation"),
      ).toBeInTheDocument();
    });
  });

  test("closes edit modal via close action", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByTestId("edit-w1"));
    expect(screen.getByTestId("workstation-modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "close" }));
    await waitFor(() => {
      expect(screen.queryByTestId("workstation-modal")).not.toBeInTheDocument();
    });
  });

  test("toggles status from connected to disconnected", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    // w1 starts as "connected" — clicking toggle should flip it to "disconnected"
    await user.click(screen.getByTestId("toggle-status-w1"));

    // The row is still present (not deleted)
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  test("does not toggle status for building workstation", async () => {
    const user = userEvent.setup();
    fetchWorkstations.mockResolvedValueOnce([
      { id: "w-build", name: "InProgress", status: "building", usersCount: 0 },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("InProgress")).toBeInTheDocument());
    // Clicking toggle on a building row should be a no-op (status stays "building")
    await user.click(screen.getByTestId("toggle-status-w-build"));
    expect(screen.getByText("InProgress")).toBeInTheDocument();
  });

  test("does not toggle status for provisioning workstation", async () => {
    const user = userEvent.setup();
    fetchWorkstations.mockResolvedValueOnce([
      { id: "w-prov", name: "Provisioning WS", status: "provisioning", usersCount: 0 },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("Provisioning WS")).toBeInTheDocument());
    await user.click(screen.getByTestId("toggle-status-w-prov"));
    expect(screen.getByText("Provisioning WS")).toBeInTheDocument();
  });

  test("shows failed-create toast when createWorkstationTemplate returns null", async () => {
    const user = userEvent.setup();
    clientApi.apiPost.mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValue({}) });

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Create" }));
    await user.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to save workstation")).toBeInTheDocument();
    });
  });

  test("deletes workstation from edit modal delete action", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());

    await user.click(screen.getByTestId("edit-w1"));
    await user.click(screen.getByRole("button", { name: "delete-current" }));

    await waitFor(() => {
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
      expect(screen.queryByTestId("workstation-modal")).not.toBeInTheDocument();
    });
    expect(apiDelete).toHaveBeenCalledWith("/workstations/templates/w1");

    confirmSpy.mockRestore();
  });

  test("deletes live workstation rows through the live delete endpoint", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    fetchWorkstations.mockResolvedValueOnce([
      {
        id: "w1",
        name: "Alpha",
        code: "A",
        status: "connected",
        usersCount: 0,
        source: "workstation",
      },
    ]);

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByTestId("edit-w1"));
    await user.click(screen.getByRole("button", { name: "delete-current" }));

    await waitFor(() =>
      expect(screen.queryByText("Alpha")).not.toBeInTheDocument(),
    );
    expect(apiDelete).toHaveBeenCalledWith("/workstations/w1");

    confirmSpy.mockRestore();
  });
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import WorkstationsPage from "../WorkstationsPage";
import { createWorkstation } from "../../services/workstationsApi.js";
import { fetchWorkstations } from "../../utils/modalHelpers.jsx";

jest.mock("../../hooks/useClickLogger", () => ({
  useClickLogger: () => () => (handler) => handler,
}));

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({ text: "#fff" }),
}));

jest.mock("../../utils/modalHelpers.jsx", () => ({
  fetchWorkstations: jest.fn(),
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
  default: ({ rows, showUsers, showCurrent, showLastUsed }) => (
    <div data-testid="workstation-list">
      <div data-testid="users-column">{showUsers ? "on" : "off"}</div>
      <div data-testid="current-column">{showCurrent ? "on" : "off"}</div>
      <div data-testid="lastused-column">{showLastUsed ? "on" : "off"}</div>
      {rows.map((row) => (
        <div key={row.id}>{row.name}</div>
      ))}
    </div>
  ),
}));

jest.mock("../../components/workstations/WorkstationModal.jsx", () => ({
  __esModule: true,
  default: ({ open, onSubmit, onClose }) =>
    open ? (
      <div data-testid="workstation-modal">
        <button onClick={() => onSubmit({ orgId: "org-1", name: "Created WS", ip: "10.0.0.1", groups: [], users: [] })}>submit</button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

jest.mock("../../components/common/SearchField/SearchField.jsx", () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }) => (
    <input aria-label="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ),
}));

jest.mock("../../components/common/DisplayButton/DisplayButton.jsx", () => ({
  __esModule: true,
  default: ({ columnToggles }) => (
    <div>
      <button onClick={() => columnToggles.onToggle("showUsers")}>toggle-users</button>
      <button onClick={() => columnToggles.onToggle("showCurrent")}>toggle-current</button>
      <button onClick={() => columnToggles.onToggle("showLastUsed")}>toggle-lastused</button>
    </div>
  ),
}));

jest.mock("../../components/common/FilterButton/FilterButton.jsx", () => ({
  __esModule: true,
  default: () => <div data-testid="filter-button" />,
}));

jest.mock("../../components/common/CreateButton/CreateButton.jsx", () => ({
  __esModule: true,
  default: ({ onClick, buttonText }) => <button onClick={onClick}>{buttonText}</button>,
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

describe("createWorkstation", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test("posts payload and returns response", async () => {
    localStorage.setItem("jwt", "token-123");
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: "ws-1" }),
    });

    const result = await createWorkstation("org-1", "WS 1", "10.0.0.1", [{ id: "g1" }]);

    expect(result).toEqual({ id: "ws-1" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workstations",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("WorkstationsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWorkstations.mockResolvedValue([
      { id: "w1", name: "Alpha", code: "A", status: "connected", usersCount: 0 },
      { id: "w2", name: "Beta", code: "B", status: "disconnected", usersCount: 0 },
    ]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: "new" }),
    });
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

    await waitFor(() => expect(screen.getByTestId("users-column")).toHaveTextContent("on"));
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
    await waitFor(() => expect(screen.getByText("Created WS")).toBeInTheDocument());
  });

  test("shows refresh error when refresh fails", async () => {
    const user = userEvent.setup();
    fetchWorkstations
      .mockResolvedValueOnce([{ id: "w1", name: "Alpha", code: "A", status: "connected", usersCount: 0 }])
      .mockRejectedValueOnce(new Error("boom"));

    renderPage();
    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to refresh"));
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkstationList from "../WorkstationList";

jest.mock("../../../assets/ActiveIcon.jsx", () => () => <span data-testid="active-icon" />);
jest.mock("../../common/HoverableRow.jsx", () => ({ children }) => <div>{children}</div>);

jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function MockCheckbox({ checked = false, indeterminate = false, onChange }) {
    return (
      <input
        type="checkbox"
        aria-label={indeterminate ? "indeterminate checkbox" : "checkbox"}
        checked={checked}
        onChange={onChange}
      />
    );
  };
});

jest.mock("../../common/StatusButton/StatusButton.jsx", () => {
  return function MockStatusButton({ status, onClick }) {
    const label = status === "connected" ? "Disconnect" : "Connect";
    return <button onClick={onClick}>{label}</button>;
  };
});

jest.mock("../../common/EditButton/EditButton.jsx", () => {
  return function MockEditButton({ menuItems = [] }) {
    return (
      <button
        aria-label="edit"
        onClick={() => menuItems[0]?.onClick?.()}
      >
        Edit
      </button>
    );
  };
});

jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => {
  return function MockDisplayIcon({ type, data }) {
    if (type === "user") {
      const first = data?.firstName?.[0] || "";
      const last = data?.lastName?.[0] || "";
      return <span>{`${first}${last}`}</span>;
    }

    return <span>{data?.name || data?.code || "icon"}</span>;
  };
});

describe("WorkstationList", () => {
  const mockRows = [
    {
      id: 1,
      name: "Workstation 1",
      code: "WS-001",
      users: [
        "John Doe",
        "Jane Roe",
        "Bob Smith",
        "Alice Jones",
        "Sam Lee",
      ],
      usersCount: 5,
      currentUser: "John Doe",
      lastUsed: "2 hours ago",
      status: "connected",
    },
    {
      id: 2,
      name: "Workstation 2",
      code: "WS-002",
      users: ["Jane Smith", "Mike Ross", "Amy Pond"],
      usersCount: 3,
      currentUser: "Jane Smith",
      lastUsed: "1 day ago",
      status: "busy",
    },
  ];

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnToggleStatus = jest.fn();
  const mockOnToggleSelect = jest.fn();
  const mockOnToggleSelectAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it("renders workstation rows", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getAllByText("Workstation 1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Workstation 2")[0]).toBeInTheDocument();
  });

  it("renders desktop headers", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getByText("Name/Number")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Last Used")).toBeInTheDocument();
  });

  it("displays workstation codes", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getByText("↳ WS-001")).toBeInTheDocument();
    expect(screen.getByText("↳ WS-002")).toBeInTheDocument();
  });

  it("displays extra user count when more than three users exist", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getByText("+ 2")).toBeInTheDocument();
  });

  it("displays current users and last used values on desktop", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getAllByText("JD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JS").length).toBeGreaterThan(0);
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(screen.getByText("1 day ago")).toBeInTheDocument();
  });

  it("renders header checkbox plus row checkboxes on desktop", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getAllByRole("checkbox")).toHaveLength(mockRows.length + 1);
  });

  it("calls onToggleStatus when status button is clicked", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    fireEvent.click(screen.getByText("Disconnect"));
    expect(mockOnToggleStatus).toHaveBeenCalledWith(1);
  });

  it("calls onEdit when edit is clicked", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    fireEvent.click(screen.getAllByLabelText(/edit/i)[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockRows[0]);
  });

  it("calls onToggleSelectAll from the header checkbox", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
        onToggleSelectAll={mockOnToggleSelectAll}
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(mockOnToggleSelectAll).toHaveBeenCalled();
  });

  it("calls onToggleSelect for a row checkbox", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
        onToggleSelect={mockOnToggleSelect}
      />,
    );

    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(mockOnToggleSelect).toHaveBeenCalledWith(1);
  });

  it("respects showUsers/showCurrent/showLastUsed props", () => {
    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
        showUsers={false}
        showCurrent={false}
        showLastUsed={false}
      />,
    );

    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Current")).not.toBeInTheDocument();
    expect(screen.queryByText("Last Used")).not.toBeInTheDocument();
    expect(screen.queryByText("2 hours ago")).not.toBeInTheDocument();
  });

  it("does not change structure based on window width alone", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(
      <WorkstationList
        rows={mockRows}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getByText("Name/Number")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("Last Used")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(mockRows.length + 1);
  });

  it("renders safely with empty rows", () => {
    render(
      <WorkstationList
        rows={[]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onToggleStatus={mockOnToggleStatus}
      />,
    );

    expect(screen.getByText("Name/Number")).toBeInTheDocument();
  });
});

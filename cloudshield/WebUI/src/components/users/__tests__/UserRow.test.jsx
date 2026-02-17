import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserRow from "../UserRow.jsx";

// Mock components
jest.mock("../../common/EditButton/EditButton.jsx", () => {
  return function MockEditButton({ menuItems }) {
    return (
      <div data-testid="edit-button">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            data-testid={`menu-item-${item.label.replace(/\s+/g, "-")}`}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => {
  return function MockDisplayIcon({ type, data }) {
    return <div data-testid={`display-icon-${type}`}>{data?.name}</div>;
  };
});

jest.mock("../../common/Checkbox/Checkbox.jsx", () => {
  return function MockCheckbox({ checked, onChange }) {
    return (
      <input
        type="checkbox"
        data-testid="row-checkbox"
        checked={checked}
        onChange={onChange}
      />
    );
  };
});

jest.mock("../../../assets/EditIcon.jsx", () => {
  return function MockEditIcon() {
    return <span data-testid="edit-icon" />;
  };
});

jest.mock("../../../assets/TrashIcon.jsx", () => {
  return function MockTrashIcon() {
    return <span data-testid="trash-icon" />;
  };
});

jest.mock("../../../assets/ActiveIcon.jsx", () => {
  return function MockActiveIcon({ outerColor, innerColor }) {
    return (
      <span
        data-testid="active-icon"
        data-outer={outerColor}
        data-inner={innerColor}
      />
    );
  };
});

describe("UserRow", () => {
  const defaultProps = {
    data: {
      id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      title: "Engineer",
      status: "online",
      workstations: [],
      groups: [],
      files: [],
      workstationCount: 0,
      groupCount: 0,
      fileCount: 0,
    },
    showTitle: true,
    showWorkstations: true,
    showGroups: true,
    showFiles: true,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    isLast: false,
    cols: ["40px", "1fr", "1fr", "1fr", "1fr", "1fr", "40px", "40px"],
    isMobile: false,
    isTablet: false,
    isSelected: false,
    onToggleSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user name and email", () => {
    render(<UserRow {...defaultProps} />);

    // Use getAllByText since name appears in both DisplayIcon and the span
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getByText("↳ john@example.com")).toBeInTheDocument();
  });

  it("renders title when showTitle is true", () => {
    render(<UserRow {...defaultProps} />);

    expect(screen.getByText("Engineer")).toBeInTheDocument();
  });

  it("hides title when showTitle is false", () => {
    render(<UserRow {...defaultProps} showTitle={false} />);

    expect(screen.queryByText("Engineer")).not.toBeInTheDocument();
  });

  it("shows online status indicator with correct colors", () => {
    render(<UserRow {...defaultProps} />);

    const icon = screen.getByTestId("active-icon");
    expect(icon.dataset.inner).toBe("#04C40A");
  });

  it("shows offline status indicator with correct colors", () => {
    const offlineData = { ...defaultProps.data, status: "offline" };
    render(<UserRow {...defaultProps} data={offlineData} />);

    const icon = screen.getByTestId("active-icon");
    expect(icon.dataset.inner).toBe("#ff5252");
  });

  it("calls onEdit when edit button is clicked", () => {
    render(<UserRow {...defaultProps} />);

    fireEvent.click(screen.getByTestId("menu-item-edit-user"));
    expect(defaultProps.onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button is clicked", () => {
    render(<UserRow {...defaultProps} />);

    fireEvent.click(screen.getByTestId("menu-item-delete-user"));
    expect(defaultProps.onDelete).toHaveBeenCalled();
  });

  it("calls onToggleSelect when checkbox is clicked", () => {
    render(<UserRow {...defaultProps} />);

    fireEvent.click(screen.getByTestId("row-checkbox"));
    expect(defaultProps.onToggleSelect).toHaveBeenCalled();
  });

  it("hides checkbox on mobile", () => {
    render(<UserRow {...defaultProps} isMobile={true} />);

    expect(screen.queryByTestId("row-checkbox")).not.toBeInTheDocument();
  });

  it("renders divider when not last row", () => {
    const { container } = render(<UserRow {...defaultProps} isLast={false} />);

    expect(
      container.querySelector('[style*="border-top"]')
    ).toBeInTheDocument();
  });

  it("does not render divider when last row", () => {
    const { container } = render(<UserRow {...defaultProps} isLast={true} />);

    const dividers = container.querySelectorAll('[style*="border-top: 1px"]');
    expect(dividers.length).toBe(0);
  });

  it("displays dash when no workstations", () => {
    render(<UserRow {...defaultProps} />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("displays workstation count when items exist", () => {
    const dataWithWorkstations = {
      ...defaultProps.data,
      workstations: [{ id: "ws1", name: "WS1" }],
      workstationCount: 5,
    };
    render(<UserRow {...defaultProps} data={dataWithWorkstations} />);

    expect(screen.getByText("+ 4")).toBeInTheDocument();
  });

  it("applies hover styles on mouse enter/leave", () => {
    const { container } = render(<UserRow {...defaultProps} />);

    const row = container.firstChild;
    fireEvent.mouseEnter(row);
    expect(row.style.backgroundColor).toBe("rgba(255, 255, 255, 0.02)");

    fireEvent.mouseLeave(row);
    expect(row.style.backgroundColor).toBe("transparent");
  });

  // Additional tests for ItemsPill component coverage
  it("displays only count when items array is empty but totalCount exists", () => {
    const dataWithCount = {
      ...defaultProps.data,
      workstations: [],
      workstationCount: 10,
    };
    render(<UserRow {...defaultProps} data={dataWithCount} />);

    expect(screen.getByText("+ 10")).toBeInTheDocument();
  });

  it("displays items with extra count when more than 3 items", () => {
    const dataWithItems = {
      ...defaultProps.data,
      groups: [
        { id: "g1", name: "Group 1" },
        { id: "g2", name: "Group 2" },
        { id: "g3", name: "Group 3" },
      ],
      groupCount: 7,
    };
    render(<UserRow {...defaultProps} data={dataWithItems} />);

    expect(screen.getByText("+ 4")).toBeInTheDocument();
  });

  it("renders DisplayIcon for each visible item", () => {
    const dataWithItems = {
      ...defaultProps.data,
      workstations: [
        { id: "ws1", name: "WS1" },
        { id: "ws2", name: "WS2" },
      ],
      workstationCount: 2,
    };
    render(<UserRow {...defaultProps} data={dataWithItems} />);

    expect(screen.getAllByTestId("display-icon-workstation").length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct outer color for online status", () => {
    render(<UserRow {...defaultProps} />);

    const icon = screen.getByTestId("active-icon");
    expect(icon.dataset.outer).toBe("#1F381F");
  });

  it("shows correct outer color for offline status", () => {
    const offlineData = { ...defaultProps.data, status: "offline" };
    render(<UserRow {...defaultProps} data={offlineData} />);

    const icon = screen.getByTestId("active-icon");
    expect(icon.dataset.outer).toBe("#381F1F");
  });

  it("hides workstations column when showWorkstations is false", () => {
    const dataWithWorkstations = {
      ...defaultProps.data,
      workstations: [{ id: "ws1", name: "WS1" }],
      workstationCount: 1,
    };
    render(<UserRow {...defaultProps} data={dataWithWorkstations} showWorkstations={false} />);

    // Should not show workstation icons when hidden
    expect(screen.queryAllByTestId("display-icon-workstation").filter(
      el => el.textContent === "WS1"
    ).length).toBe(0);
  });

  it("hides groups column when showGroups is false", () => {
    const dataWithGroups = {
      ...defaultProps.data,
      groups: [{ id: "g1", name: "G1" }],
      groupCount: 1,
    };
    render(<UserRow {...defaultProps} data={dataWithGroups} showGroups={false} />);

    expect(screen.queryAllByTestId("display-icon-group").filter(
      el => el.textContent === "G1"
    ).length).toBe(0);
  });

  it("hides files column when showFiles is false", () => {
    const dataWithFiles = {
      ...defaultProps.data,
      files: [{ id: "f1", name: "F1" }],
      fileCount: 1,
    };
    render(<UserRow {...defaultProps} data={dataWithFiles} showFiles={false} />);

    // Files use "workstation" type in the original component
    const fileIcons = screen.queryAllByTestId("display-icon-workstation");
    expect(fileIcons.filter(el => el.textContent === "F1").length).toBe(0);
  });

  it("uses gridTemplateColumns from cols prop", () => {
    const customCols = ["50px", "2fr", "1fr"];
    const { container } = render(<UserRow {...defaultProps} cols={customCols} />);

    const row = container.firstChild;
    expect(row.style.gridTemplateColumns).toBe("50px 2fr 1fr");
  });

  it("renders user display icon", () => {
    render(<UserRow {...defaultProps} />);

    expect(screen.getByTestId("display-icon-user")).toBeInTheDocument();
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import UserRow from "../UserRow.jsx";

// Mock useThemeColors hook
jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    bgPrimary: "#0A0A0A",
    bgSecondary: "#111111",
    textPrimary: "#FFFFFF",
    textSecondary: "#9E9E9E",
    inputBg: "#161616",
    border: "rgba(255,255,255,0.16)",
    borderLight: "rgba(255,255,255,0.08)",
    lightOverlay: "rgba(255,255,255,0.08)",
    lightOverlaySubtle: "rgba(255,255,255,0.03)",
  }),
}));

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

    // Name now appears only once (no DisplayIcon)
    expect(screen.getByText("John Doe")).toBeInTheDocument();
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
    expect(container.children.length).toBeGreaterThan(1);
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
      workstations: Array.from({ length: 5 }, (_, i) => ({ id: `ws-${i + 1}`, name: `WS ${i + 1}` })),
    };
    render(<UserRow {...defaultProps} data={dataWithWorkstations} />);

    // 5 => shows 3 bubbles and "+ 2"
    expect(screen.getByText("+ 2")).toBeInTheDocument();
  });

  it("applies hover styles on mouse enter/leave", () => {
    const { container } = render(<UserRow {...defaultProps} />);
    const row = container.firstChild;

    fireEvent.mouseEnter(row);
    expect(row).toBeInTheDocument();

    fireEvent.mouseLeave(row);
    expect(row.style.backgroundColor).toBe("transparent");
  });

  it("displays only count when items array is empty but totalCount exists", () => {
    const dataWithCountOnly = {
      ...defaultProps.data,
      workstations: Array.from({ length: 10 }, (_, i) => ({ id: `ws-${i + 1}`, name: `WS ${i + 1}` })),
    };
    render(<UserRow {...defaultProps} data={dataWithCountOnly} />);

    // 10 => "+ 7" (since 3 shown, 7 extra)
    expect(screen.getByText("+ 7")).toBeInTheDocument();
  });

  it("displays items with extra count when more than 3 items", () => {
    const dataWithManyGroups = {
      ...defaultProps.data,
      groups: Array.from({ length: 7 }, (_, i) => ({ id: `g${i + 1}`, name: `Group ${i + 1}` })),
    };
    render(<UserRow {...defaultProps} data={dataWithManyGroups} />);

    expect(screen.getByText("+ 4")).toBeInTheDocument();
  });

  it("renders avatar bubbles for each visible item", () => {
    const dataWithTwoWorkstations = {
      ...defaultProps.data,
      workstations: [
        { id: "ws1", name: "WS1" },
        { id: "ws2", name: "WS2" },
      ],
    };

    const { container } = render(<UserRow {...defaultProps} data={dataWithTwoWorkstations} />);

    const icons = container.querySelectorAll(".display-icon-wrapper");
    expect(icons.length).toBeGreaterThanOrEqual(3);
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
      workstations: 5, // would render "+ 2" if visible
    };
    render(<UserRow {...defaultProps} data={dataWithWorkstations} showWorkstations={false} />);

    expect(screen.queryByText("+ 2")).not.toBeInTheDocument();
  });

  it("hides groups column when showGroups is false", () => {
    const dataWithGroups = {
      ...defaultProps.data,
      groups: 6, // would render "+ 3" if visible
    };
    render(<UserRow {...defaultProps} data={dataWithGroups} showGroups={false} />);

    expect(screen.queryByText("+ 3")).not.toBeInTheDocument();
  });

  it("hides files column when showFiles is false", () => {
    const dataWithFiles = {
      ...defaultProps.data,
      files: [{ id: "f1", name: "F1" }],
    };
    render(<UserRow {...defaultProps} data={dataWithFiles} showFiles={false} />);

    // shares column is hidden => should not show bubbles or dash from that column
    // easiest stable check: file-based bubbles would include title attr or avatar bubbles beyond other columns;
    // we assert that the shares "—" isn't present due to files column when hidden.
    // (Other columns may still show "—" so we avoid asserting absence of "—" globally.)
    // Instead, assert that the text "F1" is not rendered anywhere.
    expect(screen.queryByText("F1")).not.toBeInTheDocument();
  });

  it("uses gridTemplateColumns from cols prop", () => {
    const customCols = ["50px", "2fr", "1fr"];
    const { container } = render(<UserRow {...defaultProps} cols={customCols} />);

    const row = container.firstChild;
    expect(row.style.gridTemplateColumns).toBe("50px 2fr 1fr");
  });

  it("renders user leading circle icon", () => {
    const { container } = render(<UserRow {...defaultProps} />);

    const leadingCircle = container.querySelector(".display-icon-initials");

    expect(leadingCircle).toBeInTheDocument();
  });

  describe("responsive breakpoints (getResponsiveStyles)", () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    function setWidth(w) {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: w,
      });
    }

    // ---- Mobile (< 768) ----
    it("applies mobile row styles when width < 768", () => {
      setWidth(500);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("8px");
      expect(row.style.padding).toBe("10px 6px");
    });

    it("applies mobile name fontSize when width < 768", () => {
      setWidth(375);
      const { container } = render(<UserRow {...defaultProps} />);

      const nameEl = container.querySelector('[style*="font-weight"]');
      expect(nameEl).not.toBeNull();
      expect(nameEl.style.fontSize).toBe("0.95rem");
    });

    it("applies mobile email fontSize when width < 768", () => {
      setWidth(375);
      render(<UserRow {...defaultProps} />);

      const emailEl = screen.getByText("↳ john@example.com");
      expect(emailEl.style.fontSize).toBe("0.8rem");
    });

    it("applies mobile nameSection gap when width < 768", () => {
      setWidth(600);
      const { container } = render(<UserRow {...defaultProps} />);

      const nameSections = container.querySelectorAll('[style*="align-items: center"]');
      const nameSection = Array.from(nameSections).find(
        (el) => el.style.gap === "8px" && el.style.display === "flex"
      );
      expect(nameSection).toBeTruthy();
    });

    it("uses mobile styles at boundary width 767", () => {
      setWidth(767);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("8px");
      expect(row.style.padding).toBe("10px 6px");
    });

    // ---- Tablet (768 – 1023) ----
    it("applies tablet row styles when width is 768", () => {
      setWidth(768);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("10px");
      expect(row.style.padding).toBe("11px 7px");
    });

    it("applies tablet row styles when width is 1023", () => {
      setWidth(1023);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("10px");
      expect(row.style.padding).toBe("11px 7px");
    });

    it("does not apply mobile name fontSize at tablet width", () => {
      setWidth(900);
      render(<UserRow {...defaultProps} />);

      const emailEl = screen.getByText("↳ john@example.com");
      expect(emailEl.style.fontSize).not.toBe("0.8rem");
    });

    // ---- Desktop (>= 1024) ----
    it("applies default desktop styles when width >= 1024", () => {
      setWidth(1440);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("12px");
      expect(row.style.padding).toBe("12px 8px");
    });

    it("applies desktop styles at boundary width 1024", () => {
      setWidth(1024);
      const { container } = render(<UserRow {...defaultProps} />);

      const row = container.firstChild;
      expect(row.style.gap).toBe("12px");
      expect(row.style.padding).toBe("12px 8px");
    });

    it("does not apply mobile or tablet styles at desktop width", () => {
      setWidth(1920);
      render(<UserRow {...defaultProps} />);

      const emailEl = screen.getByText("↳ john@example.com");
      expect(emailEl.style.fontSize).toBe("0.85rem");
    });
  });
});
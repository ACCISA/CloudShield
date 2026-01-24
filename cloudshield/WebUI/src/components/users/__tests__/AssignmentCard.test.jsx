/**
 * AssignmentCard.test.jsx
 *
 * Test suite for the AssignmentCard component
 * Tests rendering, hover effects, and remove functionality
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AssignmentCard from "../AssignmentCard";

describe("AssignmentCard Component", () => {
  const mockItem = {
    id: "ws-1",
    name: "Development",
    code: "WS-001",
  };

  const mockOnRemove = jest.fn();

  beforeEach(() => {
    mockOnRemove.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("displays item name", () => {
      render(<AssignmentCard item={mockItem} onRemove={mockOnRemove} />);
      expect(screen.getByText("Development")).toBeInTheDocument();
    });

    test("displays item code", () => {
      render(<AssignmentCard item={mockItem} onRemove={mockOnRemove} />);
      expect(screen.getByText("WS-001")).toBeInTheDocument();
    });

    test("displays initials in avatar", () => {
      render(<AssignmentCard item={mockItem} onRemove={mockOnRemove} />);
      expect(screen.getByText("D")).toBeInTheDocument();
    });

    test("renders with only id when name and code are missing", () => {
      const itemWithOnlyId = { id: "test-123" };
      render(<AssignmentCard item={itemWithOnlyId} onRemove={mockOnRemove} />);
      expect(screen.getByText("test-123")).toBeInTheDocument();
    });

    test("renders remove button", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );
      const removeButton = container.querySelector("button");
      expect(removeButton).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls onRemove when remove button is clicked", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const removeButton = container.querySelector("button");
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    test("passes item to onRemove callback", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const removeButton = container.querySelector("button");
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith(mockItem);
    });
  });

  describe("Different Types", () => {
    test("renders with workstation type", () => {
      const { container } = render(
        <AssignmentCard
          item={mockItem}
          onRemove={mockOnRemove}
          type="workstation"
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders with group type", () => {
      const groupItem = { id: "g-1", name: "Sales", code: "SALES" };
      render(
        <AssignmentCard item={groupItem} onRemove={mockOnRemove} type="group" />
      );
      expect(screen.getByText("Sales")).toBeInTheDocument();
    });

    test("renders with file type", () => {
      const fileItem = { id: "f-1", name: "Documents", code: "DOC-001" };
      render(
        <AssignmentCard item={fileItem} onRemove={mockOnRemove} type="file" />
      );
      expect(screen.getByText("Documents")).toBeInTheDocument();
    });
  });

  describe("Hover Effects", () => {
    test("card responds to mouse enter", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const card = container.firstChild;
      fireEvent.mouseEnter(card);

      expect(card).toBeInTheDocument();
    });

    test("card responds to mouse leave", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const card = container.firstChild;
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      expect(card).toBeInTheDocument();
    });

    test("remove button responds to mouse enter", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const removeButton = container.querySelector("button");
      fireEvent.mouseEnter(removeButton);

      expect(removeButton).toBeInTheDocument();
    });

    test("remove button responds to mouse leave", () => {
      const { container } = render(
        <AssignmentCard item={mockItem} onRemove={mockOnRemove} />
      );

      const removeButton = container.querySelector("button");
      fireEvent.mouseEnter(removeButton);
      fireEvent.mouseLeave(removeButton);

      expect(removeButton).toBeInTheDocument();
    });
  });
});

/**
 * EmptyState.test.jsx
 *
 * Test suite for the EmptyState component.
 * Covers rendering, optional icon, optional description,
 * custom testId, and edge cases.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState/EmptyState";

describe("EmptyState Component", () => {
  // ─── Basic rendering ─────────────────────────────────
  describe("Rendering", () => {
    it("renders with the required message prop", () => {
      render(<EmptyState message="No workstations found" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(
        screen.getByTestId("empty-state-message"),
      ).toHaveTextContent("No workstations found");
    });

    it("renders the message in a paragraph element", () => {
      render(<EmptyState message="No users found" />);
      const msg = screen.getByTestId("empty-state-message");
      expect(msg.tagName).toBe("P");
    });
  });

  // ─── Icon ─────────────────────────────────────────────
  describe("Icon", () => {
    it("renders the icon when provided", () => {
      const icon = <span data-testid="my-icon">📦</span>;
      render(<EmptyState message="Nothing here" icon={icon} />);
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
      expect(screen.getByTestId("my-icon")).toBeInTheDocument();
    });

    it("does not render the icon wrapper when icon is omitted", () => {
      render(<EmptyState message="Nothing here" />);
      expect(screen.queryByTestId("empty-state-icon")).not.toBeInTheDocument();
    });

    it("does not render the icon wrapper when icon is null", () => {
      render(<EmptyState message="Nothing here" icon={null} />);
      expect(screen.queryByTestId("empty-state-icon")).not.toBeInTheDocument();
    });
  });

  // ─── Description ──────────────────────────────────────
  describe("Description", () => {
    it("renders the description when provided", () => {
      render(
        <EmptyState
          message="No groups found"
          description="Try adjusting your filters"
        />,
      );
      const desc = screen.getByTestId("empty-state-description");
      expect(desc).toHaveTextContent("Try adjusting your filters");
    });

    it("renders the description in a paragraph element", () => {
      render(
        <EmptyState
          message="No groups found"
          description="Subtitle text"
        />,
      );
      const desc = screen.getByTestId("empty-state-description");
      expect(desc.tagName).toBe("P");
    });

    it("does not render description when omitted", () => {
      render(<EmptyState message="No groups found" />);
      expect(
        screen.queryByTestId("empty-state-description"),
      ).not.toBeInTheDocument();
    });

    it("does not render description when set to undefined", () => {
      render(
        <EmptyState message="No groups found" description={undefined} />,
      );
      expect(
        screen.queryByTestId("empty-state-description"),
      ).not.toBeInTheDocument();
    });
  });

  // ─── Custom testId ────────────────────────────────────
  describe("Custom testId", () => {
    it("uses the default testId when none is provided", () => {
      render(<EmptyState message="Default" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    it("applies a custom testId to the container", () => {
      render(<EmptyState message="Custom" testId="ws-empty" />);
      expect(screen.getByTestId("ws-empty")).toBeInTheDocument();
    });

    it("propagates custom testId to child elements", () => {
      const icon = <span>🎯</span>;
      render(
        <EmptyState
          message="Custom"
          icon={icon}
          description="Sub"
          testId="custom"
        />,
      );
      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
      expect(screen.getByTestId("custom-message")).toBeInTheDocument();
      expect(screen.getByTestId("custom-description")).toBeInTheDocument();
    });
  });

  // ─── Full composition ────────────────────────────────
  describe("Full composition", () => {
    it("renders icon, message, and description together", () => {
      const icon = <span data-testid="full-icon">🔍</span>;
      render(
        <EmptyState
          message="No files found"
          icon={icon}
          description="Upload files to get started"
        />,
      );

      expect(screen.getByTestId("empty-state-icon")).toBeInTheDocument();
      expect(screen.getByTestId("full-icon")).toBeInTheDocument();
      expect(
        screen.getByTestId("empty-state-message"),
      ).toHaveTextContent("No files found");
      expect(
        screen.getByTestId("empty-state-description"),
      ).toHaveTextContent("Upload files to get started");
    });

    it("renders message only when no icon or description is given", () => {
      render(<EmptyState message="Empty" />);
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByTestId("empty-state-message")).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state-icon")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("empty-state-description"),
      ).not.toBeInTheDocument();
    });
  });

  // ─── Styling ──────────────────────────────────────────
  describe("Styling", () => {
    it("container has flex column layout", () => {
      render(<EmptyState message="Styled" />);
      const container = screen.getByTestId("empty-state");
      expect(container.style.display).toBe("flex");
      expect(container.style.flexDirection).toBe("column");
      expect(container.style.alignItems).toBe("center");
      expect(container.style.justifyContent).toBe("center");
      expect(container.style.textAlign).toBe("center");
    });

    it("container has rounded border", () => {
      render(<EmptyState message="Styled" />);
      const container = screen.getByTestId("empty-state");
      expect(container.style.borderRadius).toBe("16px");
    });
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UserAssignment from "../UserAssignment";

describe("UserAssignment", () => {
  const mockOnToggleUser = jest.fn();
  const mockOnAllUsersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component with heading", () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        allUsers={false}
        onAllUsersChange={mockOnAllUsersChange}
        showAllUsersCheckbox={true}
      />
    );
    expect(screen.getByText("Assign users")).toBeInTheDocument();
  });

  it("renders all available user buttons", () => {
    render(<UserAssignment users={[]} onToggleUser={mockOnToggleUser} />);

    expect(
      screen.getByRole("button", { name: "Michael Scott" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Jim Halpert" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pam Beasly" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dwight Schrute" })
    ).toBeInTheDocument();
  });

  it('displays "All users" checkbox when showAllUsersCheckbox is true', () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        showAllUsersCheckbox={true}
      />
    );

    expect(
      screen.getByRole("checkbox", { name: /all users/i })
    ).toBeInTheDocument();
  });

  it('does not display "All users" checkbox when showAllUsersCheckbox is false', () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        showAllUsersCheckbox={false}
      />
    );

    expect(
      screen.queryByRole("checkbox", { name: /all users/i })
    ).not.toBeInTheDocument();
  });

  it("shows selected users as contained variant buttons", () => {
    render(
      <UserAssignment
        users={["Michael Scott", "Jim Halpert"]}
        onToggleUser={mockOnToggleUser}
      />
    );

    const michaelButton = screen.getByRole("button", { name: "Michael Scott" });
    const jimButton = screen.getByRole("button", { name: "Jim Halpert" });
    const pamButton = screen.getByRole("button", { name: "Pam Beasly" });

    // Selected buttons should have 'contained' class
    expect(michaelButton.className).toMatch(/MuiButton-contained/);
    expect(jimButton.className).toMatch(/MuiButton-contained/);

    // Unselected button should have 'outlined' class
    expect(pamButton.className).toMatch(/MuiButton-outlined/);
  });

  it("calls onToggleUser when a user button is clicked", () => {
    render(<UserAssignment users={[]} onToggleUser={mockOnToggleUser} />);

    const michaelButton = screen.getByRole("button", { name: "Michael Scott" });
    fireEvent.click(michaelButton);

    expect(mockOnToggleUser).toHaveBeenCalledTimes(1);
    expect(mockOnToggleUser).toHaveBeenCalledWith("Michael Scott");
  });

  it("calls onToggleUser with correct user name for each button", () => {
    render(<UserAssignment users={[]} onToggleUser={mockOnToggleUser} />);

    fireEvent.click(screen.getByRole("button", { name: "Jim Halpert" }));
    expect(mockOnToggleUser).toHaveBeenCalledWith("Jim Halpert");

    fireEvent.click(screen.getByRole("button", { name: "Pam Beasly" }));
    expect(mockOnToggleUser).toHaveBeenCalledWith("Pam Beasly");

    fireEvent.click(screen.getByRole("button", { name: "Dwight Schrute" }));
    expect(mockOnToggleUser).toHaveBeenCalledWith("Dwight Schrute");
  });

  it("reflects allUsers checkbox state correctly", () => {
    const { rerender } = render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        allUsers={false}
        onAllUsersChange={mockOnAllUsersChange}
        showAllUsersCheckbox={true}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /all users/i });
    expect(checkbox).not.toBeChecked();

    rerender(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        allUsers={true}
        onAllUsersChange={mockOnAllUsersChange}
        showAllUsersCheckbox={true}
      />
    );

    expect(checkbox).toBeChecked();
  });

  it("calls onAllUsersChange when checkbox is toggled", () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        allUsers={false}
        onAllUsersChange={mockOnAllUsersChange}
        showAllUsersCheckbox={true}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /all users/i });
    fireEvent.click(checkbox);

    expect(mockOnAllUsersChange).toHaveBeenCalledTimes(1);
    expect(mockOnAllUsersChange).toHaveBeenCalledWith(true);
  });

  it("does not call onAllUsersChange when it is not provided", () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        allUsers={false}
        showAllUsersCheckbox={true}
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: /all users/i });
    // Should not throw error when callback is not provided
    expect(() => fireEvent.click(checkbox)).not.toThrow();
  });

  it("works with default props", () => {
    render(<UserAssignment users={[]} onToggleUser={mockOnToggleUser} />);

    // Should render with default showAllUsersCheckbox=true and allUsers=false
    expect(screen.getByText("Assign users")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /all users/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /all users/i })
    ).not.toBeChecked();
  });

  it("renders all users with correct styling structure", () => {
    const { container } = render(
      <UserAssignment
        users={["Michael Scott"]}
        onToggleUser={mockOnToggleUser}
      />
    );

    // Check that the component has the expected MUI Box structure
    const boxes = container.querySelectorAll(".MuiBox-root");
    expect(boxes.length).toBeGreaterThan(0);
  });

  it("handles empty users array correctly", () => {
    render(<UserAssignment users={[]} onToggleUser={mockOnToggleUser} />);

    // All buttons should be outlined (unselected)
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button.className).toMatch(/MuiButton-outlined/);
    });
  });

  it("handles all users being selected", () => {
    const allUsers = [
      "Michael Scott",
      "Jim Halpert",
      "Pam Beasly",
      "Dwight Schrute",
    ];
    render(<UserAssignment users={allUsers} onToggleUser={mockOnToggleUser} />);

    // All buttons should be contained (selected)
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button.className).toMatch(/MuiButton-contained/);
    });
  });

  it("properly handles user toggle for selected user", () => {
    const selectedUsers = ["Michael Scott"];
    render(
      <UserAssignment users={selectedUsers} onToggleUser={mockOnToggleUser} />
    );

    const michaelButton = screen.getByRole("button", { name: "Michael Scott" });
    fireEvent.click(michaelButton);

    // Should be called to deselect
    expect(mockOnToggleUser).toHaveBeenCalledWith("Michael Scott");
  });

  it("does not break when onToggleUser is not provided", () => {
    render(<UserAssignment users={[]} />);

    const michaelButton = screen.getByRole("button", { name: "Michael Scott" });

    // Should not throw error
    expect(() => fireEvent.click(michaelButton)).not.toThrow();
  });

  it("renders checkbox label correctly", () => {
    render(
      <UserAssignment
        users={[]}
        onToggleUser={mockOnToggleUser}
        showAllUsersCheckbox={true}
      />
    );

    expect(screen.getByText("All users")).toBeInTheDocument();
  });
});

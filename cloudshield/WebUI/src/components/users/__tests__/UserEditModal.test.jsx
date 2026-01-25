import { render, screen, fireEvent } from "@testing-library/react";
import UserEditModal from "../UserEditModal";

describe("UserEditModal Component", () => {
  let mockOnClose;
  let mockOnSubmit;
  let mockOnDelete;

  const mockUser = {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    title: "Software Engineer",
    status: "active",
  };

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
    mockOnDelete = jest.fn();
  });

  test("does not render when open is false", () => {
    render(
      <UserEditModal
        open={false}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.queryByText("User › Edit User")).not.toBeInTheDocument();
  });

  test("renders when open is true", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText("User › Edit User")).toBeInTheDocument();
  });

  test("closes when X button is clicked", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test("renders all step names in breadcrumb", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("Workstations")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

  test("loads and displays user data", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument();
  });

  test("allows editing first name", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const firstNameInput = screen.getByDisplayValue("John");
    fireEvent.change(firstNameInput, { target: { value: "Jane" } });

    expect(firstNameInput.value).toBe("Jane");
  });

  test("allows editing last name", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const lastNameInput = screen.getByDisplayValue("Doe");
    fireEvent.change(lastNameInput, { target: { value: "Smith" } });

    expect(lastNameInput.value).toBe("Smith");
  });

  test("allows editing email", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const emailInput = screen.getByDisplayValue("john@example.com");
    fireEvent.change(emailInput, { target: { value: "jane@example.com" } });

    expect(emailInput.value).toBe("jane@example.com");
  });

  test("allows editing title", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const titleInput = screen.getByDisplayValue("Software Engineer");
    fireEvent.change(titleInput, { target: { value: "Senior Engineer" } });

    expect(titleInput.value).toBe("Senior Engineer");
  });

  test("shows Delete button on Basic Info step", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  test("calls onDelete when Delete button is clicked", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByText("Delete");
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  test("Next button is enabled on Basic Info step when data is valid", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const nextButton = screen.getByText(/Next/);
    expect(nextButton).not.toBeDisabled();
  });

  test("navigates to Workstations step when Next is clicked", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText(/Next/));

    expect(screen.getByText("Assign Workstations")).toBeInTheDocument();
  });

  test("can navigate back from Workstations to Basic Info", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Back/));

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  });

  test("navigates through all steps", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    // Navigate to Groups step
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    expect(screen.getByText("Assign Groups")).toBeInTheDocument();

    // Navigate to Files step
    fireEvent.click(screen.getByText(/Next/));
    expect(screen.getByText("Assign Files")).toBeInTheDocument();
  });

  test("displays Update button on final step", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    // Navigate to final step
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));

    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  test("calls onSubmit when Update button is clicked", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    // Navigate to final step and click Update
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Update"));

    expect(mockOnSubmit).toHaveBeenCalled();
  });

  test("calls onClose when Update is clicked", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    // Navigate to final step and click Update
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText("Update"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  test("hides Delete button on steps other than Basic Info", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText(/Next/));
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  test("can navigate using breadcrumb", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    // Click on Groups in breadcrumb
    const groupsBreadcrumb = screen.getByText("Groups");
    fireEvent.click(groupsBreadcrumb);
    expect(screen.getByText("Assign Groups")).toBeInTheDocument();
  });

  test("reloads data when user prop changes", () => {
    const { rerender } = render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByDisplayValue("John")).toBeInTheDocument();

    const newUser = {
      ...mockUser,
      name: "Jane Smith",
    };

    rerender(
      <UserEditModal
        open={true}
        data={newUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
  });

  test("Next button is disabled when first name is empty", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    const firstNameInput = screen.getByDisplayValue("John");
    fireEvent.change(firstNameInput, { target: { value: "" } });

    const nextButton = screen.getByText(/Next/);
    expect(nextButton).toBeDisabled();
  });

  test("closes modal and calls onClose on Delete", () => {
    render(
      <UserEditModal
        open={true}
        data={mockUser}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

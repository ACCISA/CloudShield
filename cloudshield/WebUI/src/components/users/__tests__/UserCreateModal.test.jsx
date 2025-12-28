import { render, screen, fireEvent } from "@testing-library/react";
import UserCreateModal from "../UserCreateModal";

describe("UserCreateModal Component", () => {
  let mockOnClose;
  let mockOnSubmit;

  beforeEach(() => {
    mockOnClose = jest.fn();
    mockOnSubmit = jest.fn();
  });

  test("does not render when open is false", () => {
    render(
      <UserCreateModal
        open={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByText("User › New User")).not.toBeInTheDocument();
  });

  test("renders when open is true", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText("User › New User")).toBeInTheDocument();
  });

  test("closes when X button is clicked", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  test("renders all step names in breadcrumb", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("Workstations")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

  test("renders Basic Info step by default", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Doe")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/johndoe@example\.com/)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Software Engineer")
    ).toBeInTheDocument();
  });

  test("allows entering first name", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const firstNameInput = screen.getByPlaceholderText("John");
    fireEvent.change(firstNameInput, { target: { value: "John" } });

    expect(firstNameInput.value).toBe("John");
  });

  test("allows entering last name", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const lastNameInput = screen.getByPlaceholderText("Doe");
    fireEvent.change(lastNameInput, { target: { value: "Doe" } });

    expect(lastNameInput.value).toBe("Doe");
  });

  test("allows entering email", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const emailInput = screen.getByPlaceholderText(/johndoe@example\.com/);
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    expect(emailInput.value).toBe("john@example.com");
  });

  test("allows entering title", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const titleInput = screen.getByPlaceholderText("Software Engineer");
    fireEvent.change(titleInput, { target: { value: "Engineer" } });

    expect(titleInput.value).toBe("Engineer");
  });

  test("Next button is disabled when basic info is incomplete", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const nextButton = screen.getByText(/Next/);
    expect(nextButton).toBeDisabled();
  });

  test("Next button is enabled when all basic info fields are filled", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/johndoe@example\.com/), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Software Engineer"), {
      target: { value: "Engineer" },
    });

    const nextButton = screen.getByText(/Next/);
    expect(nextButton).not.toBeDisabled();
  });

  test("navigates to Workstations step when Next is clicked", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/johndoe@example\.com/), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Software Engineer"), {
      target: { value: "Engineer" },
    });
    fireEvent.click(screen.getByText(/Next/));

    expect(screen.getByText("Assign Workstations")).toBeInTheDocument();
  });

  test("can navigate back from Workstations to Basic Info", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/johndoe@example\.com/), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Software Engineer"), {
      target: { value: "Engineer" },
    });
    fireEvent.click(screen.getByText(/Next/));
    fireEvent.click(screen.getByText(/Back/));

    expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
  });

  test("Next button is disabled on Workstations step when nothing is selected", () => {
    render(
      <UserCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("John"), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByPlaceholderText("Doe"), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText(/johndoe@example\.com/), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Software Engineer"), {
      target: { value: "Engineer" },
    });
    fireEvent.click(screen.getByText(/Next/));

    const nextButton = screen.getByText(/Next/);
    expect(nextButton).toBeDisabled();
  });
});

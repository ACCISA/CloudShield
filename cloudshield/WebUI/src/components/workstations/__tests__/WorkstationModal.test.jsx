import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WorkstationModal from "../WorkstationModal";

jest.mock("../../common/DisplayIcon/DisplayIcon.jsx", () => () => (
  <div data-testid="display-icon" />
));

jest.mock("../../../assets/ImageUploadIcon.jsx", () => () => (
  <div data-testid="upload-icon" />
));

jest.mock("../../common/Checkbox/Checkbox.jsx", () => (props) => (
  <input 
    type="checkbox" 
    checked={props.checked} 
    onChange={(e) => {
      if (props.onChange) {
        props.onChange(e.target.checked);
      }
    }}
  />
));

jest.mock("../../../assets/workstation", () => ({
  CpuIcon: () => <div data-testid="cpu-icon" />,
  RamIcon: () => <div data-testid="ram-icon" />,
  StorageIcon: () => <div data-testid="storage-icon" />,
  BasicTierIcon: () => <div data-testid="basic-tier-icon" />,
  ProTierIcon: () => <div data-testid="pro-tier-icon" />,
  UltimateTierIcon: () => <div data-testid="ultimate-tier-icon" />,
}));

describe("WorkstationModal", () => {
  it("does not render when closed", () => {
    render(
      <WorkstationModal
        open={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.queryByText("New Workstation")).not.toBeInTheDocument();
  });

  it("renders in create mode and blocks Next when name is empty", () => {
    render(
      <WorkstationModal
        open={true}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    expect(screen.getByText("New Workstation")).toBeInTheDocument();
    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeDisabled();
  });

  it("enables Next after name is set and navigates to users step", () => {
    render(
      <WorkstationModal
        open={true}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText("Enter workstation name");
    fireEvent.change(nameInput, { target: { value: "Dev WS" } });

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);

    expect(
      screen.getByPlaceholderText("Search users...")
    ).toBeInTheDocument();
  });

  it("submits data on final step and closes", () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();

    render(
      <WorkstationModal open={true} onClose={onClose} onSubmit={onSubmit} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
      target: { value: "Dev WS" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(
      screen.getByRole("button", { name: "Create Workstation" })
    );

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dev WS",
        strength: "basic",
        users: [],
        groups: [],
        software: [],
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders edit mode actions and handles delete", () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();

    render(
      <WorkstationModal
        open={true}
        onClose={onClose}
        onSubmit={jest.fn()}
        onDelete={onDelete}
        workstationData={{ name: "Existing WS", strength: "pro" }}
      />
    );

    expect(screen.getByText("Edit Workstation")).toBeInTheDocument();
    const nextButton = screen.getByText("Next");
    expect(nextButton).not.toBeDisabled();
    fireEvent.click(nextButton);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles image upload with valid file", async () => {
  const { container } = render(
    <WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />
  );

  const file = new File(["image"], "test.png", { type: "image/png" });
  const input = container.querySelector('input[type="file"]');
  
  const mockReader = {
    readAsDataURL: jest.fn(),
    onloadend: null,
    result: "data:image/png;base64,abc123"
  };
  
  global.FileReader = jest.fn(() => mockReader);
  
  Object.defineProperty(input, "files", {
    value: [file],
    writable: false
  });
  
  fireEvent.change(input);
  
  // Trigger onloadend
  mockReader.onloadend();
  
  expect(mockReader.readAsDataURL).toHaveBeenCalledWith(file);
});

// Test for search term updates
it("updates users search term", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const searchInput = screen.getByPlaceholderText("Search users...");
  fireEvent.change(searchInput, { target: { value: "John" } });
  
  expect(searchInput.value).toBe("John");
});

// Test for groups search term
it("updates groups search term", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const searchInput = screen.getByPlaceholderText("Search groups...");
  fireEvent.change(searchInput, { target: { value: "Eng" } });
  
  expect(searchInput.value).toBe("Eng");
});

// Test for software search term
it("updates software search term", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const searchInput = screen.getByPlaceholderText("Search software...");
  fireEvent.change(searchInput, { target: { value: "VS" } });
  
  expect(searchInput.value).toBe("VS");
});

// Test for onToggleGroup callback
it("calls toggleSelection for groups", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  // Click first "Sales" group
  const salesGroups = screen.getAllByText("Sales");
  fireEvent.click(salesGroups[0]);
  
  expect(screen.getByText(/Selected Groups \(1\)/)).toBeInTheDocument();
});

it("calls removeSelection for groups", () => {
  const { container } = render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const salesGroups = screen.getAllByText("Sales");
  fireEvent.click(salesGroups[0]);
  
  // Find the remove button by class name
  const removeButton = container.querySelector('.workstation-modal-card-remove-btn');
  fireEvent.click(removeButton);
  
  expect(screen.queryByText(/Selected Groups/)).not.toBeInTheDocument();
});

it("handles allGroups checkbox checked", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const checkbox = screen.getByRole("checkbox");
  
  // Simulate checking the checkbox - trigger both click and change
  fireEvent.click(checkbox);
  
  // Wait a moment and check - might need to use getAllByText if duplicates exist
  const selectedText = screen.queryByText(/Selected Groups \(10\)/);
  expect(selectedText).toBeInTheDocument();
});

it("handles allGroups checkbox unchecked", () => {
  render(<WorkstationModal open={true} onClose={jest.fn()} onSubmit={jest.fn()} />);
  
  fireEvent.change(screen.getByPlaceholderText("Enter workstation name"), {
    target: { value: "Test" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  
  const checkbox = screen.getByRole("checkbox");
  fireEvent.click(checkbox);
  fireEvent.click(checkbox);
  
  expect(screen.queryByText(/Selected Groups/)).not.toBeInTheDocument();
});
});


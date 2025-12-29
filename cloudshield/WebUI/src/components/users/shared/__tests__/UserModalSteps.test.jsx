/**
 * UserModalSteps.test.jsx
 *
 * Comprehensive test suite for UserModalSteps components
 * Tests BasicInfoStep, WorkstationsStep, GroupsStep, and FilesStep
 */
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  BasicInfoStep,
  WorkstationsStep,
  GroupsStep,
  FilesStep,
} from "../UserModalSteps";

// Mock child components
jest.mock("../../ProfilePictureUpload", () => {
  return function MockProfilePictureUpload({ firstName, lastName, onImageChange }) {
    return (
      <div data-testid="profile-picture-upload">
        <span>Profile for {firstName} {lastName}</span>
        <button onClick={() => onImageChange("mock-image.jpg")}>
          Upload Image
        </button>
      </div>
    );
  };
});

jest.mock("../../SearchAutocomplete", () => {
  return function MockSearchAutocomplete({
    label,
    placeholder,
    items,
    suggestedItems,
    selectedItems,
    onSelect,
    showAllCheckbox,
    allSelected,
    onAllChange,
  }) {
    return (
      <div data-testid="search-autocomplete">
        <label>{label}</label>
        <input placeholder={placeholder} data-testid="search-input" />
        {showAllCheckbox && (
          <label>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => onAllChange(e.target.checked)}
              data-testid="all-checkbox"
            />
            Select All
          </label>
        )}
        <div data-testid="suggested-items">
          {suggestedItems?.map((item) => (
            <button key={item.id} onClick={() => onSelect(item)}>
              Add {item.name}
            </button>
          ))}
        </div>
      </div>
    );
  };
});

jest.mock("../../AssignmentCard", () => {
  return function MockAssignmentCard({ item, type, onRemove }) {
    return (
      <div data-testid={`assignment-card-${item.id}`}>
        <span>{item.name}</span>
        <button onClick={() => onRemove(item)}>Remove</button>
      </div>
    );
  };
});

const mockStyles = {
  stepContent: { padding: "20px" },
  formGrid: { display: "grid" },
  formGroup: { marginBottom: "16px" },
  label: { fontWeight: "bold" },
  input: { width: "100%" },
  assignedSection: { marginTop: "20px" },
  assignedLabel: { fontWeight: "600" },
  cardsGrid: { display: "grid" },
};

describe("BasicInfoStep Component", () => {
  const defaultProps = {
    firstName: "",
    setFirstName: jest.fn(),
    lastName: "",
    setLastName: jest.fn(),
    email: "",
    setEmail: jest.fn(),
    title: "",
    setTitle: jest.fn(),
    profileImage: null,
    setProfileImage: jest.fn(),
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<BasicInfoStep {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders ProfilePictureUpload component", () => {
      render(<BasicInfoStep {...defaultProps} />);
      expect(screen.getByTestId("profile-picture-upload")).toBeInTheDocument();
    });

    test("renders all form fields", () => {
      render(<BasicInfoStep {...defaultProps} />);
      expect(screen.getByText("First Name")).toBeInTheDocument();
      expect(screen.getByText("Last Name")).toBeInTheDocument();
      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByText("Job Title")).toBeInTheDocument();
    });

    test("renders input placeholders", () => {
      render(<BasicInfoStep {...defaultProps} />);
      expect(screen.getByPlaceholderText("John")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Doe")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("johndoe@example.com")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Software Engineer")).toBeInTheDocument();
    });

    test("displays current values in inputs", () => {
      const props = {
        ...defaultProps,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        title: "Manager",
      };
      render(<BasicInfoStep {...props} />);
      
      expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Smith")).toBeInTheDocument();
      expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Manager")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls setFirstName when first name input changes", () => {
      render(<BasicInfoStep {...defaultProps} />);
      const input = screen.getByPlaceholderText("John");
      
      fireEvent.change(input, { target: { value: "John" } });
      
      expect(defaultProps.setFirstName).toHaveBeenCalledWith("John");
    });

    test("calls setLastName when last name input changes", () => {
      render(<BasicInfoStep {...defaultProps} />);
      const input = screen.getByPlaceholderText("Doe");
      
      fireEvent.change(input, { target: { value: "Doe" } });
      
      expect(defaultProps.setLastName).toHaveBeenCalledWith("Doe");
    });

    test("calls setEmail when email input changes", () => {
      render(<BasicInfoStep {...defaultProps} />);
      const input = screen.getByPlaceholderText("johndoe@example.com");
      
      fireEvent.change(input, { target: { value: "test@email.com" } });
      
      expect(defaultProps.setEmail).toHaveBeenCalledWith("test@email.com");
    });

    test("calls setTitle when title input changes", () => {
      render(<BasicInfoStep {...defaultProps} />);
      const input = screen.getByPlaceholderText("Software Engineer");
      
      fireEvent.change(input, { target: { value: "Developer" } });
      
      expect(defaultProps.setTitle).toHaveBeenCalledWith("Developer");
    });

    test("calls setProfileImage when image is uploaded", () => {
      render(<BasicInfoStep {...defaultProps} />);
      const uploadButton = screen.getByText("Upload Image");
      
      fireEvent.click(uploadButton);
      
      expect(defaultProps.setProfileImage).toHaveBeenCalledWith("mock-image.jpg");
    });
  });

  describe("Props Integration", () => {
    test("passes firstName and lastName to ProfilePictureUpload", () => {
      const props = {
        ...defaultProps,
        firstName: "John",
        lastName: "Doe",
      };
      render(<BasicInfoStep {...props} />);
      
      expect(screen.getByText("Profile for John Doe")).toBeInTheDocument();
    });
  });
});

describe("WorkstationsStep Component", () => {
  const mockWorkstations = [
    { id: "ws-1", name: "Development", code: "WS-001" },
    { id: "ws-2", name: "Testing", code: "WS-002" },
  ];

  const defaultProps = {
    selectedWorkstations: [],
    setSelectedWorkstations: jest.fn(),
    allWorkstations: false,
    setAllWorkstations: jest.fn(),
    suggestedWorkstations: mockWorkstations,
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<WorkstationsStep {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders SearchAutocomplete component", () => {
      render(<WorkstationsStep {...defaultProps} />);
      expect(screen.getByTestId("search-autocomplete")).toBeInTheDocument();
    });

    test("displays correct label", () => {
      render(<WorkstationsStep {...defaultProps} />);
      expect(screen.getByText("Assign Workstations")).toBeInTheDocument();
    });

    test("does not show assigned section when no workstations selected", () => {
      render(<WorkstationsStep {...defaultProps} />);
      expect(screen.queryByText("Assigned Workstations")).not.toBeInTheDocument();
    });

    test("shows assigned section when workstations are selected", () => {
      const props = {
        ...defaultProps,
        selectedWorkstations: mockWorkstations,
      };
      render(<WorkstationsStep {...props} />);
      
      expect(screen.getByText("Assigned Workstations")).toBeInTheDocument();
    });

    test("shows 'All Workstations' label when all are selected", () => {
      const props = {
        ...defaultProps,
        allWorkstations: true,
      };
      render(<WorkstationsStep {...props} />);
      
      expect(screen.getByText("All Workstations")).toBeInTheDocument();
    });

    test("renders assignment cards for selected workstations", () => {
      const props = {
        ...defaultProps,
        selectedWorkstations: mockWorkstations,
      };
      render(<WorkstationsStep {...props} />);
      
      expect(screen.getByTestId("assignment-card-ws-1")).toBeInTheDocument();
      expect(screen.getByTestId("assignment-card-ws-2")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls setSelectedWorkstations when adding a workstation", () => {
      render(<WorkstationsStep {...defaultProps} />);
      
      const addButton = screen.getByText("Add Development");
      fireEvent.click(addButton);
      
      expect(defaultProps.setSelectedWorkstations).toHaveBeenCalledWith([
        mockWorkstations[0],
      ]);
    });

    test("toggles all workstations when checkbox is checked", () => {
      render(<WorkstationsStep {...defaultProps} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllWorkstations).toHaveBeenCalledWith(true);
      expect(defaultProps.setSelectedWorkstations).toHaveBeenCalledWith([]);
    });

    test("unchecks all workstations when checkbox is unchecked", () => {
      const props = {
        ...defaultProps,
        allWorkstations: true,
      };
      render(<WorkstationsStep {...props} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllWorkstations).toHaveBeenCalledWith(false);
      // When unchecking, it should not clear selected workstations
      expect(defaultProps.setSelectedWorkstations).not.toHaveBeenCalled();
    });

    test("removes individual workstation when not in all mode", () => {
      const props = {
        ...defaultProps,
        selectedWorkstations: mockWorkstations,
      };
      render(<WorkstationsStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setSelectedWorkstations).toHaveBeenCalledWith([
        mockWorkstations[1],
      ]);
    });

    test("removes workstation in all mode by unchecking all and filtering", () => {
      const props = {
        ...defaultProps,
        allWorkstations: true,
      };
      render(<WorkstationsStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setAllWorkstations).toHaveBeenCalledWith(false);
    });
  });
});

describe("GroupsStep Component", () => {
  const mockGroups = [
    { id: "g-1", name: "Sales", code: "SALES" },
    { id: "g-2", name: "Marketing", code: "MKT" },
  ];

  const defaultProps = {
    selectedGroups: [],
    setSelectedGroups: jest.fn(),
    allGroups: false,
    setAllGroups: jest.fn(),
    suggestedGroups: mockGroups,
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<GroupsStep {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders SearchAutocomplete component", () => {
      render(<GroupsStep {...defaultProps} />);
      expect(screen.getByTestId("search-autocomplete")).toBeInTheDocument();
    });

    test("displays correct label", () => {
      render(<GroupsStep {...defaultProps} />);
      expect(screen.getByText("Assign Groups")).toBeInTheDocument();
    });

    test("does not show assigned section when no groups selected", () => {
      render(<GroupsStep {...defaultProps} />);
      expect(screen.queryByText("Assigned Groups")).not.toBeInTheDocument();
    });

    test("shows assigned section when groups are selected", () => {
      const props = {
        ...defaultProps,
        selectedGroups: mockGroups,
      };
      render(<GroupsStep {...props} />);
      
      expect(screen.getByText("Assigned Groups")).toBeInTheDocument();
    });

    test("shows 'All Groups' label when all are selected", () => {
      const props = {
        ...defaultProps,
        allGroups: true,
      };
      render(<GroupsStep {...props} />);
      
      expect(screen.getByText("All Groups")).toBeInTheDocument();
    });

    test("renders assignment cards for selected groups", () => {
      const props = {
        ...defaultProps,
        selectedGroups: mockGroups,
      };
      render(<GroupsStep {...props} />);
      
      expect(screen.getByTestId("assignment-card-g-1")).toBeInTheDocument();
      expect(screen.getByTestId("assignment-card-g-2")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls setSelectedGroups when adding a group", () => {
      render(<GroupsStep {...defaultProps} />);
      
      const addButton = screen.getByText("Add Sales");
      fireEvent.click(addButton);
      
      expect(defaultProps.setSelectedGroups).toHaveBeenCalledWith([
        mockGroups[0],
      ]);
    });

    test("toggles all groups when checkbox is checked", () => {
      render(<GroupsStep {...defaultProps} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllGroups).toHaveBeenCalledWith(true);
      expect(defaultProps.setSelectedGroups).toHaveBeenCalledWith([]);
    });

    test("unchecks all groups when checkbox is unchecked", () => {
      const props = {
        ...defaultProps,
        allGroups: true,
      };
      render(<GroupsStep {...props} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllGroups).toHaveBeenCalledWith(false);
      expect(defaultProps.setSelectedGroups).not.toHaveBeenCalled();
    });

    test("removes individual group when not in all mode", () => {
      const props = {
        ...defaultProps,
        selectedGroups: mockGroups,
      };
      render(<GroupsStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setSelectedGroups).toHaveBeenCalledWith([
        mockGroups[1],
      ]);
    });

    test("removes group in all mode by unchecking all and filtering", () => {
      const props = {
        ...defaultProps,
        allGroups: true,
      };
      render(<GroupsStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setAllGroups).toHaveBeenCalledWith(false);
    });
  });
});

describe("FilesStep Component", () => {
  const mockFiles = [
    { id: "f-1", name: "Document.pdf", code: "DOC-001" },
    { id: "f-2", name: "Spreadsheet.xlsx", code: "XLS-001" },
  ];

  const defaultProps = {
    selectedFiles: [],
    setSelectedFiles: jest.fn(),
    allFiles: false,
    setAllFiles: jest.fn(),
    suggestedFiles: mockFiles,
    styles: mockStyles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(<FilesStep {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders SearchAutocomplete component", () => {
      render(<FilesStep {...defaultProps} />);
      expect(screen.getByTestId("search-autocomplete")).toBeInTheDocument();
    });

    test("displays correct label", () => {
      render(<FilesStep {...defaultProps} />);
      expect(screen.getByText("Assign Files")).toBeInTheDocument();
    });

    test("does not show assigned section when no files selected", () => {
      render(<FilesStep {...defaultProps} />);
      expect(screen.queryByText("Assigned Files")).not.toBeInTheDocument();
    });

    test("shows assigned section when files are selected", () => {
      const props = {
        ...defaultProps,
        selectedFiles: mockFiles,
      };
      render(<FilesStep {...props} />);
      
      expect(screen.getByText("Assigned Files")).toBeInTheDocument();
    });

    test("shows 'All Files' label when all are selected", () => {
      const props = {
        ...defaultProps,
        allFiles: true,
      };
      render(<FilesStep {...props} />);
      
      expect(screen.getByText("All Files")).toBeInTheDocument();
    });

    test("renders assignment cards for selected files", () => {
      const props = {
        ...defaultProps,
        selectedFiles: mockFiles,
      };
      render(<FilesStep {...props} />);
      
      expect(screen.getByTestId("assignment-card-f-1")).toBeInTheDocument();
      expect(screen.getByTestId("assignment-card-f-2")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("calls setSelectedFiles when adding a file", () => {
      render(<FilesStep {...defaultProps} />);
      
      const addButton = screen.getByText("Add Document.pdf");
      fireEvent.click(addButton);
      
      expect(defaultProps.setSelectedFiles).toHaveBeenCalledWith([
        mockFiles[0],
      ]);
    });

    test("toggles all files when checkbox is checked", () => {
      render(<FilesStep {...defaultProps} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllFiles).toHaveBeenCalledWith(true);
      expect(defaultProps.setSelectedFiles).toHaveBeenCalledWith([]);
    });

    test("unchecks all files when checkbox is unchecked", () => {
      const props = {
        ...defaultProps,
        allFiles: true,
      };
      render(<FilesStep {...props} />);
      
      const checkbox = screen.getByTestId("all-checkbox");
      fireEvent.click(checkbox);
      
      expect(defaultProps.setAllFiles).toHaveBeenCalledWith(false);
      expect(defaultProps.setSelectedFiles).not.toHaveBeenCalled();
    });

    test("removes individual file when not in all mode", () => {
      const props = {
        ...defaultProps,
        selectedFiles: mockFiles,
      };
      render(<FilesStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setSelectedFiles).toHaveBeenCalledWith([
        mockFiles[1],
      ]);
    });

    test("removes file in all mode by unchecking all and filtering", () => {
      const props = {
        ...defaultProps,
        allFiles: true,
      };
      render(<FilesStep {...props} />);
      
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);
      
      expect(defaultProps.setAllFiles).toHaveBeenCalledWith(false);
    });
  });
});

describe("Edge Cases and Integration", () => {
  describe("Empty States", () => {
    test("BasicInfoStep handles empty strings gracefully", () => {
      const props = {
        firstName: "",
        setFirstName: jest.fn(),
        lastName: "",
        setLastName: jest.fn(),
        email: "",
        setEmail: jest.fn(),
        title: "",
        setTitle: jest.fn(),
        profileImage: null,
        setProfileImage: jest.fn(),
        styles: mockStyles,
      };
      
      const { container } = render(<BasicInfoStep {...props} />);
      expect(container).toBeInTheDocument();
    });

    test("WorkstationsStep with empty arrays", () => {
      const props = {
        selectedWorkstations: [],
        setSelectedWorkstations: jest.fn(),
        allWorkstations: false,
        setAllWorkstations: jest.fn(),
        suggestedWorkstations: [],
        styles: mockStyles,
      };
      
      render(<WorkstationsStep {...props} />);
      expect(screen.queryByText("Assigned Workstations")).not.toBeInTheDocument();
    });
  });

  describe("Conditional Rendering", () => {
    test("WorkstationsStep shows cards only when allWorkstations is true", () => {
      const props = {
        selectedWorkstations: [],
        setSelectedWorkstations: jest.fn(),
        allWorkstations: true,
        setAllWorkstations: jest.fn(),
        suggestedWorkstations: [],
        styles: mockStyles,
      };
      
      render(<WorkstationsStep {...props} />);
      expect(screen.getByText("All Workstations")).toBeInTheDocument();
    });
  });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StyledInput from "../StyledInput";

describe("StyledInput", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with label", () => {
    render(<StyledInput label="Username" value="" onChange={mockOnChange} />);

    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders input field with value", () => {
    render(
      <StyledInput label="Username" value="testuser" onChange={mockOnChange} />
    );

    const input = screen.getByDisplayValue("testuser");
    expect(input).toBeInTheDocument();
  });

  it("renders with placeholder", () => {
    render(
      <StyledInput
        label="Email"
        value=""
        onChange={mockOnChange}
        placeholder="Enter your email"
      />
    );

    const input = screen.getByPlaceholderText("Enter your email");
    expect(input).toBeInTheDocument();
  });

  it("calls onChange when input value changes", () => {
    render(<StyledInput label="Username" value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "newvalue" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("updates value when typing", () => {
    const { rerender } = render(
      <StyledInput label="Username" value="" onChange={mockOnChange} />
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");

    rerender(
      <StyledInput label="Username" value="test" onChange={mockOnChange} />
    );

    expect(input).toHaveValue("test");
  });

  it("renders label above input field", () => {
    const { container } = render(
      <StyledInput label="Username" value="test" onChange={mockOnChange} />
    );

    const label = screen.getByText("Username");
    const input = screen.getByDisplayValue("test");

    // Label should be rendered before input in DOM order
    expect(label.compareDocumentPosition(input)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("passes additional props to OutlinedInput", () => {
    render(
      <StyledInput
        label="Username"
        value=""
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("supports type attribute", () => {
    render(
      <StyledInput
        label="Email"
        value=""
        onChange={mockOnChange}
        type="email"
      />
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  it("renders with MUI OutlinedInput styling", () => {
    const { container } = render(
      <StyledInput label="Username" value="" onChange={mockOnChange} />
    );

    const outlinedInput = container.querySelector(".MuiOutlinedInput-root");
    expect(outlinedInput).toBeInTheDocument();
  });

  it("renders with MUI Typography for label", () => {
    const { container } = render(
      <StyledInput label="Username" value="" onChange={mockOnChange} />
    );

    const typography = container.querySelector(".MuiTypography-root");
    expect(typography).toBeInTheDocument();
    expect(typography).toHaveTextContent("Username");
  });

  it("handles empty label", () => {
    render(<StyledInput label="" value="test" onChange={mockOnChange} />);

    const input = screen.getByDisplayValue("test");
    expect(input).toBeInTheDocument();
  });

  it("handles multiline input through additional props", () => {
    render(
      <StyledInput
        label="Description"
        value="Test description"
        onChange={mockOnChange}
        multiline
        rows={4}
      />
    );

    const textarea = screen.getByDisplayValue("Test description");
    expect(textarea).toBeInTheDocument();
  });
});

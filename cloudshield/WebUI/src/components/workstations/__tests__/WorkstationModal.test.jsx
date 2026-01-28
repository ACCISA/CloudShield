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
  <input type="checkbox" aria-label={props.label} checked={props.checked} />
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
});

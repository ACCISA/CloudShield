import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CreateTicketModal from "../../Tickets/CreateTicketModal";

jest.mock("../../../api/ticketsApi", () => ({
  createTicket: jest.fn(),
}));
import { createTicket } from "../../../api/ticketsApi";

const TITLE_PLACEHOLDER = /cannot connect to workstation vpn/i;
const DESC_PLACEHOLDER = /please provide steps/i;

const renderModal = (props = {}) =>
  render(
    <CreateTicketModal
      isOpen={true}
      onClose={jest.fn()}
      onSuccess={jest.fn()}
      {...props}
    />
  );

describe("CreateTicketModal", () => {
  afterEach(() => jest.clearAllMocks());

  it("renders the modal title", () => {
    renderModal();
    expect(screen.getByText("Submit a Request")).toBeInTheDocument();
  });

  it("renders title input field", () => {
    renderModal();
    expect(screen.getByPlaceholderText(TITLE_PLACEHOLDER)).toBeInTheDocument();
  });

  it("renders description input field", () => {
    renderModal();
    expect(screen.getByPlaceholderText(DESC_PLACEHOLDER)).toBeInTheDocument();
  });

  it("renders category toggle buttons", () => {
    renderModal();
    expect(screen.getByText("Network / VPN")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders priority toggle buttons", () => {
    renderModal();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("High / Urgent")).toBeInTheDocument();
  });

  it("submit button is disabled when title or description is empty", () => {
    renderModal();
    const submitBtn = screen.getByText("Submit Request");
    expect(submitBtn.closest("button")).toBeDisabled();
  });

  it("submit button enables when both title and description are filled", () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "VPN broken" },
    });
    fireEvent.change(screen.getByPlaceholderText(DESC_PLACEHOLDER), {
      target: { value: "Cannot connect since this morning" },
    });
    const submitBtn = screen.getByText("Submit Request");
    expect(submitBtn.closest("button")).not.toBeDisabled();
  });

  it("calls createTicket and onSuccess on valid submit", async () => {
    createTicket.mockResolvedValue({ id: "t1" });
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    renderModal({ onSuccess, onClose });

    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "My VPN is broken" },
    });
    fireEvent.change(screen.getByPlaceholderText(DESC_PLACEHOLDER), {
      target: { value: "Cannot connect since this morning" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Request").closest("button"));
    });

    expect(createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ title: "My VPN is broken" })
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows error message on API failure", async () => {
    createTicket.mockRejectedValue(new Error("Server error"));
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByPlaceholderText(DESC_PLACEHOLDER), {
      target: { value: "Some description here" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Request").closest("button"));
    });

    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render when isOpen is false", () => {
    render(
      <CreateTicketModal isOpen={false} onClose={jest.fn()} onSuccess={jest.fn()} />
    );
    expect(screen.queryByText("Submit a Request")).not.toBeInTheDocument();
  });

  it("prepends category to description on submit", async () => {
    createTicket.mockResolvedValue({ id: "t1" });
    renderModal({ onSuccess: jest.fn(), onClose: jest.fn() });

    fireEvent.change(screen.getByPlaceholderText(TITLE_PLACEHOLDER), {
      target: { value: "VPN issue" },
    });
    fireEvent.change(screen.getByPlaceholderText(DESC_PLACEHOLDER), {
      target: { value: "Cannot connect" },
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Submit Request").closest("button"));
    });

    const callArg = createTicket.mock.calls[0][0];
    expect(callArg.description).toContain("[Category:");
    expect(callArg.description).toContain("Cannot connect");
  });
});
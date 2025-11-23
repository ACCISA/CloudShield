import { render, screen, fireEvent } from "@testing-library/react";
import StatusButton from "../StatusButton";

describe("StatusButton", () => {
  it("renders Connect button when status is connected", () => {
    render(<StatusButton status="connected" />);
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("renders Disconnect button when status is disconnected", () => {
    render(<StatusButton status="disconnected" />);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("renders Disconnect button when status is busy", () => {
    render(<StatusButton status="busy" />);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("renders with default disconnected status when no status prop provided", () => {
    render(<StatusButton />);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("calls onClick handler when clicked", () => {
    const handleClick = jest.fn();
    render(<StatusButton status="connected" onClick={handleClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("has green border when status is connected", () => {
    render(<StatusButton status="connected" />);
    const button = screen.getByRole("button");

    expect(button).toHaveStyle({
      borderColor: "#116e34",
    });
  });

  it("has red border when status is disconnected", () => {
    render(<StatusButton status="disconnected" />);
    const button = screen.getByRole("button");

    expect(button).toHaveStyle({
      borderColor: "#7c1d1d",
    });
  });

  it("has pointer cursor", () => {
    render(<StatusButton status="connected" />);
    const button = screen.getByRole("button");

    expect(button).toHaveStyle({
      cursor: "pointer",
    });
  });
});

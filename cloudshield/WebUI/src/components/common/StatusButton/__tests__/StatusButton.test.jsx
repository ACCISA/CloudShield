import { render, screen, fireEvent } from "@testing-library/react";
import StatusButton from "../StatusButton";

describe("StatusButton", () => {
  it("renders Ready label when status is connected", () => {
    render(<StatusButton status="connected" />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("renders Unavailable label when status is disconnected", () => {
    render(<StatusButton status="disconnected" />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders Unavailable label when status is busy", () => {
    render(<StatusButton status="busy" />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("renders default unavailable label when no status prop is provided", () => {
    render(<StatusButton />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
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

  it("has pointer cursor when clickable", () => {
    render(<StatusButton status="connected" onClick={() => {}} />);
    const button = screen.getByRole("button");

    expect(button).toHaveStyle({
      cursor: "pointer",
    });
  });
});

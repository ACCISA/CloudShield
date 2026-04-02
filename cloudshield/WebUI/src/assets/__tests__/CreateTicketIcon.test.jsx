import { render } from "@testing-library/react";
import CreateTicketIcon from "../CreateTicketIcon";

describe("CreateTicketIcon", () => {
  it("renders without crashing", () => {
    const { container } = render(<CreateTicketIcon />);
    expect(container).toBeTruthy();
  });

  it("renders an SVG element", () => {
    const { container } = render(<CreateTicketIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("uses default dimensions", () => {
    const { container } = render(<CreateTicketIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  it("accepts custom width and height", () => {
    const { container } = render(<CreateTicketIcon width={24} height={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("accepts custom color", () => {
    const { container } = render(<CreateTicketIcon color="#0099FF" />);
    const strokedElements = container.querySelectorAll("[stroke]");

    strokedElements.forEach((element) => {
      expect(element).toHaveAttribute("stroke", "#0099FF");
    });
  });

  it("applies custom className", () => {
    const { container } = render(<CreateTicketIcon className="ticket-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("ticket-icon");
  });

  it("has correct viewBox", () => {
    const { container } = render(<CreateTicketIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
  });
});

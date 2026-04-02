import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DisplayIcon from "../DisplayIcon";

describe("DisplayIcon", () => {
  it("renders workstation initials using workstation fallback fields", () => {
    render(
      <DisplayIcon
        type="workstation"
        size="small"
        data={{ workstationName: "Edge Node" }}
        className="custom-icon"
      />,
    );

    const wrapper = screen.getByTitle("Edge Node");
    expect(wrapper.className).toContain("h-8 w-8 text-xs");
    expect(wrapper.className).toContain("custom-icon");
    expect(screen.getByText("EN")).not.toBeNull();
  });

  it("renders group fallback values when no group name is provided", () => {
    render(<DisplayIcon type="group" data={{}} />);

    expect(screen.getByTitle("Unknown Group")).not.toBeNull();
    expect(screen.getByText("UG")).not.toBeNull();
  });

  it("renders user name from first and last name with custom color", () => {
    render(
      <DisplayIcon
        type="user"
        size="large"
        data={{ firstName: "Ada", lastName: "Lovelace", color: "#123456" }}
      />,
    );

    const wrapper = screen.getByTitle("Ada Lovelace");
    const initialsNode = screen.getByText("AL").parentElement;

    expect(wrapper.className).toContain("h-14 w-14 text-base");
    expect(initialsNode).not.toBeNull();
    expect((initialsNode as HTMLElement).textContent).toBe("AL");
  });

  it("uses user fallback fields when first/last names are missing", () => {
    render(<DisplayIcon type="user" data={{ email: "solo@example.com" }} />);

    expect(screen.getByTitle("solo@example.com")).not.toBeNull();
    expect(screen.getByText("SC")).not.toBeNull();
  });

  it("falls back to unknown user label when all user fields are blank", () => {
    render(<DisplayIcon type="user" data={{ name: "   " }} />);

    expect(screen.getByTitle("Unknown User")).not.toBeNull();
    expect(screen.getByText("UU")).not.toBeNull();
  });

  it("renders profile image and falls back to initials when image load fails", () => {
    render(
      <DisplayIcon
        type="user"
        data={{ name: "Jane Doe", profile_image: "https://example.com/jane.png" }}
      />,
    );

    const image = screen.getByRole("img", { name: "Jane Doe" });
    expect(image.getAttribute("src")).toBe("https://example.com/jane.png");

    fireEvent.error(image);

    expect(screen.queryByRole("img", { name: "Jane Doe" })).toBeNull();
    expect(screen.getByText("JD")).not.toBeNull();
  });
});

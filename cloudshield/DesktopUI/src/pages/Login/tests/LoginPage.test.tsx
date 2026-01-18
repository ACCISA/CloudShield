import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoginPage from "../LoginPage";

describe("LoginPage Component", () => {
  it("renders the LoginPage", () => {
    const { container } = render(<LoginPage />);
    expect(container).toBeTruthy();
  });

  it("renders with correct background styling", () => {
    const { container } = render(<LoginPage />);
    const mainDiv = container.querySelector("div");
    expect(mainDiv?.className).toContain("bg-[#0a0a0a]");
    expect(mainDiv?.className).toContain("text-white");
  });

  it("has full screen dimensions", () => {
    const { container } = render(<LoginPage />);
    const mainDiv = container.querySelector("div");
    expect(mainDiv?.className).toContain("min-h-screen");
    expect(mainDiv?.className).toContain("w-full");
  });

  it("centers content", () => {
    const { container } = render(<LoginPage />);
    const mainDiv = container.querySelector("div");
    expect(mainDiv?.className).toContain("flex");
    expect(mainDiv?.className).toContain("items-center");
    expect(mainDiv?.className).toContain("justify-center");
    expect(mainDiv?.className).toContain("px-4");
  });
});

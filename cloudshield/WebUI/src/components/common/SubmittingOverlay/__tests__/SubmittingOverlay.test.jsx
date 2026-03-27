import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SubmittingOverlay from "../SubmittingOverlay.jsx";

jest.mock("../../../../hooks/useThemeColors", () => ({
  useThemeColors: () => ({
    textPrimary: "#ffffff",
    border: "#222222",
    info: "#00aaff",
  }),
}));

describe("SubmittingOverlay", () => {
  test("renders default label", () => {
    render(<SubmittingOverlay />);
    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  test("renders custom label", () => {
    render(<SubmittingOverlay label="Creating user..." />);
    expect(screen.getByText("Creating user...")).toBeInTheDocument();
  });
});

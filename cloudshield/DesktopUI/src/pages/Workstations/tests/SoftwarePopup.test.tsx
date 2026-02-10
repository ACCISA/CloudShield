import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {  render, screen } from "@testing-library/react";
import SoftwarePopup from "../SoftwarePopup";
import { Software } from "../../../models/Workstations";

describe("SoftwarePopup", () => {
    const mockSoftwares: Software[] = [
        { name: "Software A", description: "Description A", path: "/path/to/softwareA" },
        { name: "Software B", description: "Description B", path: "/path/to/softwareB" },
    ];

    beforeEach(() => {
        render(<SoftwarePopup softwares={mockSoftwares} />);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("renders the software list correctly", () => {
        expect(screen.getByText("Installed Software")).toBeTruthy();
        expect(screen.getByText("Software A")).toBeTruthy();
        expect(screen.getByText(/Description A/)).toBeTruthy();
        expect(screen.getByText("Software B")).toBeTruthy();
        expect(screen.getByText(/Description B/)).toBeTruthy();
    });
});
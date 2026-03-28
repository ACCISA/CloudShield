import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CsvImportButton from "../CSVImport/CSVImport";

const themeColors = {
  border: "#444",
  borderLight: "#666",
  bgSecondary: "#111",
  text: "#fff",
};

describe("CSVImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the help popover and closes it again", () => {
    render(
      <CsvImportButton
        button={<button type="button">Import CSV</button>}
        onImport={vi.fn()}
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email", "full_name", "password_hash"]}
        optionalColumns={["role", "workstations"]}
        exampleHeader="email,full_name,password_hash,role,workstations"
        exampleRow="john@example.com,John Doe,$2b$12$...,employee,WS001;WS002"
      />,
    );

    const helpButton = screen.getByRole("button", { name: /csv format help/i });
    fireEvent.click(helpButton);

    expect(screen.getByText("Employees CSV Format")).toBeInTheDocument();
    expect(screen.getByText("Required columns: email, full_name, password_hash")).toBeInTheDocument();
    expect(screen.getByText("Optional columns: role, workstations")).toBeInTheDocument();
    expect(screen.getByText("email,full_name,password_hash,role,workstations")).toBeInTheDocument();
    expect(screen.getByText("john@example.com,John Doe,$2b$12$...,employee,WS001;WS002")).toBeInTheDocument();

    fireEvent.click(helpButton);
    expect(screen.queryByText("Employees CSV Format")).not.toBeInTheDocument();
  });

  it("calls onImport with the selected file and clears the input value", () => {
    const onImport = vi.fn();

    render(
      <CsvImportButton
        button={<button type="button">Import CSV</button>}
        onImport={onImport}
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email"]}
        optionalColumns={[]}
        exampleHeader="email"
        exampleRow="john@example.com"
      />,
    );

    const input = screen.getByDisplayValue("", { selector: 'input[type="file"]' });
    const file = new File(["email\njohn@example.com"], "employees.csv", { type: "text/csv" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith(file);
    expect(input.value).toBe("");
  });

  it("does nothing when the file picker is closed without a file", () => {
    const onImport = vi.fn();

    render(
      <CsvImportButton
        button={<button type="button">Import CSV</button>}
        onImport={onImport}
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email"]}
        optionalColumns={[]}
        exampleHeader="email"
        exampleRow="john@example.com"
      />,
    );

    const input = screen.getByDisplayValue("", { selector: 'input[type="file"]' });
    fireEvent.change(input, { target: { files: [] } });

    expect(onImport).not.toHaveBeenCalled();
  });

  it("disables the trigger button while importing", () => {
    render(
      <CsvImportButton
        button={<button type="button">Import CSV</button>}
        onImport={vi.fn()}
        importing
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email"]}
        optionalColumns={[]}
        exampleHeader="email"
        exampleRow="john@example.com"
      />,
    );

    expect(screen.getByRole("button", { name: /import csv/i })).toBeDisabled();
  });

  it("respects a disabled trigger button passed in as the button prop", () => {
    render(
      <CsvImportButton
        button={<button type="button" disabled>Import CSV</button>}
        onImport={vi.fn()}
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email"]}
        optionalColumns={[]}
        exampleHeader="email"
        exampleRow="john@example.com"
      />,
    );

    expect(screen.getByRole("button", { name: /import csv/i })).toBeDisabled();
  });

  it("renders non-element button content and supports a custom accept value", () => {
    render(
      <CsvImportButton
        button="Import CSV"
        onImport={vi.fn()}
        accept=".csv"
        themeColors={themeColors}
        helpTitle="Employees CSV Format"
        requiredColumns={["email"]}
        optionalColumns={[]}
        exampleHeader="email"
        exampleRow="john@example.com"
      />,
    );

    expect(screen.getByText("Import CSV")).toBeInTheDocument();
    expect(screen.getByLabelText(/csv format help/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("", { selector: 'input[type="file"]' })).toHaveAttribute("accept", ".csv");
  });
});

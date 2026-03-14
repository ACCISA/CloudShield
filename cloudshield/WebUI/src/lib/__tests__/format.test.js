import { formatShares } from "../format";

describe("formatShares", () => {
  it("returns '-' for numeric 0", () => {
    expect(formatShares(0)).toBe("-");
  });

  it("returns '-' for string '0'", () => {
    expect(formatShares("0")).toBe("-");
  });

  it("returns '-' for null", () => {
    expect(formatShares(null)).toBe("-");
  });

  it("returns '-' for undefined", () => {
    expect(formatShares(undefined)).toBe("-");
  });

  it("returns '-' for empty string", () => {
    expect(formatShares("")).toBe("-");
  });

  it("returns stringified number for positive numeric values", () => {
    expect(formatShares(25)).toBe("25");
  });

  it("returns the same non-empty string value", () => {
    expect(formatShares("125")).toBe("125");
  });

  it("stringifies non-string truthy values", () => {
    expect(formatShares(false)).toBe("false");
  });
});
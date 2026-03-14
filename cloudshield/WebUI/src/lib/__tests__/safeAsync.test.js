jest.mock("../errors", () => ({
  getUserErrorMessage: jest.fn(),
}));

import { safeAsync } from "../safeAsync";
import { getUserErrorMessage } from "../errors";

describe("safeAsync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the resolved value when fn succeeds", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const toast = { error: jest.fn() };

    await expect(safeAsync(fn, { toast })).resolves.toBe("ok");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(getUserErrorMessage).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rethrows the original error and shows toast message when fn rejects", async () => {
    const err = new Error("boom");
    const fn = jest.fn().mockRejectedValue(err);
    const toast = { error: jest.fn() };

    getUserErrorMessage.mockReturnValue("Friendly message");

    await expect(safeAsync(fn, { toast })).rejects.toBe(err);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(getUserErrorMessage).toHaveBeenCalledTimes(1);
    expect(getUserErrorMessage).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Friendly message");
  });

  it("rethrows the original error even when no toast is provided", async () => {
    const err = new Error("no toast");
    const fn = jest.fn().mockRejectedValue(err);

    getUserErrorMessage.mockReturnValue("Friendly message");

    await expect(safeAsync(fn)).rejects.toBe(err);

    expect(getUserErrorMessage).toHaveBeenCalledWith(err);
  });

  it("does not fail when toast exists but has no error method", async () => {
    const err = new Error("partial toast");
    const fn = jest.fn().mockRejectedValue(err);
    const toast = {};

    getUserErrorMessage.mockReturnValue("Friendly message");

    await expect(safeAsync(fn, { toast })).rejects.toBe(err);

    expect(getUserErrorMessage).toHaveBeenCalledWith(err);
  });

  it("handles synchronous throws from fn", async () => {
    const err = new Error("sync fail");
    const fn = jest.fn(() => {
      throw err;
    });
    const toast = { error: jest.fn() };

    getUserErrorMessage.mockReturnValue("Sync friendly message");

    await expect(safeAsync(fn, { toast })).rejects.toBe(err);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(getUserErrorMessage).toHaveBeenCalledWith(err);
    expect(toast.error).toHaveBeenCalledWith("Sync friendly message");
  });
});
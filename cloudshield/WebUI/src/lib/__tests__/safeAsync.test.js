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


// Mock the error parser
jest.mock('../errors', () => ({
  getUserErrorMessage: jest.fn((err) => err.message || 'Default error'),
}));

describe('safeAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns data and enforces minDelay on fast success', async () => {
    const fastFn = jest.fn().mockResolvedValue('success data');
    
    const promise = safeAsync(fastFn, { minDelay: 500 });
    
    // Fast forward 100ms (data is ready, but delay holds it)
    jest.advanceTimersByTime(100);
    
    // Fast forward remaining 400ms
    jest.advanceTimersByTime(400);
    
    const result = await promise;
    expect(result).toBe('success data');
    expect(fastFn).toHaveBeenCalledTimes(1);
  });

  it('returns data immediately if execution takes longer than minDelay', async () => {
    const slowFn = jest.fn().mockImplementation(() => {
      jest.advanceTimersByTime(600); // Takes 600ms internally
      return Promise.resolve('slow data');
    });

    const promise = safeAsync(slowFn, { minDelay: 500 });
    const result = await promise;
    
    expect(result).toBe('slow data');
  });

  it('catches errors, enforces minDelay, triggers toast, and throws', async () => {
    const errorFn = jest.fn().mockRejectedValue(new Error('API Failed'));
    const toastMock = { error: jest.fn() };

    const promise = safeAsync(errorFn, { toast: toastMock, minDelay: 500 });
    
    // Fast forward 500ms
    jest.advanceTimersByTime(500);

    await expect(promise).rejects.toThrow('API Failed');
    expect(getUserErrorMessage).toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledTimes(1);
  });
});
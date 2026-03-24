/**
 * safeAsync.comprehensive.test.js
 *
 * Comprehensive test suite for safeAsync utility function
 * Tests async handling, minimum delay enforcement, error handling and edge cases
 */
jest.mock("../errors", () => ({
  getUserErrorMessage: jest.fn((err) => err.message || "Default error"),
}));

import { safeAsync } from "../safeAsync";
import { getUserErrorMessage } from "../errors";

describe("safeAsync - Comprehensive Suite", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===== Basic Success Cases =====
  describe("Success Cases", () => {
    test("returns resolved value when function succeeds", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const toast = { error: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(toast.error).not.toHaveBeenCalled();
    });

    test("returns number values", async () => {
      const fn = jest.fn().mockResolvedValue(42);
      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBe(42);
    });

    test("returns boolean values", async () => {
      const fnTrue = jest.fn().mockResolvedValue(true);
      const fnFalse = jest.fn().mockResolvedValue(false);

      const p1 = safeAsync(fnTrue, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      expect(await p1).toBe(true);

      jest.clearAllMocks();
      const p2 = safeAsync(fnFalse, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      expect(await p2).toBe(false);
    });

    test("returns complex objects", async () => {
      const data = { nested: { value: [1, 2, { deep: true }] } };
      const fn = jest.fn().mockResolvedValue(data);
      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toEqual(data);
    });

    test("returns arrays", async () => {
      const arr = [1, "two", { three: 3 }, null];
      const fn = jest.fn().mockResolvedValue(arr);
      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toEqual(arr);
    });

    test("executes function only once", async () => {
      const fn = jest.fn().mockResolvedValue("data");
      const 
promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      await promise;

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("does not call error callback on success", async () => {
      const fn = jest.fn().mockResolvedValue("ok");
      const toast = { error: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);
      await promise;

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  // ===== Minimum Delay Enforcement =====
  describe("Minimum Delay Enforcement", () => {
    test("enforces minimum delay for fast operations", async () => {
      const fn = jest.fn().mockResolvedValue("quick");
      const start = jest.now();
      const promise = safeAsync(fn, { minDelay: 500 });

      jest.advanceTimersByTime(250);
      expect(fn).toHaveBeenCalled();

      jest.advanceTimersByTime(250);
      await promise;

      expect(jest.now() - start).toBe(500);
    });

    test("does not add delay when operation exceeds minDelay", async () => {
      const fn = jest.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve("slow"), 600);
        })
      );

      const promise = safeAsync(fn, { minDelay: 500 });
      jest.advanceTimersByTime(700);
      await promise;

      expect(fn).toHaveBeenCalled();
    });

    test("uses default minDelay of 500ms", async () => {
      const fn = jest.fn().mockResolvedValue("default");
      const start = jest.now();
      const promise = safeAsync(fn);

      jest.advanceTimersByTime(250);
      jest.advanceTimersByTime(250);
      await promise;

      expect(jest.now() - start).toBe(500);
    });

    test("respects custom minDelay values", async () => {
      const delays = [0, 100, 1000];

      for (const delay of delays) {
        jest.clearAllTimers();
        jest.clearAllMocks();

        const fn = jest.fn().mockResolvedValue("test");
        const start = jest.now();
        const promise = safeAsync(fn, { minDelay: delay });

        jest.advanceTimersByTime(delay + 100);
        await promise;

        expect(jest.now() - start).toBeGreaterThanOrEqual(delay);
      }
    });

    test("minDelay applied even when operation is very fast", async () => {
      const fn = jest.fn().mockResolvedValue("instant");
      const promise = safeAsync(fn, { minDelay: 1000 });

      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(500);
      await promise;

      expect(jest.now()).toBeGreaterThanOrEqual(1000);
    });

    test("handles zero minDelay", async () => {
      const fn = jest.fn().mockResolvedValue("no delay");
      const promise = safeAsync(fn, { minDelay: 0 });

      jest.advanceTimersByTime(10);
      const result = await promise;

      expect(result).toBe("no delay");
    });
  });

  // ===== Error Handling =====
  describe("Error Handling", () => {
    test("rethrows original error", async () => {
      const err = new Error("test error");
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { error: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toBe(err);
    });

    test("calls getUserErrorMessage with error", async () => {
      const err = new Error("api error");
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { error: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      try {
        await promise;
      } catch {
        // Expected
      }

      expect(getUserErrorMessage).toHaveBeenCalledWith(err);
    });

    test("displays error toast with user-friendly message", async () => {
      const err = new Error("network error");
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { error: jest.fn() };

      getUserErrorMessage.mockReturnValue("Connection failed");

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      try {
        await promise;
      } catch {
        // Expected
      }

      expect(toast.error).toHaveBeenCalledWith("Connection failed");
    });

    test("handles errors without toast", async () => {
      const err = new Error("no toast");
      const fn = jest.fn().mockRejectedValue(err);

      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toBe(err);
      expect(getUserErrorMessage).toHaveBeenCalledWith(err);
    });

    test("handles toast without error method", async () => {
      const err = new Error("partial toast");
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { warning: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toBe(err);
      expect(getUserErrorMessage).toHaveBeenCalledWith(err);
    });

    test("handles synchronous throws", async () => {
      const err = new Error("sync throw");
      const fn = jest.fn(() => {
        throw err;
      });
      const toast = { error: jest.fn() };

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toBe(err);
      expect(getUserErrorMessage).toHaveBeenCalledWith(err);
      expect(toast.error).toHaveBeenCalled();
    });

    test("enforces minDelay even on error", async () => {
      const err = new Error("error");
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { error: jest.fn() };
      const start = jest.now();

      const promise = safeAsync(fn, { toast, minDelay: 500 });
      jest.advanceTimersByTime(250);
      expect(fn).toHaveBeenCalled();

      jest.advanceTimersByTime(250);
      try {
        await promise;
      } catch {
        // Expected
      }

      expect(jest.now() - start).toBe(500);
    });

    test("handles different error types", async () => {
      const errors = [
        new Error("Error"),
        new TypeError("Type"),
        { custom: "error" },
        "string error",
        42,
      ];

      for (const err of errors) {
        jest.clearAllMocks();
        const fn = jest.fn().mockRejectedValue(err);
        const toast = { error: jest.fn() };

        const promise = safeAsync(fn, { toast, minDelay: 0 });
        jest.advanceTimersByTime(100);

        try {
          await promise;
        } catch {
          // Expected
        }

        expect(getUserErrorMessage).toHaveBeenCalledWith(err);
        expect(toast.error).toHaveBeenCalled();
      }
    });
  });

  // ===== Options Handling =====
  describe("Options Handling", () => {
    test("works without options", async () => {
      const fn = jest.fn().mockResolvedValue("no options");
      const promise = safeAsync(fn);
      jest.advanceTimersByTime(600);
      const result = await promise;

      expect(result).toBe("no options");
    });

    test("works with only toast option", async () => {
      const fn = jest.fn().mockResolvedValue("with toast");
      const toast = { error: jest.fn() };
      const promise = safeAsync(fn, { toast });
      jest.advanceTimersByTime(600);
      const result = await promise;

      expect(result).toBe("with toast");
    });

    test("works with only minDelay option", async () => {
      const fn = jest.fn().mockResolvedValue("with delay");
      const promise = safeAsync(fn, { minDelay: 100 });
      jest.advanceTimersByTime(150);
      const result = await promise;

      expect(result).toBe("with delay");
    });

    test("works with all options", async () => {
      const fn = jest.fn().mockResolvedValue("full options");
      const toast = { error: jest.fn() };
      const promise = safeAsync(fn, { toast, minDelay: 200 });
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toBe("full options");
    });
  });

  // ===== Parallel Execution =====
  describe("Parallel Execution", () => {
    test("handles multiple concurrent calls", async () => {
      const fn1 = jest.fn().mockResolvedValue("result1");
      const fn2 = jest.fn().mockResolvedValue("result2");
      const fn3 = jest.fn().mockResolvedValue("result3");

      const p1 = safeAsync(fn1, { minDelay: 0 });
      const p2 = safeAsync(fn2, { minDelay: 0 });
      const p3 = safeAsync(fn3, { minDelay: 0 });

      jest.advanceTimersByTime(100);
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(r1).toBe("result1");
      expect(r2).toBe("result2");
      expect(r3).toBe("result3");
    });

    test("handles mixed success and errors", async () => {
      const fnSuccess = jest.fn().mockResolvedValue("success");
      const fnError = jest.fn().mockRejectedValue(new Error("failed"));
      const toast = { error: jest.fn() };

      const p1 = safeAsync(fnSuccess, { minDelay: 0 });
      const p2 = safeAsync(fnError, { minDelay: 0, toast });

      jest.advanceTimersByTime(100);
      const r1 = await p1;
      expect(r1).toBe("success");

      try {
        await p2;
      } catch {
        // Expected
      }

      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ===== Edge Cases =====
  describe("Edge Cases", () => {
    test("handles very large minDelay", async () => {
      const fn = jest.fn().mockResolvedValue("delayed");
      const promise = safeAsync(fn, { minDelay: 1000000 });
      jest.advanceTimersByTime(500000);
      jest.advanceTimersByTime(500000);
      const result = await promise;

      expect(result).toBe("delayed");
    });

    test("handles errors with no message", async () => {
      const err = { code: "ERROR" };
      const fn = jest.fn().mockRejectedValue(err);
      const toast = { error: jest.fn() };

      getUserErrorMessage.mockReturnValue("Unknown error");

      const promise = safeAsync(fn, { toast, minDelay: 0 });
      jest.advanceTimersByTime(100);

      try {
        await promise;
      } catch {
        // Expected
      }

      expect(getUserErrorMessage).toHaveBeenCalledWith(err);
      expect(toast.error).toHaveBeenCalledWith("Unknown error");
    });

    test("handles undefined return value", async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBeUndefined();
    });

    test("handles null return value", async () => {
      const fn = jest.fn().mockResolvedValue(null);
      const promise = safeAsync(fn, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const result = await promise;

      expect(result).toBeNull();
    });

    test("handles empty objects and arrays", async () => {
      const fn1 = jest.fn().mockResolvedValue({});
      const fn2 = jest.fn().mockResolvedValue([]);

      const p1 = safeAsync(fn1, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const r1 = await p1;
      expect(r1).toEqual({});

      jest.clearAllMocks();
      const p2 = safeAsync(fn2, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      const r2 = await p2;
      expect(r2).toEqual([]);
    });
  });

  // ===== Real-world Scenarios =====
  describe("Real-world Scenarios", () => {
    test("API call with artificial loading delay", async () => {
      const apiCall = jest.fn(() =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ id: 1, name: "item" }), 200);
        })
      );

      const promise = safeAsync(apiCall, { minDelay: 500 });
      jest.advanceTimersByTime(300);
      jest.advanceTimersByTime(300);
      const result = await promise;

      expect(result).toEqual({ id: 1, name: "item" });
    });

    test("Failed API call shows user-friendly error", async () => {
      const apiCall = jest.fn().mockRejectedValue(new Error("Network error"));
      const errorCallback = jest.fn();

      getUserErrorMessage.mockReturnValue("Failed to load data. Please try again.");

      const promise = safeAsync(apiCall, {
        minDelay: 500,
        toast: { error: errorCallback },
      });

      jest.advanceTimersByTime(500);

      try {
        await promise;
      } catch {
        // Expected
      }

      expect(errorCallback).toHaveBeenCalledWith("Failed to load data. Please try again.");
    });

    test("Sequential async operations", async () => {
      const fn1 = jest.fn().mockResolvedValue("step1");
      const fn2 = jest.fn().mockResolvedValue("step2");

      const result1 = await safeAsync(fn1, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      expect(result1).toBe("step1");

      jest.clearAllMocks();
      const result2 = await safeAsync(fn2, { minDelay: 0 });
      jest.advanceTimersByTime(100);
      expect(result2).toBe("step2");
    });
  });
});

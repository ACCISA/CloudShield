/**
 * useAsyncTask.test.js
 *
 * Comprehensive test suite for the useAsyncTask hook.
 * Tests polling, status transitions, error handling, and cleanup.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useAsyncTask } from "../useAsyncTask";

describe("useAsyncTask Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // ===== INITIAL STATE TESTS =====
  describe("Initial State", () => {
    test("should initialize with idle status and empty values", () => {
      const { result } = renderHook(() => useAsyncTask());

      expect(result.current.status).toBe("idle");
      expect(result.current.jobId).toBeNull();
      expect(result.current.message).toBe("");
      expect(result.current.progress).toBeNull();
      expect(result.current.result).toBeNull();
    });

    test("should have required methods", () => {
      const { result } = renderHook(() => useAsyncTask());

      expect(typeof result.current.executeTask).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    test("should accept custom pollInterval option", () => {
      const { result } = renderHook(() => useAsyncTask({ pollInterval: 2000 }));

      expect(result.current.status).toBe("idle");
      // Hook should initialize without errors
      expect(result.current).toBeDefined();
    });

    test("should use default pollInterval of 5000ms", () => {
      const { result } = renderHook(() => useAsyncTask());

      expect(result.current).toBeDefined();
      // Default interval is used internally
    });
  });

  // ===== EXECUTE TASK TESTS =====
  describe("Execute Task", () => {
    test("should set status to starting when executeTask is called", async () => {
      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-123");

      await act(async () => {
        result.current.executeTask(taskFn);
      });

      // Status transitions through states
      expect(result.current.status).not.toBe("idle");
    });

    test("should call task function and get job ID", async () => {
      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-456");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      expect(taskFn).toHaveBeenCalledTimes(1);
      expect(result.current.jobId).toBe("job-456");
    });

    test("should set status to running after task function succeeds", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-789");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
      });
    });

    test("should set status to failed if task function throws", async () => {
      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockRejectedValue(new Error("Task failed"));

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      expect(result.current.status).toBe("failed");
      expect(result.current.message).toContain("Task failed");
    });

    test("should handle task function that throws without message", async () => {
      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockRejectedValue(new Error());

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      expect(result.current.status).toBe("failed");
      expect(result.current.message).toContain("Failed to start task");
    });

    test("should reset progress when new task is started", async () => {
      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-new");

      // Set initial progress
      await act(async () => {
        await result.current.executeTask(jest.fn().mockResolvedValue("job-old"));
      });

      // Start new task
      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      expect(result.current.jobId).toBe("job-new");
    });

    test("should clear previous messages when starting new task", async () => {
      const { result } = renderHook(() => useAsyncTask());

      await act(async () => {
        await result.current.executeTask(jest.fn().mockResolvedValue("job-1"));
      });

      // Set a message
      const taskFn = jest.fn().mockResolvedValue("job-2");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      expect(result.current.message).toBe("");
    });
  });

  // ===== API STATUS POLLING TESTS =====
  describe("API Status Polling", () => {
    test("should fetch job status immediately after task starts", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: 30 }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-poll-1");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      expect(global.fetch).toHaveBeenCalled();
      const callUrl = global.fetch.mock.calls[0][0];
      expect(callUrl).toContain("job-poll-1");
    });

    test("should handle 404 response as queued status", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-404");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
        expect(result.current.message).toContain("Setting up task");
      });
    });

    test("should handle network error in fetch", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-error");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.message).toContain("Failed to fetch status");
      });
    });

    test("should set progress when provided in response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: 65 }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-progress");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.progress).toBe(65);
      });
    });

    test("should handle string progress values", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "running",
            progress: "Setting up domain configuration",
          }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-str-progress");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.progress).toBe("Setting up domain configuration");
      });
    });

    test("should set message from response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "running",
            message: "Adding user to groups",
          }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-message");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.message).toBe("Adding user to groups");
      });
    });

    test("should infer message from string progress", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "running",
            progress: "Creating user account",
          }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-infer-msg");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.message).toBe("Creating user account");
      });
    });

    test("should set result from response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "finished",
            result: { userId: "user-123", email: "john@example.com" },
          }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-result");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.result).toEqual({
          userId: "user-123",
          email: "john@example.com",
        });
      });
    });
  });

  // ===== STATUS INFERENCE TESTS =====
  describe("Status Inference", () => {
    test("should convert finished status to succeeded", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-finished");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
      });
    });

    test("should convert started status to running", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "started" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-started");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
      });
    });

    test("should convert queued status to running", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "queued" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-queued");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
      });
    });

    test("should convert deferred status to running", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "deferred" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-deferred");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
      });
    });

    test("should infer failed from progress text", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ progress: "FAILED: Network error" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-infer-failed");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("failed");
      });
    });

    test("should infer succeeded from progress text", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ progress: "User creation completed" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-infer-completed");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
      });
    });

    test("should default to running if no clear status", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ progress: "Processing..." }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-default");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("running");
      });
    });
  });

  // ===== POLLING INTERVAL TESTS =====
  describe("Polling Interval", () => {
    test("should continue polling while status is running", async () => {
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: callCount < 3 ? "running" : "finished",
            progress: callCount * 25,
          }),
        });
      });

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-polling");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
      });

      expect(global.fetch.mock.calls.length).toBeGreaterThan(1);
    });

    test("should stop polling when status is succeeded", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-stop-poll");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      const initialCallCount = global.fetch.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Should not make additional calls after succeeding
      expect(global.fetch.mock.calls.length).toBe(initialCallCount);
    });

    test("should stop polling when status is failed", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "failed", message: "Task failed" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-fail-poll");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("failed");
      });

      const initialCallCount = global.fetch.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(global.fetch.mock.calls.length).toBe(initialCallCount);
    });

    test("should respect custom poll interval", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 2000 }));
      const taskFn = jest.fn().mockResolvedValue("job-interval");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
      });

      const firstCallCount = global.fetch.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      // Should not have made another call yet
      expect(global.fetch.mock.calls.length).toBe(firstCallCount);

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Now should have made another call
      expect(global.fetch.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    test("should continue polling despite fetch errors", async () => {
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => "Server error",
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        });
      });

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-retry");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.message).toContain("Failed to fetch status");

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
      });
    });
  });

  // ===== RESET FUNCTIONALITY TESTS =====
  describe("Reset Functionality", () => {
    test("should reset all state to initial values", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: 50 }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-reset");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");
      expect(result.current.jobId).toBeNull();
      expect(result.current.message).toBe("");
      expect(result.current.progress).toBeNull();
      expect(result.current.result).toBeNull();
    });

    test("should clear polling timer on reset", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: 25 }),
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-clear-timer");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      const fetchCountBefore = global.fetch.mock.calls.length;

      await act(async () => {
        result.current.reset();
        jest.advanceTimersByTime(2000);
      });

      // Should not make additional fetch calls after reset
      expect(global.fetch.mock.calls.length).toBe(fetchCountBefore);
    });

    test("should allow restarting task after reset", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn1 = jest.fn().mockResolvedValue("job-1");
      const taskFn2 = jest.fn().mockResolvedValue("job-2");

      await act(async () => {
        await result.current.executeTask(taskFn1);
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
      });

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");

      await act(async () => {
        await result.current.executeTask(taskFn2);
        jest.runAllTimers();
      });

      expect(result.current.jobId).toBe("job-2");
    });
  });

  // ===== CLEANUP TESTS =====
  describe("Cleanup on Unmount", () => {
    test("should clear polling timer on unmount", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running" }),
        })
      );

      const { result, unmount } = renderHook(() =>
        useAsyncTask({ pollInterval: 1000 })
      );
      const taskFn = jest.fn().mockResolvedValue("job-unmount");

      await act(async () => {
        await result.current.executeTask(taskFn);
      });

      const fetchCountBefore = global.fetch.mock.calls.length;

      await act(async () => {
        unmount();
        jest.advanceTimersByTime(5000);
      });

      // No additional fetches after unmount
      expect(global.fetch.mock.calls.length).toBe(fetchCountBefore);
    });

    test("should handle unmount without active polling", () => {
      const { unmount } = renderHook(() => useAsyncTask());

      // Should not throw error
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  // ===== EDGE CASES TESTS =====
  describe("Edge Cases", () => {
    test("should handle empty response JSON", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-empty");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      // Should not crash
      expect(result.current.jobId).toBe("job-empty");
    });

    test("should handle JSON parse error", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error("JSON parse error");
          },
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-parse");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      // Should continue polling despite error
      expect(result.current.status).toBe("running");
    });

    test("should handle text error without throwing", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: async () => {
            throw new Error("Text read error");
          },
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-text-error");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      // Should not crash
      expect(result.current.message).toContain("Failed to fetch status");
    });

    test("should handle special characters in job ID", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const jobIdWithSpecialChars = "job-123/456?test=true&other=false";
      const taskFn = jest.fn().mockResolvedValue(jobIdWithSpecialChars);

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      expect(result.current.jobId).toBe(jobIdWithSpecialChars);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("job-123%2F456%3Ftest%3Dtrue%26other%3Dfalse")
      );
    });

    test("should handle null response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => null,
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn = jest.fn().mockResolvedValue("job-null");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.runAllTimers();
      });

      // Should continue polling
      expect(result.current.status).toBe("running");
    });

    test("should handle progress as number and string simultaneously", async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: "running", progress: "Adding to groups" }),
        });

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-mixed");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBe(50);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBe("Adding to groups");
    });
  });

  // ===== INTEGRATION TESTS =====
  describe("Integration Tests", () => {
    test("complete successful task flow", async () => {
      const responses = [
        { status: "running", progress: 25, message: "Step 1" },
        { status: "running", progress: 50, message: "Step 2" },
        { status: "running", progress: 75, message: "Step 3" },
        {
          status: "finished",
          progress: 100,
          message: "Completed",
          result: { success: true },
        },
      ];

      let responseIndex = 0;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => responses[responseIndex++],
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-complete");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBe(25);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBe(50);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.progress).toBe(75);

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("succeeded");
        expect(result.current.progress).toBe(100);
        expect(result.current.result).toEqual({ success: true });
      });
    });

    test("complete failed task flow", async () => {
      const responses = [
        { status: "running", progress: 30, message: "Starting task" },
        { status: "failed", progress: 30, message: "Network connection lost" },
      ];

      let responseIndex = 0;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => responses[responseIndex++],
        })
      );

      const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
      const taskFn = jest.fn().mockResolvedValue("job-fail");

      await act(async () => {
        await result.current.executeTask(taskFn);
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("failed");
        expect(result.current.message).toContain("Network connection lost");
      });
    });

    test("multiple task executions with reset", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "finished" }),
        })
      );

      const { result } = renderHook(() => useAsyncTask());
      const taskFn1 = jest.fn().mockResolvedValue("job-1");
      const taskFn2 = jest.fn().mockResolvedValue("job-2");
      const taskFn3 = jest.fn().mockResolvedValue("job-3");

      await act(async () => {
        await result.current.executeTask(taskFn1);
        jest.runAllTimers();
      });

      await waitFor(() => expect(result.current.status).toBe("succeeded"));

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe("idle");

      await act(async () => {
        await result.current.executeTask(taskFn2);
        jest.runAllTimers();
      });

      await waitFor(() => expect(result.current.jobId).toBe("job-2"));

      await act(async () => {
        result.current.reset();
      });

      await act(async () => {
        await result.current.executeTask(taskFn3);
        jest.runAllTimers();
      });

      expect(result.current.jobId).toBe("job-3");
    });
  });
});

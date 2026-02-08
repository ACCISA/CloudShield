import { renderHook, act } from "@testing-library/react";
import { useAsyncTask } from "../useAsyncTask";

describe("useAsyncTask", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.resetAllMocks();
    consoleErrorSpy?.mockRestore();
  });

  const flush = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const flushAll = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("completes successfully when status is finished", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "finished", progress: 20, result: { ok: true } }),
      text: async () => "",
    });

    const { result } = renderHook(() => useAsyncTask());
    const taskFn = jest.fn().mockResolvedValue("job-1");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flushAll();

    expect(result.current.status).toBe("succeeded");
    expect(result.current.progress).toBe(20);
    expect(result.current.result).toEqual({ ok: true });
  });

  it("keeps running then succeeds on next poll", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "started", progress: "Working" }),
        text: async () => "",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "succeeded", result: { done: true } }),
        text: async () => "",
      });

    const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));
    const taskFn = jest.fn().mockResolvedValue("job-2");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flushAll();

    expect(result.current.status).toBe("running");
    expect(result.current.message).toBe("Working");

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await flush();

    expect(result.current.status).toBe("succeeded");
    expect(result.current.result).toEqual({ done: true });
  });

  it("infers failed status from progress text", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ progress: "Failed to connect" }),
      text: async () => "",
    });

    const { result } = renderHook(() => useAsyncTask());
    const taskFn = jest.fn().mockResolvedValue("job-3");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flush();

    expect(result.current.status).toBe("failed");
    expect(result.current.message).toBe("Failed to connect");
  });

  it("infers success from completed progress text", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ progress: "Completed successfully", result: { ok: 1 } }),
      text: async () => "",
    });

    const { result } = renderHook(() => useAsyncTask());
    const taskFn = jest.fn().mockResolvedValue("job-4");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flush();

    expect(result.current.status).toBe("succeeded");
    expect(result.current.result).toEqual({ ok: 1 });
  });

  it("sets polling error message when status fetch fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Nope",
    });

    const { result } = renderHook(() => useAsyncTask());
    const taskFn = jest.fn().mockResolvedValue("job-5");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flush();

    expect(result.current.status).toBe("running");
    expect(result.current.message).toBe("Nope");
  });

  it("sets fallback polling error when error has no message", async () => {
    global.fetch.mockRejectedValueOnce(null);

    const { result } = renderHook(() => useAsyncTask());
    const taskFn = jest.fn().mockResolvedValue("job-6");

    await act(async () => {
      await result.current.executeTask(taskFn);
    });

    await flush();

    expect(result.current.message).toBe("Polling error…");
  });

  it("fails when taskFn throws", async () => {
    const { result } = renderHook(() => useAsyncTask());

    await act(async () => {
      await result.current.executeTask(() => Promise.reject(new Error("boom")));
    });

    expect(result.current.status).toBe("failed");
    expect(result.current.message).toBe("boom");
  });

  it("reset clears state and stops polling", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "running", progress: 1 }),
      text: async () => "",
    });

    const clearSpy = jest.spyOn(global, "clearInterval");
    const { result } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));

    await act(async () => {
      await result.current.executeTask(() => Promise.resolve("job-7"));
    });

    await flush();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.jobId).toBeNull();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("clears polling interval on unmount", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "running", progress: 1 }),
      text: async () => "",
    });

    const clearSpy = jest.spyOn(global, "clearInterval");
    const { result, unmount } = renderHook(() => useAsyncTask({ pollInterval: 1000 }));

    await act(async () => {
      await result.current.executeTask(() => Promise.resolve("job-8"));
    });

    await flush();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});

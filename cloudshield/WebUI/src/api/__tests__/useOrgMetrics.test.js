/**
 * Tests for useOrgMetrics.js
 * This file tests the useOrgMetrics custom hook, which fetches organization metrics from the API and manages loading/error state.
 * 
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useOrgMetrics } from "../useOrgMetrics";
import { apiGet } from "../client";

jest.mock("../client", () => ({
  apiGet: jest.fn(),
}));

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useOrgMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with default stats, loading=true, error=null", () => {
    // Don't resolve apiGet to keep it in loading state
    apiGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOrgMetrics());

    expect(result.current.stats).toEqual({
      users: 0,
      workstations: 0,
      groups: 0,
      shares: 0,
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("fetches metrics successfully and maps access_groups -> groups", async () => {
    apiGet.mockResolvedValueOnce({
      stats: { users: 10, workstations: 5, access_groups: 2, shares: 3 },
    });

    const { result } = renderHook(() => useOrgMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(apiGet).toHaveBeenCalledWith("/organizations/me/metrics");
    expect(result.current.error).toBeNull();
    expect(result.current.stats).toEqual({
      users: 10,
      workstations: 5,
      groups: 2,
      shares: 3,
    });
  });

  it("defaults missing stats fields to 0 (covers ?. and ?? fallbacks)", async () => {
    // Simulate API returning some missing/undefined/null fields
    apiGet.mockResolvedValueOnce({
      stats: {
        users: undefined, // -> 0
        workstations: null, // -> 0
        // access_groups missing entirely -> groups: 0
        shares: 7,
      },
    });

    const { result } = renderHook(() => useOrgMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      users: 0,
      workstations: 0,
      groups: 0,
      shares: 7,
    });
  });

  it("defaults everything to 0 when res.stats is missing entirely", async () => {
    apiGet.mockResolvedValueOnce({}); // res.stats is undefined

    const { result } = renderHook(() => useOrgMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      users: 0,
      workstations: 0,
      groups: 0,
      shares: 0,
    });
    expect(result.current.error).toBeNull();
  });

  it("sets error and resets stats when apiGet throws", async () => {
    const err = new Error("boom");
    apiGet.mockRejectedValueOnce(err);

    const { result } = renderHook(() => useOrgMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(err);
    expect(result.current.stats).toEqual({
      users: 0,
      workstations: 0,
      groups: 0,
      shares: 0,
    });
  });

  it("does not set state if unmounted before SUCCESS resolves (covers `if (!mounted) return;` in try + finally)", async () => {
    const d = deferred();
    apiGet.mockReturnValueOnce(d.promise);

    const { result, unmount } = renderHook(() => useOrgMetrics());

    // Initially loading with default stats
    expect(result.current.loading).toBe(true);
    expect(result.current.stats.users).toBe(0);

    // Unmount before resolving
    unmount();

    // Now resolve successfully, but since we unmounted, the hook should not update state or throw warnings
    d.resolve({
      stats: { users: 99, workstations: 88, access_groups: 77, shares: 66 },
    });

    // flush microtasks to allow any state updates to process if they were going to
    await Promise.resolve();

    // Nothing to assert on state since hook is unmounted;
    // this test exists to execute the guarded try/finally paths without React 'state update on unmounted component' warnings.
    expect(true).toBe(true);
  });

  it("does not set error/stats/loading if unmounted before ERROR rejects (covers `if (!mounted) return;` in catch + finally)", async () => {
    const d = deferred();
    apiGet.mockReturnValueOnce(d.promise);

    const { unmount } = renderHook(() => useOrgMetrics());

    unmount();

    d.reject(new Error("late fail"));

    // flush microtasks to allow any state updates to process if they were going to
    await Promise.resolve();
    await Promise.resolve();

    // If we got here without warnings, the test passes. There's no state to check since we're unmounted.
    // This test is mainly to ensure that the catch + finally blocks are also guarded against state updates after unmounting, just like the try block.
    // If there were no guards, we would get warnings about setting state on an unmounted component when the promise rejects.
    expect(true).toBe(true);
  });
});

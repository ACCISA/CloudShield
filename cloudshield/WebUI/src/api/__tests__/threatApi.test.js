/**
 * Tests for threatApi.js (normalizeAlert, fetchSecurityAlerts,
 * updateAlertStatus, useSecurityAlerts hook).
 */

jest.mock("../client", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
}));

import { apiGet, apiPatch } from "../client";
import {
  normalizeAlert,
  fetchSecurityAlerts,
  updateAlertStatus,
  useSecurityAlerts,
} from "../threatApi";
import { renderHook, act, waitFor } from "@testing-library/react";

afterEach(() => jest.clearAllMocks());

// ── normalizeAlert ────────────────────────────────────────────────────────────

describe("normalizeAlert", () => {
  const base = {
    alert_id: "a1",
    source: "snort",
    severity: "HIGH",
    timestamp: 1700000000,
    title: "Test alert",
  };

  it("maps alert_id to id", () => {
    expect(normalizeAlert(base).id).toBe("a1");
  });

  it("falls back to source-timestamp id when alert_id missing", () => {
    const { id } = normalizeAlert({ ...base, alert_id: undefined });
    expect(id).toMatch(/snort-/);
  });

  it("maps HIGH severity to high risk", () => {
    expect(normalizeAlert(base).risk).toBe("high");
  });

  it("maps CRITICAL severity to high risk", () => {
    expect(normalizeAlert({ ...base, severity: "CRITICAL" }).risk).toBe("high");
  });

  it("maps MEDIUM severity to moderate risk", () => {
    expect(normalizeAlert({ ...base, severity: "MEDIUM" }).risk).toBe("moderate");
  });

  it("maps LOW severity to low risk", () => {
    expect(normalizeAlert({ ...base, severity: "LOW" }).risk).toBe("low");
  });

  it("defaults unknown severity to moderate", () => {
    expect(normalizeAlert({ ...base, severity: "UNKNOWN" }).risk).toBe("moderate");
  });

  it("defaults status to unresolved", () => {
    expect(normalizeAlert(base).status).toBe("unresolved");
  });

  it("preserves _raw original alert", () => {
    expect(normalizeAlert(base)._raw).toBe(base);
  });

  it("uses current time when timestamp missing", () => {
    const before = Date.now();
    const result = normalizeAlert({ ...base, timestamp: undefined });
    const after = Date.now();
    const alertTime = new Date(result.date).getTime();
    expect(alertTime).toBeGreaterThanOrEqual(before);
    expect(alertTime).toBeLessThanOrEqual(after);
  });

  // source → type mapping
  it("maps snort source to Network intrusion", () => {
    expect(normalizeAlert({ ...base, source: "snort" }).type).toBe("Network intrusion");
  });

  it("maps anomaly source to Suspicious activity", () => {
    expect(normalizeAlert({ ...base, source: "anomaly" }).type).toBe("Suspicious activity");
  });

  it("maps beacon source to C2 communication", () => {
    expect(normalizeAlert({ ...base, source: "beacon" }).type).toBe("C2 communication");
  });

  it("maps proc_net source to Malicious process", () => {
    expect(normalizeAlert({ ...base, source: "proc_net" }).type).toBe("Malicious process");
  });

  it("maps correlation source to Multi-source threat", () => {
    expect(normalizeAlert({ ...base, source: "correlation" }).type).toBe("Multi-source threat");
  });

  it("defaults unknown source type to Suspicious activity", () => {
    expect(normalizeAlert({ ...base, source: "unknown_src" }).type).toBe("Suspicious activity");
  });

  // description builders
  describe("description builders", () => {
    it("builds anomaly description with agent_id and score", () => {
      const alert = { ...base, source: "anomaly", agent_id: "ag1", details: { score: -3.14 } };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("ag1");
      expect(d).toContain("3.14");
    });

    it("builds anomaly description without optional fields", () => {
      const d = normalizeAlert({ ...base, source: "anomaly" }).description;
      expect(d).toContain("Anomalous network behaviour");
    });

    it("builds snort description with src/dst", () => {
      const alert = { ...base, source: "snort", src_ip: "1.2.3.4", src_port: 1234, dst_ip: "5.6.7.8", dst_port: 80, rule_id: "1:9999", proto: "tcp" };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("1.2.3.4:1234");
      expect(d).toContain("5.6.7.8:80");
      expect(d).toContain("TCP");
    });

    it("builds snort description with only src", () => {
      const alert = { ...base, source: "snort", src_ip: "1.2.3.4", src_port: 80 };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("1.2.3.4:80");
    });

    it("builds threat_intel description with IP", () => {
      const alert = { ...base, source: "threat_intel", src_ip: "9.9.9.9", details: { source: "feodo" } };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("9.9.9.9");
      expect(d).toContain("feodo");
    });

    it("builds threat_intel description without IP", () => {
      const d = normalizeAlert({ ...base, source: "threat_intel" }).description;
      expect(d).toContain("feed");
    });

    it("builds traffic_spike description", () => {
      const alert = { ...base, source: "traffic_spike", agent_id: "ag2", description: "10x spike" };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("ag2");
      expect(d).toContain("10x spike");
    });

    it("builds fail2ban description", () => {
      const alert = { ...base, source: "fail2ban", src_ip: "3.3.3.3" };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("3.3.3.3");
    });

    it("builds fail2ban description with unknown IP", () => {
      const d = normalizeAlert({ ...base, source: "fail2ban" }).description;
      expect(d).toContain("unknown");
    });

    it("builds beacon description", () => {
      const alert = { ...base, source: "beacon", dst_ip: "8.8.8.8", details: { interval_mean: 60, interval_cv: 0.05, sample_count: 5, process_name: "evil.exe" } };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("8.8.8.8");
      expect(d).toContain("~60s");
      expect(d).toContain("evil.exe");
    });

    it("builds beacon description with missing details", () => {
      const d = normalizeAlert({ ...base, source: "beacon" }).description;
      expect(d).toContain("C2 implant");
    });

    it("builds proc_net description", () => {
      const alert = { ...base, source: "proc_net", dst_ip: "7.7.7.7", details: { process_name: "curl", pid: 1234 } };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("curl");
      expect(d).toContain("1234");
    });

    it("builds correlation description with sources list", () => {
      const alert = { ...base, source: "correlation", details: { sources: ["snort", "beacon"] } };
      const d = normalizeAlert(alert).description;
      expect(d).toContain("snort");
      expect(d).toContain("beacon");
    });

    it("builds correlation description without sources", () => {
      const d = normalizeAlert({ ...base, source: "correlation" }).description;
      expect(d).toContain("multiple detectors");
    });

    it("falls back to description field for unknown source", () => {
      const d = normalizeAlert({ ...base, source: "custom", description: "my desc" }).description;
      expect(d).toBe("my desc");
    });

    it("falls back to title for unknown source without description", () => {
      const d = normalizeAlert({ ...base, source: "custom", description: undefined, title: "my title" }).description;
      expect(d).toBe("my title");
    });

    it("uses default text when no description or title", () => {
      const d = normalizeAlert({ ...base, source: "custom", description: undefined, title: undefined }).description;
      expect(d).toBe("Security event detected.");
    });
  });
});

// ── fetchSecurityAlerts ───────────────────────────────────────────────────────

describe("fetchSecurityAlerts", () => {
  it("calls apiGet with correct URL and normalizes results", async () => {
    const raw = [{ alert_id: "a1", source: "snort", severity: "HIGH", timestamp: 1700000000 }];
    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({ alerts: raw }) });

    const result = await fetchSecurityAlerts(50);

    expect(apiGet).toHaveBeenCalledWith("/threat/unified?limit=50");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });

  it("uses default limit of 200", async () => {
    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({ alerts: [] }) });
    await fetchSecurityAlerts();
    expect(apiGet).toHaveBeenCalledWith("/threat/unified?limit=200");
  });

  it("handles missing alerts key in response", async () => {
    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({}) });
    const result = await fetchSecurityAlerts();
    expect(result).toEqual([]);
  });
});

// ── updateAlertStatus ─────────────────────────────────────────────────────────

describe("updateAlertStatus", () => {
  it("calls apiPatch with encoded alertId and status", async () => {
    apiPatch.mockResolvedValue({});
    await updateAlertStatus("alert/123", "resolved");
    expect(apiPatch).toHaveBeenCalledWith(
      "/threat/unified/alert%2F123",
      { status: "resolved" }
    );
  });
});

// ── useSecurityAlerts hook ────────────────────────────────────────────────────

describe("useSecurityAlerts", () => {
  it("returns alerts and sets loading false on success", async () => {
    const raw = [{ alert_id: "b1", source: "anomaly", severity: "MEDIUM", timestamp: 1700000000 }];
    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({ alerts: raw }) });

    const { result } = renderHook(() => useSecurityAlerts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("sets error and empty alerts on fetch failure", async () => {
    apiGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useSecurityAlerts());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.alerts).toEqual([]);
  });

  it("refresh re-fetches alerts", async () => {
    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({ alerts: [] }) });

    const { result } = renderHook(() => useSecurityAlerts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    apiGet.mockResolvedValue({ json: jest.fn().mockResolvedValue({ alerts: [{ alert_id: "c1", source: "snort", severity: "LOW", timestamp: 1 }] }) });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.alerts).toHaveLength(1);
  });
});

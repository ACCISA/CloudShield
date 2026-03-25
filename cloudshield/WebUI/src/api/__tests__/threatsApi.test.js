import { explainSecurityAlert } from "../threatsApi";

jest.mock("../client", () => ({
  apiPost: jest.fn(),
}));

import { apiPost } from "../client";

describe("threatsApi", () => {
  afterEach(() => jest.clearAllMocks());

  it("posts to the threat explain endpoint", async () => {
    apiPost.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ explanation: "AI summary" }),
    });

    const payload = {
      risk: "high",
      type: "snort",
      category: "network",
      source: "sensor-1",
      description: "Suspicious connection detected",
    };

    const result = await explainSecurityAlert(payload);

    expect(apiPost).toHaveBeenCalledWith("/threat/alerts/explain", payload);
    expect(result).toEqual({ explanation: "AI summary" });
  });

  it("supports already-parsed responses", async () => {
    apiPost.mockResolvedValue({ explanation: "Parsed summary" });

    const result = await explainSecurityAlert({ risk: "low" });

    expect(result).toEqual({ explanation: "Parsed summary" });
  });
});

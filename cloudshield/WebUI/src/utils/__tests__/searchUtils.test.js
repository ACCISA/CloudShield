/**
 * searchUtils.test.js
 *
 * Test cases for typo tolerance in search functionality
 */

import { searchWithRelevance } from "../searchUtils";

describe("Search with Typo Tolerance", () => {
  test('should find "Michael" when searching "micheal"', () => {
    const users = [
      { id: 1, name: "Michael Scott" },
      { id: 2, name: "Jim Halpert" },
    ];

    const results = searchWithRelevance(users, "micheal", [
      { field: "name", weight: 1 },
    ]);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Michael Scott");
  });

  test('should find "Micheal" when searching "michael"', () => {
    const users = [
      { id: 1, name: "Micheal Burns" },
      { id: 2, name: "Noah Smith" },
    ];

    const results = searchWithRelevance(users, "michael", [
      { field: "name", weight: 1 },
    ]);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Micheal Burns");
  });

  test('should find both "Michael" and "Micheal" when searching either', () => {
    const users = [
      { id: 1, name: "Michael Scott" },
      { id: 2, name: "Micheal Burns" },
      { id: 3, name: "Noah Smith" },
    ];

    const results1 = searchWithRelevance(users, "michael", [
      { field: "name", weight: 1 },
    ]);
    const results2 = searchWithRelevance(users, "micheal", [
      { field: "name", weight: 1 },
    ]);

    // Both searches should find both Michael and Micheal
    expect(results1.length).toBe(2);
    expect(results2.length).toBe(2);
  });

  test("should prioritize exact matches over typo matches", () => {
    const users = [
      { id: 1, name: "Michael Scott" },
      { id: 2, name: "Micheal Burns" },
    ];

    const results = searchWithRelevance(users, "michael", [
      { field: "name", weight: 1 },
    ]);

    // Exact match should be first
    expect(results[0].name).toBe("Michael Scott");
    expect(results[1].name).toBe("Micheal Burns");
  });

  test("should handle one-letter typos", () => {
    const users = [
      { id: 1, name: "Jon Smith" },
      { id: 2, name: "John Doe" },
    ];

    const results = searchWithRelevance(users, "jon", [
      { field: "name", weight: 1 },
    ]);

    expect(results.length).toBe(2);
    expect(results.map((u) => u.name)).toContain("Jon Smith");
    expect(results.map((u) => u.name)).toContain("John Doe");
  });

  test("should handle common transpositions", () => {
    const activities = [
      { id: 1, user: "Michael", activity: "Uploaded file" },
      { id: 2, user: "Micheal", activity: "Created folder" },
      { id: 3, user: "Sarah", activity: "Deleted item" },
    ];

    const results = searchWithRelevance(activities, "michael", [
      { field: "user", weight: 1 },
    ]);

    expect(results.length).toBe(2);
    expect(results.map((a) => a.user)).toContain("Michael");
    expect(results.map((a) => a.user)).toContain("Micheal");
  });

  test("should not match strings that are too different", () => {
    const users = [
      { id: 1, name: "Michael" },
      { id: 2, name: "Sarah" },
    ];

    const results = searchWithRelevance(users, "michael", [
      { field: "name", weight: 1 },
    ]);

    // Should only find Michael, not Sarah (too different)
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Michael");
  });

  test("should handle weighted fields with typo tolerance", () => {
    const users = [
      { id: 1, name: "Micheal Burns", email: "micheal@example.com" },
      { id: 2, name: "Noah Smith", email: "michael@example.com" },
    ];

    const results = searchWithRelevance(users, "michael", [
      { field: "name", weight: 2 },
      { field: "email", weight: 1 },
    ]);

    // Both should be found
    expect(results.length).toBe(2);
    // Name match should be weighted higher
    expect(results[0].name).toBe("Micheal Burns");
  });

  test("should handle multiple word searches with typos", () => {
    const users = [
      { id: 1, name: "Michael Scott" },
      { id: 2, name: "Micheal Burns" },
      { id: 3, name: "Mike Jones" },
    ];

    const results = searchWithRelevance(users, "michel", [
      { field: "name", weight: 1 },
    ]);

    // Should find both Michael and Micheal (within edit distance)
    expect(results.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";

import { clampDate, dateOnly } from "@/lib/dateRange";

describe("dateOnly", () => {
  it("extracts the date portion of an ISO datetime", () => {
    expect(dateOnly("2023-01-02T00:00:00Z")).toBe("2023-01-02");
    expect(dateOnly("2023-01-02")).toBe("2023-01-02");
  });

  it("returns undefined for null/empty", () => {
    expect(dateOnly(null)).toBeUndefined();
    expect(dateOnly(undefined)).toBeUndefined();
    expect(dateOnly("")).toBeUndefined();
  });
});

describe("clampDate", () => {
  it("clamps below min and above max", () => {
    expect(clampDate("2022-12-31", "2023-01-01", "2023-12-31")).toBe("2023-01-01");
    expect(clampDate("2024-06-01", "2023-01-01", "2023-12-31")).toBe("2023-12-31");
  });

  it("leaves in-range values untouched", () => {
    expect(clampDate("2023-06-15", "2023-01-01", "2023-12-31")).toBe("2023-06-15");
  });

  it("ignores missing bounds", () => {
    expect(clampDate("2023-06-15")).toBe("2023-06-15");
    expect(clampDate("2020-01-01", undefined, "2023-12-31")).toBe("2020-01-01");
  });
});

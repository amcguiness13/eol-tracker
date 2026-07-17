import { describe, expect, it } from "vitest";
import { computeStatus, DEFAULT_APPROACHING_THRESHOLD_DAYS } from "../services/statusService.js";

const NOW = new Date("2026-07-17T12:00:00.000Z");

describe("computeStatus", () => {
  it("is 'supported' when the EOL date is well beyond the threshold", () => {
    const result = computeStatus({ eolFrom: "2028-01-01", eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.status).toBe("supported");
    expect(result.eolDate).toBe("2028-01-01");
    expect(result.daysRemaining).toBeGreaterThan(90);
  });

  it("is 'approaching' when within the threshold", () => {
    // 2026-07-17 + 30 days = 2026-08-16
    const result = computeStatus({ eolFrom: "2026-08-16", eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.status).toBe("approaching");
    expect(result.daysRemaining).toBe(30);
  });

  it("is 'eol' with a negative daysRemaining once the EOL date has passed", () => {
    const result = computeStatus({ eolFrom: "2026-01-01", eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.status).toBe("eol");
    expect(result.daysRemaining).toBeLessThan(0);
    // 2026-01-01 to 2026-07-17 is 197 days overdue
    expect(result.daysRemaining).toBe(-197);
  });

  it("is 'supported' with null daysRemaining when there is no known EOL date", () => {
    const result = computeStatus({ eolFrom: null, eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.status).toBe("supported");
    expect(result.eolDate).toBeNull();
    expect(result.daysRemaining).toBeNull();
  });

  it("treats daysRemaining exactly at the threshold as approaching (inclusive boundary)", () => {
    // exactly 90 days out
    const result = computeStatus({ eolFrom: "2026-10-15", eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.daysRemaining).toBe(90);
    expect(result.status).toBe("approaching");
  });

  it("treats daysRemaining one day beyond the threshold as still supported", () => {
    const result = computeStatus({ eolFrom: "2026-10-16", eoasFrom: null, discontinuedFrom: null }, 90, NOW);
    expect(result.daysRemaining).toBe(91);
    expect(result.status).toBe("supported");
  });

  it("computes a distinct support-end date (End of Active Support) alongside EOL", () => {
    const result = computeStatus({ eolFrom: "2027-04-30", eoasFrom: "2026-10-20", discontinuedFrom: null }, 90, NOW);
    expect(result.eolDate).toBe("2027-04-30");
    expect(result.supportEndDate).toBe("2026-10-20");
    expect(result.daysUntilSupportEnd).toBe(95);
    expect(result.status).toBe("supported"); // status is driven by EOL date, not support-end date
  });

  it("falls back to discontinuedFrom for support-end when eoasFrom is absent (hardware/device products)", () => {
    const result = computeStatus({ eolFrom: null, eoasFrom: null, discontinuedFrom: "2026-05-01" }, 90, NOW);
    expect(result.supportEndDate).toBe("2026-05-01");
    expect(result.daysUntilSupportEnd).toBeLessThan(0);
  });

  it("uses the 90-day default threshold when none is passed", () => {
    const result = computeStatus({ eolFrom: "2026-10-15", eoasFrom: null, discontinuedFrom: null }, undefined, NOW);
    expect(DEFAULT_APPROACHING_THRESHOLD_DAYS).toBe(90);
    expect(result.status).toBe("approaching");
  });

  it("respects a custom (e.g. 7-day) threshold for approaching status", () => {
    const result = computeStatus({ eolFrom: "2026-08-16", eoasFrom: null, discontinuedFrom: null }, 7, NOW);
    expect(result.daysRemaining).toBe(30);
    expect(result.status).toBe("supported"); // 30 days out is not within a 7-day threshold
  });
});

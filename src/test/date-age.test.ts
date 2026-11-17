import { describe, it, expect } from "vitest";
import { daysSince, ageLabel } from "@/lib/dates";

// Local noon on 17 Nov 2026 — the day the test ticket came in and showed "-14 dagar sedan".
const NOW = new Date(2026, 10, 17, 12, 0, 0).getTime();

describe("ticket age", () => {
  it("counts a ticket created today as 0 days", () => {
    expect(daysSince("2026-11-17", NOW)).toBe(0);
  });

  it("labels a ticket created today as Idag, never a negative number", () => {
    const label = ageLabel(daysSince("2026-11-17", NOW));
    expect(label).toBe("Idag");
    expect(label).not.toContain("-");
  });

  it("counts yesterday as 1 day and labels it Igår", () => {
    expect(daysSince("2026-11-16", NOW)).toBe(1);
    expect(ageLabel(1)).toBe("Igår");
  });

  it("counts a two-week-old ticket as 14 days", () => {
    expect(daysSince("2026-11-03", NOW)).toBe(14);
    expect(ageLabel(14)).toBe("14 dagar sedan");
  });

  it("never goes negative for a date in the future", () => {
    expect(daysSince("2026-12-01", NOW)).toBe(0);
    expect(ageLabel(daysSince("2026-12-01", NOW))).toBe("Idag");
  });

  it("falls back to Idag for a missing or unparsable date", () => {
    expect(daysSince("", NOW)).toBe(0);
    expect(daysSince("inget datum", NOW)).toBe(0);
    expect(ageLabel(daysSince("", NOW))).toBe("Idag");
  });
});

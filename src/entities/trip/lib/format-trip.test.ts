import { describe, expect, it } from "vitest";

import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";

describe("trip presentation", () => {
  it("formats a date range within one month", () => {
    expect(formatTripDateRange("2026-04-18", "2026-04-21")).toBe("4월 18일–21일");
  });

  it("formats a date range across months without using the machine time zone", () => {
    expect(formatTripDateRange("2026-04-30", "2026-05-02")).toBe("4월 30일–5월 2일");
  });

  it("formats inclusive days and overnight stays", () => {
    expect(formatTripLength("2026-04-18", "2026-04-21")).toBe("3박 4일");
  });
});

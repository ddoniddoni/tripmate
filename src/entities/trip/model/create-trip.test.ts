import { describe, expect, it } from "vitest";

import { createTripSchema, parseCreateTripFormData } from "@/entities/trip/model/create-trip";

const validTrip = {
  destination: "대한민국 · 부산",
  endDate: "2026-10-12",
  startDate: "2026-10-10",
  timeZone: "Asia/Seoul",
  title: "가을의 부산",
};

describe("create trip input", () => {
  it("accepts a valid trip and trims text fields", () => {
    expect(createTripSchema.parse({ ...validTrip, title: "  가을의 부산  " })).toMatchObject({
      ...validTrip,
    });
  });

  it("rejects a trip whose end date comes before its start date", () => {
    const result = createTripSchema.safeParse({
      ...validTrip,
      endDate: "2026-10-09",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["endDate"]);
    }
  });

  it("parses only the expected fields from form data", () => {
    const formData = new FormData();
    Object.entries(validTrip).forEach(([key, value]) => formData.set(key, value));
    formData.set("untrusted", "ignored");

    expect(parseCreateTripFormData(formData)).toMatchObject({ success: true, data: validTrip });
  });
});

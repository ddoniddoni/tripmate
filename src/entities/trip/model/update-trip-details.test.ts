import { describe, expect, it } from "vitest";

import { parseUpdateTripDetailsFormData } from "@/entities/trip/model/update-trip-details";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

function createFormData() {
  const formData = new FormData();
  formData.set("tripId", tripId);
  formData.set("title", "  가을의 부산  ");
  formData.set("destination", "  대한민국 · 부산  ");
  formData.set("startDate", "2026-10-10");
  formData.set("endDate", "2026-10-12");
  return formData;
}

describe("parseUpdateTripDetailsFormData", () => {
  it("parses and trims the editable trip details", () => {
    const result = parseUpdateTripDetailsFormData(createFormData());

    expect(result).toEqual({
      data: {
        destination: "대한민국 · 부산",
        endDate: "2026-10-12",
        startDate: "2026-10-10",
        title: "가을의 부산",
        tripId,
      },
      success: true,
    });
  });

  it("rejects an invalid trip ID and blank title", () => {
    const formData = createFormData();
    formData.set("tripId", "not-a-trip-id");
    formData.set("title", "   ");

    expect(parseUpdateTripDetailsFormData(formData).success).toBe(false);
  });

  it("rejects a trip period where the end date comes first", () => {
    const formData = createFormData();
    formData.set("startDate", "2026-10-13");

    expect(parseUpdateTripDetailsFormData(formData).success).toBe(false);
  });
});

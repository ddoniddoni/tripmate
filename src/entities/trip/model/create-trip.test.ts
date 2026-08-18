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

  it("rejects a year longer than four digits with a clear Korean message", () => {
    const result = createTripSchema.safeParse({
      ...validTrip,
      startDate: "202608-12-01",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "연도는 네 자리로 입력해 주세요.",
            path: ["startDate"],
          }),
        ]),
      );
    }
  });

  it("uses Korean validation messages for missing travel details", () => {
    const result = createTripSchema.safeParse({
      ...validTrip,
      destination: "",
      title: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: "여행 이름을 입력해 주세요.", path: ["title"] }),
          expect.objectContaining({ message: "여행지를 입력해 주세요.", path: ["destination"] }),
        ]),
      );
    }
  });

  it("parses only the expected fields from form data", () => {
    const formData = new FormData();
    Object.entries(validTrip).forEach(([key, value]) => formData.set(key, value));
    formData.set("untrusted", "ignored");

    expect(parseCreateTripFormData(formData)).toMatchObject({ success: true, data: validTrip });
  });
});

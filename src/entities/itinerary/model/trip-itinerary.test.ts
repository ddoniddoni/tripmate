import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import {
  parseTripItinerary,
  validateTripItinerary,
} from "@/entities/itinerary/model/trip-itinerary";

function expectInvalid(input: unknown, message: string) {
  const result = validateTripItinerary(input);

  expect(result.success).toBe(false);

  if (!result.success) {
    expect(result.issues.some((issue) => issue.message.includes(message))).toBe(true);
  }
}

describe("tripItinerarySchema", () => {
  it("accepts the deterministic Jeju fixture", () => {
    const result = validateTripItinerary(jejuTrip);

    expect(result).toEqual({ success: true, data: jejuTrip });
  });

  it("rejects a day outside the trip range", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.days["jeju-day-4"].date = "2026-04-22";

    expectInvalid(input, "여행 기간 밖");
  });

  it("rejects an impossible calendar date", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.days["jeju-day-2"].date = "2026-02-30";

    expectInvalid(input, "유효한 날짜");
  });

  it("rejects duplicate item references across days", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.days["jeju-day-2"].itemIds.push("woojin-breakfast");

    expectInvalid(input, "둘 이상의 위치");
  });

  it("rejects references to missing items", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.days["jeju-day-1"].itemIds.push("missing-item");

    expectInvalid(input, "존재하지 않는 아이템");
  });

  it("rejects items whose dayId differs from their containing day", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.items["woojin-breakfast"].dayId = "jeju-day-2";

    expectInvalid(input, "포함된 날짜와 일치하지 않습니다");
  });

  it("rejects orphaned items", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.days["jeju-day-1"].itemIds = input.itinerary.days[
      "jeju-day-1"
    ].itemIds.filter((itemId) => itemId !== "woojin-breakfast");

    expectInvalid(input, "어떤 날짜에도 포함되지 않았습니다");
  });

  it("rejects invalid schedule times and durations", () => {
    const invalidTime = structuredClone(jejuTrip);
    invalidTime.itinerary.items["woojin-breakfast"].startTime = "25:00";

    const invalidDuration = structuredClone(jejuTrip);
    invalidDuration.itinerary.items["woojin-breakfast"].durationMinutes = 0;

    expectInvalid(invalidTime, "HH:mm");
    expectInvalid(invalidDuration, "1분 이상");
  });

  it("rejects coordinates outside valid longitude and latitude ranges", () => {
    const invalidLongitude = structuredClone(jejuTrip);
    invalidLongitude.itinerary.items["woojin-breakfast"].place.longitude = 181;

    const invalidLatitude = structuredClone(jejuTrip);
    invalidLatitude.itinerary.items["woojin-breakfast"].place.latitude = -91;

    expectInvalid(invalidLongitude, "180 이하");
    expectInvalid(invalidLatitude, "-90 이상");
  });

  it("rejects invalid trip ranges and time zones", () => {
    const invalidRange = structuredClone(jejuTrip);
    invalidRange.trip.endDate = "2026-04-17";

    const invalidTimeZone = structuredClone(jejuTrip);
    invalidTimeZone.trip.timeZone = "Jeju/Local";

    expectInvalid(invalidRange, "종료일");
    expectInvalid(invalidTimeZone, "IANA 시간대");
  });

  it("throws at trusted-data boundaries when parsing invalid input", () => {
    const input = structuredClone(jejuTrip);
    input.itinerary.dayOrder.push("missing-day");

    expect(() => parseTripItinerary(input)).toThrow();
  });
});

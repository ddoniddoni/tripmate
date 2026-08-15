import { describe, expect, it } from "vitest";

import {
  getSafeInternalPath,
  getSafeTripEditorPath,
} from "@/shared/lib/safe-internal-path";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const dayId = "bbd0c1f9-a6e4-40b6-a320-4b5e35296c9a";

describe("getSafeInternalPath", () => {
  it("keeps an invitation destination with a valid token", () => {
    const invitationPath = `/invites/${"a".repeat(43)}`;

    expect(getSafeInternalPath(invitationPath)).toBe(invitationPath);
  });

  it("keeps a safe trip editor destination and normalizes its workspace query", () => {
    expect(
      getSafeInternalPath(`/trips/${tripId}?day=${dayId}&view=itinerary&source=share`),
    ).toBe(`/trips/${tripId}?view=itinerary&day=${dayId}`);
    expect(
      getSafeTripEditorPath(tripId, { day: [dayId], view: ["expenses"] }),
    ).toBe(`/trips/${tripId}?view=expenses&day=${dayId}`);
  });

  it("rejects external, unrelated, and malformed invitation destinations", () => {
    expect(getSafeInternalPath("https://example.com")).toBe("/trips");
    expect(getSafeInternalPath("//example.com")).toBe("/trips");
    expect(getSafeInternalPath("/\\example.com")).toBe("/trips");
    expect(getSafeInternalPath("/login")).toBe("/trips");
    expect(getSafeInternalPath("/invites/not-a-valid-token")).toBe("/trips");
    expect(getSafeInternalPath(`/trips/not-a-uuid?view=itinerary`)).toBe("/trips");
    expect(getSafeInternalPath(`//example.com/trips/${tripId}`)).toBe("/trips");
  });
});

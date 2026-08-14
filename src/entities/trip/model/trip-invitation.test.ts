import { describe, expect, it } from "vitest";

import {
  createTripInvitationSchema,
  isTripInvitationExpired,
  parseRevokeTripInvitationFormData,
  tripInvitationTokenSchema,
} from "@/entities/trip/model/trip-invitation";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";

describe("trip invitation input", () => {
  it("normalizes an invitee email and accepts editor or viewer roles", () => {
    expect(
      createTripInvitationSchema.parse({
        email: "  FRIEND@EXAMPLE.COM ",
        role: "editor",
        tripId,
      }),
    ).toEqual({
      email: "friend@example.com",
      role: "editor",
      tripId,
    });
  });

  it("does not allow owner invitations or malformed invitation links", () => {
    expect(
      createTripInvitationSchema.safeParse({
        email: "friend@example.com",
        role: "owner",
        tripId,
      }).success,
    ).toBe(false);
    expect(tripInvitationTokenSchema.safeParse("not-an-invitation-token").success).toBe(false);
  });

  it("validates revocation targets and derives expiration from an ISO timestamp", () => {
    const formData = new FormData();
    formData.set("invitationId", "791fa61b-fd1e-4f09-a331-e0816e32728d");
    formData.set("tripId", tripId);

    expect(parseRevokeTripInvitationFormData(formData).success).toBe(true);
    expect(
      isTripInvitationExpired(
        {
          email: "friend@example.com",
          expiresAt: "2026-04-24T00:00:00.000Z",
          id: "791fa61b-fd1e-4f09-a331-e0816e32728d",
          role: "viewer",
        },
        new Date("2026-04-25T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

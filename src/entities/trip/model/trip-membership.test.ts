import { describe, expect, it } from "vitest";

import {
  getTripPermissions,
  parseLeaveTripFormData,
  parseRemoveTripMemberFormData,
  parseTransferTripOwnershipFormData,
  parseUpdateTripMemberRoleFormData,
  tripInvitationRoleSchema,
  tripMemberRoleSchema,
} from "@/entities/trip/model/trip-membership";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const memberId = "791fa61b-fd1e-4f09-a331-e0816e32728d";

describe("trip membership permissions", () => {
  it("accepts the three supported member roles", () => {
    expect(tripMemberRoleSchema.options).toEqual(["owner", "editor", "viewer"]);
  });

  it("limits new invitations to editor and viewer roles", () => {
    expect(tripInvitationRoleSchema.options).toEqual(["editor", "viewer"]);
  });

  it("allows only owners to manage members, update, or delete a trip", () => {
    expect(getTripPermissions("owner")).toEqual({
      canDeleteTrip: true,
      canEditItinerary: true,
      canManageMembers: true,
      canUpdateTrip: true,
    });
    expect(getTripPermissions("editor")).toEqual({
      canDeleteTrip: false,
      canEditItinerary: true,
      canManageMembers: false,
      canUpdateTrip: false,
    });
    expect(getTripPermissions("viewer")).toEqual({
      canDeleteTrip: false,
      canEditItinerary: false,
      canManageMembers: false,
      canUpdateTrip: false,
    });
  });

  it("accepts only editor and viewer role updates for another trip member", () => {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("role", "editor");
    formData.set("tripId", tripId);

    expect(parseUpdateTripMemberRoleFormData(formData)).toMatchObject({
      data: { memberId, role: "editor", tripId },
      success: true,
    });

    formData.set("role", "owner");
    expect(parseUpdateTripMemberRoleFormData(formData).success).toBe(false);
  });

  it("parses a member removal target", () => {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("tripId", tripId);

    expect(parseRemoveTripMemberFormData(formData)).toMatchObject({
      data: { memberId, tripId },
      success: true,
    });
  });

  it("parses a member leaving a trip without accepting another user id", () => {
    const formData = new FormData();
    formData.set("tripId", tripId);

    expect(parseLeaveTripFormData(formData)).toMatchObject({
      data: { tripId },
      success: true,
    });
  });

  it("parses an ownership transfer target", () => {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("tripId", tripId);

    expect(parseTransferTripOwnershipFormData(formData)).toMatchObject({
      data: { memberId, tripId },
      success: true,
    });
  });
});

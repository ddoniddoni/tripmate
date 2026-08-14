import { describe, expect, it } from "vitest";

import {
  getTripPermissions,
  tripInvitationRoleSchema,
  tripMemberRoleSchema,
} from "@/entities/trip/model/trip-membership";

describe("trip membership permissions", () => {
  it("accepts the three supported member roles", () => {
    expect(tripMemberRoleSchema.options).toEqual(["owner", "editor", "viewer"]);
  });

  it("limits new invitations to editor and viewer roles", () => {
    expect(tripInvitationRoleSchema.options).toEqual(["editor", "viewer"]);
  });

  it("allows only owners to manage members or delete a trip", () => {
    expect(getTripPermissions("owner")).toEqual({
      canDeleteTrip: true,
      canEditItinerary: true,
      canManageMembers: true,
    });
    expect(getTripPermissions("editor")).toEqual({
      canDeleteTrip: false,
      canEditItinerary: true,
      canManageMembers: false,
    });
    expect(getTripPermissions("viewer")).toEqual({
      canDeleteTrip: false,
      canEditItinerary: false,
      canManageMembers: false,
    });
  });
});

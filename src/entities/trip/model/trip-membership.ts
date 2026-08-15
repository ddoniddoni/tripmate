import { z } from "@/shared/lib/zod";

import { profileDisplayNameSchema } from "@/entities/user/model/profile";

export const tripMemberRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const tripInvitationRoleSchema = z.enum(["editor", "viewer"]);

export type TripMemberRole = z.infer<typeof tripMemberRoleSchema>;
export type TripInvitationRole = z.infer<typeof tripInvitationRoleSchema>;

export const tripMemberSchema = z.object({
  displayName: profileDisplayNameSchema.nullable(),
  role: tripMemberRoleSchema,
  userId: z.uuid(),
});

export type TripMember = z.infer<typeof tripMemberSchema>;

export const updateTripMemberRoleSchema = z.object({
  memberId: z.uuid(),
  role: tripInvitationRoleSchema,
  tripId: z.uuid(),
});

export const removeTripMemberSchema = z.object({
  memberId: z.uuid(),
  tripId: z.uuid(),
});

export const leaveTripSchema = z.object({
  tripId: z.uuid(),
});

export const transferTripOwnershipSchema = z.object({
  memberId: z.uuid(),
  tripId: z.uuid(),
});

export function parseUpdateTripMemberRoleFormData(formData: FormData) {
  return updateTripMemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
    tripId: formData.get("tripId"),
  });
}

export function parseRemoveTripMemberFormData(formData: FormData) {
  return removeTripMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    tripId: formData.get("tripId"),
  });
}

export function parseLeaveTripFormData(formData: FormData) {
  return leaveTripSchema.safeParse({
    tripId: formData.get("tripId"),
  });
}

export function parseTransferTripOwnershipFormData(formData: FormData) {
  return transferTripOwnershipSchema.safeParse({
    memberId: formData.get("memberId"),
    tripId: formData.get("tripId"),
  });
}

export type TripPermissions = {
  canDeleteTrip: boolean;
  canEditItinerary: boolean;
  canManageMembers: boolean;
  canUpdateTrip: boolean;
};

export function getTripPermissions(role: TripMemberRole): TripPermissions {
  return {
    canDeleteTrip: role === "owner",
    canEditItinerary: role === "owner" || role === "editor",
    canManageMembers: role === "owner",
    canUpdateTrip: role === "owner",
  };
}

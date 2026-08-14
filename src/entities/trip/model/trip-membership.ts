import { z } from "@/shared/lib/zod";

export const tripMemberRoleSchema = z.enum(["owner", "editor", "viewer"]);
export const tripInvitationRoleSchema = z.enum(["editor", "viewer"]);

export type TripMemberRole = z.infer<typeof tripMemberRoleSchema>;
export type TripInvitationRole = z.infer<typeof tripInvitationRoleSchema>;

export const tripMemberSchema = z.object({
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

import { z } from "@/shared/lib/zod";

import { tripInvitationRoleSchema } from "@/entities/trip/model/trip-membership";
import { tripSchema } from "@/entities/trip/model/trip";

export const tripInvitationEmailSchema = z
  .string("초대할 이메일 주소를 입력해 주세요.")
  .trim()
  .min(1, "초대할 이메일 주소를 입력해 주세요.")
  .toLowerCase()
  .email("유효한 이메일 주소를 입력해 주세요.")
  .max(320, "이메일 주소가 너무 깁니다.");

export const tripInvitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "초대 링크가 올바르지 않습니다.");

export const tripInvitationStatusSchema = z.enum(["pending", "accepted", "declined"]);

export type TripInvitationStatus = z.infer<typeof tripInvitationStatusSchema>;

export const createTripInvitationSchema = z.object({
  email: tripInvitationEmailSchema,
  role: tripInvitationRoleSchema,
  tripId: z.uuid(),
});

export type CreateTripInvitationInput = z.infer<typeof createTripInvitationSchema>;

export const tripInvitationSchema = z.object({
  email: tripInvitationEmailSchema,
  expiresAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  role: tripInvitationRoleSchema,
});

export type TripInvitation = z.infer<typeof tripInvitationSchema>;

export const tripInvitationPreviewSchema = z.object({
  expiresAt: z.iso.datetime({ offset: true }),
  role: tripInvitationRoleSchema,
  trip: tripSchema,
});

export type TripInvitationPreview = z.infer<typeof tripInvitationPreviewSchema>;

export const tripInvitationNotificationSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  role: tripInvitationRoleSchema,
  status: tripInvitationStatusSchema,
  trip: tripSchema,
});

export type TripInvitationNotification = z.infer<typeof tripInvitationNotificationSchema>;

export const revokeTripInvitationSchema = z.object({
  invitationId: z.uuid(),
  tripId: z.uuid(),
});

export const respondToTripInvitationSchema = z.object({
  invitationId: z.uuid(),
  response: z.enum(["accepted", "declined"]),
});

export type RespondToTripInvitationInput = z.infer<typeof respondToTripInvitationSchema>;

export function parseCreateTripInvitationFormData(formData: FormData) {
  return createTripInvitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    tripId: formData.get("tripId"),
  });
}

export function parseRevokeTripInvitationFormData(formData: FormData) {
  return revokeTripInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
    tripId: formData.get("tripId"),
  });
}

export function parseRespondToTripInvitationFormData(formData: FormData) {
  return respondToTripInvitationSchema.safeParse({
    invitationId: formData.get("invitationId"),
    response: formData.get("response"),
  });
}

export function isTripInvitationExpired(invitation: TripInvitation, now = new Date()) {
  return new Date(invitation.expiresAt).getTime() <= now.getTime();
}

export function isTripInvitationNotificationActionable(
  notification: TripInvitationNotification,
  now = new Date(),
) {
  return (
    notification.status === "pending" &&
    new Date(notification.expiresAt).getTime() > now.getTime()
  );
}

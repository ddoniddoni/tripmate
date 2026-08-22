import { z } from "@/shared/lib/zod";

import {
  tripInvitationNotificationSchema,
  type TripInvitationNotification,
} from "@/entities/trip/model/trip-invitation";
import { calendarDateSchema } from "@/shared/lib/calendar-date";
import { retrySupabaseJwtValidation } from "@/shared/api/supabase/auth-retry";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const userIdSchema = z.uuid();
const notificationRowsSchema = z.array(
  z.object({
    created_at: tripInvitationNotificationSchema.shape.createdAt,
    expires_at: tripInvitationNotificationSchema.shape.expiresAt,
    id: tripInvitationNotificationSchema.shape.id,
    role: tripInvitationNotificationSchema.shape.role,
    status: tripInvitationNotificationSchema.shape.status,
    trip_destination: z.string(),
    trip_end_date: calendarDateSchema,
    trip_id: z.uuid(),
    trip_start_date: calendarDateSchema,
    trip_time_zone: z.string(),
    trip_title: z.string(),
  }),
);

export class SupabaseTripNotificationRepositoryError extends Error {
  constructor() {
    super("알림을 불러오지 못했습니다.");
    this.name = "SupabaseTripNotificationRepositoryError";
  }
}

function reportNotificationQueryError(operation: string, error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  console.error("Supabase invitation notification query failed.", { code, operation });
}

export async function listSupabaseTripInvitationNotifications(
  userId: string,
): Promise<TripInvitationNotification[]> {
  if (!userIdSchema.safeParse(userId).success) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const requestNotifications = () => supabase.rpc("list_trip_invitation_notifications");
  const { data, error } = await retrySupabaseJwtValidation(requestNotifications);

  if (error) {
    reportNotificationQueryError("list", error);
    throw new SupabaseTripNotificationRepositoryError();
  }

  try {
    return notificationRowsSchema.parse(data).map((notification) =>
      tripInvitationNotificationSchema.parse({
        createdAt: notification.created_at,
        expiresAt: notification.expires_at,
        id: notification.id,
        role: notification.role,
        status: notification.status,
        trip: {
          destination: notification.trip_destination,
          endDate: notification.trip_end_date,
          id: notification.trip_id,
          startDate: notification.trip_start_date,
          timeZone: notification.trip_time_zone,
          title: notification.trip_title,
        },
      }),
    );
  } catch {
    throw new SupabaseTripNotificationRepositoryError();
  }
}

export async function countSupabasePendingTripInvitationNotifications(userId: string) {
  if (!userIdSchema.safeParse(userId).success) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const requestCount = () =>
    supabase
      .from("trip_invitations")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString());
  const { count, error } = await retrySupabaseJwtValidation(requestCount);

  if (error) {
    reportNotificationQueryError("count-pending", error);
    throw new SupabaseTripNotificationRepositoryError();
  }

  return count ?? 0;
}

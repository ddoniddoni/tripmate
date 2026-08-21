import { z } from "@/shared/lib/zod";

import {
  tripMemberSchema,
  type TripMember,
} from "@/entities/trip/model/trip-membership";
import { profileDisplayNameSchema } from "@/entities/user/model/profile";
import {
  tripInvitationSchema,
  tripInvitationEmailSchema,
  tripInvitationPreviewSchema,
  type TripInvitation,
  type TripInvitationPreview,
} from "@/entities/trip/model/trip-invitation";
import { tripSchema, type Trip } from "@/entities/trip/model/trip";
import { tripCoverImagePathSchema } from "@/entities/trip/model/trip-cover-image";
import { calendarDateSchema } from "@/shared/lib/calendar-date";
import { createSupabaseAdminClient } from "@/shared/api/supabase/admin";
import {
  isSupabaseJwtIssuedInFutureError,
  waitForSupabaseTokenClockSync,
} from "@/shared/api/supabase/auth-retry";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const supabaseTripIdSchema = z.uuid();
const tripSelectFields = "id, title, destination, start_date, end_date, time_zone";
const tripSelectFieldsWithCoverImage = `${tripSelectFields}, cover_image_path`;
const tripInvitationPreviewSelectFields = `role, expires_at, trips(${tripSelectFields})`;
const tripInvitationPreviewSelectFieldsWithCoverImage = `role, expires_at, trips(${tripSelectFieldsWithCoverImage})`;
const supabaseTripRowSchema = z.object({
  cover_image_path: tripCoverImagePathSchema.nullable().optional().default(null),
  destination: z.string(),
  end_date: calendarDateSchema,
  id: supabaseTripIdSchema,
  start_date: calendarDateSchema,
  time_zone: z.string(),
  title: z.string(),
});

const supabaseTripRowsSchema = z.array(supabaseTripRowSchema);
const supabaseTripMemberRowsSchema = z.array(
  z.object({
    profiles: z
      .object({
        display_name: profileDisplayNameSchema.nullable(),
      })
      .nullable(),
    role: tripMemberSchema.shape.role,
    user_id: tripMemberSchema.shape.userId,
  }),
);
const supabaseTripInvitationRowsSchema = z.array(
  z.object({
    email: tripInvitationSchema.shape.email,
    expires_at: tripInvitationSchema.shape.expiresAt,
    id: tripInvitationSchema.shape.id,
    role: tripInvitationSchema.shape.role,
  }),
);
const supabaseTripInvitationPreviewRowSchema = z.object({
  expires_at: tripInvitationSchema.shape.expiresAt,
  role: tripInvitationSchema.shape.role,
  trips: supabaseTripRowSchema.nullable(),
});

export class SupabaseTripRepositoryError extends Error {
  constructor() {
    super("여행 데이터를 불러오지 못했습니다.");
    this.name = "SupabaseTripRepositoryError";
  }
}

function reportSupabaseTripQueryError(operation: string, error: unknown) {
  if (typeof error !== "object" || error === null) {
    console.error("Supabase trip query failed.", { operation });
    return;
  }

  const { code, details, hint, message } = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  console.error("Supabase trip query failed.", {
    code,
    details,
    hint,
    message,
    operation,
  });
}

/**
 * A staged deploy can briefly run the application before the matching
 * Supabase migration has reached the database. Keep existing trips readable
 * in that state, but do not hide unrelated query failures.
 */
export function isSupabaseTripCoverColumnUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };

  return (
    typeof message === "string" &&
    message.includes("cover_image_path") &&
    (code === "42703" || code === "PGRST204")
  );
}

function toTrip(row: z.infer<typeof supabaseTripRowSchema>): Trip {
  return tripSchema.parse({
    coverImagePath: row.cover_image_path ?? undefined,
    destination: row.destination,
    endDate: row.end_date,
    id: row.id,
    startDate: row.start_date,
    timeZone: row.time_zone,
    title: row.title,
  });
}

export async function listSupabaseTrips(): Promise<Trip[]> {
  const supabase = await createSupabaseServerClient();
  const requestTrips = () =>
    supabase
      .from("trips")
      .select(tripSelectFieldsWithCoverImage)
      .order("start_date", { ascending: true });
  let initialResult = await requestTrips();

  if (isSupabaseJwtIssuedInFutureError(initialResult.error)) {
    await waitForSupabaseTokenClockSync();
    initialResult = await requestTrips();
  }

  let data: unknown = initialResult.data;
  let error: unknown = initialResult.error;

  if (isSupabaseTripCoverColumnUnavailable(error)) {
    const fallbackResult = await supabase
      .from("trips")
      .select(tripSelectFields)
      .order("start_date", { ascending: true });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    reportSupabaseTripQueryError("list", error);
    throw new SupabaseTripRepositoryError();
  }

  try {
    return supabaseTripRowsSchema.parse(data).map(toTrip);
  } catch {
    throw new SupabaseTripRepositoryError();
  }
}

export async function getSupabaseTrip(tripId: string): Promise<Trip | null> {
  if (!supabaseTripIdSchema.safeParse(tripId).success) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const initialResult = await supabase
    .from("trips")
    .select(tripSelectFieldsWithCoverImage)
    .eq("id", tripId)
    .maybeSingle();
  let data: unknown = initialResult.data;
  let error: unknown = initialResult.error;

  if (isSupabaseTripCoverColumnUnavailable(error)) {
    const fallbackResult = await supabase
      .from("trips")
      .select(tripSelectFields)
      .eq("id", tripId)
      .maybeSingle();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    reportSupabaseTripQueryError("get", error);
    throw new SupabaseTripRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    return toTrip(supabaseTripRowSchema.parse(data));
  } catch {
    throw new SupabaseTripRepositoryError();
  }
}

export async function listSupabaseTripMembers(tripId: string): Promise<TripMember[]> {
  if (!supabaseTripIdSchema.safeParse(tripId).success) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trip_members")
    .select("user_id, role, profiles(display_name)")
    .eq("trip_id", tripId);

  if (error) {
    reportSupabaseTripQueryError("list-members", error);
    throw new SupabaseTripRepositoryError();
  }

  try {
    return supabaseTripMemberRowsSchema.parse(data).map((member) =>
      tripMemberSchema.parse({
        displayName: member.profiles?.display_name ?? null,
        role: member.role,
        userId: member.user_id,
      }),
    );
  } catch {
    throw new SupabaseTripRepositoryError();
  }
}

export async function listSupabasePendingTripInvitations(
  tripId: string,
): Promise<TripInvitation[]> {
  if (!supabaseTripIdSchema.safeParse(tripId).success) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trip_invitations")
    .select("id, email, role, expires_at")
    .eq("trip_id", tripId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    reportSupabaseTripQueryError("list-pending-invitations", error);
    throw new SupabaseTripRepositoryError();
  }

  try {
    return supabaseTripInvitationRowsSchema.parse(data).map((invitation) =>
      tripInvitationSchema.parse({
        email: invitation.email,
        expiresAt: invitation.expires_at,
        id: invitation.id,
        role: invitation.role,
      }),
    );
  } catch {
    throw new SupabaseTripRepositoryError();
  }
}

type SupabaseTripInvitationPreviewInput = {
  email: string;
  tokenHash: string;
};

export async function getSupabaseTripInvitationPreview({
  email,
  tokenHash,
}: SupabaseTripInvitationPreviewInput): Promise<TripInvitationPreview | null> {
  const emailResult = tripInvitationEmailSchema.safeParse(email);

  if (!emailResult.success || !/^[a-f0-9]{64}$/.test(tokenHash)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const initialResult = await supabase
    .from("trip_invitations")
    .select(tripInvitationPreviewSelectFieldsWithCoverImage)
    .eq("email", emailResult.data)
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  let data: unknown = initialResult.data;
  let error: unknown = initialResult.error;

  if (isSupabaseTripCoverColumnUnavailable(error)) {
    const fallbackResult = await supabase
      .from("trip_invitations")
      .select(tripInvitationPreviewSelectFields)
      .eq("email", emailResult.data)
      .eq("token_hash", tokenHash)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    reportSupabaseTripQueryError("get-invitation-preview", error);
    throw new SupabaseTripRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    const row = supabaseTripInvitationPreviewRowSchema.parse(data);

    if (!row.trips) {
      return null;
    }

    return tripInvitationPreviewSchema.parse({
      expiresAt: row.expires_at,
      role: row.role,
      trip: toTrip(row.trips),
    });
  } catch {
    throw new SupabaseTripRepositoryError();
  }
}

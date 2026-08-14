import { z } from "zod";

import {
  tripMemberSchema,
  type TripMember,
} from "@/entities/trip/model/trip-membership";
import {
  tripInvitationSchema,
  type TripInvitation,
} from "@/entities/trip/model/trip-invitation";
import { tripSchema, type Trip } from "@/entities/trip/model/trip";
import { calendarDateSchema } from "@/shared/lib/calendar-date";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const supabaseTripIdSchema = z.uuid();
const supabaseTripRowSchema = z.object({
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

export class SupabaseTripRepositoryError extends Error {
  constructor() {
    super("여행 데이터를 불러오지 못했습니다.");
    this.name = "SupabaseTripRepositoryError";
  }
}

function toTrip(row: z.infer<typeof supabaseTripRowSchema>): Trip {
  return tripSchema.parse({
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
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, time_zone")
    .order("start_date", { ascending: true });

  if (error) {
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
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, destination, start_date, end_date, time_zone")
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
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
    .select("user_id, role")
    .eq("trip_id", tripId);

  if (error) {
    throw new SupabaseTripRepositoryError();
  }

  try {
    return supabaseTripMemberRowsSchema.parse(data).map((member) =>
      tripMemberSchema.parse({ role: member.role, userId: member.user_id }),
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

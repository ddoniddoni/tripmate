import { getSupabaseTrip } from "@/entities/trip/api/supabase-trip-repository";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";

const tripCoverBucket = "trip-covers";

type TripCoverRouteContext = {
  params: Promise<{ tripId: string }>;
};

export async function GET(_request: Request, { params }: TripCoverRouteContext) {
  const { tripId } = await params;
  const trip = await getSupabaseTrip(tripId);

  if (!trip?.coverImagePath) {
    return new Response(null, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(tripCoverBucket)
    .createSignedUrl(trip.coverImagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    return new Response(null, { status: 404 });
  }

  return Response.redirect(data.signedUrl, 307);
}

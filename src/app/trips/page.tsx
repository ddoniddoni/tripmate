import Link from "next/link";
import { redirect } from "next/navigation";

import { listSupabaseTrips } from "@/entities/trip/api/supabase-trip-repository";
import { formatTripDateRange } from "@/entities/trip/lib/format-trip";
import type { Trip } from "@/entities/trip/model/trip";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { NewTripForm } from "@/features/trip-management/ui/new-trip-form";
import { calendarDateToUtcDate } from "@/shared/lib/calendar-date";
import { BrandMark } from "@/shared/ui/brand-mark";

export const dynamic = "force-dynamic";

type TripCardProps = {
  trip: Trip;
};

function TripCard({ trip }: TripCardProps) {
  const startDate = calendarDateToUtcDate(trip.startDate);

  return (
    <Link className="trip-card" href={`/trips/${trip.id}`}>
      <div className="trip-card-art" aria-hidden="true">
        <span className="sun" />
        <span className="island island-back" />
        <span className="island island-front" />
        <span className="trip-date-badge">
          <strong>{startDate.getUTCDate()}</strong>
          <span>{startDate.getUTCMonth() + 1}월</span>
        </span>
      </div>
      <div className="trip-card-body">
        <div className="trip-card-heading">
          <div>
            <span className="trip-status">계획 중</span>
            <h2>{trip.title}</h2>
          </div>
          <span className="arrow-link" aria-hidden="true">
            ↗
          </span>
        </div>
        <p>
          {trip.destination.replace(" · ", " ")} · {formatTripDateRange(trip.startDate, trip.endDate)}
        </p>
        <div className="trip-card-footer">
          <span>내 여행</span>
        </div>
      </div>
    </Link>
  );
}

export default async function TripsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, tripsResult] = await Promise.allSettled([
    getSupabaseUserProfile(user.id),
    listSupabaseTrips(),
  ]);

  if (profileResult.status === "rejected") {
    throw profileResult.reason;
  }

  const profile = profileResult.value;

  if (!profile?.displayName) {
    redirect("/profile");
  }

  if (tripsResult.status === "rejected") {
    throw tripsResult.reason;
  }

  const trips = tripsResult.value;

  const profileInitial = Array.from(profile.displayName)[0]?.toLocaleUpperCase("ko-KR") ?? "여";

  return (
    <main className="trips-page">
      <header className="trips-header">
        <BrandMark />
        <div className="account-actions">
          <Link
            aria-label={`${profile.displayName} 프로필 설정`}
            className="profile-avatar profile-avatar-link"
            href="/profile"
          >
            {profileInitial}
          </Link>
          <SignOutButton />
        </div>
      </header>

      <section className="trips-content" aria-labelledby="trips-heading">
        <div className="eyebrow">나의 여행</div>
        <div className="trips-title-row">
          <div>
            <h1 id="trips-heading">다음 여행은 어디인가요?</h1>
            <p>함께 계획하고, 같은 순간을 기대해 보세요.</p>
          </div>
          <span className="trip-count">{trips.length}개의 여행</span>
        </div>

        <div className="trip-grid">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          <NewTripForm />
        </div>
      </section>
    </main>
  );
}

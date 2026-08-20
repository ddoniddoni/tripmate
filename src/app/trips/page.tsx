import Link from "next/link";
import { redirect } from "next/navigation";

import { listSupabaseTrips } from "@/entities/trip/api/supabase-trip-repository";
import { formatTripDateRange } from "@/entities/trip/lib/format-trip";
import type { Trip } from "@/entities/trip/model/trip";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { NewTripForm } from "@/features/trip-management/ui/new-trip-form";
import { createSupabaseServerClient } from "@/shared/api/supabase/server";
import { calendarDateToUtcDate } from "@/shared/lib/calendar-date";
import { BrandMark } from "@/shared/ui/brand-mark";

export const dynamic = "force-dynamic";

type TripCardProps = {
  trip: Trip;
};

function LocationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M16 8.25c0 4.2-6 8.25-6 8.25S4 12.45 4 8.25a6 6 0 1 1 12 0Z" />
      <circle cx="10" cy="8.25" r="2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <rect height="13" rx="2.25" width="15" x="2.5" y="4.25" />
      <path d="M6.25 2.5v3.25M13.75 2.5v3.25M2.5 8h15" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

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
          <span className="trip-status">계획 중</span>
          <span className="trip-membership-label">내 여행</span>
        </div>
        <h2>{trip.title}</h2>
        <dl className="trip-card-meta">
          <div>
            <dt>
              <LocationIcon />
              <span className="sr-only">여행지</span>
            </dt>
            <dd>{trip.destination}</dd>
          </div>
          <div>
            <dt>
              <CalendarIcon />
              <span className="sr-only">여행 기간</span>
            </dt>
            <dd>{formatTripDateRange(trip.startDate, trip.endDate)}</dd>
          </div>
        </dl>
        <div className="trip-card-footer">
          <span>여행 열기</span>
          <span className="arrow-link" aria-hidden="true">
            <ArrowRightIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function TripsPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const [profileResult, tripsResult] = await Promise.allSettled([
    getSupabaseUserProfile(user.id, supabase),
    listSupabaseTrips(supabase),
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
        <div className="trips-title-row">
          <div>
            <span className="eyebrow">여행 보드</span>
            <h1 id="trips-heading">나의 여행</h1>
            <p>
              <strong>다음 여행은 어디인가요?</strong>
              <span>함께 계획하고, 같은 순간을 기대해 보세요.</span>
            </p>
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

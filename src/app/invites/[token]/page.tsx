import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSupabaseTripInvitationPreview } from "@/entities/trip/api/supabase-trip-repository";
import { formatTripDateRange, formatTripLength } from "@/entities/trip/lib/format-trip";
import { tripInvitationTokenSchema } from "@/entities/trip/model/trip-invitation";
import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { SignOutButton } from "@/features/auth/ui/sign-out-button";
import { getTripInvitationTokenHash } from "@/features/trip-sharing/lib/trip-invitation-token";
import { AcceptTripInvitationForm } from "@/features/trip-sharing/ui/accept-trip-invitation-form";
import { BrandMark } from "@/shared/ui/brand-mark";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const tokenResult = tripInvitationTokenSchema.safeParse(token);

  if (!tokenResult.success) {
    notFound();
  }

  const invitationPath = `/invites/${tokenResult.data}`;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(invitationPath)}`);
  }

  const profile = await getSupabaseUserProfile(user.id);

  if (!profile?.displayName) {
    redirect(`/profile?next=${encodeURIComponent(invitationPath)}`);
  }

  const invitation = user.email
    ? await getSupabaseTripInvitationPreview({
        email: user.email,
        tokenHash: getTripInvitationTokenHash(tokenResult.data),
      })
    : null;

  if (!invitation) {
    return (
      <main className="invitation-page">
        <section className="invitation-card" aria-labelledby="invitation-heading">
          <BrandMark />
          <span className="eyebrow">여행 초대</span>
          <h1 id="invitation-heading">이 초대를 확인할 수 없어요</h1>
          <p>
            링크가 만료되었거나 이미 사용됐을 수 있어요. 초대받은 이메일과 다른 계정으로
            로그인했다면 아래에서 계정을 바꿔 주세요.
          </p>
          <div className="invitation-secondary-actions">
            <SignOutButton label="다른 계정으로 로그인" nextPath={invitationPath} />
            <Link className="invitation-secondary-link" href="/trips">
              내 여행으로 이동
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const roleDetails =
    invitation.role === "editor"
      ? { description: "일정, 준비 항목, 경비를 함께 수정할 수 있어요.", label: "편집 가능" }
      : { description: "여행 계획을 확인할 수 있어요.", label: "보기 전용" };

  return (
    <main className="invitation-page">
      <section className="invitation-card" aria-labelledby="invitation-heading">
        <BrandMark />
        <span className="eyebrow">여행 초대</span>
        <h1 id="invitation-heading">{invitation.trip.title} 여행에 초대받았어요</h1>
        <p>참여하면 바로 공유 여행 계획으로 이동해 함께 일정을 이어갈 수 있어요.</p>
        <dl className="invitation-trip-summary">
          <div>
            <dt>여행지</dt>
            <dd>{invitation.trip.destination}</dd>
          </div>
          <div>
            <dt>여행 일정</dt>
            <dd>
              {formatTripDateRange(invitation.trip.startDate, invitation.trip.endDate)} ·{" "}
              {formatTripLength(invitation.trip.startDate, invitation.trip.endDate)}
            </dd>
          </div>
          <div>
            <dt>참여 권한</dt>
            <dd>
              <strong className={`invitation-role invitation-role-${invitation.role}`}>
                {roleDetails.label}
              </strong>
              <span>{roleDetails.description}</span>
            </dd>
          </div>
        </dl>
        <AcceptTripInvitationForm token={tokenResult.data} />
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";

import { getSupabaseUserProfile } from "@/entities/user/api/supabase-profile-repository";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
import { ProfileForm } from "@/features/profile/ui/profile-form";
import { BrandMark } from "@/shared/ui/brand-mark";
import { getSafeInternalPath } from "@/shared/lib/safe-internal-path";

export const dynamic = "force-dynamic";

type ProfilePageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);
  const nextPath = getSafeInternalPath(params.next);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/profile?next=${encodeURIComponent(nextPath)}`)}`);
  }

  const profile = await getSupabaseUserProfile(user.id);

  if (profile?.displayName) {
    redirect("/trips");
  }

  return (
    <main className="profile-page">
      <section className="profile-card" aria-labelledby="profile-heading">
        <BrandMark />
        <div>
          <span className="eyebrow">나를 소개해요</span>
          <h1 id="profile-heading">여행에서 사용할 이름을 알려 주세요.</h1>
          <p>
            함께 여행하는 사람과 준비 항목, 경비 정산에서 이 이름으로 표시돼요.
          </p>
        </div>
        <ProfileForm initialDisplayName={profile?.displayName ?? ""} nextPath={nextPath} />
      </section>
    </main>
  );
}

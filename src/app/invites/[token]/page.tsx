import { notFound, redirect } from "next/navigation";

import { tripInvitationTokenSchema } from "@/entities/trip/model/trip-invitation";
import { getAuthenticatedUser } from "@/features/auth/model/get-authenticated-user";
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

  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="invitation-page">
      <section className="invitation-card" aria-labelledby="invitation-heading">
        <BrandMark />
        <span className="eyebrow">여행 초대</span>
        <h1 id="invitation-heading">여행에 초대받았어요</h1>
        <p>로그인한 이메일 주소가 초대받은 이메일과 같으면 바로 참여할 수 있어요.</p>
        <AcceptTripInvitationForm token={tokenResult.data} />
      </section>
    </main>
  );
}

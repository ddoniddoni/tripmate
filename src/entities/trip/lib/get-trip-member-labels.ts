import type { TripMember } from "@/entities/trip/model/trip-membership";

type TripMemberIdentity = Pick<TripMember, "displayName" | "userId">;

export function getTripMemberLabels(
  members: readonly TripMemberIdentity[],
  currentUserId: string,
) {
  const labels = new Map<string, string>();
  let unnamedCompanionCount = 0;

  for (const member of members) {
    const displayName = member.displayName?.trim();

    if (member.userId === currentUserId) {
      labels.set(member.userId, displayName ? `나 · ${displayName}` : "나");
      continue;
    }

    if (displayName) {
      labels.set(member.userId, displayName);
      continue;
    }

    unnamedCompanionCount += 1;
    labels.set(member.userId, `여행 멤버 ${unnamedCompanionCount}`);
  }

  return labels;
}

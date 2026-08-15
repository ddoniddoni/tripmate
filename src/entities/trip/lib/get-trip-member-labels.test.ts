import { describe, expect, it } from "vitest";

import { getTripMemberLabels } from "@/entities/trip/lib/get-trip-member-labels";

const ownerId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const minjiId = "791fa61b-fd1e-4f09-a331-e0816e32728d";
const unnamedMemberId = "1b6d21bf-5ca2-4266-8b02-d9256a08e0da";

describe("getTripMemberLabels", () => {
  it("uses names where set while retaining clear labels for self and legacy blank profiles", () => {
    const labels = getTripMemberLabels(
      [
        { displayName: "민지", userId: minjiId },
        { displayName: "지우", userId: ownerId },
        { displayName: null, userId: unnamedMemberId },
      ],
      ownerId,
    );

    expect(labels.get(ownerId)).toBe("나 · 지우");
    expect(labels.get(minjiId)).toBe("민지");
    expect(labels.get(unnamedMemberId)).toBe("여행 멤버 1");
  });
});

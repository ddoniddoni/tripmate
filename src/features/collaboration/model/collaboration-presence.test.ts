import { describe, expect, it } from "vitest";

import {
  getCollaboratorActivityCopy,
  getWorkspaceActivityCopy,
} from "@/features/collaboration/model/collaboration-presence";

describe("collaboration presence copy", () => {
  it("describes the active workspace without exposing a durable editing lock", () => {
    expect(getWorkspaceActivityCopy("itinerary")).toBe("일정을 살펴보는 중");
    expect(getWorkspaceActivityCopy("settings")).toBe("여행 설정을 확인하는 중");
    expect(getWorkspaceActivityCopy()).toBeNull();
  });

  it("names one active collaborator and summarizes a group", () => {
    expect(
      getCollaboratorActivityCopy([{ activeWorkspace: "expenses", name: "민지" }]),
    ).toBe("민지님이 경비를 정리하는 중");

    expect(
      getCollaboratorActivityCopy([
        { activeWorkspace: "itinerary", name: "민지" },
        { activeWorkspace: "preparation", name: "준호" },
      ]),
    ).toBe("민지님 외 1명이 함께 여행을 준비하는 중");
  });
});

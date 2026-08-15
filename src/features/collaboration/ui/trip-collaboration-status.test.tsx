// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  others: [] as Array<{
    connectionId: number;
    info: { color: string; name: string };
    presence: { activeWorkspace?: "overview" | "itinerary" | "preparation" | "expenses" };
  }>,
  status: "connected",
}));

vi.mock("@liveblocks/client", () => ({
  shallow: () => true,
}));

vi.mock("@liveblocks/react", () => ({
  useOthers: (selector: (others: typeof mocks.others) => unknown) => selector(mocks.others),
  useStatus: () => mocks.status,
}));

import { TripCollaborationStatus } from "@/features/collaboration/ui/trip-collaboration-status";

describe("TripCollaborationStatus", () => {
  it("shows an active collaborator's workspace alongside the connection state", () => {
    mocks.status = "connected";
    mocks.others = [
      {
        connectionId: 2,
        info: { color: "#4f7fca", name: "민지" },
        presence: { activeWorkspace: "itinerary" },
      },
    ];

    render(<TripCollaborationStatus />);

    expect(screen.getByRole("status")).toHaveAccessibleName(
      "동기화됨. 나 외 1명 접속 중. 민지님이 일정을 살펴보는 중",
    );
    expect(screen.getByText("민지님이 일정을 살펴보는 중")).toBeInTheDocument();
  });

  it("keeps a connected status clear when collaborators have not sent presence yet", () => {
    mocks.status = "connected";
    mocks.others = [
      {
        connectionId: 2,
        info: { color: "#4f7fca", name: "민지" },
        presence: {},
      },
    ];

    render(<TripCollaborationStatus />);

    expect(screen.getByRole("status")).toHaveAccessibleName("동기화됨. 나 외 1명 접속 중");
    expect(screen.queryByText(/민지님이/)).not.toBeInTheDocument();
  });
});

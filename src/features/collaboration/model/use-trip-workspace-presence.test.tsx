// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMyPresence: vi.fn(),
}));

vi.mock("@liveblocks/react", () => ({
  useUpdateMyPresence: () => mocks.updateMyPresence,
}));

import { useTripWorkspacePresence } from "@/features/collaboration/model/use-trip-workspace-presence";

function PresenceHarness({ activeWorkspace }: { activeWorkspace: "overview" | "itinerary" }) {
  useTripWorkspacePresence(activeWorkspace);
  return null;
}

describe("useTripWorkspacePresence", () => {
  it("updates only the temporary active workspace presence when it changes", () => {
    mocks.updateMyPresence.mockReset();
    const { rerender } = render(<PresenceHarness activeWorkspace="overview" />);

    expect(mocks.updateMyPresence).toHaveBeenLastCalledWith({ activeWorkspace: "overview" });

    rerender(<PresenceHarness activeWorkspace="itinerary" />);

    expect(mocks.updateMyPresence).toHaveBeenLastCalledWith({ activeWorkspace: "itinerary" });
    expect(mocks.updateMyPresence).toHaveBeenCalledTimes(2);
  });
});

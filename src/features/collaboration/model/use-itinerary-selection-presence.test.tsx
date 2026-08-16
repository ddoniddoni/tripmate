// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMyPresence: vi.fn(),
}));

vi.mock("@liveblocks/react", () => ({
  useUpdateMyPresence: () => mocks.updateMyPresence,
}));

import { useItinerarySelectionPresence } from "@/features/collaboration/model/use-itinerary-selection-presence";

function SelectionPresenceHarness({ selectedItemId }: { selectedItemId: string | null }) {
  useItinerarySelectionPresence(selectedItemId);
  return null;
}

describe("useItinerarySelectionPresence", () => {
  it("shares only the temporary selected item and clears it when no item is selected", () => {
    mocks.updateMyPresence.mockReset();
    const { rerender } = render(<SelectionPresenceHarness selectedItemId="hamdeok-beach" />);

    expect(mocks.updateMyPresence).toHaveBeenLastCalledWith({
      selectedItineraryItemId: "hamdeok-beach",
    });

    rerender(<SelectionPresenceHarness selectedItemId={null} />);

    expect(mocks.updateMyPresence).toHaveBeenLastCalledWith({ selectedItineraryItemId: null });
    expect(mocks.updateMyPresence).toHaveBeenCalledTimes(2);
  });
});

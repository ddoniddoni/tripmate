// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DefaultTripCoverArt } from "@/entities/trip/ui/default-trip-cover-art";

describe("DefaultTripCoverArt", () => {
  it("renders the shared TripMate placeholder artwork", () => {
    render(<DefaultTripCoverArt />);

    expect(screen.getByText("TRIP MATE")).toBeInTheDocument();
    expect(screen.getByText("TripMate")).toBeInTheDocument();
    expect(screen.getByText("YOUR NEXT STORY")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/trip-management/model/trip-cover-image-action", () => ({
  removeTripCoverImage: vi.fn(),
  updateTripCoverImage: vi.fn(),
}));

vi.mock("@/shared/api/supabase/browser", () => ({
  createSupabaseBrowserClient: vi.fn(),
}));

import { TripCoverImageForm } from "@/features/trip-management/ui/trip-cover-image-form";

const props = {
  tripId: "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8",
  tripTitle: "가을의 부산",
};

describe("TripCoverImageForm", () => {
  it("offers an owner an accessible file picker with constrained image formats", () => {
    render(<TripCoverImageForm {...props} canUpdateTrip />);

    expect(screen.getByRole("heading", { name: "여행 사진" })).toBeInTheDocument();
    expect(screen.getByLabelText("여행 커버 사진 선택")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(
      screen.getByText("여행 카드 상단을 채울 사진이에요. JPG, PNG, WebP · 최대 5MB"),
    ).toBeInTheDocument();
    expect(screen.getByText("사진 올리기")).toBeInTheDocument();
    expect(screen.getByText("TRIP MATE")).toBeInTheDocument();
  });

  it("keeps the current cover visible while explaining owner-only editing", () => {
    render(
      <TripCoverImageForm
        {...props}
        canUpdateTrip={false}
        coverImagePath="d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8/9f1c1e54-12a1-49a9-bf5f-a95027e8bb5e.jpg"
      />,
    );

    expect(screen.getByAltText("가을의 부산 커버 사진")).toBeInTheDocument();
    expect(screen.getByText("커버 사진 변경은 소유자만 할 수 있어요.")).toBeInTheDocument();
    expect(screen.queryByLabelText("여행 커버 사진 선택")).not.toBeInTheDocument();
  });
});

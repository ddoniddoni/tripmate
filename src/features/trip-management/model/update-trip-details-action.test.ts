import { LiveObject } from "@liveblocks/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createTripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";
import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";

const mocks = vi.hoisted(() => ({
  Liveblocks: vi.fn(),
  from: vi.fn(),
  getStorageDocument: vi.fn(),
  getUser: vi.fn(),
  memberEq: vi.fn(),
  memberMaybeSingle: vi.fn(),
  memberSelect: vi.fn(),
  mutateStorage: vi.fn(),
  readEq: vi.fn(),
  readMaybeSingle: vi.fn(),
  readSelect: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateMaybeSingle: vi.fn(),
  updateSelect: vi.fn(),
}));

vi.mock("@liveblocks/node", () => ({
  Liveblocks: mocks.Liveblocks,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { initialUpdateTripDetailsActionState } from "@/features/trip-management/model/update-trip-details-action-state";
import { updateTripDetails } from "@/features/trip-management/model/update-trip-details-action";

const tripId = "d4f6f86c-8e85-4d2a-b77f-f2b15d1be3d8";
const userId = "b37aa707-35d7-4d7d-a8c5-b5ea8c703673";
const originalLiveblocksSecret = process.env.LIVEBLOCKS_SECRET_KEY;

const storedTrip = {
  destination: "대한민국 · 부산",
  end_date: "2026-10-12",
  id: tripId,
  start_date: "2026-10-10",
  time_zone: "Asia/Seoul",
  title: "가을의 부산",
};

function createFormData({
  endDate = storedTrip.end_date,
  startDate = storedTrip.start_date,
}: {
  endDate?: string;
  startDate?: string;
} = {}) {
  const formData = new FormData();
  formData.set("tripId", tripId);
  formData.set("title", "새로운 부산 여행");
  formData.set("destination", "대한민국 · 부산");
  formData.set("startDate", startDate);
  formData.set("endDate", endDate);
  return formData;
}

function createStoredJejuItinerary() {
  const trip = structuredClone(jejuTrip);

  trip.trip.id = tripId;
  Object.values(trip.itinerary.days).forEach((day) => {
    day.tripId = tripId;
  });

  return trip;
}

describe("updateTripDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEBLOCKS_SECRET_KEY = "sk_test_liveblocks";

    const memberBuilder = {
      eq: mocks.memberEq,
      maybeSingle: mocks.memberMaybeSingle,
      select: mocks.memberSelect,
    };
    const readTripBuilder = {
      eq: mocks.readEq,
      maybeSingle: mocks.readMaybeSingle,
      select: mocks.readSelect,
    };
    const updateTripBuilder = {
      eq: mocks.updateEq,
      maybeSingle: mocks.updateMaybeSingle,
      select: mocks.updateSelect,
      update: mocks.update,
    };
    let tripQueryCount = 0;

    mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.memberSelect.mockReturnValue(memberBuilder);
    mocks.memberEq.mockReturnValue(memberBuilder);
    mocks.memberMaybeSingle.mockResolvedValue({ data: { role: "owner" }, error: null });
    mocks.readSelect.mockReturnValue(readTripBuilder);
    mocks.readEq.mockReturnValue(readTripBuilder);
    mocks.readMaybeSingle.mockResolvedValue({ data: storedTrip, error: null });
    mocks.update.mockReturnValue(updateTripBuilder);
    mocks.updateEq.mockReturnValue(updateTripBuilder);
    mocks.updateSelect.mockReturnValue(updateTripBuilder);
    mocks.updateMaybeSingle.mockResolvedValue({ data: { id: tripId }, error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "trip_members") {
        return memberBuilder;
      }

      tripQueryCount += 1;
      return tripQueryCount === 1 ? readTripBuilder : updateTripBuilder;
    });
    mocks.Liveblocks.mockImplementation(function LiveblocksMock() {
      return {
        getStorageDocument: mocks.getStorageDocument,
        mutateStorage: mocks.mutateStorage,
      };
    });
  });

  afterAll(() => {
    if (originalLiveblocksSecret) {
      process.env.LIVEBLOCKS_SECRET_KEY = originalLiveblocksSecret;
      return;
    }

    delete process.env.LIVEBLOCKS_SECRET_KEY;
  });

  it("requires a logged-in user before checking trip details", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      updateTripDetails(initialUpdateTripDetailsActionState, createFormData()),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a non-owner before reading or updating the trip", async () => {
    mocks.memberMaybeSingle.mockResolvedValue({ data: { role: "editor" }, error: null });

    await expect(
      updateTripDetails(initialUpdateTripDetailsActionState, createFormData()),
    ).resolves.toEqual({
      message: "여행 정보를 수정할 권한이 없습니다.",
      status: "error",
    });

    expect(mocks.readSelect).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates same-period details and revalidates the list and editor", async () => {
    await expect(
      updateTripDetails(initialUpdateTripDetailsActionState, createFormData()),
    ).resolves.toEqual({
      message: "여행 정보를 저장했습니다.",
      status: "success",
    });

    expect(mocks.from).toHaveBeenNthCalledWith(1, "trip_members");
    expect(mocks.from).toHaveBeenNthCalledWith(2, "trips");
    expect(mocks.from).toHaveBeenNthCalledWith(3, "trips");
    expect(mocks.update).toHaveBeenCalledWith({
      destination: "대한민국 · 부산",
      end_date: "2026-10-12",
      start_date: "2026-10-10",
      title: "새로운 부산 여행",
    });
    expect(mocks.getStorageDocument).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/trips/${tripId}`);
  });

  it("updates the shared itinerary when an owner expands the trip period", async () => {
    const currentItinerary = createStoredJejuItinerary();
    const storage = new LiveObject(createTripItineraryStorage(currentItinerary.itinerary));
    mocks.readMaybeSingle.mockResolvedValue({
      data: {
        ...storedTrip,
        end_date: "2026-04-21",
        start_date: "2026-04-18",
      },
      error: null,
    });
    mocks.getStorageDocument.mockResolvedValue(currentItinerary.itinerary);
    mocks.mutateStorage.mockImplementation(
      async (_roomId: string, callback: (context: { root: typeof storage }) => void) => {
        callback({ root: storage });
      },
    );

    await expect(
      updateTripDetails(
        initialUpdateTripDetailsActionState,
        createFormData({ endDate: "2026-04-22", startDate: "2026-04-18" }),
      ),
    ).resolves.toEqual({
      message: "여행 정보를 저장했습니다.",
      status: "success",
    });

    expect(mocks.mutateStorage).toHaveBeenCalledWith(`trip:${tripId}`, expect.any(Function));
    expect(storage.toJSON().days[`${tripId}-day-20260422`]).toMatchObject({
      date: "2026-04-22",
      itemIds: [],
    });
  });

  it("rejects a shorter period before changing metadata when it would remove scheduled days", async () => {
    const currentItinerary = createStoredJejuItinerary();
    mocks.readMaybeSingle.mockResolvedValue({
      data: {
        ...storedTrip,
        end_date: "2026-04-21",
        start_date: "2026-04-18",
      },
      error: null,
    });
    mocks.getStorageDocument.mockResolvedValue(currentItinerary.itinerary);

    await expect(
      updateTripDetails(
        initialUpdateTripDetailsActionState,
        createFormData({ endDate: "2026-04-21", startDate: "2026-04-19" }),
      ),
    ).resolves.toMatchObject({
      message: expect.stringContaining("일정이 있어"),
      status: "error",
    });

    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.mutateStorage).not.toHaveBeenCalled();
  });

  it("rolls back metadata when the shared itinerary update cannot complete", async () => {
    const currentItinerary = createStoredJejuItinerary();
    mocks.readMaybeSingle.mockResolvedValue({
      data: {
        ...storedTrip,
        end_date: "2026-04-21",
        start_date: "2026-04-18",
      },
      error: null,
    });
    mocks.getStorageDocument.mockResolvedValue(currentItinerary.itinerary);
    mocks.mutateStorage.mockResolvedValue(undefined);

    await expect(
      updateTripDetails(
        initialUpdateTripDetailsActionState,
        createFormData({ endDate: "2026-04-22", startDate: "2026-04-18" }),
      ),
    ).resolves.toEqual({
      message: "여행 기간을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });

    expect(mocks.update).toHaveBeenNthCalledWith(1, {
      destination: "대한민국 · 부산",
      end_date: "2026-04-22",
      start_date: "2026-04-18",
      title: "새로운 부산 여행",
    });
    expect(mocks.update).toHaveBeenNthCalledWith(2, {
      destination: storedTrip.destination,
      end_date: "2026-04-21",
      start_date: "2026-04-18",
      title: storedTrip.title,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error when the RLS-protected update affects no trip", async () => {
    mocks.updateMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      updateTripDetails(initialUpdateTripDetailsActionState, createFormData()),
    ).resolves.toEqual({
      message: "여행 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      status: "error",
    });
  });
});

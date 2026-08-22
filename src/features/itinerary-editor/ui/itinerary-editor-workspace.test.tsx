// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import type { TripItinerary } from "@/entities/itinerary/model/trip-itinerary";
import { ItineraryEditorWorkspace } from "@/features/itinerary-editor/ui/itinerary-editor-workspace";

vi.mock("@/features/map-sync/ui/google-itinerary-map", () => ({
  GoogleItineraryMap: ({
    destination,
    markers,
    onSelect,
    routeCoordinates = [],
  }: {
    destination: string;
    markers: Array<{
      coordinate: { latitude: number; longitude: number };
      id: string;
      isSelected: boolean;
      name: string;
    }>;
    onSelect: (itemId: string) => void;
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  }) => (
    <div role="region" aria-label={`${destination} 선택 일정 지도`}>
      <output data-testid="map-route-signature">
        {routeCoordinates.map((coordinate) => `${coordinate.latitude}:${coordinate.longitude}`).join("|")}
      </output>
      {markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          aria-label={`${marker.name} 지도에서 선택`}
          aria-pressed={marker.isSelected}
          onClick={() => onSelect(marker.id)}
        >
          {marker.name}
        </button>
      ))}
    </div>
  ),
}));

function renderWorkspace(
  canEditItinerary = true,
  initialTripItinerary = jejuTrip,
  selectedItemCollaborators: Array<{
    color: string;
    connectionId: number;
    name: string;
    selectedItemId: string;
  }> = [],
  memberLabels: ReadonlyMap<string, string> = new Map(),
) {
  const user = userEvent.setup();
  render(
    <ItineraryEditorWorkspace
      canEditItinerary={canEditItinerary}
      initialTripItinerary={initialTripItinerary}
      memberLabels={memberLabels}
      selectedItemCollaborators={selectedItemCollaborators}
    />,
  );
  return user;
}

function createTripWithSuggestion(): TripItinerary {
  const tripItinerary = structuredClone(jejuTrip);

  tripItinerary.itinerary.placeSuggestions["seongsan-suggestion"] = {
    comments: {
      "seongsan-comment": {
        body: "일출 시간부터 같이 확인해 봐요.",
        createdAt: "2026-08-17T01:05:00.000Z",
        createdBy: "user-minji",
        id: "seongsan-comment",
      },
    },
    createdAt: "2026-08-17T01:00:00.000Z",
    createdBy: "user-minji",
    dayId: "jeju-day-1",
    id: "seongsan-suggestion",
    note: "아침 일찍 출발하면 좋겠어",
    place: {
      address: "제주특별자치도 서귀포시 성산읍 성산리 1",
      category: "관광 명소",
      latitude: 33.4581,
      longitude: 126.9425,
      name: "성산일출봉",
      provider: "google",
      providerPlaceId: "google.seongsan-ilchulbong",
    },
    votes: {
      "user-jiwoo": "2026-08-17T01:03:00.000Z",
    },
  };

  return tripItinerary;
}

function createTripWithSecondDayItem(): TripItinerary {
  const tripItinerary = structuredClone(jejuTrip);
  const secondDayItemId = "bijarim-forest";

  tripItinerary.itinerary.days["jeju-day-1"].itemIds = tripItinerary.itinerary.days[
    "jeju-day-1"
  ].itemIds.filter((itemId) => itemId !== secondDayItemId);
  tripItinerary.itinerary.days["jeju-day-2"].itemIds = [secondDayItemId];
  tripItinerary.itinerary.items[secondDayItemId].dayId = "jeju-day-2";

  return tripItinerary;
}

describe("ItineraryEditorWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (input === "/api/directions") {
          const query: unknown = init?.body ? JSON.parse(String(init.body)) : null;

          if (
            !query ||
            typeof query !== "object" ||
            !("coordinates" in query) ||
            !Array.isArray(query.coordinates)
          ) {
            return new Response(JSON.stringify({ message: "invalid route" }), { status: 400 });
          }

          const coordinates = query.coordinates;
          const legs = coordinates.slice(1).map(() => ({
            distanceMeters: 1_000,
            durationSeconds: 300,
          }));

          return new Response(
            JSON.stringify({
              route: {
                coordinates,
                distanceMeters: legs.length * 1_000,
                durationSeconds: legs.length * 300,
                legs,
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        if (typeof input === "string" && input.startsWith("/api/place-details")) {
          return new Response(
            JSON.stringify({
              details: {
                rating: 4.6,
                regularOpeningHours: ["월요일: 오전 9:00 ~ 오후 6:00"],
                userRatingCount: 321,
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            places: [
              {
                address: "제주특별자치도 서귀포시 성산읍 성산리 1",
                category: "관광 명소",
                latitude: 33.4581,
                longitude: 126.9425,
                name: "성산일출봉",
                provider: "google",
                providerPlaceId: "google.seongsan-ilchulbong",
              },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("switches to an empty day and adds a searched place without optional details", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /2일차/ }));
    expect(screen.getByText("아직 일정이 없어요")).toBeInTheDocument();
    expect(screen.getByText("경유지가 없어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });

    await user.type(within(dialog).getByLabelText("장소 검색"), "성산");
    await user.click(await within(dialog).findByRole("button", { name: "성산일출봉 정보 확인" }));
    const previewDialog = await screen.findByRole("dialog", { name: "성산일출봉 정보 확인" });
    await user.click(within(previewDialog).getByRole("button", { name: "이 장소 선택" }));
    await user.click(within(dialog).getByRole("button", { name: "일정 추가" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "성산일출봉" })).toBeInTheDocument();
    expect(screen.getByText("일정 1개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByText("장소를 하나 더 추가하면 경로를 보여 드려요.")).toBeInTheDocument();
  });

  it("shows field errors without closing the add dialog", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });
    await user.click(within(dialog).getByRole("button", { name: "일정 추가" }));

    expect(
      await within(dialog).findByText("장소 검색 결과에서 장소를 선택해 주세요."),
    ).toBeInTheDocument();
  });

  it("fills the form from a Google place search result without exposing coordinates", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });
    await user.type(within(dialog).getByLabelText("장소 검색"), "성산");
    await user.click(await within(dialog).findByRole("button", { name: "성산일출봉 정보 확인" }));
    const previewDialog = await screen.findByRole("dialog", { name: "성산일출봉 정보 확인" });
    await user.click(within(previewDialog).getByRole("button", { name: "상세 정보 보기" }));

    expect(await within(previewDialog).findByText(/4\.6점/)).toBeInTheDocument();
    expect(within(previewDialog).getByText(/321개 리뷰/)).toBeInTheDocument();
    expect(within(previewDialog).getByText("주간 영업시간 보기")).toBeInTheDocument();
    expect(within(previewDialog).getByRole("link", { name: /Google 지도에서 보기/ })).toHaveAttribute(
      "target",
      "_blank",
    );

    await user.click(within(previewDialog).getByRole("button", { name: "이 장소 선택" }));

    expect(within(dialog).getByLabelText("장소 이름")).toHaveValue("성산일출봉");
    expect(within(dialog).getByLabelText("주소")).toHaveValue(
      "제주특별자치도 서귀포시 성산읍 성산리 1",
    );
    expect(within(dialog).queryByLabelText("경도")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("위도")).not.toBeInTheDocument();
  });

  it("saves a day memo in the shared itinerary workspace", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "메모 작성" }));
    await user.type(screen.getByLabelText("오늘의 메모"), "비가 오면 카페부터 들르기");
    await user.click(screen.getByRole("button", { name: "메모 저장" }));

    expect(screen.getByText("비가 오면 카페부터 들르기")).toBeInTheDocument();
    expect(screen.getByText("오늘의 메모를 저장했습니다.")).toBeInTheDocument();
  });

  it("keeps a suggested place off the map until an editor adds it to the itinerary", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "장소 제안" }));
    const dialog = await screen.findByRole("dialog", { name: "이런 곳도 있어요" });

    await user.click(within(dialog).getByRole("button", { name: "후보 장소 저장" }));
    expect(
      await within(dialog).findByText("장소 검색 결과에서 장소를 선택해 주세요."),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("장소 검색"), "성산");
    await user.click(
      await within(dialog).findByRole("button", { name: "성산일출봉 후보 장소로 선택" }),
    );
    await user.type(within(dialog).getByLabelText("제안 메모"), "일출 보러 가면 좋겠어");
    await user.click(within(dialog).getByRole("button", { name: "후보 장소 저장" }));

    expect(screen.getByRole("heading", { name: "성산일출봉" })).toBeInTheDocument();
    expect(screen.getByText("일출 보러 가면 좋겠어")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "성산일출봉 지도에서 선택" }),
    ).not.toBeInTheDocument();

    const voteButton = screen.getByRole("button", { name: "성산일출봉 좋아요 추가" });
    await user.click(voteButton);

    expect(voteButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "성산일출봉 좋아요 취소" })).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("인기 후보")).toBeInTheDocument();
    expect(screen.getByText("나 · 가고 싶어요")).toBeInTheDocument();

    await user.click(screen.getByText("의견"));
    await user.click(screen.getByRole("button", { name: "의견 등록" }));
    expect(await screen.findByText("의견을 입력해 주세요.")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("성산일출봉에 의견 남기기"),
      "근처 아침 식당도 같이 찾아보자",
    );
    await user.click(screen.getByRole("button", { name: "의견 등록" }));

    expect(screen.getByText("근처 아침 식당도 같이 찾아보자")).toBeInTheDocument();
    expect(screen.getByText(/의견을 남겼습니다/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "일정에 추가" }));

    expect(screen.getByText("일정 4개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByText("성산일출봉을 정식 일정에 추가했습니다.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "성산일출봉 지도에서 선택" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "일정에 추가" })).not.toBeInTheDocument();
  });

  it("keeps day planning controls read-only for viewers", () => {
    renderWorkspace(false);

    expect(screen.queryByRole("button", { name: "하루 복사" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "메모 작성" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "장소 제안" })).not.toBeInTheDocument();
    expect(screen.getByText("아직 공유된 후보 장소가 없어요.")).toBeInTheDocument();
  });

  it("lets viewers read candidate votes and comments without collaboration controls", async () => {
    const user = renderWorkspace(
      false,
      createTripWithSuggestion(),
      [],
      new Map([
        ["user-jiwoo", "나 · 지우"],
        ["user-minji", "민지"],
      ]),
    );

    expect(screen.getByLabelText("좋아요 1개")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /성산일출봉 좋아요/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "일정에 추가" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "제안 삭제" })).not.toBeInTheDocument();

    await user.click(screen.getByText("의견"));

    expect(screen.getByText("민지")).toBeInTheDocument();
    expect(screen.getByText("일출 시간부터 같이 확인해 봐요.")).toBeInTheDocument();
    expect(screen.queryByLabelText("성산일출봉에 의견 남기기")).not.toBeInTheDocument();
  });

  it("edits an existing item while preserving its position", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "우진해장국 수정" }));
    const dialog = await screen.findByRole("dialog", { name: "우진해장국" });
    const nameInput = within(dialog).getByLabelText("장소 이름");

    await user.clear(nameInput);
    await user.type(nameInput, "우진 해장국 본점");
    await user.click(within(dialog).getByRole("button", { name: "변경 저장" }));

    expect(screen.getByRole("heading", { name: "우진 해장국 본점" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("우진 해장국 본점");
  });

  it("warns about overlapping schedules without preventing the update", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "우진해장국 수정" }));
    const dialog = await screen.findByRole("dialog", { name: "우진해장국" });
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "도착 시간 시" }), "11");
    await user.selectOptions(within(dialog).getByRole("combobox", { name: "도착 시간 분" }), "30");

    expect(await within(dialog).findByText("일정 시간이 겹쳐요.")).toBeInTheDocument();
    expect(within(dialog).getByText(/함덕해수욕장 일정과 겹쳐요/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "변경 저장" }));

    expect(screen.getAllByText("시간 겹침")).toHaveLength(2);
    expect(screen.getByText("시간이 겹치는 일정 2개")).toBeInTheDocument();
  });

  it("shows route-aware travel buffers between schedules with enough time", async () => {
    renderWorkspace();

    expect(await screen.findByText("자동차 약 5분 · 55분 여유")).toBeInTheDocument();
    expect(screen.getByText("자동차 약 5분 · 85분 여유")).toBeInTheDocument();
  });

  it("warns when the next schedule starts before the required travel time", async () => {
    const tripWithTightTravelTime = structuredClone(jejuTrip);
    tripWithTightTravelTime.itinerary.items["hamdeok-beach"].startTime = "11:02";
    renderWorkspace(true, tripWithTightTravelTime);

    expect(await screen.findByText("자동차 약 5분 필요 · 3분 부족")).toBeInTheDocument();
    expect(screen.getByText("이동 촉박")).toBeInTheDocument();
  });

  it("only warns about conflicts involving the schedule being drafted", async () => {
    const tripWithExistingConflict = structuredClone(jejuTrip);
    tripWithExistingConflict.itinerary.items["hamdeok-beach"].startTime = "10:00";
    const user = renderWorkspace(true, tripWithExistingConflict);

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });

    expect(within(dialog).queryByText("일정 시간이 겹쳐요.")).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting an item", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "함덕해수욕장 삭제" }));
    const dialog = await screen.findByRole("alertdialog", {
      name: "함덕해수욕장을 삭제할까요?",
    });
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));

    expect(screen.queryByRole("heading", { name: "함덕해수욕장" })).not.toBeInTheDocument();
    expect(screen.getByText("일정 2개 · Asia/Seoul")).toBeInTheDocument();
  });

  it("duplicates an existing item immediately after its source", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "우진해장국 복제" }));

    expect(screen.getAllByRole("heading", { name: "우진해장국" })).toHaveLength(2);
    expect(screen.getByText("일정 4개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByText("우진해장국 일정을 복제했습니다.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "우진해장국 선택" })[1]).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("copies one complete day to another date and selects the first copied item", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "하루 복사" }));
    const dialog = await screen.findByRole("dialog", {
      name: "1일차 일정을 복사할까요?",
    });

    expect(within(dialog).getByText("일정 3개를 복사해요")).toBeInTheDocument();
    expect(
      within(dialog).getByText("우진해장국 · 함덕해수욕장 · 비자림"),
    ).toBeInTheDocument();
    const destinationRadios = within(dialog).getAllByRole("radio");

    expect(destinationRadios[0]).toBeChecked();
    await user.click(destinationRadios[1]);
    expect(destinationRadios[1]).toBeChecked();

    await user.click(within(dialog).getByRole("button", { name: "3개 일정 복사" }));

    expect(
      screen.queryByRole("dialog", { name: "1일차 일정을 복사할까요?" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("일정 3개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByText("3일차에 일정 3개를 복사했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "우진해장국 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "우진해장국 지도에서 선택" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1일차/ }));
    expect(screen.getByText("일정 3개 · Asia/Seoul")).toBeInTheDocument();
  });

  it("disables day copy for an empty day", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /2일차/ }));
    expect(screen.getByRole("button", { name: "하루 복사" })).toBeDisabled();
  });

  it("exposes keyboard instructions from every drag handle", () => {
    renderWorkspace();

    const handle = screen.getByRole("button", { name: "우진해장국 순서 이동" });
    const instructionsId = handle.getAttribute("aria-describedby");

    expect(instructionsId).toBe("drag-instructions");
    expect(document.getElementById(instructionsId ?? "")).toHaveTextContent(
      "위아래 화살표로 이동",
    );
  });

  it("reorders items through the keyboard-friendly move controls", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "우진해장국 아래로 이동" }));

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("함덕해수욕장");
    expect(headings[1]).toHaveTextContent("우진해장국");
    expect(screen.getByText(/우진해장국을 2번째로 이동했습니다/)).toBeInTheDocument();
  });

  it("sorts a day's route order by the entered start times on request", async () => {
    const unorderedTrip = structuredClone(jejuTrip);
    unorderedTrip.itinerary.days["jeju-day-1"].itemIds = [
      "bijarim-forest",
      "hamdeok-beach",
      "woojin-breakfast",
    ];
    const user = renderWorkspace(true, unorderedTrip);

    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("비자림");
    await user.click(screen.getByRole("button", { name: "시간순 정렬" }));

    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent("우진해장국");
    expect(screen.getByText("입력한 시간 기준으로 일정 순서를 정렬했습니다.")).toBeInTheDocument();
  });

  it("moves an item to an empty day through the accessible move dialog", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "우진해장국 다른 날짜로 이동" }));
    const dialog = await screen.findByRole("dialog", { name: "우진해장국 이동" });

    expect(within(dialog).getByLabelText("이동할 위치")).toHaveValue("0");
    await user.click(within(dialog).getByRole("button", { name: "일정 이동" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("일정 1개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "우진해장국" })).toBeInTheDocument();
    expect(screen.getByText(/우진해장국을 2일차로 옮겼습니다/)).toBeInTheDocument();
  });

  it("synchronizes timeline and map marker selection", async () => {
    const user = renderWorkspace();
    const mapMarker = screen.getByRole("button", { name: "함덕해수욕장 지도에서 선택" });

    await user.click(mapMarker);

    expect(mapMarker).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "함덕해수욕장 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "우진해장국 선택" }));

    expect(screen.getByRole("button", { name: "우진해장국 지도에서 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(mapMarker).toHaveAttribute("aria-pressed", "false");
  });

  it("searches the complete trip and moves viewers to an itinerary on another day", async () => {
    const user = renderWorkspace(false, createTripWithSecondDayItem());

    await user.click(screen.getByRole("button", { name: "일정 찾기" }));
    const dialog = await screen.findByRole("dialog", { name: "일정 찾기" });
    const searchInput = within(dialog).getByRole("searchbox", { name: "전체 일정 검색" });

    expect(within(dialog).getByText("3곳")).toBeInTheDocument();

    await user.type(searchInput, "서울 야경");
    expect(await within(dialog).findByText("일치하는 일정이 없어요")).toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "비자림");
    await user.click(
      await within(dialog).findByRole("button", {
        name: "비자림, 2일차 일정으로 이동",
      }),
    );

    expect(screen.queryByRole("dialog", { name: "일정 찾기" })).not.toBeInTheDocument();
    expect(screen.getByText("일정 1개 · Asia/Seoul")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비자림 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("비자림이 있는 2일차로 이동했습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "장소 추가" })).not.toBeInTheDocument();
  });

  it("shows collaborators who are currently checking the same itinerary item", () => {
    renderWorkspace(true, jejuTrip, [
      {
        color: "#4f7fca",
        connectionId: 2,
        name: "민지",
        selectedItemId: "hamdeok-beach",
      },
      {
        color: "#d97b5d",
        connectionId: 3,
        name: "준호",
        selectedItemId: "hamdeok-beach",
      },
    ]);

    expect(screen.getByText("민지님 외 1명이 이 장소를 확인 중")).toBeInTheDocument();
    expect(screen.queryByText("민지님이 이 장소를 확인 중")).not.toBeInTheDocument();
  });

  it("selects a place when its card body is clicked", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByText("서사로 11, 제주시"));

    expect(screen.getByRole("button", { name: "우진해장국 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "우진해장국 지도에서 선택" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("recalculates the displayed route after a committed itinerary reorder", async () => {
    const user = renderWorkspace();

    await screen.findByText(/자동차 이동 ·/);
    const initialRoutePoints = screen.getByTestId("map-route-signature").textContent;

    expect(initialRoutePoints).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "비자림 위로 이동" }));

    await waitFor(() => {
      const updatedRoutePoints = screen.getByTestId("map-route-signature").textContent;

      expect(updatedRoutePoints).toBeTruthy();
      expect(updatedRoutePoints).not.toBe(initialRoutePoints);
    });
  });

  it("switches the mobile itinerary and map controls", async () => {
    const user = renderWorkspace();
    const mobileViewSwitch = screen.getByRole("group", { name: "모바일 화면 전환" });
    const itineraryButton = screen.getByRole("button", { name: "일정" });
    const mapButton = screen.getByRole("button", { name: "지도" });

    expect(mobileViewSwitch.closest(".editor-layout")).not.toBeNull();
    expect(itineraryButton).toHaveAttribute("aria-pressed", "true");
    expect(itineraryButton).toHaveAttribute("aria-controls", "itinerary-timeline-panel");
    expect(mapButton).toHaveAttribute("aria-controls", "itinerary-map-panel");
    await user.click(mapButton);

    expect(mapButton).toHaveAttribute("aria-pressed", "true");
    expect(itineraryButton).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "함덕해수욕장 지도에서 선택" }));
    expect(itineraryButton).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps a viewer in read-only mode while preserving day and map navigation", async () => {
    const user = renderWorkspace(false);

    expect(screen.queryByRole("button", { name: "장소 추가" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "우진해장국 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "우진해장국 복제" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "우진해장국 순서 이동" })).not.toBeInTheDocument();

    const mapMarker = screen.getByRole("button", { name: "함덕해수욕장 지도에서 선택" });
    await user.click(mapMarker);
    expect(mapMarker).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /2일차/ }));
    expect(screen.getByText("아직 일정이 없어요")).toBeInTheDocument();
    expect(screen.getByText("다른 구성원이 추가한 일정을 여기서 확인할 수 있어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "지도" }));
    expect(screen.getByRole("button", { name: "지도" })).toHaveAttribute("aria-pressed", "true");
  });
});

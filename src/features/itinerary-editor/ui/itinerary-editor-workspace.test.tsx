// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
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

function renderWorkspace(canEditItinerary = true, initialTripItinerary = jejuTrip) {
  const user = userEvent.setup();
  render(
    <ItineraryEditorWorkspace
      canEditItinerary={canEditItinerary}
      initialTripItinerary={initialTripItinerary}
    />,
  );
  return user;
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

  it("switches to an empty day and adds a validated itinerary item", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /둘째 날/ }));
    expect(screen.getByText("아직 일정이 없어요")).toBeInTheDocument();
    expect(screen.getByText("경유지가 없어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });

    await user.type(within(dialog).getByLabelText("장소 검색"), "성산");
    await user.click(await within(dialog).findByRole("button", { name: "성산일출봉 선택" }));
    await user.type(within(dialog).getByLabelText("시작 시간"), "08:00");
    await user.type(within(dialog).getByLabelText("소요 시간(분)"), "120");
    await user.type(within(dialog).getByLabelText("메모"), "아침 일찍 출발");
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

    expect(await within(dialog).findByText("장소 이름을 입력해 주세요.")).toBeInTheDocument();
    expect(within(dialog).getByText("주소를 입력해 주세요.")).toBeInTheDocument();
  });

  it("fills the form from a Google place search result without exposing coordinates", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });
    await user.type(within(dialog).getByLabelText("장소 검색"), "성산");
    await user.click(await within(dialog).findByRole("button", { name: "성산일출봉 선택" }));

    expect(within(dialog).getByLabelText("장소 이름")).toHaveValue("성산일출봉");
    expect(within(dialog).getByLabelText("주소")).toHaveValue(
      "제주특별자치도 서귀포시 성산읍 성산리 1",
    );
    expect(within(dialog).queryByLabelText("경도")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("위도")).not.toBeInTheDocument();
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
    const startTimeInput = within(dialog).getByLabelText("시작 시간");

    await user.clear(startTimeInput);
    await user.type(startTimeInput, "11:30");

    expect(await within(dialog).findByText("일정 시간이 겹쳐요.")).toBeInTheDocument();
    expect(within(dialog).getByText(/함덕해수욕장 일정과 겹쳐요/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "변경 저장" }));

    expect(screen.getAllByText("시간 겹침")).toHaveLength(2);
    expect(screen.getByText("시간이 겹치는 일정 2개")).toBeInTheDocument();
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
    const itineraryButton = screen.getByRole("button", { name: "일정" });
    const mapButton = screen.getByRole("button", { name: "지도" });

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

    await user.click(screen.getByRole("button", { name: /둘째 날/ }));
    expect(screen.getByText("아직 일정이 없어요")).toBeInTheDocument();
    expect(screen.getByText("다른 구성원이 추가한 일정을 여기서 확인할 수 있어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "지도" }));
    expect(screen.getByRole("button", { name: "지도" })).toHaveAttribute("aria-pressed", "true");
  });
});

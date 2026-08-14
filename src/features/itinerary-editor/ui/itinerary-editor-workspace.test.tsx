// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { jejuTrip } from "@/entities/itinerary/mock/jeju-trip";
import { ItineraryEditorWorkspace } from "@/features/itinerary-editor/ui/itinerary-editor-workspace";

function renderWorkspace(canEditItinerary = true) {
  const user = userEvent.setup();
  render(
    <ItineraryEditorWorkspace
      canEditItinerary={canEditItinerary}
      initialTripItinerary={jejuTrip}
    />,
  );
  return user;
}

describe("ItineraryEditorWorkspace", () => {
  it("switches to an empty day and adds a validated itinerary item", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /둘째 날/ }));
    expect(screen.getByText("아직 일정이 없어요")).toBeInTheDocument();
    expect(screen.getByText("경유지가 없어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });

    await user.type(within(dialog).getByLabelText("장소 이름"), "성산일출봉");
    await user.type(within(dialog).getByLabelText("주소"), "성산읍 일출로 284-12");
    await user.type(within(dialog).getByLabelText("카테고리"), "자연");
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

  it("fills the form from a debounced mock place search result", async () => {
    const user = renderWorkspace();

    await user.click(screen.getByRole("button", { name: "장소 추가" }));
    const dialog = await screen.findByRole("dialog", { name: "장소를 일정에 추가" });
    await user.type(within(dialog).getByLabelText("장소 검색"), "함덕");
    await user.click(await within(dialog).findByRole("button", { name: "함덕해수욕장 선택" }));

    expect(within(dialog).getByLabelText("장소 이름")).toHaveValue("함덕해수욕장");
    expect(within(dialog).getByLabelText("주소")).toHaveValue("조천읍 조함해안로 525");
    expect(within(dialog).getByLabelText("경도")).toHaveValue(126.6692);
    expect(within(dialog).getByLabelText("위도")).toHaveValue(33.5431);
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

  it("recalculates the displayed route after a committed itinerary reorder", async () => {
    const user = renderWorkspace();

    await screen.findByText(/자동차 ·/);
    const initialRoutePoints = document.querySelector(".route-line")?.getAttribute("points");

    expect(initialRoutePoints).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "비자림 위로 이동" }));

    await waitFor(() => {
      const updatedRoutePoints = document.querySelector(".route-line")?.getAttribute("points");

      expect(updatedRoutePoints).toBeTruthy();
      expect(updatedRoutePoints).not.toBe(initialRoutePoints);
    });
  });

  it("switches the mobile itinerary and map controls", async () => {
    const user = renderWorkspace();
    const itineraryButton = screen.getByRole("button", { name: "일정" });
    const mapButton = screen.getByRole("button", { name: "지도" });

    expect(itineraryButton).toHaveAttribute("aria-pressed", "true");
    await user.click(mapButton);

    expect(mapButton).toHaveAttribute("aria-pressed", "true");
    expect(itineraryButton).toHaveAttribute("aria-pressed", "false");
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

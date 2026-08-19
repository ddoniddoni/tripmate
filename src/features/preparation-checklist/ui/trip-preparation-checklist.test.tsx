// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import { TripPreparationChecklistView } from "@/features/preparation-checklist/ui/trip-preparation-checklist";

const members = [
  { displayName: "지우", role: "owner" as const, userId: "user-jiwoo" },
  { displayName: "민지", role: "editor" as const, userId: "user-minji" },
];

const checklistItem: PreparationChecklistItem = {
  assigneeId: null,
  category: "booking",
  completedAt: null,
  createdAt: "2026-04-01T09:00:00.000Z",
  createdBy: "user-jiwoo",
  dueDate: null,
  id: "stay-reservation",
  isPriority: false,
  title: "숙소 예약 확인하기",
};

const ownPackingItem: PreparationChecklistItem = {
  assigneeId: "user-jiwoo",
  category: "packing",
  completedAt: null,
  createdAt: "2026-04-01T10:00:00.000Z",
  createdBy: "user-jiwoo",
  dueDate: "2026-04-04",
  id: "sun-cream",
  isPriority: true,
  title: "자외선 차단제 챙기기",
};

const completedTransportItem: PreparationChecklistItem = {
  assigneeId: "user-minji",
  category: "transport",
  completedAt: "2026-04-02T10:00:00.000Z",
  createdAt: "2026-04-01T11:00:00.000Z",
  createdBy: "user-minji",
  dueDate: null,
  id: "airport-bus",
  isPriority: false,
  title: "공항버스 시간 확인하기",
};

function ChecklistHarness({
  canEditChecklist = true,
  initialItems = [checklistItem],
}: {
  canEditChecklist?: boolean;
  initialItems?: PreparationChecklistItem[];
}) {
  const [items, setItems] = useState<PreparationChecklistItem[]>(initialItems);

  return (
    <TripPreparationChecklistView
      canEditChecklist={canEditChecklist}
      currentUserId="user-jiwoo"
      items={items}
      members={members}
      onAdd={(values) => {
        setItems((currentItems) => [
          ...currentItems,
          {
            assigneeId: values.assigneeId || null,
            category: values.category,
            completedAt: null,
            createdAt: "2026-04-01T10:00:00.000Z",
            createdBy: "user-jiwoo",
            dueDate: values.dueDate || null,
            id: "ticket-check",
            isPriority: false,
            title: values.title,
          },
        ]);
        return true;
      }}
      onAssign={(itemId, assigneeId) => {
        setItems((currentItems) =>
          currentItems.map((item) => (item.id === itemId ? { ...item, assigneeId } : item)),
        );
      }}
      onUpdate={(itemId, values) => {
        setItems((currentItems) =>
          currentItems.map((item) => (item.id === itemId ? { ...item, ...values } : item)),
        );
        return true;
      }}
      onRemove={(itemId) => {
        setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      }}
      onToggleComplete={(itemId) => {
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId
              ? { ...item, completedAt: item.completedAt ? null : "2026-04-02T10:00:00.000Z" }
              : item,
          ),
        );
      }}
      onTogglePriority={(itemId) => {
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId ? { ...item, isPriority: !item.isPriority } : item,
          ),
        );
      }}
      statusMessage=""
    />
  );
}

describe("TripPreparationChecklistView", () => {
  it("keeps an empty checklist in a focused first-item flow", async () => {
    const user = userEvent.setup();
    const { container } = render(<ChecklistHarness initialItems={[]} />);

    const workspace = screen.getByRole("region", { name: "준비하기" });

    expect(workspace).toHaveClass("preparation-workspace-empty");
    expect(container.querySelector(".preparation-empty-state")).toBeInTheDocument();

    await user.type(screen.getByLabelText("준비할 일"), "여권 유효기간 확인하기");
    await user.click(screen.getByRole("button", { name: "추가" }));

    expect(workspace).not.toHaveClass("preparation-workspace-empty");
    expect(screen.queryByText("첫 준비 항목을 적어 볼까요?")).not.toBeInTheDocument();
  });

  it("adds a categorized task, assigns a member, and marks it complete", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    await user.selectOptions(screen.getByLabelText("카테고리"), "transport");
    const assigneeSelect = screen.getByLabelText("담당자");
    expect(within(assigneeSelect).getByRole("option", { name: "나 · 지우" })).toBeInTheDocument();
    expect(within(assigneeSelect).getByRole("option", { name: "민지" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("담당자"), "user-minji");
    await user.type(screen.getByLabelText("마감일"), "2026-04-12");
    await user.type(screen.getByLabelText("준비할 일"), "렌터카 예약 확인하기");
    await user.click(screen.getByRole("button", { name: "추가" }));

    const transportSection = screen.getByRole("region", { name: "준비하기" });
    expect(within(transportSection).getByText("렌터카 예약 확인하기")).toBeInTheDocument();
    expect(within(transportSection).getByText("마감 4월 12일")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("숙소 예약 확인하기 담당자"), "user-minji");
    expect(screen.getByLabelText("숙소 예약 확인하기 담당자")).toHaveValue("user-minji");

    await user.click(screen.getByRole("checkbox", { name: "숙소 예약 확인하기 완료" }));
    expect(screen.getByLabelText("준비 진행률 50%")).toBeInTheDocument();
  });

  it("keeps a viewer read-only while showing the shared checklist", () => {
    render(<ChecklistHarness canEditChecklist={false} />);

    expect(screen.getByText("보기 전용 권한에서는 준비 항목을 변경할 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "숙소 예약 확인하기 완료" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "추가" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "숙소 예약 확인하기 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "숙소 예약 확인하기 우선 표시" })).not.toBeInTheDocument();
  });

  it("updates a task title and category without recreating the checklist item", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    await user.click(screen.getByRole("button", { name: "숙소 예약 확인하기 수정" }));
    const titleInput = screen.getByLabelText("준비할 일 수정");
    await user.clear(titleInput);
    await user.type(titleInput, "공항버스 시간 확인하기");
    await user.selectOptions(screen.getByLabelText("준비 항목 분류 수정"), "transport");
    await user.type(screen.getByLabelText("마감일 수정"), "2026-04-10");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("공항버스 시간 확인하기")).toBeInTheDocument();
    expect(screen.queryByText("숙소 예약 확인하기")).not.toBeInTheDocument();
    expect(screen.getByText("마감 4월 10일")).toBeInTheDocument();
    expect(document.querySelector(".preparation-category-transport")).toBeInTheDocument();
  });

  it("allows an existing due date to be cleared", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness initialItems={[ownPackingItem]} />);

    expect(screen.getByText("마감 4월 4일")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "자외선 차단제 챙기기 수정" }));
    await user.clear(screen.getByLabelText("마감일 수정"));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.queryByText("마감 4월 4일")).not.toBeInTheDocument();
  });

  it("marks a task as priority and filters the shared priority state locally", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness initialItems={[checklistItem, ownPackingItem]} />);

    await user.click(screen.getByRole("button", { name: "숙소 예약 확인하기 우선 표시" }));
    expect(
      screen.getByRole("button", { name: "숙소 예약 확인하기 우선 해제" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "우선, 2개" }));
    expect(screen.getByText("숙소 예약 확인하기")).toBeInTheDocument();
    expect(screen.getByText("자외선 차단제 챙기기")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "숙소 예약 확인하기 우선 해제" }));
    expect(screen.queryByText("숙소 예약 확인하기")).not.toBeInTheDocument();
  });

  it("filters the local checklist without changing the shared progress", async () => {
    const user = userEvent.setup();
    render(
      <ChecklistHarness initialItems={[checklistItem, ownPackingItem, completedTransportItem]} />,
    );

    expect(screen.getByLabelText("준비 진행률 33%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "미완료, 2개" }));
    expect(screen.getByText("숙소 예약 확인하기")).toBeInTheDocument();
    expect(screen.getByText("자외선 차단제 챙기기")).toBeInTheDocument();
    expect(screen.queryByText("공항버스 시간 확인하기")).not.toBeInTheDocument();
    expect(screen.getByLabelText("준비 진행률 33%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "내 담당, 1개" }));
    expect(screen.getByText("자외선 차단제 챙기기")).toBeInTheDocument();
    expect(screen.queryByText("숙소 예약 확인하기")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "우선, 1개" }));
    expect(screen.getByText("자외선 차단제 챙기기")).toBeInTheDocument();
    expect(screen.queryByText("숙소 예약 확인하기")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "완료, 1개" }));
    expect(screen.getByText("공항버스 시간 확인하기")).toBeInTheDocument();
    expect(screen.queryByText("자외선 차단제 챙기기")).not.toBeInTheDocument();
  });

  it("offers a return to all tasks when the selected local filter is empty", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    await user.click(screen.getByRole("button", { name: "내 담당, 0개" }));
    expect(screen.getByText("내 담당 항목이 없어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "전체 항목 보기" }));
    expect(screen.getByText("숙소 예약 확인하기")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { PreparationChecklistItem } from "@/entities/preparation-checklist/model/preparation-checklist";
import { TripPreparationChecklistView } from "@/features/preparation-checklist/ui/trip-preparation-checklist";

const members = [
  { role: "owner" as const, userId: "user-jiwoo" },
  { role: "editor" as const, userId: "user-minji" },
];

const checklistItem: PreparationChecklistItem = {
  assigneeId: null,
  category: "booking",
  completedAt: null,
  createdAt: "2026-04-01T09:00:00.000Z",
  createdBy: "user-jiwoo",
  id: "stay-reservation",
  title: "숙소 예약 확인하기",
};

function ChecklistHarness({ canEditChecklist = true }: { canEditChecklist?: boolean }) {
  const [items, setItems] = useState<PreparationChecklistItem[]>([checklistItem]);

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
            id: "ticket-check",
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
      statusMessage=""
    />
  );
}

describe("TripPreparationChecklistView", () => {
  it("adds a categorized task, assigns a member, and marks it complete", async () => {
    const user = userEvent.setup();
    render(<ChecklistHarness />);

    await user.selectOptions(screen.getByLabelText("카테고리"), "transport");
    await user.selectOptions(screen.getByLabelText("담당자"), "user-minji");
    await user.type(screen.getByLabelText("준비할 일"), "렌터카 예약 확인하기");
    await user.click(screen.getByRole("button", { name: "추가" }));

    const transportSection = screen.getByRole("region", { name: "준비하기" });
    expect(within(transportSection).getByText("렌터카 예약 확인하기")).toBeInTheDocument();

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
  });
});

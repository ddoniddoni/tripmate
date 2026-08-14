// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canRedo: false,
  canUndo: false,
  redo: vi.fn(),
  undo: vi.fn(),
}));

vi.mock("@liveblocks/react", () => ({
  useCanRedo: () => mocks.canRedo,
  useCanUndo: () => mocks.canUndo,
  useRedo: () => mocks.redo,
  useUndo: () => mocks.undo,
}));

import { TripHistoryControls } from "@/features/collaboration/ui/trip-history-controls";

function resetMocks() {
  mocks.canRedo = false;
  mocks.canUndo = false;
  mocks.redo.mockReset();
  mocks.undo.mockReset();
}

describe("TripHistoryControls", () => {
  it("disables unavailable or read-only history actions", () => {
    resetMocks();
    mocks.canRedo = true;
    mocks.canUndo = true;
    render(<TripHistoryControls canEditItinerary={false} />);

    expect(screen.getByRole("button", { name: "마지막 변경 실행 취소" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "실행 취소한 변경 다시 적용" })).toBeDisabled();
  });

  it("runs the available actions and announces the result", async () => {
    resetMocks();
    mocks.canRedo = true;
    mocks.canUndo = true;
    const user = userEvent.setup();
    render(<TripHistoryControls canEditItinerary />);

    await user.click(screen.getByRole("button", { name: "마지막 변경 실행 취소" }));
    await user.click(screen.getByRole("button", { name: "실행 취소한 변경 다시 적용" }));

    expect(mocks.undo).toHaveBeenCalledOnce();
    expect(mocks.redo).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("실행 취소한 변경을 다시 적용했습니다.");
  });

  it("supports undo and redo shortcuts outside text inputs", () => {
    resetMocks();
    mocks.canRedo = true;
    mocks.canUndo = true;
    render(<TripHistoryControls canEditItinerary />);

    fireEvent.keyDown(window, { ctrlKey: true, key: "z" });
    fireEvent.keyDown(window, { ctrlKey: true, key: "Z", shiftKey: true });

    expect(mocks.undo).toHaveBeenCalledOnce();
    expect(mocks.redo).toHaveBeenCalledOnce();
  });

  it("leaves text input undo handling to the browser", () => {
    resetMocks();
    mocks.canUndo = true;
    render(
      <>
        <input aria-label="일정 메모" />
        <TripHistoryControls canEditItinerary />
      </>,
    );

    fireEvent.keyDown(screen.getByLabelText("일정 메모"), { ctrlKey: true, key: "z" });

    expect(mocks.undo).not.toHaveBeenCalled();
  });
});

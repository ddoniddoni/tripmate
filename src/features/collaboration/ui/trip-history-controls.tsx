"use client";

import {
  useCanRedo,
  useCanUndo,
  useRedo,
  useUndo,
} from "@liveblocks/react";
import { useCallback, useEffect, useEffectEvent, useState } from "react";

type TripHistoryControlsProps = {
  canEditItinerary: boolean;
};

function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M7.6 5.15 3.75 9l3.85 3.85" />
      <path d="M4.3 9h7.2a4.25 4.25 0 1 1 0 8.5H9.7" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M12.4 5.15 16.25 9l-3.85 3.85" />
      <path d="M15.7 9H8.5a4.25 4.25 0 1 0 0 8.5h1.8" />
    </svg>
  );
}

function isTextEditingElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}

export function TripHistoryControls({ canEditItinerary }: TripHistoryControlsProps) {
  const canRedo = useCanRedo();
  const canUndo = useCanUndo();
  const redo = useRedo();
  const undo = useUndo();
  const [historyMessage, setHistoryMessage] = useState("");
  const undoDisabled = !canEditItinerary || !canUndo;
  const redoDisabled = !canEditItinerary || !canRedo;
  const undoTitle = !canEditItinerary
    ? "보기 전용 권한에서는 되돌릴 수 없어요."
    : canUndo
      ? "마지막 변경 실행 취소 (⌘ 또는 Ctrl+Z)"
      : "되돌릴 변경이 없어요.";
  const redoTitle = !canEditItinerary
    ? "보기 전용 권한에서는 다시 실행할 수 없어요."
    : canRedo
      ? "실행 취소한 변경 다시 적용 (⌘ 또는 Ctrl+Shift+Z)"
      : "다시 실행할 변경이 없어요.";

  const handleUndo = useCallback(() => {
    if (undoDisabled) {
      return;
    }

    undo();
    setHistoryMessage("마지막 변경을 실행 취소했습니다.");
  }, [undo, undoDisabled]);

  const handleRedo = useCallback(() => {
    if (redoDisabled) {
      return;
    }

    redo();
    setHistoryMessage("실행 취소한 변경을 다시 적용했습니다.");
  }, [redo, redoDisabled]);

  const handleHistoryShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      !(event.metaKey || event.ctrlKey) ||
      event.key.toLowerCase() !== "z" ||
      isTextEditingElement(event.target)
    ) {
      return;
    }

    if (event.shiftKey) {
      if (!redoDisabled) {
        event.preventDefault();
        handleRedo();
      }
      return;
    }

    if (!undoDisabled) {
      event.preventDefault();
      handleUndo();
    }
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      handleHistoryShortcut(event);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="history-controls" role="group" aria-label="일정 변경 이력">
      <button
        type="button"
        aria-label="마지막 변경 실행 취소"
        aria-keyshortcuts="Meta+Z Control+Z"
        disabled={undoDisabled}
        onClick={handleUndo}
        title={undoTitle}
      >
        <span className="history-control-icon">
          <UndoIcon />
        </span>
        <span className="history-control-label">되돌리기</span>
        <span className="history-control-shortcut" aria-hidden="true">
          ⌘Z
        </span>
      </button>
      <button
        type="button"
        aria-label="실행 취소한 변경 다시 적용"
        aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z"
        disabled={redoDisabled}
        onClick={handleRedo}
        title={redoTitle}
      >
        <span className="history-control-icon">
          <RedoIcon />
        </span>
        <span className="history-control-label">다시 실행</span>
        <span className="history-control-shortcut" aria-hidden="true">
          ⇧⌘Z
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {historyMessage}
      </span>
    </div>
  );
}

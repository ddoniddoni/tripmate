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
    <div className="history-controls" role="group" aria-label="일정 편집 기록">
      <button
        type="button"
        aria-label="마지막 변경 실행 취소"
        disabled={undoDisabled}
        onClick={handleUndo}
        title="실행 취소 (⌘ 또는 Ctrl+Z)"
      >
        <span aria-hidden="true">↶</span>
        <span className="history-control-label">되돌리기</span>
      </button>
      <button
        type="button"
        aria-label="실행 취소한 변경 다시 적용"
        disabled={redoDisabled}
        onClick={handleRedo}
        title="다시 실행 (⌘ 또는 Ctrl+Shift+Z)"
      >
        <span aria-hidden="true">↷</span>
        <span className="history-control-label">다시</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {historyMessage}
      </span>
    </div>
  );
}

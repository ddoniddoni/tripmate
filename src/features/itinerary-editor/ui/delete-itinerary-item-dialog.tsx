"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";

type DeleteItineraryItemDialogProps = {
  itemName: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function DeleteItineraryItemDialog({
  itemName,
  onConfirm,
  onOpenChange,
  open,
}: DeleteItineraryItemDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">일정 삭제</span>
          <AlertDialog.Title>{itemName}을 삭제할까요?</AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            현재 로컬 편집에서는 실행 취소를 지원하지 않습니다. 삭제한 일정은 다시 추가해야 합니다.
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel className="secondary-button">취소</AlertDialog.Cancel>
            <AlertDialog.Action className="danger-button" onClick={onConfirm}>
              삭제
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

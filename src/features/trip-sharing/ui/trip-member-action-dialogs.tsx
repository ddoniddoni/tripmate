import * as AlertDialog from "@radix-ui/react-alert-dialog";

import type { TripMember } from "@/entities/trip/model/trip-membership";

type DialogProps = {
  isMutating: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type MemberDialogProps = DialogProps & {
  member: TripMember | null;
  memberLabel: string;
  onConfirm: () => void;
};

function getObjectParticle(label: string) {
  const lastCharacter = label.at(-1);

  if (!lastCharacter) {
    return "을";
  }

  const characterCode = lastCharacter.charCodeAt(0);
  const isHangulSyllable = characterCode >= 0xac00 && characterCode <= 0xd7a3;

  return isHangulSyllable && (characterCode - 0xac00) % 28 === 0 ? "를" : "을";
}

export function MemberRemovalDialog({
  isMutating,
  member,
  memberLabel,
  onConfirm,
  onOpenChange,
  open,
}: MemberDialogProps) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">멤버 제외</span>
          <AlertDialog.Title>
            {member ? `${memberLabel}${getObjectParticle(memberLabel)} 제외할까요?` : "멤버를 제외할까요?"}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            제외된 멤버는 이 여행의 일정, 준비 항목, 경비를 더 이상 볼 수 없습니다. 이 작업은 되돌릴 수 없습니다.
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button className="secondary-button" disabled={isMutating} type="button">
                취소
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className="danger-button" disabled={isMutating} onClick={onConfirm} type="button">
                {isMutating ? "제외 중…" : "제외하기"}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function OwnershipTransferDialog({
  isMutating,
  member,
  memberLabel,
  onConfirm,
  onOpenChange,
  open,
}: MemberDialogProps) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">소유권 이전</span>
          <AlertDialog.Title>
            {member ? `${memberLabel}에게 소유권을 넘길까요?` : "여행 소유권을 넘길까요?"}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            소유권을 넘기면 나는 편집자가 됩니다. 이후에는 새 소유자만 멤버와 여행 정보를 관리할 수 있어요.
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button className="secondary-button" disabled={isMutating} type="button">
                취소
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className="primary-button" disabled={isMutating} onClick={onConfirm} type="button">
                {isMutating ? "넘기는 중…" : "소유권 넘기기"}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function TripLeaveDialog({ isMutating, onConfirm, onOpenChange, open }: DialogProps & { onConfirm: () => void }) {
  return (
    <AlertDialog.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content alert-dialog-content">
          <span className="section-kicker">여행 나가기</span>
          <AlertDialog.Title>이 여행에서 나갈까요?</AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            더 이상 일정, 준비 항목, 경비를 볼 수 없습니다. 다시 참여하려면 소유자에게 새로 초대받아야 해요.
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button className="secondary-button" disabled={isMutating} type="button">
                취소
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button className="danger-button" disabled={isMutating} onClick={onConfirm} type="button">
                {isMutating ? "나가는 중…" : "여행 나가기"}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

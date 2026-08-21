import type { TripMember } from "@/entities/trip/model/trip-membership";
import { NativeSelect } from "@/shared/ui/native-select";

type EditableTripMemberRole = "editor" | "viewer";

type TripMemberRowProps = {
  canManageMembers: boolean;
  isMutating: boolean;
  isPending: boolean;
  isCurrentUser: boolean;
  label: string;
  member: TripMember;
  onLeave: (member: TripMember) => void;
  onRemove: (member: TripMember) => void;
  onRoleChange: (memberId: string, role: EditableTripMemberRole) => void;
  onTransfer: (member: TripMember) => void;
};

function getRoleLabel(role: TripMember["role"]) {
  if (role === "owner") {
    return "소유자";
  }

  return role === "editor" ? "편집자" : "보기 전용";
}

export function TripMemberRow({
  canManageMembers,
  isCurrentUser,
  isMutating,
  isPending,
  label,
  member,
  onLeave,
  onRemove,
  onRoleChange,
  onTransfer,
}: TripMemberRowProps) {
  const canManageThisMember = canManageMembers && !isCurrentUser && member.role !== "owner";

  return (
    <li>
      <div className="trip-member-identity">
        <span aria-hidden="true" className={`trip-member-avatar trip-member-avatar-${member.role}`}>
          {label.slice(0, 1)}
        </span>
        <div>
          <strong>{label}</strong>
          <span>{member.role === "owner" ? "이 여행의 소유자" : getRoleLabel(member.role)}</span>
        </div>
      </div>

      {isCurrentUser && member.role !== "owner" ? (
        <button
          className="text-action text-action-danger"
          disabled={isMutating}
          onClick={() => onLeave(member)}
          type="button"
        >
          {isPending ? "처리 중…" : "여행 나가기"}
        </button>
      ) : member.role === "owner" ? (
        <span className="trip-member-role-badge">소유자</span>
      ) : canManageThisMember ? (
        <div className="trip-member-controls">
          <label className="sr-only" htmlFor={`trip-member-role-${member.userId}`}>
            {label} 권한
          </label>
          <NativeSelect
            aria-label={`${label} 권한`}
            disabled={isMutating}
            id={`trip-member-role-${member.userId}`}
            onChange={(event) => onRoleChange(member.userId, event.target.value as EditableTripMemberRole)}
            value={member.role}
          >
            <option value="editor">편집자</option>
            <option value="viewer">보기 전용</option>
          </NativeSelect>
          <button
            aria-label={`${label} 제외`}
            className="text-action text-action-danger"
            disabled={isMutating}
            onClick={() => onRemove(member)}
            type="button"
          >
            {isPending ? "처리 중…" : "제외"}
          </button>
          <button
            aria-label={`${label}에게 소유권 넘기기`}
            className="text-action"
            disabled={isMutating}
            onClick={() => onTransfer(member)}
            type="button"
          >
            소유권
          </button>
        </div>
      ) : (
        <span className="trip-member-role-badge">{getRoleLabel(member.role)}</span>
      )}
    </li>
  );
}

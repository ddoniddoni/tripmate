import type { TripWorkspaceView } from "@/features/collaboration/model/trip-workspace-navigation";

type ActiveCollaborator = {
  activeWorkspace?: TripWorkspaceView;
  name: string;
};

const workspaceActivityCopy: Record<TripWorkspaceView, string> = {
  expenses: "경비를 정리하는 중",
  itinerary: "일정을 살펴보는 중",
  overview: "여행 개요를 보는 중",
  preparation: "준비 항목을 확인하는 중",
  settings: "여행 설정을 확인하는 중",
};

export function getWorkspaceActivityCopy(activeWorkspace?: TripWorkspaceView) {
  return activeWorkspace ? workspaceActivityCopy[activeWorkspace] : null;
}

export function getCollaboratorActivityCopy(collaborators: readonly ActiveCollaborator[]) {
  const activeCollaborators = collaborators.filter(
    (collaborator): collaborator is ActiveCollaborator & { activeWorkspace: TripWorkspaceView } =>
      collaborator.activeWorkspace !== undefined,
  );

  if (activeCollaborators.length === 0) {
    return null;
  }

  const [firstCollaborator] = activeCollaborators;

  if (activeCollaborators.length === 1) {
    return `${firstCollaborator.name}님이 ${getWorkspaceActivityCopy(firstCollaborator.activeWorkspace)}`;
  }

  return `${firstCollaborator.name}님 외 ${activeCollaborators.length - 1}명이 함께 여행을 준비하는 중`;
}

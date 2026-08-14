"use client";

import { shallow } from "@liveblocks/client";
import { useOthers, useStatus } from "@liveblocks/react";

import { getCollaborationConnectionCopy } from "@/features/collaboration/model/trip-room";

export function TripCollaborationStatus() {
  const status = useStatus();
  const collaborators = useOthers(
    (others) =>
      others.map((other) => ({
        color: other.info.color,
        connectionId: other.connectionId,
        name: other.info.name,
      })),
    shallow,
  );
  const connectionCopy = getCollaborationConnectionCopy(status);
  const collaboratorCount = collaborators.length;

  return (
    <div
      aria-label={`${connectionCopy}. 나 외 ${collaboratorCount}명 접속 중`}
      className={`sync-pill collaboration-status collaboration-status-${status}`}
      role="status"
    >
      <i aria-hidden="true" />
      <span>{connectionCopy}</span>
      {collaboratorCount > 0 ? (
        <ol aria-hidden="true" className="collaborator-list">
          {collaborators.slice(0, 3).map((collaborator) => (
            <li
              className="collaborator-avatar"
              key={collaborator.connectionId}
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.name.slice(0, 1)}
            </li>
          ))}
          {collaboratorCount > 3 ? (
            <li className="collaborator-avatar collaborator-avatar-overflow">
              +{collaboratorCount - 3}
            </li>
          ) : null}
        </ol>
      ) : null}
    </div>
  );
}

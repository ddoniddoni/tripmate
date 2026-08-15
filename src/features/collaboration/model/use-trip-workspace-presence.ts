"use client";

import { useUpdateMyPresence } from "@liveblocks/react";
import { useEffect } from "react";

import type { TripWorkspaceView } from "@/features/collaboration/model/trip-workspace-navigation";

export function useTripWorkspacePresence(activeWorkspace: TripWorkspaceView) {
  const updateMyPresence = useUpdateMyPresence();

  useEffect(() => {
    updateMyPresence({ activeWorkspace });
  }, [activeWorkspace, updateMyPresence]);
}

"use client";

import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import { useMemo, type ReactNode } from "react";

import { createTripItineraryStorage } from "@/features/collaboration/model/liveblocks-itinerary";
import type { ItineraryDocument } from "@/entities/itinerary/model/trip-itinerary";

type TripCollaborationRoomProps = {
  children: ReactNode;
  initialItinerary: ItineraryDocument;
  roomId: string;
};

export function TripCollaborationRoom({
  children,
  initialItinerary,
  roomId,
}: TripCollaborationRoomProps) {
  const initialStorage = useMemo(
    () => createTripItineraryStorage(initialItinerary),
    [initialItinerary],
  );

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={roomId} initialStorage={initialStorage}>
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
